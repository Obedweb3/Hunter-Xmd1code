const { cmd } = require('../command');
const axios = require('axios');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const crypto = require('crypto');

// Configuration
const CONFIG = {
    maxFileSize: 100 * 1024 * 1024, // 100MB limit for documents
    cacheDir: path.join(__dirname, '..', 'cache', 'downloads'),
    tempDir: path.join(__dirname, '..', 'temp'),
    maxRetries: 3,
    timeout: 30000,
    audioBitrate: '320k', // Higher quality for downloads
    videoQuality: '720p'
};

// Ensure directories exist
[CONFIG.cacheDir, CONFIG.tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// API Health Status Cache
const apiHealthCache = new Map();
const API_HEALTH_TTL = 5 * 60 * 1000;

// Smart API Manager
class APIManager {
    constructor() {
        this.apis = [
            {
                name: 'Y2Mate Guru',
                type: 'y2mate',
                endpoint: 'https://y2mate.guru/api/convert',
                priority: 1,
                supportsAudio: true,
                supportsVideo: true
            },
            {
                name: 'David Cyril',
                type: 'direct',
                audioEndpoint: 'https://api.davidcyriltech.my.id/download/ytmp3',
                videoEndpoint: 'https://api.davidcyriltech.my.id/download/ytvideo',
                priority: 2,
                supportsAudio: true,
                supportsVideo: true
            },
            {
                name: 'Siputzx',
                type: 'direct',
                audioEndpoint: 'https://api.siputzx.my.id/api/d/ytmp3',
                videoEndpoint: 'https://api.siputzx.my.id/api/d/ytmp4',
                priority: 3,
                supportsAudio: true,
                supportsVideo: true
            },
            {
                name: 'Ryzendesu',
                type: 'direct',
                endpoint: 'https://api.ryzendesu.vip/api/downloader/yt',
                priority: 4,
                supportsAudio: true,
                supportsVideo: true
            },
            {
                name: 'Agatz',
                type: 'agatz',
                endpoint: 'https://api.agatz.xyz/api/yt',
                priority: 5,
                supportsAudio: true,
                supportsVideo: true
            }
        ];
    }

    /**
     * Checks the health status of the specified API.
     *
     * This function first checks if the health status of the API is cached and still valid based on the defined TTL.
     * If the cached status is not available or expired, it attempts to send a HEAD request to the API's endpoint
     * to determine its health. The result is then cached for future reference.
     *
     * @param {Object} api - The API object containing the name and endpoint information.
     * @param {string} api.name - The name of the API.
     * @param {string} [api.endpoint] - The primary endpoint of the API.
     * @param {string} [api.audioEndpoint] - An alternative audio endpoint of the API.
     */
    async checkHealth(api) {
        const now = Date.now();
        const cached = apiHealthCache.get(api.name);
        if (cached && (now - cached.timestamp) < API_HEALTH_TTL) {
            return cached.status;
        }

        try {
            let testUrl = api.endpoint || api.audioEndpoint;
            await axios.head(testUrl, { timeout: 5000 });
            apiHealthCache.set(api.name, { status: true, timestamp: now });
            return true;
        } catch {
            apiHealthCache.set(api.name, { status: false, timestamp: now });
            return false;
        }
    }

    async getWorkingApis(type = 'audio') {
        const checks = await Promise.all(
            this.apis
                .filter(api => type === 'audio' ? api.supportsAudio : api.supportsVideo)
                .map(async api => ({
                    ...api,
                    healthy: await this.checkHealth(api)
                }))
        );
        return checks.filter(api => api.healthy).sort((a, b) => a.priority - b.priority);
    }
}

const apiManager = new APIManager();

/**
 * Formats a number into a more readable string representation.
 *
 * The function checks if the input number is falsy, returning '0' if so.
 * It then formats numbers in millions with an 'M' suffix and in thousands with a 'K' suffix,
 * rounding to one decimal place. If the number is less than 1000, it returns the number as a string.
 *
 * @param {number} num - The number to format.
 */
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

/**
 * Generates an MD5 hash for the given URL.
 */
function generateHash(url) {
    return crypto.createHash('md5').update(url).digest('hex');
}

function cleanFilename(title) {
    return title.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_').substring(0, 50);
}

// Download as Document (MP3/MP4 files)
/**
 * Downloads a document (audio or video) from a given URL, utilizing various APIs and caching mechanisms.
 *
 * The function first checks if a cached version of the file exists and is valid. If not, it attempts to download the file using available APIs, handling different types of responses based on the API used. If all API attempts fail, it falls back to using ytdl-core for downloading. The function also implements retry logic in case of failures, allowing for a specified number of retries before throwing an error.
 *
 * @param url - The URL of the document to download.
 * @param isVideo - A boolean indicating whether the document is a video (default is false).
 * @param retryCount - The current retry attempt count (default is 0).
 * @returns An object containing the file path, method used, whether it was cached, file name, and file size.
 * @throws Error If all download methods fail after the maximum number of retries.
 */
async function downloadAsDocument(url, isVideo = false, retryCount = 0) {
    const ext = isVideo ? 'mp4' : 'mp3';
    const cacheKey = generateHash(url + (isVideo ? '_video' : '_audio'));
    const cachePath = path.join(CONFIG.cacheDir, cacheKey + '.' + ext);
    
    // Check cache
    if (fs.existsSync(cachePath)) {
        const stats = fs.statSync(cachePath);
        if (stats.size > 0 && (Date.now() - stats.mtimeMs) < 24 * 60 * 60 * 1000) {
            console.log(`📦 Cache hit: ${cacheKey}`);
            return { filePath: cachePath, method: 'cache', cached: true, fileName: path.basename(cachePath) };
        }
    }

    const workingApis = await apiManager.getWorkingApis(isVideo ? 'video' : 'audio');
    const errors = [];

    // Try APIs
    for (const api of workingApis) {
        try {
            console.log(`🔄 Trying ${api.name}...`);
            let downloadUrl = null;
            let title = null;
            
            if (api.type === 'direct') {
                const endpoint = isVideo ? api.videoEndpoint : api.audioEndpoint;
                const response = await axios.get(endpoint, {
                    params: { url },
                    timeout: CONFIG.timeout,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
                
                downloadUrl = response.data?.downloadUrl || response.data?.url || response.data?.data?.download || response.data?.result?.download;
                title = response.data?.title || response.data?.result?.title;
            } 
            else if (api.type === 'y2mate') {
                const response = await axios.get(api.endpoint, {
                    params: { url: url, format: isVideo ? 'mp4' : 'mp3' },
                    timeout: CONFIG.timeout
                });
                downloadUrl = response.data?.download_url;
                title = response.data?.title;
            }
            else if (api.type === 'agatz') {
                const response = await axios.get(api.endpoint, {
                    params: { url },
                    timeout: CONFIG.timeout
                });
                downloadUrl = isVideo ? response.data?.video : response.data?.audio;
                title = response.data?.title;
            }

            if (downloadUrl) {
                // Stream download to file
                const writer = fs.createWriteStream(cachePath);
                const response = await axios({
                    url: downloadUrl,
                    method: 'GET',
                    responseType: 'stream',
                    timeout: 120000,
                    maxContentLength: CONFIG.maxFileSize,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });

                let downloadedBytes = 0;
                const totalBytes = parseInt(response.headers['content-length'] || 0);
                
                response.data.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    if (totalBytes) {
                        const percent = Math.round((downloadedBytes * 100) / totalBytes);
                        process.stdout.write(`\r⬇️  Downloading: ${percent}% (${(downloadedBytes/1024/1024).toFixed(2)}MB)`);
                    }
                });

                response.data.pipe(writer);
                
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
                
                console.log(''); // New line after progress

                // Verify file
                const stats = fs.statSync(cachePath);
                if (stats.size === 0) throw new Error('Downloaded file is empty');

                const finalFileName = cleanFilename(title || 'download') + '.' + ext;
                
                return { 
                    filePath: cachePath, 
                    method: api.name, 
                    cached: false,
                    fileName: finalFileName,
                    fileSize: stats.size
                };
            }
        } catch (err) {
            errors.push(`${api.name}: ${err.message}`);
            continue;
        }
    }

    // Fallback to ytdl-core
    try {
        console.log('🔄 Falling back to ytdl-core...');
        
        if (!isVideo) {
            // Download audio and convert to MP3
            const tempVideo = path.join(CONFIG.tempDir, `temp_${Date.now()}.mp4`);
            const outputMp3 = path.join(CONFIG.tempDir, `output_${Date.now()}.mp3`);
            
            await new Promise((resolve, reject) => {
                ytdl(url, { quality: 'highestaudio', filter: 'audioonly' })
                    .pipe(fs.createWriteStream(tempVideo))
                    .on('finish', resolve)
                    .on('error', reject);
            });

            await new Promise((resolve, reject) => {
                ffmpeg(tempVideo)
                    .audioCodec('libmp3lame')
                    .audioBitrate(CONFIG.audioBitrate)
                    .format('mp3')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(outputMp3);
            });

            fs.copyFileSync(outputMp3, cachePath);
            fs.unlinkSync(tempVideo);
            fs.unlinkSync(outputMp3);
            
            const stats = fs.statSync(cachePath);
            const info = await ytdl.getInfo(url);
            
            return { 
                filePath: cachePath, 
                method: 'ytdl-core+ffmpeg', 
                cached: false,
                fileName: cleanFilename(info.videoDetails.title) + '.mp3',
                fileSize: stats.size
            };
        } else {
            // Download video
            const info = await ytdl.getInfo(url);
            const format = ytdl.chooseFormat(info.formats, { quality: '18', filter: 'videoandaudio' });
            
            const response = await axios.get(format.url, {
                responseType: 'stream',
                timeout: 120000,
                maxContentLength: CONFIG.maxFileSize
            });

            const writer = fs.createWriteStream(cachePath);
            response.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const stats = fs.statSync(cachePath);
            return { 
                filePath: cachePath, 
                method: 'ytdl-core', 
                cached: false,
                fileName: cleanFilename(info.videoDetails.title) + '.mp4',
                fileSize: stats.size
            };
        }
    } catch (err) {
        errors.push(`ytdl-core: ${err.message}`);
    }

    // Retry logic
    if (retryCount < CONFIG.maxRetries) {
        console.log(`⚠️ Retrying... (${retryCount + 1}/${CONFIG.maxRetries})`);
        await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
        return downloadAsDocument(url, isVideo, retryCount + 1);
    }

    throw new Error(`All methods failed:\n${errors.join('\n')}`);
}

// Main Download Command
cmd({
    pattern: "dl",
    alias: ["download", "get", "save", "song", "mp3", "mp4", "yt"],
    desc: "Download YouTube audio/video as document file",
    category: "download",
    use: ".dl <query> | .dl video <query>",
    react: "📥",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return reply(`❌ *Usage Examples:*

📥 *Download Audio (MP3):*
.dl Alan Walker Faded
.dl song Happy Pharrell

📥 *Download Video (MP4):*
.dl video Alan Walker Faded
.dl mp4 Despacito

📥 *Download as Document:*
.dl doc Alan Walker Faded

*Features:*
• High quality MP3 (320kbps) / MP4 (720p)
• Sends as downloadable file
• Shows download progress
• Auto retry if failed`);
        }

        // Parse command
        let isVideo = false;
        let searchQuery = q;
        const lowerQ = q.toLowerCase();

        if (lowerQ.startsWith('video ') || lowerQ.startsWith('mp4 ') || lowerQ.startsWith('vid ')) {
            isVideo = true;
            searchQuery = q.substring(q.indexOf(' ') + 1).trim();
        } else if (lowerQ.startsWith('audio ') || lowerQ.startsWith('mp3 ') || lowerQ.startsWith('song ')) {
            searchQuery = q.substring(q.indexOf(' ') + 1).trim();
        }

        const startTime = Date.now();
        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        // Search
        const searchResults = await ytSearch(searchQuery);
        if (!searchResults?.videos?.length) {
            return reply("❌ No results found. Try different keywords.");
        }

        const video = searchResults.videos[0];
        const videoInfo = {
            title: video.title,
            url: video.url,
            duration: video.timestamp,
            views: formatNumber(video.views),
            author: video.author.name,
            thumbnail: video.thumbnail
        };

        // Send processing message
        const statusMsg = await reply(
            `⏳ *Initializing Download*\n\n` +
            `🎵 *${videoInfo.title}*\n` +
            `👤 ${videoInfo.author} | ⏱️ ${videoInfo.duration}\n` +
            `📦 Type: ${isVideo ? 'MP4 Video' : 'MP3 Audio'}\n\n` +
            `⬇️ Starting download...`
        );

        // Download as document
        const result = await downloadAsDocument(video.url, isVideo);
        const downloadTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const fileSizeMB = (result.fileSize / (1024 * 1024)).toFixed(2);

        // Delete status message
        await conn.sendMessage(from, { delete: statusMsg.key });

        // Prepare caption
        const caption = 
            `╭━━━〔 *📥 DOWNLOAD COMPLETE* 〕━━━╮\n` +
            `┃\n` +
            `┃ 🎵 *${videoInfo.title}*\n` +
            `┃ 👤 ${videoInfo.author}\n` +
            `┃ ⏱️ ${videoInfo.duration} | 👀 ${videoInfo.views}\n` +
            `┃ 📦 ${fileSizeMB} MB | ⏱️ ${downloadTime}s\n` +
            `┃ 🔧 ${result.method}${result.cached ? ' (📦 cached)' : ''}\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
            `📁 *File saved as:* ${result.fileName}`;

        // Send as DOCUMENT (downloadable file)
        await conn.sendMessage(from, {
            document: fs.readFileSync(result.filePath),
            mimetype: isVideo ? 'video/mp4' : 'audio/mpeg',
            fileName: result.fileName,
            caption: caption,
            contextInfo: {
                externalAdReply: {
                    title: videoInfo.title.substring(0, 50),
                    body: `👤 ${videoInfo.author} • 📦 ${fileSizeMB}MB`,
                    thumbnailUrl: videoInfo.thumbnail,
                    sourceUrl: videoInfo.url,
                    mediaType: 1
                }
            }
        }, { quoted: mek });

        // Send thumbnail separately
        await conn.sendMessage(from, {
            image: { url: videoInfo.thumbnail },
            caption: `✅ *Download Ready!*\n📁 ${result.fileName}\n💾 ${fileSizeMB} MB`,
            viewOnce: false
        });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("Download error:", error);
        
        let errorMsg = "❌ *Download Failed*\n\n";
        if (error.message.includes('timeout')) {
            errorMsg += "⏱️ Download timed out. File may be too large.\nTry shorter videos.";
        } else if (error.message.includes('size')) {
            errorMsg += "📦 File exceeds 100MB limit.\nTry shorter/lower quality content.";
        } else {
            errorMsg += `💥 ${error.message.substring(0, 200)}`;
        }
        
        await reply(errorMsg);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// Quick Audio Download
cmd({
    pattern: "mp3",
    alias: ["audio", "ytaudio", "ytmp3", "music"],
    desc: "Download YouTube audio as MP3 file",
    category: "download",
    use: ".mp3 <query>",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Provide a song name!\nExample: .mp3 Alan Walker Faded");
    
    // Redirect to dl command
    m.text = `.dl ${q}`;
    // Re-process the message
    return require('./your-file-name')(conn, mek, m); // Adjust path
});

// Quick Video Download
cmd({
    pattern: "mp4",
    alias: ["video", "ytvideo", "ytmp4", "vid"],
    desc: "Download YouTube video as MP4 file",
    category: "download",
    use: ".mp4 <query>",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Provide a video name!\nExample: .mp4 Alan Walker Faded");
    
    m.text = `.dl video ${q}`;
    return require('./your-file-name')(conn, mek, m); // Adjust path
});

// Batch Download
cmd({
    pattern: "batch",
    alias: ["bulk", "multiple"],
    desc: "Download multiple songs (up to 3)",
    category: "download",
    use: ".batch <query 1> | <query 2> | <query 3>",
    react: "📦",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ Provide songs separated by |\nExample: .batch song1 | song2 | song3");
        
        const songs = q.split('|').map(s => s.trim()).filter(s => s);
        if (songs.length > 3) return reply("❌ Maximum 3 songs at a time!");
        
        await reply(`📦 *Batch Download Started*\n⏳ ${songs.length} songs queued...`);
        
        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];
            await reply(`🎵 [${i+1}/${songs.length}] Searching: ${song}...`);
            
            try {
                const search = await ytSearch(song);
                if (search.videos.length) {
                    const video = search.videos[0];
                    await reply(`⬇️ [${i+1}/${songs.length}] Downloading: ${video.title}...`);
                    
                    const result = await downloadAsDocument(video.url, false);
                    const fileSizeMB = (result.fileSize / (1024 * 1024)).toFixed(2);
                    
                    await conn.sendMessage(from, {
                        document: fs.readFileSync(result.filePath),
                        mimetype: 'audio/mpeg',
                        fileName: result.fileName,
                        caption: `🎵 [${i+1}/${songs.length}] ${video.title}\n📦 ${fileSizeMB} MB`
                    }, { quoted: mek });
                }
            } catch (err) {
                await reply(`❌ Failed [${i+1}]: ${song}\nReason: ${err.message}`);
            }
            
            if (i < songs.length - 1) await new Promise(r => setTimeout(r, 5000));
        }
        
        await reply(`✅ *Batch Complete!* Downloaded ${songs.length} songs`);
        
    } catch (error) {
        reply("❌ Error: " + error.message);
    }
});

// Export
module.exports = {
    downloadAsDocument,
    apiManager,
    CONFIG
};

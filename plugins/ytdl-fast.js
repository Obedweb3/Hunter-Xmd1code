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
    maxFileSize: 50 * 1024 * 1024, // 50MB limit
    cacheDir: path.join(__dirname, '..', 'cache', 'downloads'),
    tempDir: path.join(__dirname, '..', 'temp'),
    maxRetries: 3,
    timeout: 30000,
    audioBitrate: '128k',
    videoQuality: '360p'
};

// Ensure directories exist
[CONFIG.cacheDir, CONFIG.tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// API Health Status Cache
const apiHealthCache = new Map();
const API_HEALTH_TTL = 5 * 60 * 1000; // 5 minutes

// Smart API Manager with health checking
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
            },
            {
                name: 'Y2Mate CH',
                type: 'y2mate_alt',
                endpoint: 'https://y2mate.ch/api/v1/convert',
                priority: 6,
                supportsAudio: true,
                supportsVideo: true
            }
        ];
    }

    async checkHealth(api) {
        const now = Date.now();
        const cached = apiHealthCache.get(api.name);
        if (cached && (now - cached.timestamp) < API_HEALTH_TTL) {
            return cached.status;
        }

        try {
            let testUrl;
            if (api.type === 'direct') {
                testUrl = api.audioEndpoint || api.videoEndpoint;
            } else {
                testUrl = api.endpoint;
            }
            
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

// Utility: Format numbers
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Utility: Generate file hash for caching
function generateHash(url) {
    return crypto.createHash('md5').update(url).digest('hex');
}

// Utility: Clean filename
function cleanFilename(title) {
    return title.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_').substring(0, 50);
}

// Smart Download with retry logic and caching
async function smartDownload(url, isVideo = false, retryCount = 0) {
    const cacheKey = generateHash(url + (isVideo ? '_video' : '_audio'));
    const cachePath = path.join(CONFIG.cacheDir, cacheKey + (isVideo ? '.mp4' : '.opus'));
    
    // Check cache first
    if (fs.existsSync(cachePath)) {
        const stats = fs.statSync(cachePath);
        if (stats.size > 0 && (Date.now() - stats.mtimeMs) < 24 * 60 * 60 * 1000) {
            console.log(`📦 Cache hit: ${cacheKey}`);
            return { buffer: fs.readFileSync(cachePath), method: 'cache', cached: true };
        }
    }

    const workingApis = await apiManager.getWorkingApis(isVideo ? 'video' : 'audio');
    const errors = [];

    // Try APIs first
    for (const api of workingApis) {
        try {
            console.log(`🔄 Trying ${api.name}...`);
            let downloadUrl = null;
            
            if (api.type === 'direct') {
                const endpoint = isVideo ? api.videoEndpoint : api.audioEndpoint;
                const response = await axios.get(endpoint, {
                    params: { url },
                    timeout: CONFIG.timeout,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
                
                downloadUrl = response.data?.downloadUrl || response.data?.url || response.data?.data?.download;
            } 
            else if (api.type === 'y2mate' || api.type === 'y2mate_alt') {
                const response = await axios.get(api.endpoint, {
                    params: { 
                        url: url,
                        format: isVideo ? 'mp4' : 'mp3'
                    },
                    timeout: CONFIG.timeout
                });
                downloadUrl = response.data?.download_url;
            }
            else if (api.type === 'agatz') {
                const response = await axios.get(api.endpoint, {
                    params: { url },
                    timeout: CONFIG.timeout
                });
                downloadUrl = isVideo ? response.data?.video : response.data?.audio;
            }

            if (downloadUrl) {
                const mediaResponse = await axios.get(downloadUrl, {
                    responseType: 'arraybuffer',
                    timeout: 120000,
                    maxContentLength: CONFIG.maxFileSize,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    onDownloadProgress: (progressEvent) => {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        process.stdout.write(`\r⬇️  Downloading: ${percent}%`);
                    }
                });
                console.log(''); // New line after progress
                
                const buffer = Buffer.from(mediaResponse.data);
                
                // Save to cache
                fs.writeFileSync(cachePath, buffer);
                
                return { buffer, method: api.name, cached: false };
            }
        } catch (err) {
            errors.push(`${api.name}: ${err.message}`);
            continue;
        }
    }

    // Fallback to ytdl-core with conversion
    if (!isVideo) {
        try {
            console.log('🔄 Falling back to ytdl-core with OPUS conversion...');
            const tempFile = path.join(CONFIG.tempDir, `temp_${Date.now()}.mp4`);
            const outputFile = path.join(CONFIG.tempDir, `output_${Date.now()}.opus`);
            
            // Download audio using ytdl-core
            await new Promise((resolve, reject) => {
                ytdl(url, {
                    quality: 'highestaudio',
                    filter: 'audioonly'
                })
                .pipe(fs.createWriteStream(tempFile))
                .on('finish', resolve)
                .on('error', reject);
            });

            // Convert to OPUS using ffmpeg
            await new Promise((resolve, reject) => {
                ffmpeg(tempFile)
                    .audioCodec('libopus')
                    .audioBitrate(CONFIG.audioBitrate)
                    .format('opus')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(outputFile);
            });

            const buffer = fs.readFileSync(outputFile);
            
            // Cleanup temp files
            fs.unlinkSync(tempFile);
            fs.unlinkSync(outputFile);
            
            // Save to cache
            fs.writeFileSync(cachePath, buffer);
            
            return { buffer, method: 'ytdl-core+ffmpeg', cached: false };
        } catch (err) {
            errors.push(`ytdl-core+ffmpeg: ${err.message}`);
        }
    } else {
        // Video fallback
        try {
            console.log('🔄 Falling back to ytdl-core video...');
            const info = await ytdl.getInfo(url);
            const format = ytdl.chooseFormat(info.formats, { 
                quality: '18',
                filter: 'videoandaudio'
            });
            
            const response = await axios.get(format.url, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: CONFIG.maxFileSize
            });
            
            const buffer = Buffer.from(response.data);
            fs.writeFileSync(cachePath, buffer);
            
            return { buffer, method: 'ytdl-core', cached: false };
        } catch (err) {
            errors.push(`ytdl-core: ${err.message}`);
        }
    }

    // Retry logic
    if (retryCount < CONFIG.maxRetries) {
        console.log(`⚠️ Retrying... (${retryCount + 1}/${CONFIG.maxRetries})`);
        await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
        return smartDownload(url, isVideo, retryCount + 1);
    }

    throw new Error(`All methods failed:\n${errors.join('\n')}`);
}

// Main Play Command
cmd({
    pattern: "play",
    alias: ["song", "ytplay", "music", "yt", "audio"],
    desc: "Download and play YouTube audio/video with smart features",
    category: "download",
    use: ".play <query> | .play video <query> | .play voice <query>",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        if (!q) {
            return reply(`❌ *Usage Examples:*

🎵 *Audio:* .play Alan Walker Faded
🎬 *Video:* .play video Alan Walker Faded  
🎙️ *Voice Note:* .play voice Alan Walker Faded
📋 *Search Only:* .play search Alan Walker Faded

*Tips:*
• Use "voice" for PTT (push-to-talk) mode
• Use "video" for video download
• Bot auto-converts to WhatsApp-compatible format`);
        }

        // Parse command modifiers
        let isVideo = false;
        let isVoice = false;
        let isSearch = false;
        let searchQuery = q;

        const lowerQ = q.toLowerCase();
        if (lowerQ.startsWith('video ')) {
            isVideo = true;
            searchQuery = q.substring(6).trim();
        } else if (lowerQ.startsWith('voice ')) {
            isVoice = true;
            searchQuery = q.substring(6).trim();
        } else if (lowerQ.startsWith('audio ')) {
            searchQuery = q.substring(6).trim();
        } else if (lowerQ.startsWith('search ')) {
            isSearch = true;
            searchQuery = q.substring(7).trim();
        }

        const startTime = Date.now();
        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        // Search with multiple results option
        const searchResults = await ytSearch(searchQuery);
        if (!searchResults?.videos?.length) {
            return reply("❌ No results found. Try different keywords.");
        }

        // If search mode, show top 5 results
        if (isSearch) {
            let searchMsg = `🔍 *Search Results for:* "${searchQuery}"\n\n`;
            searchResults.videos.slice(0, 5).forEach((video, i) => {
                searchMsg += `${i + 1}. *${video.title}*\n`;
                searchMsg += `   👤 ${video.author.name} | ⏱️ ${video.timestamp} | 👀 ${formatNumber(video.views)}\n`;
                searchMsg += `   🔗 ${video.url}\n\n`;
            });
            searchMsg += `*Reply with number (1-5) to download*`;
            
            // Store search context for reply handling
            global.searchContext = global.searchContext || {};
            global.searchContext[from] = {
                results: searchResults.videos.slice(0, 5),
                timestamp: Date.now(),
                isVideo: false
            };
            
            return reply(searchMsg);
        }

        const video = searchResults.videos[0];
        const videoInfo = {
            title: video.title,
            url: video.url,
            duration: video.timestamp,
            views: formatNumber(video.views),
            thumbnail: video.thumbnail,
            author: video.author.name,
            uploaded: video.ago,
            videoId: video.videoId
        };

        // Send processing message
        const statusMsg = await reply(
            `⏳ *Processing ${isVideo ? '🎬 VIDEO' : isVoice ? '🎙️ VOICE NOTE' : '🎵 AUDIO'}*\n\n` +
            `🎵 *${videoInfo.title}*\n` +
            `👤 ${videoInfo.author}\n` +
            `⏱️ ${videoInfo.duration} | 👀 ${videoInfo.views}\n\n` +
            `⚡ Getting stream...`
        );

        // Download with smart system
        const { buffer, method, cached } = await smartDownload(video.url, isVideo);
        const downloadTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const fileSize = (buffer.length / (1024 * 1024)).toFixed(2);

        // Delete status message
        await conn.sendMessage(from, { delete: statusMsg.key });

        // Prepare caption
        const caption = 
            `╭━━━〔 *🎵 GURU-MD PLAYER* 〕━━━╮\n` +
            `┃\n` +
            `┃ 🎵 *${videoInfo.title}*\n` +
            `┃ 👤 ${videoInfo.author}\n` +
            `┃ ⏱️ ${videoInfo.duration} | 👀 ${videoInfo.views}\n` +
            `┃ 📅 ${videoInfo.uploaded}\n` +
            `┃ 📦 ${fileSize} MB | ⚡ ${downloadTime}s\n` +
            `┃ 🔧 ${method}${cached ? ' (📦 cached)' : ''}\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━━━━━━━╯`;

        // Send based on type
        if (isVideo) {
            await conn.sendMessage(from, {
                video: buffer,
                mimetype: 'video/mp4',
                fileName: `${cleanFilename(videoInfo.title)}.mp4`,
                caption: caption,
                contextInfo: {
                    externalAdReply: {
                        title: videoInfo.title.substring(0, 50),
                        body: `👤 ${videoInfo.author} • ⏱️ ${videoInfo.duration}`,
                        thumbnailUrl: videoInfo.thumbnail,
                        sourceUrl: videoInfo.url,
                        mediaType: 1
                    }
                }
            }, { quoted: mek });
        } else if (isVoice) {
            // Send as voice note (PTT)
            await conn.sendMessage(from, {
                audio: buffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true, // Push-to-talk mode
                fileName: `${cleanFilename(videoInfo.title)}.opus`,
                caption: caption
            }, { quoted: mek });
        } else {
            // Send as regular audio (OPUS format - plays inline)
            await conn.sendMessage(from, {
                audio: buffer,
                mimetype: 'audio/ogg; codecs=opus', // Fixed: OPUS codec for reliable playback
                fileName: `${cleanFilename(videoInfo.title)}.opus`,
                caption: caption,
                contextInfo: {
                    externalAdReply: {
                        title: videoInfo.title.substring(0, 50),
                        body: `👤 ${videoInfo.author} • ⏱️ ${videoInfo.duration}`,
                        thumbnailUrl: videoInfo.thumbnail,
                        sourceUrl: videoInfo.url,
                        mediaType: 2
                    }
                }
            }, { quoted: mek });
        }

        // Success reactions
        await conn.sendMessage(from, { react: { text: isVideo ? "🎬" : "🎵", key: mek.key } });
        
        // Send thumbnail as view-once
        setTimeout(async () => {
            await conn.sendMessage(from, {
                image: { url: videoInfo.thumbnail },
                caption: `✅ *${isVideo ? 'Video' : 'Audio'} Ready*\n> ${videoInfo.title}\n> _Powered by Guru-MD_`,
                viewOnce: true
            });
        }, 1000);

    } catch (error) {
        console.error("Play command error:", error);
        
        let errorMsg = "❌ *Download Failed*\n\n";
        if (error.message.includes('timeout')) {
            errorMsg += "⏱️ Request timed out. The file might be too large or the service is slow.\n\nTry:\n• Use shorter videos\n• Try again in a moment";
        } else if (error.message.includes('size')) {
            errorMsg += "📦 File too large. Maximum size is 50MB.\n\nTry:\n• Shorter videos\n• Lower quality";
        } else {
            errorMsg += `💥 ${error.message.substring(0, 200)}`;
        }
        
        errorMsg += `\n\n🔗 *Watch on YouTube:*\n${error.videoUrl || 'Search manually'}`;
        
        await reply(errorMsg);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// Quick Video Command
cmd({
    pattern: "video",
    alias: ["ytvideo", "ytmp4", "vid"],
    desc: "Quick YouTube video download",
    category: "download",
    use: ".video <query>",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Provide a video name!\nExample: .video Alan Walker Faded");
    
    // Redirect to play with video flag
    m.text = `.play video ${q}`;
    return; // The play handler will catch this if you have message handler, or call play directly
});

// Quick Audio Command  
cmd({
    pattern: "yta",
    alias: ["ytaudio", "ytmp3", "song"],
    desc: "Quick YouTube audio download",
    category: "download",
    use: ".yta <query>",
    react: "🎧",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Provide a song name!\nExample: .yta Alan Walker Faded");
    
    m.text = `.play ${q}`;
});

// Voice Note Command
cmd({
    pattern: "voice",
    alias: ["vn", "ptt", "voicenote"],
    desc: "Download and send as voice note",
    category: "download",
    use: ".voice <query>",
    react: "🎙️",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Provide a song name!\nExample: .voice Alan Walker Faded");
    
    m.text = `.play voice ${q}`;
});

// Playlist Download
cmd({
    pattern: "playlist",
    alias: ["pl", "album"],
    desc: "Download multiple songs (up to 5)",
    category: "download",
    use: ".playlist <query 1> | <query 2> | ...",
    react: "📀",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ Provide songs separated by |\nExample: .playlist song1 | song2 | song3");
        
        const songs = q.split('|').map(s => s.trim()).filter(s => s);
        if (songs.length > 5) return reply("❌ Maximum 5 songs at a time!");
        
        await reply(`📀 *Downloading ${songs.length} songs...*\n⏳ This may take a while`);
        
        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];
            await reply(`🎵 [${i+1}/${songs.length}] Downloading: ${song}...`);
            
            // Simulate play command for each
            try {
                const search = await ytSearch(song);
                if (search.videos.length) {
                    const video = search.videos[0];
                    const { buffer } = await smartDownload(video.url, false);
                    
                    await conn.sendMessage(from, {
                        audio: buffer,
                        mimetype: 'audio/ogg; codecs=opus',
                        fileName: `${cleanFilename(video.title)}.opus`,
                        caption: `🎵 *${i+1}/${songs.length}* ${video.title}`
                    }, { quoted: mek });
                }
            } catch (err) {
                await reply(`❌ Failed: ${song}`);
            }
            
            // Delay between downloads
            if (i < songs.length - 1) await new Promise(r => setTimeout(r, 3000));
        }
        
        await reply(`✅ *Playlist Complete!* Downloaded ${songs.length} songs`);
        
    } catch (error) {
        reply("❌ Error: " + error.message);
    }
});

// System Status Command
cmd({
    pattern: "mediastatus",
    alias: ["mstatus", "dlstatus"],
    desc: "Check media download system status",
    category: "tools",
    react: "📊",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const apis = await apiManager.getWorkingApis('audio');
    const videoApis = await apiManager.getWorkingApis('video');
    
    // Get cache stats
    const cacheFiles = fs.existsSync(CONFIG.cacheDir) ? fs.readdirSync(CONFIG.cacheDir) : [];
    const cacheSize = cacheFiles.reduce((acc, file) => {
        try {
            return acc + fs.statSync(path.join(CONFIG.cacheDir, file)).size;
        } catch { return acc; }
    }, 0);
    
    let status = `📊 *GURU-MD Media System Status*\n\n`;
    status += `🔌 *APIs Available:*\n`;
    status += `   🎵 Audio: ${apis.length} working\n`;
    status += `   🎬 Video: ${videoApis.length} working\n\n`;
    
    status += `💾 *Cache Status:*\n`;
    status += `   📁 Files: ${cacheFiles.length}\n`;
    status += `   📦 Size: ${(cacheSize / (1024 * 1024)).toFixed(2)} MB\n\n`;
    
    status += `⚙️ *Configuration:*\n`;
    status += `   🔊 Audio Bitrate: ${CONFIG.audioBitrate}\n`;
    status += `   📹 Video Quality: ${CONFIG.videoQuality}\n`;
    status += `   📦 Max File Size: ${(CONFIG.maxFileSize / (1024 * 1024))} MB\n`;
    status += `   🔄 Max Retries: ${CONFIG.maxRetries}\n\n`;
    
    status += `✅ *System Ready*`;
    
    await reply(status);
});

// Clear Cache Command
cmd({
    pattern: "clearcache",
    alias: ["clrcache", "cleanmedia"],
    desc: "Clear media download cache",
    category: "owner",
    react: "🧹",
    filename: __filename
}, async (conn, mek, m, { from, reply, isOwner }) => {
    if (!isOwner) return reply("❌ Owner only command!");
    
    try {
        const files = fs.readdirSync(CONFIG.cacheDir);
        let deleted = 0;
        let saved = 0;
        
        for (const file of files) {
            const filePath = path.join(CONFIG.cacheDir, file);
            const stats = fs.statSync(filePath);
            
            // Delete files older than 24 hours
            if (Date.now() - stats.mtimeMs > 24 * 60 * 60 * 1000) {
                fs.unlinkSync(filePath);
                deleted++;
            } else {
                saved++;
            }
        }
        
        await reply(`🧹 *Cache Cleaned*\n\n🗑️ Deleted: ${deleted} files\n💾 Kept: ${saved} files (recent)`);
    } catch (error) {
        reply("❌ Error: " + error.message);
    }
});

// API Status Command (Enhanced)
cmd({
    pattern: "apistatus",
    alias: ["checkapi", "apihealth"],
    desc: "Check YouTube download APIs health",
    category: "tools",
    react: "🔌",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    await reply("🔍 *Checking API Health...*");
    
    const allApis = apiManager.apis;
    let statusMsg = `🔌 *API Health Status*\n\n`;
    
    for (const api of allApis) {
        const isHealthy = await apiManager.checkHealth(api);
        statusMsg += `${isHealthy ? '🟢' : '🔴'} *${api.name}*\n`;
        statusMsg += `   Type: ${api.type} | Priority: ${api.priority}\n`;
        statusMsg += `   Audio: ${api.supportsAudio ? '✅' : '❌'} | Video: ${api.supportsVideo ? '✅' : '❌'}\n\n`;
    }
    
    statusMsg += `📝 *Note:* Red APIs will be skipped automatically`;
    
    await reply(statusMsg);
});

// Export for use in other modules
module.exports = {
    smartDownload,
    apiManager,
    CONFIG
};

const { cmd } = require('../command');
const axios = require('axios');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURATION ====================
const CONFIG = {
    TIMEOUTS: {
        SEARCH: 10000,
        DOWNLOAD: 60000,
        API_CHECK: 5000
    },
    LIMITS: {
        MAX_FILE_SIZE_MB: 100, // WhatsApp limit is ~100MB for media
        MAX_DURATION_MINUTES: 30 // Prevent extremely long downloads
    },
    RETRIES: 2
};

// Smart API endpoints with priority ranking
const API_ENDPOINTS = {
    AUDIO: [
        { name: 'GuruAPI', url: 'https://api.davidcyriltech.my.id/download/ytmp3', priority: 1, stable: true },
        { name: 'Siputzx', url: 'https://api.siputzx.my.id/api/d/ytmp3', priority: 2, stable: true },
        { name: 'Ryzendesu', url: 'https://api.ryzendesu.vip/api/downloader/yt', priority: 3, stable: false },
        { name: 'Agatz', url: 'https://api.agatz.xyz/api/yt', priority: 4, stable: false }
    ],
    VIDEO: [
        { name: 'GuruAPI', url: 'https://api.davidcyriltech.my.id/download/ytvideo', priority: 1, stable: true },
        { name: 'Siputzx', url: 'https://api.siputzx.my.id/api/d/ytmp4', priority: 2, stable: true },
        { name: 'Ryzendesu', url: 'https://api.ryzendesu.vip/api/downloader/yt', priority: 3, stable: false },
        { name: 'Y2Mate', url: 'https://y2mate.guru/api/convert', priority: 4, stable: false }
    ]
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format numbers with K/M suffix
 */
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

/**
 * Format duration from seconds or timestamp
 */
function formatDuration(timestamp) {
    if (!timestamp) return '0:00';
    if (typeof timestamp === 'number') {
        const mins = Math.floor(timestamp / 60);
        const secs = timestamp % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return timestamp;
}

/**
 * Create progress bar visualization
 */
function createProgressBar(current, total, size = 10) {
    const filled = Math.round((current / total) * size);
    const empty = size - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Extract video ID from various YouTube URL formats
 */
function extractVideoID(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
        /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Smart API selector with health checking
 */
async function selectBestAPI(type) {
    const endpoints = type === 'video' ? API_ENDPOINTS.VIDEO : API_ENDPOINTS.AUDIO;
    
    // Try stable APIs first
    for (const api of endpoints.filter(a => a.stable)) {
        try {
            await axios.head(api.url, { timeout: CONFIG.TIMEOUTS.API_CHECK });
            return api;
        } catch (e) {
            continue;
        }
    }
    
    // Return first available if none respond to health check
    return endpoints[0];
}

// ==================== MAIN PLAY COMMAND ====================

cmd({
    pattern: "play",
    alias: ["song", "ytplay", "music", "ytvideo"],
    desc: "Download YouTube videos or audio with smart API selection",
    category: "download",
    use: ".play <song name> | .play video <song name> | .play <url>",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, sender }) => {
    
    // Validate input
    if (!q) {
        return reply(`╭══━ ★ *GURU-MD PLAYER* ★ ━══╮

🎵 *Usage Guide:*

├─ *.play <song name>* - Audio
├─ *.play video <song name>* - Video
├─ *.play <YouTube URL>* - Direct download
├─ *.yt <song>* - Quick audio
└─ *.video <song>* - Quick video

📌 *Examples:*
• .play Alan Walker Faded
• .play video Despacito
• .yt https://youtube.com/watch?v=...

╰══━ ★ *Powered By GuruTech* ★ ━══╯`);
    }

    const startTime = Date.now();
    let statusMsg;
    
    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // Parse command arguments
        let isVideo = false;
        let searchQuery = q.trim();
        let isDirectURL = false;
        let videoId = null;

        // Check if it's a direct URL
        videoId = extractVideoID(q);
        if (videoId) {
            isDirectURL = true;
            searchQuery = `https://youtube.com/watch?v=${videoId}`;
        } else {
            // Parse video/audio prefix
            const lowerQ = q.toLowerCase();
            if (lowerQ.startsWith('video ')) {
                isVideo = true;
                searchQuery = q.substring(6).trim();
            } else if (lowerQ.startsWith('audio ')) {
                searchQuery = q.substring(6).trim();
            }
        }

        // Initial status
        statusMsg = await reply(`🔍 ${isDirectURL ? 'Resolving URL...' : `Searching: "${searchQuery}"`}`);

        // Search or validate
        let videoInfo;
        
        if (isDirectURL) {
            try {
                const info = await ytdl.getInfo(searchQuery);
                videoInfo = {
                    title: info.videoDetails.title,
                    url: searchQuery,
                    duration: formatDuration(parseInt(info.videoDetails.lengthSeconds)),
                    views: formatNumber(info.videoDetails.viewCount),
                    thumbnail: info.videoDetails.thumbnails.pop().url,
                    author: info.videoDetails.author.name,
                    uploaded: info.videoDetails.publishDate,
                    videoId: videoId,
                    lengthSeconds: parseInt(info.videoDetails.lengthSeconds)
                };
            } catch (err) {
                return reply("❌ Invalid YouTube URL or video unavailable.");
            }
        } else {
            const searchResults = await ytSearch(searchQuery);
            
            if (!searchResults?.videos?.length) {
                return reply("❌ No results found. Try different keywords or check spelling.");
            }

            const video = searchResults.videos[0];
            
            // Check duration limit
            const durationParts = video.timestamp.split(':').map(Number);
            const durationMinutes = durationParts.length === 2 
                ? durationParts[0] + durationParts[1]/60 
                : durationParts[0] * 60 + durationParts[1] + durationParts[2]/60;

            if (durationMinutes > CONFIG.LIMITS.MAX_DURATION_MINUTES) {
                return reply(`⚠️ Video too long (${video.timestamp}). Maximum allowed: ${CONFIG.LIMITS.MAX_DURATION_MINUTES} minutes.`);
            }

            videoInfo = {
                title: video.title,
                url: video.url,
                duration: video.timestamp,
                views: formatNumber(video.views),
                thumbnail: video.thumbnail,
                author: video.author.name,
                uploaded: video.ago,
                videoId: video.videoId,
                lengthSeconds: video.seconds
            };
        }

        // Update status with video info
        await conn.sendMessage(from, {
            text: `📥 *Processing ${isVideo ? 'VIDEO' : 'AUDIO'}*

🎵 ${videoInfo.title}
👤 ${videoInfo.author}
⏱️ ${videoInfo.duration} | 👀 ${videoInfo.views}

⏳ Initializing download...`,
            edit: statusMsg.key
        });

        // ==================== DOWNLOAD LOGIC ====================
        
        let mediaBuffer = null;
        let downloadMethod = '';
        let finalSize = 0;
        const errors = [];

        // Strategy 1: Smart API Selection
        const selectedAPI = await selectBestAPI(isVideo ? 'video' : 'audio');
        
        try {
            await conn.sendMessage(from, {
                text: `📥 *Processing ${isVideo ? 'VIDEO' : 'AUDIO'}*

🎵 ${videoInfo.title}
👤 ${videoInfo.author}
⏱️ ${videoInfo.duration} | 👀 ${videoInfo.views}

⏳ Using ${selectedAPI.name}...`,
                edit: statusMsg.key
            });

            const apiUrl = selectedAPI.url.includes('?') 
                ? `${selectedAPI.url}&url=${encodeURIComponent(videoInfo.url)}${isVideo ? '' : ''}`
                : `${selectedAPI.url}?url=${encodeURIComponent(videoInfo.url)}`;

            const response = await axios.get(apiUrl, { 
                timeout: CONFIG.TIMEOUTS.DOWNLOAD,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            let downloadUrl = null;
            
            // Parse different API response formats
            if (response.data) {
                if (response.data.downloadUrl) downloadUrl = response.data.downloadUrl;
                else if (response.data.url) downloadUrl = response.data.url;
                else if (response.data.data?.download) downloadUrl = response.data.data.download;
                else if (response.data.result?.download) downloadUrl = response.data.result.download;
                else if (isVideo && response.data.video) downloadUrl = response.data.video;
                else if (!isVideo && response.data.audio) downloadUrl = response.data.audio;
            }

            if (downloadUrl) {
                const mediaResponse = await axios.get(downloadUrl, {
                    responseType: 'arraybuffer',
                    timeout: CONFIG.TIMEOUTS.DOWNLOAD,
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    onDownloadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            const bar = createProgressBar(percent, 100, 8);
                            // Update progress every 20%
                            if (percent % 20 === 0) {
                                conn.sendMessage(from, {
                                    text: `📥 *Downloading ${isVideo ? 'VIDEO' : 'AUDIO'}*

🎵 ${videoInfo.title}
${bar} ${percent}%`,
                                    edit: statusMsg.key
                                }).catch(() => {});
                            }
                        }
                    }
                });
                
                mediaBuffer = Buffer.from(mediaResponse.data);
                downloadMethod = selectedAPI.name;
                finalSize = (mediaBuffer.length / (1024 * 1024)).toFixed(2);
            }
        } catch (err) {
            errors.push(`${selectedAPI.name}: ${err.message}`);
        }

        // Strategy 2: Fallback APIs
        if (!mediaBuffer) {
            const fallbackAPIs = (isVideo ? API_ENDPOINTS.VIDEO : API_ENDPOINTS.AUDIO)
                .filter(api => api.name !== selectedAPI.name);

            for (const api of fallbackAPIs) {
                if (mediaBuffer) break;
                
                try {
                    await conn.sendMessage(from, {
                        text: `📥 *Processing ${isVideo ? 'VIDEO' : 'AUDIO'}*

🎵 ${videoInfo.title}
👤 ${videoInfo.author}

⏳ Trying ${api.name}...`,
                        edit: statusMsg.key
                    });

                    const apiUrl = `${api.url}?url=${encodeURIComponent(videoInfo.url)}${api.url.includes('ryzendesu') ? `&type=${isVideo ? 'mp4' : 'mp3'}` : ''}`;
                    
                    const response = await axios.get(apiUrl, { 
                        timeout: CONFIG.TIMEOUTS.DOWNLOAD,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });

                    let downloadUrl = response.data?.downloadUrl || 
                                     response.data?.url || 
                                     response.data?.data?.download ||
                                     (isVideo ? response.data?.video : response.data?.audio);

                    if (downloadUrl) {
                        const mediaResponse = await axios.get(downloadUrl, {
                            responseType: 'arraybuffer',
                            timeout: CONFIG.TIMEOUTS.DOWNLOAD
                        });
                        mediaBuffer = Buffer.from(mediaResponse.data);
                        downloadMethod = api.name;
                        finalSize = (mediaBuffer.length / (1024 * 1024)).toFixed(2);
                    }
                } catch (err) {
                    errors.push(`${api.name}: ${err.message}`);
                }
            }
        }

        // Strategy 3: ytdl-core fallback (most reliable but slower)
        if (!mediaBuffer) {
            try {
                await conn.sendMessage(from, {
                    text: `📥 *Processing ${isVideo ? 'VIDEO' : 'AUDIO'}*

🎵 ${videoInfo.title}
👤 ${videoInfo.author}

⏳ Using direct extraction...`,
                    edit: statusMsg.key
                });

                const info = await ytdl.getInfo(videoInfo.url);
                
                if (isVideo) {
                    // Get best quality under 720p to balance size/quality
                    const format = ytdl.chooseFormat(info.formats, { 
                        quality: 'highest',
                        filter: format => format.container === 'mp4' && format.hasAudio && format.qualityLabel <= '720p'
                    }) || ytdl.chooseFormat(info.formats, { quality: 'lowest', filter: 'videoandaudio' });
                    
                    if (format?.url) {
                        const response = await axios.get(format.url, {
                            responseType: 'arraybuffer',
                            timeout: CONFIG.TIMEOUTS.DOWNLOAD,
                            headers: { 
                                'User-Agent': 'Mozilla/5.0',
                                'Range': 'bytes=0-'
                            }
                        });
                        mediaBuffer = Buffer.from(response.data);
                        downloadMethod = `ytdl-core (${format.qualityLabel || '360p'})`;
                        finalSize = (mediaBuffer.length / (1024 * 1024)).toFixed(2);
                    }
                } else {
                    const format = ytdl.chooseFormat(info.formats, { 
                        filter: 'audioonly',
                        quality: 'highestaudio'
                    });
                    
                    if (format?.url) {
                        const response = await axios.get(format.url, {
                            responseType: 'arraybuffer',
                            timeout: CONFIG.TIMEOUTS.DOWNLOAD
                        });
                        mediaBuffer = Buffer.from(response.data);
                        downloadMethod = 'ytdl-core (Audio)';
                        finalSize = (mediaBuffer.length / (1024 * 1024)).toFixed(2);
                    }
                }
            } catch (err) {
                errors.push(`ytdl-core: ${err.message}`);
            }
        }

        // ==================== SEND MEDIA ====================

        if (!mediaBuffer) {
            throw new Error('All download methods failed');
        }

        // Check file size
        if (finalSize > CONFIG.LIMITS.MAX_FILE_SIZE_MB) {
            return reply(`⚠️ File too large (${finalSize}MB). Maximum: ${CONFIG.LIMITS.MAX_FILE_SIZE_MB}MB.\n\n🔗 Watch: ${videoInfo.url}`);
        }

        const downloadTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const safeTitle = videoInfo.title.replace(/[^\w\s-]/gi, '').substring(0, 50);

        // Final status update
        await conn.sendMessage(from, {
            text: `📤 *Uploading ${isVideo ? 'VIDEO' : 'AUDIO'}...*

🎵 ${videoInfo.title}
📦 ${finalSize}MB | ⚡ ${downloadTime}s`,
            edit: statusMsg.key
        });

        // Send media with rich context
        if (isVideo) {
            await conn.sendMessage(from, {
                video: mediaBuffer,
                mimetype: 'video/mp4',
                fileName: `${safeTitle}.mp4`,
                caption: `╭══━ ★ *GURU-MD VIDEO* ★ ━══╮

🎵 *${videoInfo.title}*
👤 ${videoInfo.author}
⏱️ ${videoInfo.duration} | 👀 ${videoInfo.views}
📦 ${finalSize}MB | ⚡ ${downloadTime}s
🔧 ${downloadMethod}

╰══━ ★ *Powered By GuruTech* ★ ━══╯`,
                contextInfo: {
                    externalAdReply: {
                        title: videoInfo.title.substring(0, 30),
                        body: `👤 ${videoInfo.author} • ⏱️ ${videoInfo.duration}`,
                        thumbnailUrl: videoInfo.thumbnail,
                        sourceUrl: videoInfo.url,
                        mediaType: 2,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                audio: mediaBuffer,
                mimetype: 'audio/mpeg',
                fileName: `${safeTitle}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: videoInfo.title.substring(0, 30),
                        body: `👤 ${videoInfo.author} • 🎵 Audio`,
                        thumbnailUrl: videoInfo.thumbnail,
                        sourceUrl: videoInfo.url,
                        mediaType: 2,
                        renderLargerThumbnail: false
                    }
                }
            }, { quoted: mek });

            // Send thumbnail as separate image for audio
            await conn.sendMessage(from, {
                image: { url: videoInfo.thumbnail },
                caption: `🎵 *Now Playing:*
> ${videoInfo.title}
> 👤 ${videoInfo.author}
> ⏱️ ${videoInfo.duration}

> © ᴄʀᴇᴀᴛᴇᴅ ʙʏ GuruTech`,
                viewOnce: true
            }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("Play command error:", error);
        
        let errorMsg = `❌ *Download Failed*

`;
        
        if (error.message.includes('All download methods failed')) {
            errorMsg += `⚠️ All APIs are currently unavailable.

🎵 *Try these alternatives:*
1. Use a different song name
2. Try direct URL: .play <youtube-link>
3. Use .yt or .video commands
4. Try again in a few minutes

🔗 *Watch on YouTube:*
${q.includes('http') ? q : 'Search manually'}`;
        } else if (error.message.includes('timeout')) {
            errorMsg += `⏱️ Request timed out. The server is busy, please try again.`;
        } else if (error.message.includes('private') || error.message.includes('unavailable')) {
            errorMsg += `🔒 This video is private or restricted.`;
        } else {
            errorMsg += `💥 Error: ${error.message}`;
        }
        
        if (statusMsg) {
            await conn.sendMessage(from, { text: errorMsg, edit: statusMsg.key });
        } else {
            await reply(errorMsg);
        }
        
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// ==================== QUICK COMMANDS ====================

cmd({
    pattern: "yt",
    alias: ["ytaudio", "ytmp3", "audio"],
    desc: "Quick YouTube audio download",
    category: "download",
    use: ".yt <song name>",
    react: "🎧",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Provide a song name or URL!\nExample: .yt Alan Walker Faded");
    
    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        let videoUrl = q;
        let videoInfo;
        
        // Check if it's a URL
        const videoId = extractVideoID(q);
        
        if (!videoId) {
            const search = await ytSearch(q);
            if (!search.videos.length) return reply("❌ No results found!");
            videoUrl = search.videos[0].url;
            videoInfo = search.videos[0];
        } else {
            videoUrl = `https://youtube.com/watch?v=${videoId}`;
            const info = await ytdl.getInfo(videoUrl);
            videoInfo = {
                title: info.videoDetails.title,
                author: { name: info.videoDetails.author.name },
                timestamp: formatDuration(parseInt(info.videoDetails.lengthSeconds))
            };
        }

        // Fast API attempt
        try {
            const apiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            
            if (response.data?.downloadUrl) {
                await conn.sendMessage(from, {
                    audio: { url: response.data.downloadUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${videoInfo.title.replace(/[^\w\s]/gi, '')}.mp3`,
                    contextInfo: {
                        externalAdReply: {
                            title: videoInfo.title,
                            body: `👤 ${videoInfo.author.name || videoInfo.author}`,
                            thumbnailUrl: videoInfo.thumbnail || `https://i.ytimg.com/vi/${extractVideoID(videoUrl)}/hqdefault.jpg`,
                            sourceUrl: videoUrl,
                            mediaType: 2
                        }
                    }
                }, { quoted: mek });
                
                await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
                return;
            }
        } catch (err) {
            console.log("Quick API failed, using ytdl...");
        }

        // Fallback to ytdl
        const info = await ytdl.getInfo(videoUrl);
        const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });
        
        await conn.sendMessage(from, {
            audio: { url: format.url },
            mimetype: 'audio/mpeg',
            fileName: `${videoInfo.title.replace(/[^\w\s]/gi, '')}.mp3`
        }, { quoted: mek });
        
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        
    } catch (error) {
        reply("❌ Error: " + error.message);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

cmd({
    pattern: "video",
    alias: ["ytvideo", "ytmp4", "vid"],
    desc: "Quick YouTube video download",
    category: "download",
    use: ".video <song name>",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Provide a video name or URL!\nExample: .video Despacito");
    
    try {
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        
        let videoUrl = q;
        let videoInfo;
        
        const videoId = extractVideoID(q);
        
        if (!videoId) {
            const search = await ytSearch(q);
            if (!search.videos.length) return reply("❌ No results found!");
            videoUrl = search.videos[0].url;
            videoInfo = search.videos[0];
        } else {
            videoUrl = `https://youtube.com/watch?v=${videoId}`;
            const info = await ytdl.getInfo(videoUrl);
            videoInfo = {
                title: info.videoDetails.title,
                author: { name: info.videoDetails.author.name },
                timestamp: formatDuration(parseInt(info.videoDetails.lengthSeconds))
            };
        }

        // Try API first
        try {
            const apiUrl = `https://api.davidcyriltech.my.id/download/ytvideo?url=${encodeURIComponent(videoUrl)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            
            if (response.data?.downloadUrl) {
                await conn.sendMessage(from, {
                    video: { url: response.data.downloadUrl },
                    mimetype: 'video/mp4',
                    caption: `🎬 *${videoInfo.title}*\n👤 ${videoInfo.author.name || videoInfo.author}\n⏱️ ${videoInfo.timestamp || videoInfo.duration}`,
                    contextInfo: {
                        externalAdReply: {
                            title: videoInfo.title,
                            body: `👤 ${videoInfo.author.name || videoInfo.author}`,
                            sourceUrl: videoUrl,
                            mediaType: 2
                        }
                    }
                }, { quoted: mek });
                
                await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
                return;
            }
        } catch (err) {
            console.log("Video API failed, using ytdl...");
        }

        // Fallback to ytdl
        const info = await ytdl.getInfo(videoUrl);
        const format = ytdl.chooseFormat(info.formats, { quality: '18' }); // 360p
        
        await conn.sendMessage(from, {
            video: { url: format.url },
            mimetype: 'video/mp4',
            caption: `🎬 *${videoInfo.title}*\n👤 ${videoInfo.author.name}\n⏱️ ${videoInfo.timestamp}`
        }, { quoted: mek });
        
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        
    } catch (error) {
        reply("❌ Error: " + error.message);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// ==================== UTILITY COMMANDS ====================

cmd({
    pattern: "yts",
    alias: ["ytsearch", "youtube"],
    desc: "Search YouTube videos",
    category: "tools",
    use: ".yts <query>",
    react: "🔍",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Provide a search query!\nExample: .yts Alan Walker");
    
    try {
        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
        
        const search = await ytSearch(q);
        
        if (!search.videos.length) return reply("❌ No results found.");
        
        let results = `╭══━ ★ *YOUTUBE SEARCH* ★ ━══╮\n\n`;
        
        search.videos.slice(0, 5).forEach((video, index) => {
            results += `*${index + 1}.* ${video.title}\n`;
            results += `├ 👤 ${video.author.name}\n`;
            results += `├ ⏱️ ${video.timestamp} | 👀 ${formatNumber(video.views)}\n`;
            results += `├ 📅 ${video.ago}\n`;
            results += `└ 🔗 ${video.url}\n\n`;
        });
        
        results += `💡 *To download:*\n`;
        results += `• .play ${search.videos[0].title}\n`;
        results += `• .play video ${search.videos[0].title}\n`;
        results += `╰══━ ★ *GuruTech* ★ ━══╯`;
        
        await reply(results);
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        
    } catch (error) {
        reply("❌ Search error: " + error.message);
    }
});

cmd({
    pattern: "apistatus",
    alias: ["checkapi", "api"],
    desc: "Check download APIs health status",
    category: "tools",
    react: "🔌",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });
    
    const checkAPI = async (name, url) => {
        try {
            await axios.head(url, { timeout: 5000 });
            return `✅ ${name}`;
        } catch {
            return `❌ ${name}`;
        }
    };
    
    const checks = await Promise.all([
        checkAPI('GuruAPI (Audio)', 'https://api.davidcyriltech.my.id/download/ytmp3'),
        checkAPI('GuruAPI (Video)', 'https://api.davidcyriltech.my.id/download/ytvideo'),
        checkAPI('Siputzx', 'https://api.siputzx.my.id/api/d/ytmp3'),
        checkAPI('Ryzendesu', 'https://api.ryzendesu.vip/api/downloader/yt'),
        checkAPI('Agatz', 'https://api.agatz.xyz/api/yt')
    ]);
    
    const statusMsg = `🔌 *API Status Monitor*

${checks.join('\n')}

📊 *System Status:* ${checks.filter(c => c.includes('✅')).length}/${checks.length} Online

💡 *Recommendations:*
• If APIs are down, bot uses ytdl-core fallback
• Downloads may be slower during API outages
• Try .yt or .video for quick downloads

> © GURU-MD System`;
    
    await reply(statusMsg);
});

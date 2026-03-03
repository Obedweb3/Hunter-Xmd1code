const { cmd } = require('../command');
const axios = require('axios');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════
// GURU-MD INTELLIGENT MEDIA ENGINE v3.0
// Advanced YouTube Downloader with AI-Powered Fallbacks
// ═══════════════════════════════════════════════════════════════════

class MediaEngine {
    constructor() {
        this.cache = new Map();
        this.stats = { totalDownloads: 0, failedDownloads: 0 };
        
        // Smart API Pool with health tracking (0-100)
        this.apiPool = {
            audio: [
                { name: 'DavidCyril', url: 'https://api.davidcyriltech.my.id/download/ytmp3', weight: 10, health: 100 },
                { name: 'Siputzx', url: 'https://api.siputzx.my.id/api/d/ytmp3', weight: 8, health: 100 },
                { name: 'Ryzendesu', url: 'https://api.ryzendesu.vip/api/downloader/yt', weight: 7, health: 100 },
                { name: 'GuruAPI', url: 'https://ytdl.guruapi.tech/api/ytmp3', weight: 6, health: 100 },
                { name: 'Agatz', url: 'https://api.agatz.xyz/api/yt', weight: 5, health: 100 }
            ],
            video: [
                { name: 'DavidCyril', url: 'https://api.davidcyriltech.my.id/download/ytvideo', weight: 10, health: 100 },
                { name: 'Siputzx', url: 'https://api.siputzx.my.id/api/d/ytmp4', weight: 8, health: 100 },
                { name: 'Ryzendesu', url: 'https://api.ryzendesu.vip/api/downloader/yt', weight: 7, health: 100 },
                { name: 'GuruAPI', url: 'https://ytdl.guruapi.tech/api/ytmp4', weight: 6, health: 100 },
                { name: 'Agatz', url: 'https://api.agatz.xyz/api/yt', weight: 5, health: 100 }
            ]
        };
    }

    // Weighted random API selection based on health
    selectAPI(type) {
        const pool = this.apiPool[type];
        const available = pool.filter(api => api.health > 20);
        if (available.length === 0) return pool[0];
        
        const totalWeight = available.reduce((sum, api) => sum + (api.health * api.weight), 0);
        let random = Math.random() * totalWeight;
        
        for (const api of available) {
            const effectiveWeight = api.health * api.weight;
            if (random < effectiveWeight) return api;
            random -= effectiveWeight;
        }
        return available[0];
    }

    // Update API health (success = +5, fail = -15)
    reportAPIHealth(api, success) {
        if (success) {
            api.health = Math.min(100, api.health + 5);
        } else {
            api.health = Math.max(0, api.health - 15);
        }
    }

    // Generate unique session ID
    generateId() {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    // Smart cache with 5min TTL
    getCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.time) < 300000) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, { data, time: Date.now() });
        if (this.cache.size > 50) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

const engine = new MediaEngine();

// ═══════════════════════════════════════════════════════════════════
// VISUAL ENGINE - Premium UI Components
// ═════════════════════════════════════════════════════════════════==

const UI = {
    borders: {
        top: '╔══════════════════════════════════════════════════╗',
        mid: '╠══════════════════════════════════════════════════╣',
        bot: '╚══════════════════════════════════════════════════╝',
        line: '║'
    },

    progressBar(percent, length = 20) {
        const filled = Math.round((percent / 100) * length);
        const empty = length - filled;
        return '▰' + '▰'.repeat(filled) + '▱'.repeat(empty) + '▰';
    },

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    waveform() {
        const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        return Array(15).fill(0).map(() => bars[Math.floor(Math.random() * bars.length)]).join('');
    },

    statusIcon(percent) {
        if (percent < 25) return '🔍';
        if (percent < 50) return '⚙️';
        if (percent < 75) return '🚀';
        if (percent < 100) return '📦';
        return '✅';
    }
};

// ═══════════════════════════════════════════════════════════════════
// MAIN PLAY COMMAND - Intelligent Download System
// ═════════════════════════════════════════════════════════════════==

cmd({
    pattern: "play",
    alias: ["song", "music", "audio", "mp3", "ytplay"],
    desc: "Smart YouTube Audio/Video Downloader",
    category: "media",
    use: ".play <query> | .play video <query>",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) {
        return reply(
            `${UI.borders.top}\n` +
            `${UI.borders.line} 🎵 *GURU-MD MEDIA ENGINE v3.0*\n` +
            `${UI.borders.mid}\n` +
            `${UI.borders.line} 📌 *Usage:*\n` +
            `${UI.borders.line} • .play <song name> → Audio\n` +
            `${UI.borders.line} • .play video <song> → Video\n` +
            `${UI.borders.line} • .play <YouTube URL> → Direct\n` +
            `${UI.borders.line} • .yt <song> → Quick audio\n` +
            `${UI.borders.line} • .video <song> → Quick video\n` +
            `${UI.borders.bot}`
        );
    }

    const sessionId = engine.generateId();
    const startTime = Date.now();
    let isVideo = false;
    let searchQuery = q;

    // Parse modifiers
    const queryLower = q.toLowerCase();
    if (queryLower.startsWith('video ') || queryLower.startsWith('vid ') || queryLower.startsWith('mp4 ')) {
        isVideo = true;
        searchQuery = q.replace(/^\w+\s+/, '');
    } else if (queryLower.startsWith('audio ') || queryLower.startsWith('mp3 ') || queryLower.startsWith('song ')) {
        searchQuery = q.replace(/^\w+\s+/, '');
    }

    let statusMsg;
    try {
        await conn.sendMessage(from, { react: { text: "⚡", key: mek.key } });

        statusMsg = await reply(
            `${UI.borders.top}\n` +
            `${UI.borders.line} 🔍 *INITIALIZING SEARCH*\n` +
            `${UI.borders.mid}\n` +
            `${UI.borders.line} ⏳ Query: ${searchQuery.substring(0, 28)}${searchQuery.length > 28 ? '...' : ''}\n` +
            `${UI.borders.line} 🆔 Session: ${sessionId}\n` +
            `${UI.borders.line} 📦 Type: ${isVideo ? 'VIDEO' : 'AUDIO'}\n` +
            `${UI.borders.bot}`
        );

        // URL or Search detection
        let videoUrl = searchQuery;
        let videoInfo = null;
        const isUrl = searchQuery.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/);

        if (!isUrl) {
            const cacheKey = `search_${searchQuery.toLowerCase()}`;
            videoInfo = engine.getCache(cacheKey);
            
            if (!videoInfo) {
                const searchResults = await ytSearch(searchQuery);
                if (!searchResults?.videos?.length) {
                    throw new Error('No results found for your query');
                }
                videoInfo = searchResults.videos[0];
                engine.setCache(cacheKey, videoInfo);
            }
            videoUrl = videoInfo.url;
        } else {
            const info = await ytdl.getInfo(videoUrl);
            videoInfo = {
                title: info.videoDetails.title,
                url: videoUrl,
                timestamp: UI.formatDuration(parseInt(info.videoDetails.lengthSeconds)),
                views: info.videoDetails.viewCount,
                thumbnail: info.videoDetails.thumbnails.pop().url,
                author: { name: info.videoDetails.author.name },
                ago: 'Direct URL',
                videoId: info.videoDetails.videoId
            };
        }

        // Update status - Found
        await conn.sendMessage(from, {
            text: `${UI.borders.top}\n` +
                  `${UI.borders.line} ⚙️ *ANALYZING MEDIA*\n` +
                  `${UI.borders.mid}\n` +
                  `${UI.borders.line} 🎵 ${videoInfo.title.substring(0, 32)}${videoInfo.title.length > 32 ? '...' : ''}\n` +
                  `${UI.borders.line} 👤 ${videoInfo.author.name.substring(0, 30)}\n` +
                  `${UI.borders.line} ⏱️ ${videoInfo.timestamp} | 👀 ${formatNumber(videoInfo.views)}\n` +
                  `${UI.borders.line}\n` +
                  `${UI.borders.line} ${UI.progressBar(25)} 25%\n` +
                  `${UI.borders.bot}`,
            edit: statusMsg.key
        });

        let mediaBuffer = null;
        let usedMethod = '';
        const apiType = isVideo ? 'video' : 'audio';

        // Strategy 1: Smart API Rotation (3 attempts)
        for (let i = 0; i < 3 && !mediaBuffer; i++) {
            const api = engine.selectAPI(apiType);
            
            try {
                await conn.sendMessage(from, {
                    text: `${UI.borders.top}\n` +
                          `${UI.borders.line} 🚀 *DOWNLOADING*\n` +
                          `${UI.borders.mid}\n` +
                          `${UI.borders.line} 📡 Method: ${api.name} (${i + 1}/3)\n` +
                          `${UI.borders.line} ${UI.progressBar(50 + (i * 15))} ${50 + (i * 15)}%\n` +
                          `${UI.borders.line} ⚡ Status: Fetching metadata...\n` +
                          `${UI.borders.bot}`,
                    edit: statusMsg.key
                });

                const apiUrl = `${api.url}?url=${encodeURIComponent(videoUrl)}`;
                const response = await axios.get(apiUrl, { 
                    timeout: 20000,
                    headers: { 'User-Agent': 'GuruMD/3.0' }
                });

                let downloadUrl = null;
                if (response.data?.downloadUrl) downloadUrl = response.data.downloadUrl;
                else if (response.data?.data?.download) downloadUrl = response.data.data.download;
                else if (response.data?.url) downloadUrl = response.data.url;
                else if (response.data?.result?.download) downloadUrl = response.data.result.download;
                else if (response.data?.[apiType === 'audio' ? 'audio' : 'video']) {
                    downloadUrl = response.data[apiType === 'audio' ? 'audio' : 'video'];
                }

                if (downloadUrl) {
                    const mediaRes = await axios.get(downloadUrl, {
                        responseType: 'arraybuffer',
                        timeout: 120000
                    });
                    
                    if (mediaRes.data && mediaRes.data.length > 1000) {
                        mediaBuffer = Buffer.from(mediaRes.data);
                        usedMethod = api.name;
                        engine.reportAPIHealth(api, true);
                    }
                }
            } catch (err) {
                engine.reportAPIHealth(api, false);
                console.log(`API ${api.name} failed:`, err.message);
            }
        }

        // Strategy 2: ytdl-core fallback
        if (!mediaBuffer) {
            await conn.sendMessage(from, {
                text: `${UI.borders.top}\n` +
                      `${UI.borders.line} 🔧 *SWITCHING TO BACKUP ENGINE*\n` +
                      `${UI.borders.mid}\n` +
                      `${UI.borders.line} 🛡️ Using: ytdl-core (Direct)\n` +
                      `${UI.borders.line} ${UI.progressBar(85)} 85%\n` +
                      `${UI.borders.line} ⚡ Status: Extracting stream...\n` +
                      `${UI.borders.bot}`,
                edit: statusMsg.key
            });

            try {
                const info = await ytdl.getInfo(videoUrl);
                const format = isVideo 
                    ? ytdl.chooseFormat(info.formats, { quality: '18' })
                    : ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });

                if (format?.url) {
                    const response = await axios.get(format.url, {
                        responseType: 'arraybuffer',
                        timeout: 120000,
                        headers: { 
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Range': 'bytes=0-'
                        }
                    });
                    
                    if (response.data && response.data.length > 1000) {
                        mediaBuffer = Buffer.from(response.data);
                        usedMethod = 'ytdl-core Direct';
                    }
                }
            } catch (err) {
                console.log('ytdl fallback failed:', err.message);
            }
        }

        if (!mediaBuffer || mediaBuffer.length < 1000) {
            throw new Error('All download methods failed. File too small or empty.');
        }

        // Success - Calculate stats
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const size = UI.formatBytes(mediaBuffer.length);
        const speed = (mediaBuffer.length / 1024 / 1024 / duration).toFixed(2);

        engine.stats.totalDownloads++;

        // Final caption
        const caption = `${UI.borders.top}\n` +
                       `${UI.borders.line} ✅ *DOWNLOAD COMPLETE*\n` +
                       `${UI.borders.mid}\n` +
                       `${UI.borders.line} 🎵 ${videoInfo.title.substring(0, 35)}${videoInfo.title.length > 35 ? '...' : ''}\n` +
                       `${UI.borders.line} 👤 ${videoInfo.author.name}\n` +
                       `${UI.borders.line} ⏱️ ${videoInfo.timestamp} | 👀 ${formatNumber(videoInfo.views)}\n` +
                       `${UI.borders.mid}\n` +
                       `${UI.borders.line} 📦 Size: ${size}\n` +
                       `${UI.borders.line} ⚡ Speed: ${speed} MB/s\n` +
                       `${UI.borders.line} ⏱️ Time: ${duration}s\n` +
                       `${UI.borders.line} 🔧 Engine: ${usedMethod}\n` +
                       `${UI.borders.line} 🆔 ID: ${sessionId}\n` +
                       `${UI.borders.bot}\n\n` +
                       `> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɢᴜʀᴜ-ᴍᴅ ᴇɴɢɪɴᴇ v3.0`;

        // Send media
        if (isVideo) {
            await conn.sendMessage(from, {
                video: mediaBuffer,
                mimetype: 'video/mp4',
                fileName: `HUNTER_${videoInfo.title.replace(/[^\w\s]/gi, '').substring(0, 30)}.mp4`,
                caption: caption,
                contextInfo: {
                    externalAdReply: {
                        title: "🎬 GURU-MD VIDEO",
                        body: `${videoInfo.title.substring(0, 40)}`,
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
                fileName: `HUNTER_${videoInfo.title.replace(/[^\w\s]/gi, '').substring(0, 30)}.mp3`,
                caption: caption,
                contextInfo: {
                    externalAdReply: {
                        title: "🎵 GURU-MD AUDIO",
                        body: `${videoInfo.title.substring(0, 40)}`,
                        thumbnailUrl: videoInfo.thumbnail,
                        sourceUrl: videoInfo.url,
                        mediaType: 2,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        // Send thumbnail with waveform
        await conn.sendMessage(from, {
            image: { url: videoInfo.thumbnail },
            caption: `🎨 *Media Artwork*\n${UI.waveform()}\n\n> ${videoInfo.title}\n> ${videoInfo.author.name}\n\n> © HUNTER XMD PRO`,
            viewOnce: true
        }, { quoted: mek });

    } catch (error) {
        console.error("Play command error:", error);
        engine.stats.failedDownloads++;
        
        const errorMsg = `${UI.borders.top}\n` +
                        `${UI.borders.line} ❌ *DOWNLOAD FAILED*\n` +
                        `${UI.borders.mid}\n` +
                        `${UI.borders.line} ⚠️ ${error.message.substring(0, 40)}\n` +
                        `${UI.borders.mid}\n` +
                        `${UI.borders.line} 💡 *Try:*\n` +
                        `${UI.borders.line} • Different keywords\n` +
                        `${UI.borders.line} • Direct YouTube URL\n` +
                        `${UI.borders.line} • .yt command for audio\n` +
                        `${UI.borders.line} • .video command for video\n` +
                        `${UI.borders.bot}`;

        if (statusMsg) {
            await conn.sendMessage(from, { text: errorMsg, edit: statusMsg.key });
        } else {
            await reply(errorMsg);
        }
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// ═══════════════════════════════════════════════════════════════════
// QUICK COMMANDS - Optimized for Speed
// ═════════════════════════════════════════════════════════════════==

cmd({
    pattern: "yt",
    alias: ["yta", "ytaudio", "mp3"],
    desc: "Quick audio download",
    category: "media",
    react: "🎧",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Provide song name or URL!\nExample: .yt Alan Walker Faded");

    await conn.sendMessage(from, { react: { text: "🎵", key: mek.key } });

    try {
        let videoUrl = q;
        let videoInfo = null;

        if (!q.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/)) {
            const search = await ytSearch(q);
            if (!search.videos.length) return reply("❌ No results found!");
            videoInfo = search.videos[0];
            videoUrl = videoInfo.url;
        } else {
            const info = await ytdl.getInfo(videoUrl);
            videoInfo = {
                title: info.videoDetails.title,
                author: { name: info.videoDetails.author.name },
                timestamp: UI.formatDuration(parseInt(info.videoDetails.lengthSeconds)),
                thumbnail: info.videoDetails.thumbnails.pop().url,
                url: videoUrl
            };
        }

        const api = engine.selectAPI('audio');
        const response = await axios.get(`${api.url}?url=${encodeURIComponent(videoUrl)}`, {
            timeout: 15000
        });

        let downloadUrl = response.data?.downloadUrl || response.data?.data?.download || 
                         response.data?.url || response.data?.audio;

        if (!downloadUrl) throw new Error('API returned no URL');

        await conn.sendMessage(from, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            fileName: `HUNTER_${videoInfo.title.replace(/[^\w\s]/gi, '')}.mp3`,
            caption: `🎵 *${videoInfo.title}*\n👤 ${videoInfo.author.name}\n⏱️ ${videoInfo.timestamp}\n\n> ⚡ Quick Download | HUNTER XMD PRO`,
            contextInfo: {
                externalAdReply: {
                    title: "🎧 Quick Audio",
                    body: videoInfo.title,
                    thumbnailUrl: videoInfo.thumbnail,
                    sourceUrl: videoInfo.url
                }
            }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        engine.reportAPIHealth(api, true);

    } catch (error) {
        console.error("YT command error:", error);
        reply("❌ Quick download failed. Try .play instead");
    }
});

cmd({
    pattern: "video",
    alias: ["vid", "ytv", "mp4"],
    desc: "Quick video download",
    category: "media",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Provide video name or URL!\nExample: .video Alan Walker Faded");

    await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });

    try {
        let videoUrl = q;
        let videoInfo = null;

        if (!q.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/)) {
            const search = await ytSearch(q);
            if (!search.videos.length) return reply("❌ No results found!");
            videoInfo = search.videos[0];
            videoUrl = videoInfo.url;
        } else {
            const info = await ytdl.getInfo(videoUrl);
            videoInfo = {
                title: info.videoDetails.title,
                author: { name: info.videoDetails.author.name },
                timestamp: UI.formatDuration(parseInt(info.videoDetails.lengthSeconds)),
                thumbnail: info.videoDetails.thumbnails.pop().url,
                url: videoUrl
            };
        }

        const api = engine.selectAPI('video');
        const response = await axios.get(`${api.url}?url=${encodeURIComponent(videoUrl)}`, {
            timeout: 15000
        });

        let downloadUrl = response.data?.downloadUrl || response.data?.data?.download || 
                         response.data?.url || response.data?.video;

        if (!downloadUrl) throw new Error('API returned no URL');

        await conn.sendMessage(from, {
            video: { url: downloadUrl },
            mimetype: 'video/mp4',
            fileName: `GURU_${videoInfo.title.replace(/[^\w\s]/gi, '')}.mp4`,
            caption: `🎬 *${videoInfo.title}*\n👤 ${videoInfo.author.name}\n⏱️ ${videoInfo.timestamp}\n\n> ⚡ Quick Download | HUNTER XMD PRO`,
            contextInfo: {
                externalAdReply: {
                    title: "🎬 Quick Video",
                    body: videoInfo.title,
                    thumbnailUrl: videoInfo.thumbnail,
                    sourceUrl: videoInfo.url
                }
            }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
        engine.reportAPIHealth(api, true);

    } catch (error) {
        console.error("Video command error:", error);
        reply("❌ Quick download failed. Try .play video instead");
    }
});

// ═══════════════════════════════════════════════════════════════════
// SYSTEM COMMANDS
// ═════════════════════════════════════════════════════════════════==

cmd({
    pattern: "mediastats",
    alias: ["mstats", "engine", "apistatus"],
    desc: "View media engine statistics",
    category: "tools",
    react: "📊",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const total = engine.stats.totalDownloads + engine.stats.failedDownloads;
    const successRate = total > 0 ? ((engine.stats.totalDownloads / total) * 100).toFixed(1) : 100;
    
    let apiStatus = "";
    const allApis = [...engine.apiPool.audio, ...engine.apiPool.video]
        .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
    
    allApis.forEach(api => {
        const health = api.health >= 80 ? "🟢" : api.health >= 40 ? "🟡" : "🔴";
        apiStatus += `${UI.borders.line} ${health} ${api.name}: ${api.health}%\n`;
    });

    const stats = `${UI.borders.top}\n` +
                 `${UI.borders.line} 📊 *MEDIA ENGINE STATS*\n` +
                 `${UI.borders.mid}\n` +
                 `${UI.borders.line} 📥 Total Downloads: ${engine.stats.totalDownloads}\n` +
                 `${UI.borders.line} ❌ Failed: ${engine.stats.failedDownloads}\n` +
                 `${UI.borders.line} 📈 Success Rate: ${successRate}%\n` +
                 `${UI.borders.line} 💾 Cache Items: ${engine.cache.size}\n` +
                 `${UI.borders.mid}\n` +
                 `${UI.borders.line} 🌐 *API Health Status:*\n` +
                 apiStatus +
                 `${UI.borders.bot}\n\n` +
                 `> Use .clearcache to reset cache`;

    await reply(stats);
});

cmd({
    pattern: "clearcache",
    desc: "Clear media cache",
    category: "tools",
    react: "🧹",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const size = engine.cache.size;
    engine.clearCache();
    reply(`✅ *Cache Cleared Successfully!*\n🗑️ Removed ${size} items\n💾 Memory freed`);
});

// Helper function
function formatNumber(num) {
    if (!num) return '0';
    num = parseInt(num);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

module.exports = { MediaEngine, UI, engine };

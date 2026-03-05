const { cmd } = require('../command');
const axios = require('axios');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const fs = require('fs');
const path = require('path');

// Helper function to format views
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Function to download file and convert to base64
async function downloadToBase64(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        return Buffer.from(response.data).toString('base64');
    } catch (error) {
        throw new Error(`Download failed: ${error.message}`);
    }
}

cmd({
    pattern: "play",
    alias: ["song", "ytplay", "music"],
    desc: "Download YouTube audio directly",
    category: "download",
    use: ".play <song name>",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ Please provide a song name!\n\n*Example:*\n.play Alan Walker Faded");

        // Send initial searching status
        const statusMsg = await reply(`🔍 Searching: *${q}*`);
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // Search for the video
        const searchResults = await ytSearch(q);
        
        if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
            return reply("❌ No results found. Try different keywords.");
        }

        const video = searchResults.videos[0];
        const videoInfo = {
            title: video.title,
            url: video.url,
            duration: video.timestamp,
            views: formatNumber(video.views),
            thumbnail: video.thumbnail,
            author: video.author.name,
            videoId: video.videoId
        };

        // Update status to downloading
        await conn.sendMessage(from, {
            text: `⬇️ Downloading: *${videoInfo.title}*\n⏱️ Please wait...`,
            edit: statusMsg.key
        });

        let mediaBuffer = null;
        let downloadMethod = '';
        let base64Data = null;

        // METHOD 1: Try David Cyril APIs (apis.davidcyril.name.ng) - PRIMARY
        const davidCyrilApis = [
            {
                name: 'David Cyril MP3',
                url: `https://apis.davidcyril.name.ng/api/youtube/mp3?url=${encodeURIComponent(video.url)}`,
                type: 'json'
            },
            {
                name: 'David Cyril MP4',
                url: `https://apis.davidcyril.name.ng/api/youtube/mp4?url=${encodeURIComponent(video.url)}`,
                type: 'json'
            },
            {
                name: 'David Cyril Download',
                url: `https://apis.davidcyril.name.ng/api/youtube/download?url=${encodeURIComponent(video.url)}&format=mp3`,
                type: 'json'
            }
        ];

        for (const api of davidCyrilApis) {
            if (mediaBuffer) break;
            try {
                console.log(`Attempting ${api.name}...`);
                const response = await axios.get(api.url, { 
                    timeout: 20000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                
                if (response.data) {
                    // Check for various response formats
                    const downloadUrl = response.data.downloadUrl || 
                                      response.data.download_url || 
                                      response.data.url || 
                                      response.data.link ||
                                      response.data.data?.download;
                    
                    const apiBase64 = response.data.base64 || 
                                    response.data.data?.base64 ||
                                    response.data.result?.base64;
                    
                    if (apiBase64) {
                        // API returned base64 directly
                        base64Data = apiBase64;
                        mediaBuffer = Buffer.from(apiBase64, 'base64');
                        downloadMethod = api.name + ' (Base64)';
                        console.log(`✅ ${api.name} success with base64`);
                        break;
                    } else if (downloadUrl) {
                        // API returned download URL - convert to base64
                        try {
                            base64Data = await downloadToBase64(downloadUrl);
                            mediaBuffer = Buffer.from(base64Data, 'base64');
                            downloadMethod = api.name + ' (URL→Base64)';
                            console.log(`✅ ${api.name} success, converted to base64`);
                            break;
                        } catch (dlErr) {
                            console.log(`⚠️ ${api.name} download failed: ${dlErr.message}`);
                        }
                    }
                }
            } catch (err) {
                console.log(`❌ ${api.name} failed: ${err.message}`);
            }
        }

        // METHOD 2: Fallback to ytdl-core if APIs fail
        if (!mediaBuffer) {
            try {
                console.log("Attempting ytdl-core download...");
                
                const info = await ytdl.getInfo(video.url);
                const format = ytdl.chooseFormat(info.formats, { 
                    filter: 'audioonly', 
                    quality: 'highestaudio' 
                });
                
                if (format?.url) {
                    // Download and convert to base64
                    base64Data = await downloadToBase64(format.url);
                    mediaBuffer = Buffer.from(base64Data, 'base64');
                    downloadMethod = 'ytdl-core (Base64)';
                    console.log(`✅ ytdl-core success: ${mediaBuffer.length} bytes`);
                }
            } catch (err) {
                console.log(`❌ ytdl-core failed: ${err.message}`);
            }
        }

        // METHOD 3: Try alternative APIs if still no success
        if (!mediaBuffer) {
            const altApis = [
                `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(video.url)}`,
                `https://api.ryzendesu.vip/api/downloader/yt?url=${encodeURIComponent(video.url)}&type=mp3`,
                `https://ytdl.guruapi.tech/api/ytmp3?url=${encodeURIComponent(video.url)}`
            ];
            
            for (const apiUrl of altApis) {
                if (mediaBuffer) break;
                try {
                    const response = await axios.get(apiUrl, { timeout: 15000 });
                    const downloadUrl = response.data?.downloadUrl || 
                                      response.data?.data?.download || 
                                      response.data?.url ||
                                      response.data?.result?.download;
                    
                    if (downloadUrl) {
                        base64Data = await downloadToBase64(downloadUrl);
                        mediaBuffer = Buffer.from(base64Data, 'base64');
                        downloadMethod = 'Alternative API (Base64)';
                        break;
                    }
                } catch (err) {
                    console.log(`API failed: ${err.message}`);
                }
            }
        }

        // If all methods fail
        if (!mediaBuffer) {
            await conn.sendMessage(from, { delete: statusMsg.key });
            return reply(`❌ *Download Failed*\n\n🎵 *Title:* ${videoInfo.title}\n👤 *Channel:* ${videoInfo.author}\n\n💡 All download methods failed. Please try again later.`);
        }

        // Delete status message before sending audio
        await conn.sendMessage(from, { delete: statusMsg.key });

        const fileSize = (mediaBuffer.length / (1024 * 1024)).toFixed(2);

        // Send audio with externalAdReply (no caption on audio itself)
        await conn.sendMessage(from, {
            audio: mediaBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${videoInfo.title.replace(/[^\w\s]/gi, '')}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: `🎵 ${videoInfo.title.substring(0, 40)}`,
                    body: `👤 ${videoInfo.author} • ⏱️ ${videoInfo.duration} • 📦 ${fileSize}MB`,
                    thumbnailUrl: videoInfo.thumbnail,
                    sourceUrl: videoInfo.url,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek });

        // Send success reaction
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        // Optional: Send thumbnail as separate view-once message
        await conn.sendMessage(from, {
            image: { url: videoInfo.thumbnail },
            caption: `🎵 *Now Playing:*\n> ${videoInfo.title}\n> 👤 ${videoInfo.author}\n\n> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ GᴜʀᴜTᴇᴄʜ`,
            viewOnce: true
        }, { quoted: mek });

    } catch (error) {
        console.error("Play command error:", error);
        reply("❌ Error: " + (error.message || "Unknown error"));
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// Video download command with base64
cmd({
    pattern: "video",
    alias: ["ytvideo", "ytmp4", "vid"],
    desc: "Download YouTube video directly",
    category: "download",
    use: ".video <video name>",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ Provide a video name!\n\n*Example:*\n.video Alan Walker Faded");

        const statusMsg = await reply(`🔍 Searching: *${q}*`);
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        const search = await ytSearch(q);
        if (!search.videos.length) return reply("❌ No results found!");

        const video = search.videos[0];
        const videoInfo = {
            title: video.title,
            url: video.url,
            duration: video.timestamp,
            views: formatNumber(video.views),
            thumbnail: video.thumbnail,
            author: video.author.name,
            videoId: video.videoId
        };

        await conn.sendMessage(from, {
            text: `⬇️ Downloading video: *${videoInfo.title}*`,
            edit: statusMsg.key
        });

        let mediaBuffer = null;
        let base64Data = null;
        let downloadMethod = '';

        // Try David Cyril video API first
        try {
            const apiUrl = `https://apis.davidcyril.name.ng/api/youtube/mp4?url=${encodeURIComponent(video.url)}`;
            const response = await axios.get(apiUrl, { timeout: 20000 });
            
            const downloadUrl = response.data?.downloadUrl || 
                              response.data?.url || 
                              response.data?.data?.download;
            
            const apiBase64 = response.data?.base64 || response.data?.data?.base64;

            if (apiBase64) {
                base64Data = apiBase64;
                mediaBuffer = Buffer.from(apiBase64, 'base64');
                downloadMethod = 'David Cyril API (Base64)';
            } else if (downloadUrl) {
                base64Data = await downloadToBase64(downloadUrl);
                mediaBuffer = Buffer.from(base64Data, 'base64');
                downloadMethod = 'David Cyril API (URL→Base64)';
            }
        } catch (err) {
            console.log("David Cyril video API failed:", err.message);
        }

        // Fallback to ytdl-core
        if (!mediaBuffer) {
            try {
                const info = await ytdl.getInfo(video.url);
                const format = ytdl.chooseFormat(info.formats, { quality: '18' }) || 
                              ytdl.chooseFormat(info.formats, { quality: 'lowest' });
                
                if (format?.url) {
                    base64Data = await downloadToBase64(format.url);
                    mediaBuffer = Buffer.from(base64Data, 'base64');
                    downloadMethod = 'ytdl-core (Base64)';
                }
            } catch (err) {
                console.log("ytdl-core video failed:", err.message);
            }
        }

        if (!mediaBuffer) {
            await conn.sendMessage(from, { delete: statusMsg.key });
            return reply(`❌ *Download Failed*\n\n🎬 *Title:* ${videoInfo.title}\n👤 *Channel:* ${videoInfo.author}\n\n💡 Try again later.`);
        }

        await conn.sendMessage(from, { delete: statusMsg.key });

        const fileSize = (mediaBuffer.length / (1024 * 1024)).toFixed(2);

        // Send video
        await conn.sendMessage(from, {
            video: mediaBuffer,
            mimetype: 'video/mp4',
            fileName: `${videoInfo.title.replace(/[^\w\s]/gi, '')}.mp4`,
            caption: `🎬 *${videoInfo.title}*\n👤 ${videoInfo.author}\n⏱️ ${videoInfo.duration}\n👀 ${videoInfo.views}\n📦 ${fileSize}MB`,
            contextInfo: {
                externalAdReply: {
                    title: videoInfo.title.substring(0, 40),
                    body: `${videoInfo.author} • ${videoInfo.duration}`,
                    thumbnailUrl: videoInfo.thumbnail,
                    sourceUrl: videoInfo.url,
                    mediaType: 1
                }
            }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("Video command error:", error);
        reply("❌ Error: " + error.message);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// API status check command
cmd({
    pattern: "apistatus",
    alias: ["checkapi", "api"],
    desc: "Check YouTube download APIs status",
    category: "tools",
    react: "🔌",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const apis = [
        { name: 'David Cyril MP3', url: 'https://apis.davidcyril.name.ng/api/youtube/mp3', type: 'remote' },
        { name: 'David Cyril MP4', url: 'https://apis.davidcyril.name.ng/api/youtube/mp4', type: 'remote' },
        { name: 'Siputzx API', url: 'https://api.siputzx.my.id', type: 'remote' },
        { name: 'ytdl-core', url: null, type: 'local' }
    ];
    
    let statusMsg = "🔌 *API Status Check*\n\n";
    
    for (const api of apis) {
        if (api.type === 'local') {
            statusMsg += `✅ ${api.name}: Available (Local)\n`;
        } else {
            try {
                await axios.get(api.url, { timeout: 5000 });
                statusMsg += `✅ ${api.name}: Online\n`;
n            } catch {
                statusMsg += `❌ ${api.name}: Offline\n`;
            }
        }
    }
    
    statusMsg += "\n> *Commands:*\n";
    statusMsg += "• .play <song> - Audio download\n";
    statusMsg += "• .video <song> - Video download\n\n";
    statusMsg += "> *Note:* Uses base64 encoding for secure downloads";
    
    await reply(statusMsg);
});

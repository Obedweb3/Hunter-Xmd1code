const { cmd } = require('../command');
const axios = require('axios');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');

// Helper function to format views
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
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
            author: video.author.name
        };

        // Update status to downloading
        await conn.sendMessage(from, {
            text: `⬇️ Downloading: *${videoInfo.title}*`,
            edit: statusMsg.key
        });

        let mediaBuffer = null;
        let downloadMethod = '';

        // Try APIs in order
        const apis = [
            `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(video.url)}`,
            `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(video.url)}`,
            `https://api.ryzendesu.vip/api/downloader/yt?url=${encodeURIComponent(video.url)}&type=mp3`,
            `https://ytdl.guruapi.tech/api/ytmp3?url=${encodeURIComponent(video.url)}`
        ];

        for (const apiUrl of apis) {
            try {
                const response = await axios.get(apiUrl, { timeout: 15000 });
                const downloadUrl = response.data?.downloadUrl || response.data?.data?.download || response.data?.url || response.data?.result?.download;
                
                if (downloadUrl) {
                    const mediaResponse = await axios.get(downloadUrl, {
                        responseType: 'arraybuffer',
                        timeout: 60000
                    });
                    mediaBuffer = Buffer.from(mediaResponse.data);
                    downloadMethod = 'API';
                    break;
                }
            } catch (err) {
                continue;
            }
        }

        // Fallback to ytdl-core
        if (!mediaBuffer) {
            try {
                const info = await ytdl.getInfo(video.url);
                const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });
                
                if (format?.url) {
                    const response = await axios.get(format.url, {
                        responseType: 'arraybuffer',
                        timeout: 60000,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    mediaBuffer = Buffer.from(response.data);
                    downloadMethod = 'ytdl-core';
                }
            } catch (err) {
                console.log("ytdl-core failed:", err.message);
            }
        }

        if (!mediaBuffer) {
            // Delete status message on failure
            await conn.sendMessage(from, { delete: statusMsg.key });
            return reply(`❌ *Download Failed*\n\n🎵 *Title:* ${videoInfo.title}\n👤 *Channel:* ${videoInfo.author}\n\n🔗 *Watch on YouTube:*\n${videoInfo.url}\n\n💡 Try again later`);
        }

        // Delete status message before sending audio
        await conn.sendMessage(from, { delete: statusMsg.key });

        // Send audio directly with thumbnail
        await conn.sendMessage(from, {
            audio: mediaBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${videoInfo.title.replace(/[^\w\s]/gi, '')}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: videoInfo.title.substring(0, 30),
                    body: `👤 ${videoInfo.author} • ⏱️ ${videoInfo.duration} • 👀 ${videoInfo.views}`,
                    thumbnailUrl: videoInfo.thumbnail,
                    sourceUrl: videoInfo.url,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("Play command error:", error);
        reply("❌ Error: " + (error.message || "Unknown error"));
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});

// Video command - sends video directly
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

        // Send initial searching status
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
            author: video.author.name
        };

        // Update status to downloading
        await conn.sendMessage(from, {
            text: `⬇️ Downloading: *${videoInfo.title}*`,
            edit: statusMsg.key
        });

        let mediaBuffer = null;

        // Try video APIs
        const apis = [
            `https://api.davidcyriltech.my.id/download/ytvideo?url=${encodeURIComponent(video.url)}`,
            `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(video.url)}`,
            `https://api.ryzendesu.vip/api/downloader/yt?url=${encodeURIComponent(video.url)}&type=mp4`
        ];

        for (const apiUrl of apis) {
            try {
                const response = await axios.get(apiUrl, { timeout: 15000 });
                const downloadUrl = response.data?.downloadUrl || response.data?.data?.download || response.data?.url;
                
                if (downloadUrl) {
                    const mediaResponse = await axios.get(downloadUrl, {
                        responseType: 'arraybuffer',
                        timeout: 60000
                    });
                    mediaBuffer = Buffer.from(mediaResponse.data);
                    break;
                }
            } catch (err) {
                continue;
            }
        }

        // Fallback to ytdl-core
        if (!mediaBuffer) {
            try {
                const info = await ytdl.getInfo(video.url);
                const format = ytdl.chooseFormat(info.formats, { quality: '18' }) || 
                              ytdl.chooseFormat(info.formats, { quality: 'lowest' });
                
                if (format?.url) {
                    const response = await axios.get(format.url, {
                        responseType: 'arraybuffer',
                        timeout: 60000,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    mediaBuffer = Buffer.from(response.data);
                }
            } catch (err) {
                console.log("ytdl-core failed:", err.message);
            }
        }

        if (!mediaBuffer) {
            // Delete status message on failure
            await conn.sendMessage(from, { delete: statusMsg.key });
            return reply(`❌ *Download Failed*\n\n🎬 *Title:* ${videoInfo.title}\n👤 *Channel:* ${videoInfo.author}\n\n🔗 *Watch on YouTube:*\n${videoInfo.url}`);
        }

        // Delete status message before sending video
        await conn.sendMessage(from, { delete: statusMsg.key });

        // Send video directly
        await conn.sendMessage(from, {
            video: mediaBuffer,
            mimetype: 'video/mp4',
            fileName: `${videoInfo.title.replace(/[^\w\s]/gi, '')}.mp4`,
            caption: `🎬 *${videoInfo.title}*\n👤 ${videoInfo.author}\n⏱️ ${videoInfo.duration}\n👀 ${videoInfo.views}`,
            contextInfo: {
                externalAdReply: {
                    title: videoInfo.title.substring(0, 30),
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

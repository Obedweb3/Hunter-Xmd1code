const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const fetch = require('node-fetch'); // Add this import

cmd({
    pattern: "yt2",
    alias: ["play2", "music"],
    react: "🎵",
    desc: "Download audio from YouTube",
    category: "download",
    use: ".song <query or url>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a song name or YouTube URL!");

        let videoUrl, title;
        
        // Check if it's a URL (improved regex)
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        
        if (youtubeRegex.test(q)) {
            videoUrl = q;
            const videoId = q.match(youtubeRegex)[1];
            const videoInfo = await yts({ videoId: videoId });
            title = videoInfo.title;
        } else {
            // Search YouTube
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ No results found!");
            videoUrl = search.videos[0].url;
            title = search.videos[0].title;
        }

        await reply("⏳ Downloading audio...");

        // Fixed: Removed space after url=
        const apiUrl = `https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            return await reply("❌ API request failed!");
        }
        
        const data = await response.json();

        if (!data.success || !data.result?.download_url) {
            return await reply("❌ Failed to download audio!");
        }

        await conn.sendMessage(from, {
            audio: { url: data.result.download_url },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: mek });

        await reply(`✅ *${title}* downloaded successfully!`);

    } catch (error) {
        console.error('YT2 Error:', error);
        await reply(`❌ Error: ${error.message}`);
    }
});


const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const fetch = require('node-fetch');

cmd({
    pattern: "yt2",
    alias: ["play2", "music", "song", "audio"],
    react: "🎵",
    desc: "Download audio from YouTube",
    category: "download",
    use: ".yt2 <query or url>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a song name or YouTube URL!\n\nExample: `.yt2 Alan Walker Faded`");

        let videoUrl, title, thumbnail, duration, author;
        
        // Check if input is URL or search query
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        
        if (youtubeRegex.test(q)) {
            videoUrl = q;
            try {
                const videoId = q.match(youtubeRegex)[1];
                const videoInfo = await yts({ videoId: videoId });
                title = videoInfo.title;
                thumbnail = videoInfo.thumbnail;
                duration = videoInfo.timestamp;
                author = videoInfo.author.name;
            } catch (e) {
                title = "YouTube Audio";
            }
        } else {
            // Search YouTube
            await reply("🔍 Searching for: " + q);
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ No results found! Try different keywords.");
            
            const video = search.videos[0];
            videoUrl = video.url;
            title = video.title;
            thumbnail = video.thumbnail;
            duration = video.timestamp;
            author = video.author.name;
        }

        await reply("⏳ Downloading audio... Please wait.");

        // Use the provided API endpoint
        const apiUrl = `https://api-rebix.zone.id/api/yta?url=${encodeURIComponent(videoUrl)}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }

        const data = await response.json();

        // Check if API returned success and has download URL
        if (!data || !data.status === 'success' || !data.result?.downloadUrl) {
            return await reply("❌ Failed to fetch download link. The API might be busy or the video is restricted.");
        }

        const downloadUrl = data.result.downloadUrl;
        const fileSize = data.result.fileSize || 'Unknown';
        const quality = data.result.quality || '128kbps';

        // Send thumbnail with info
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎵 *${title}*\n👤 ${author || 'Unknown'}\n⏱️ ${duration || 'Unknown'}\n📦 ${fileSize}\n🎧 Quality: ${quality}\n\n⬇️ Downloading...`
        }, { quoted: mek });

        // Send the audio file
        await conn.sendMessage(from, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${title}.mp3`,
            caption: `✅ *${title}*`
        }, { quoted: mek });

        await reply(`✅ *${title}* downloaded successfully!\n📦 Size: ${fileSize}`);

    } catch (error) {
        console.error('YT2 Error:', error);
        await reply(`❌ Error: ${error.message}\n\nPlease try again later or use a different video.`);
    }
});

const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const fetch = require('node-fetch');

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
        
        // Check if it's a URL
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        
        if (youtubeRegex.test(q)) {
            videoUrl = q;
            const videoId = q.match(youtubeRegex)[1];
            try {
                const videoInfo = await yts({ videoId: videoId });
                title = videoInfo.title;
            } catch (e) {
                title = "YouTube Audio";
            }
        } else {
            // Search YouTube
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ No results found!");
            videoUrl = search.videos[0].url;
            title = search.videos[0].title;
        }

        await reply("⏳ Processing... Please wait.");

        // Method 1: Using Y2Mate API (Fast)
        try {
            const y2mateResponse = await fetch(`https://y2mate.sx/api/convert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: videoUrl,
                    format: 'mp3',
                    quality: '128' // or '320' for high quality
                })
            });
            
            const y2mateData = await y2mateResponse.json();
            
            if (y2mateData.downloadUrl) {
                await conn.sendMessage(from, {
                    audio: { url: y2mateData.downloadUrl },
                    mimetype: 'audio/mpeg',
                    ptt: false,
                    caption: `🎵 *${title}*`
                }, { quoted: mek });
                return await reply(`✅ *${title}* downloaded successfully!`);
            }
        } catch (y2mateError) {
            console.log("Y2Mate failed, trying fallback...");
        }

        // Method 2: Using CnvMP3 API (Alternative)
        try {
            const cnvResponse = await fetch(`https://cnvmp3.com/check.php?url=${encodeURIComponent(videoUrl)}&format=mp3`);
            const cnvData = await cnvResponse.json();
            
            if (cnvData.downloadUrl) {
                await conn.sendMessage(from, {
                    audio: { url: cnvData.downloadUrl },
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: mek });
                return await reply(`✅ *${title}* downloaded successfully!`);
            }
        } catch (cnvError) {
            console.log("CnvMP3 failed...");
        }

        // Method 3: Direct ytmp3.cc API
        try {
            const ytmp3Response = await fetch(`https://d.ymcdn.org/api/v1/info?url=${encodeURIComponent(videoUrl)}&format=mp3`);
            const ytmp3Data = await ytmp3Response.json();
            
            if (ytmp3Data.result?.download_url) {
                await conn.sendMessage(from, {
                    audio: { url: ytmp3Data.result.download_url },
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: mek });
                return await reply(`✅ *${title}* downloaded successfully!`);
            }
        } catch (ytmp3Error) {
            console.log("YTMP3 failed...");
        }

        await reply("❌ All download methods failed. Please try again later.");

    } catch (error) {
        console.error('YT2 Error:', error);
        await reply(`❌ Error: ${error.message}`);
    }
});

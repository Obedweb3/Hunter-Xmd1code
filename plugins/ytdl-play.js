const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const fetch = require('node-fetch');

cmd({
    pattern: "yt2",
    alias: ["play2", "music", "song"],
    react: "🎵",
    desc: "Download audio from YouTube",
    category: "download",
    use: ".song <query or url>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a song name or YouTube URL!\n\nExample: `.yt2 Alan Walker Faded`");

        let videoUrl, title, thumbnail;
        
        // Check if input is URL or search query
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        
        if (youtubeRegex.test(q)) {
            videoUrl = q;
            try {
                const videoInfo = await yts({ videoId: q.match(youtubeRegex)[1] });
                title = videoInfo.title;
                thumbnail = videoInfo.thumbnail;
            } catch (e) {
                title = "YouTube Audio";
            }
        } else {
            // Search YouTube
            await reply("🔍 Searching for: " + q);
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ No results found!");
            
            videoUrl = search.videos[0].url;
            title = search.videos[0].title;
            thumbnail = search.videos[0].thumbnail;
        }

        await reply("⏳ Downloading audio... Please wait.");

        // Try Cobalt API (Most reliable currently)
        try {
            const cobaltResponse = await fetch('https://api.cobalt.tools/api/json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    url: videoUrl,
                    isAudioOnly: true,
                    aFormat: 'mp3'
                })
            });

            const cobaltData = await cobaltResponse.json();
            
            if (cobaltData.url) {
                // Send with thumbnail and metadata
                await conn.sendMessage(from, {
                    image: { url: thumbnail },
                    caption: `🎵 *${title}*\n\n⏳ Sending audio...`
                }, { quoted: mek });

                await conn.sendMessage(from, {
                    audio: { url: cobaltData.url },
                    mimetype: 'audio/mpeg',
                    ptt: false,
                    fileName: `${title}.mp3`
                }, { quoted: mek });

                return await reply(`✅ *${title}* downloaded successfully!`);
            }
        } catch (cobaltError) {
            console.log("Cobalt API failed:", cobaltError.message);
        }

        // Fallback: Try Y2Mate
        try {
            const y2mateResponse = await fetch(`https://y2mate.sx/api/convert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: videoUrl,
                    format: 'mp3',
                    quality: '128'
                })
            });
            
            const y2mateData = await y2mateResponse.json();
            
            if (y2mateData.downloadUrl || y2mateData.dlink) {
                const downloadUrl = y2mateData.downloadUrl || y2mateData.dlink;
                
                await conn.sendMessage(from, {
                    audio: { url: downloadUrl },
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: mek });
                
                return await reply(`✅ *${title}* downloaded successfully!`);
            }
        } catch (y2mateError) {
            console.log("Y2Mate failed:", y2mateError.message);
        }

        await reply("❌ Failed to download. The video might be restricted or the service is temporarily down.\n\nTry: `.yt2 <different song name>`");

    } catch (error) {
        console.error('YT2 Error:', error);
        await reply(`❌ Error: ${error.message}`);
    }
});

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
            // Get video info from URL
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
            // Search using yt-search (more reliable than Rebix for search)
            await reply("🔍 Searching for: " + q);
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ No results found!");
            
            const video = search.videos[0];
            videoUrl = video.url;
            title = video.title;
            thumbnail = video.thumbnail;
            duration = video.timestamp;
            author = video.author.name;
        }

        await reply(`⏳ Downloading: *${title}*\n🎤 ${author || 'Unknown'}\n⏱️ ${duration || 'Unknown'}`);

        // WORKING API: Use y2mate.sx or y2mate.com API (Currently Active)
        const downloadUrl = await downloadFromY2Mate(videoUrl);
        
        if (!downloadUrl) {
            throw new Error('Failed to get download URL');
        }

        // Send thumbnail first
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎵 *${title}*\n⏱️ ${duration || 'Unknown'}\n\n⬇️ Sending audio...`
        }, { quoted: mek });

        // Send audio file
        await conn.sendMessage(from, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${title}.mp3`
        }, { quoted: mek });

        await reply(`✅ *${title}* downloaded successfully!`);

    } catch (error) {
        console.error('YT2 Error:', error);
        await reply(`❌ Failed to download. Error: ${error.message}\n\nTry:\n• Different video/song\n• Check if video is age-restricted\n• Try again later`);
    }
});

// Working Y2Mate API implementation
async function downloadFromY2Mate(videoUrl) {
    try {
        // Step 1: Analyze video
        const analyzeResponse = await fetch('https://y2mate.sx/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://y2mate.sx',
                'Referer': 'https://y2mate.sx/'
            },
            body: JSON.stringify({
                url: videoUrl,
                format: 'mp3'
            })
        });

        if (!analyzeResponse.ok) {
            throw new Error(`Analyze failed: ${analyzeResponse.status}`);
        }

        const analyzeData = await analyzeResponse.json();
        console.log('Analyze response:', analyzeData);

        if (!analyzeData || !analyzeData.videoId) {
            throw new Error('Failed to analyze video');
        }

        // Step 2: Convert to MP3
        const convertResponse = await fetch('https://y2mate.sx/api/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://y2mate.sx',
                'Referer': 'https://y2mate.sx/'
            },
            body: JSON.stringify({
                videoId: analyzeData.videoId,
                format: 'mp3',
                quality: '128'
            })
        });

        if (!convertResponse.ok) {
            throw new Error(`Convert failed: ${convertResponse.status}`);
        }

        const convertData = await convertResponse.json();
        console.log('Convert response:', convertData);

        if (convertData && convertData.downloadUrl) {
            return convertData.downloadUrl;
        }

        // Alternative: Try different response structure
        if (convertData && convertData.url) {
            return convertData.url;
        }

        throw new Error('No download URL in response');
        
    } catch (error) {
        console.error('Y2Mate Error:', error);
        
        // Fallback to alternative API if Y2Mate fails
        return await downloadFromAlternativeAPI(videoUrl);
    }
}

// Alternative API fallback
async function downloadFromAlternativeAPI(videoUrl) {
    try {
        // Try cnvmp3.com API
        const response = await fetch(`https://cnvmp3.com/check.php?url=${encodeURIComponent(videoUrl)}&format=mp3`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const data = await response.json();
        
        if (data && data.downloadUrl) {
            return data.downloadUrl;
        }
        
        throw new Error('Alternative API also failed');
    } catch (e) {
        throw e;
    }
}const config = require('../config');
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
            // Get video info from URL
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
            // Search using yt-search (more reliable than Rebix for search)
            await reply("🔍 Searching for: " + q);
            const search = await yts(q);
            if (!search.videos.length) return await reply("❌ No results found!");
            
            const video = search.videos[0];
            videoUrl = video.url;
            title = video.title;
            thumbnail = video.thumbnail;
            duration = video.timestamp;
            author = video.author.name;
        }

        await reply(`⏳ Downloading: *${title}*\n🎤 ${author || 'Unknown'}\n⏱️ ${duration || 'Unknown'}`);

        // WORKING API: Use y2mate.sx or y2mate.com API (Currently Active)
        const downloadUrl = await downloadFromY2Mate(videoUrl);
        
        if (!downloadUrl) {
            throw new Error('Failed to get download URL');
        }

        // Send thumbnail first
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎵 *${title}*\n⏱️ ${duration || 'Unknown'}\n\n⬇️ Sending audio...`
        }, { quoted: mek });

        // Send audio file
        await conn.sendMessage(from, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${title}.mp3`
        }, { quoted: mek });

        await reply(`✅ *${title}* downloaded successfully!`);

    } catch (error) {
        console.error('YT2 Error:', error);
        await reply(`❌ Failed to download. Error: ${error.message}\n\nTry:\n• Different video/song\n• Check if video is age-restricted\n• Try again later`);
    }
});

// Working Y2Mate API implementation
async function downloadFromY2Mate(videoUrl) {
    try {
        // Step 1: Analyze video
        const analyzeResponse = await fetch('https://y2mate.sx/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://y2mate.sx',
                'Referer': 'https://y2mate.sx/'
            },
            body: JSON.stringify({
                url: videoUrl,
                format: 'mp3'
            })
        });

        if (!analyzeResponse.ok) {
            throw new Error(`Analyze failed: ${analyzeResponse.status}`);
        }

        const analyzeData = await analyzeResponse.json();
        console.log('Analyze response:', analyzeData);

        if (!analyzeData || !analyzeData.videoId) {
            throw new Error('Failed to analyze video');
        }

        // Step 2: Convert to MP3
        const convertResponse = await fetch('https://y2mate.sx/api/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://y2mate.sx',
                'Referer': 'https://y2mate.sx/'
            },
            body: JSON.stringify({
                videoId: analyzeData.videoId,
                format: 'mp3',
                quality: '128'
            })
        });

        if (!convertResponse.ok) {
            throw new Error(`Convert failed: ${convertResponse.status}`);
        }

        const convertData = await convertResponse.json();
        console.log('Convert response:', convertData);

        if (convertData && convertData.downloadUrl) {
            return convertData.downloadUrl;
        }

        // Alternative: Try different response structure
        if (convertData && convertData.url) {
            return convertData.url;
        }

        throw new Error('No download URL in response');
        
    } catch (error) {
        console.error('Y2Mate Error:', error);
        
        // Fallback to alternative API if Y2Mate fails
        return await downloadFromAlternativeAPI(videoUrl);
    }
}

// Alternative API fallback
async function downloadFromAlternativeAPI(videoUrl) {
    try {
        // Try cnvmp3.com API
        const response = await fetch(`https://cnvmp3.com/check.php?url=${encodeURIComponent(videoUrl)}&format=mp3`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const data = await response.json();
        
        if (data && data.downloadUrl) {
            return data.downloadUrl;
        }
        
        throw new Error('Alternative API also failed');
    } catch (e) {
        throw e;
    }
}

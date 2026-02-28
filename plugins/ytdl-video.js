const config = require('../config');
const { cmd } = require('../command');
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

        let videoUrl, title, thumbnail, duration, author, videoId;

        // Check if input is URL or search query
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        
        if (youtubeRegex.test(q)) {
            // It's a URL
            videoUrl = q;
            videoId = q.match(youtubeRegex)[1];
            
            // Get info from Rebix API search using video ID
            try {
                const searchRes = await fetch(`https://api-rebix.zone.id/api/yts?q=${encodeURIComponent(videoId)}`);
                const searchData = await searchRes.json();
                
                if (searchData.status && searchData.result && searchData.result.length > 0) {
                    const video = searchData.result.find(v => v.videoId === videoId) || searchData.result[0];
                    title = video.title;
                    thumbnail = video.thumbnail;
                    duration = video.timestamp;
                    author = video.author?.name;
                } else {
                    title = "YouTube Audio";
                }
            } catch (e) {
                title = "YouTube Audio";
            }
        } else {
            // Search using Rebix API
            await reply("🔍 Searching for: " + q);
            
            try {
                const searchRes = await fetch(`https://api-rebix.zone.id/api/yts?q=${encodeURIComponent(q)}`);
                const searchData = await searchRes.json();
                
                if (!searchData.status || !searchData.result || searchData.result.length === 0) {
                    return await reply("❌ No results found! Try different keywords.");
                }
                
                const video = searchData.result[0];
                videoUrl = video.url;
                videoId = video.videoId;
                title = video.title;
                thumbnail = video.thumbnail;
                duration = video.timestamp;
                author = video.author?.name;
                
            } catch (searchError) {
                console.error("Rebix search error:", searchError);
                return await reply("❌ Search failed. Please try with a direct YouTube URL instead.");
            }
        }

        await reply(`⏳ Downloading: *${title}*\n🎤 ${author || 'Unknown'}\n⏱️ ${duration || 'Unknown'}`);

        // Try multiple download APIs since Rebix yta might be down
        
        // Method 1: Try Y2Mate API (Most reliable)
        try {
            const downloadUrl = await fetchFromY2Mate(videoUrl);
            if (downloadUrl) {
                await sendAudio(conn, from, mek, downloadUrl, title, thumbnail);
                return await reply(`✅ *${title}* downloaded successfully!`);
            }
        } catch (e) {
            console.log("Y2Mate failed:", e.message);
        }

        // Method 2: Try SaveFrom-style API
        try {
            const downloadUrl = await fetchFromSaveFrom(videoUrl);
            if (downloadUrl) {
                await sendAudio(conn, from, mek, downloadUrl, title, thumbnail);
                return await reply(`✅ *${title}* downloaded successfully!`);
            }
        } catch (e) {
            console.log("SaveFrom failed:", e.message);
        }

        // Method 3: Try YTMP3.cc API
        try {
            const downloadUrl = await fetchFromYTMP3(videoUrl);
            if (downloadUrl) {
                await sendAudio(conn, from, mek, downloadUrl, title, thumbnail);
                return await reply(`✅ *${title}* downloaded successfully!`);
            }
        } catch (e) {
            console.log("YTMP3 failed:", e.message);
        }

        // If all fail
        await reply("❌ Download failed. The video might be:\n• Age-restricted\n• Copyright protected\n• Too long (try videos under 10 mins)\n\nTry a different video or use `.play` command instead.");

    } catch (error) {
        console.error('YT2 Error:', error);
        await reply(`❌ Error: ${error.message}`);
    }
});

// Helper: Send audio with thumbnail
/**
 * Sends an audio file along with a thumbnail and caption.
 */
async function sendAudio(conn, from, mek, url, title, thumbnail) {
    // Send thumbnail with caption
    await conn.sendMessage(from, {
        image: { url: thumbnail },
        caption: `🎵 *${title}*\n\n⬇️ Sending audio file...`
    }, { quoted: mek });

    // Send audio file
    await conn.sendMessage(from, {
        audio: { url: url },
        mimetype: 'audio/mpeg',
        ptt: false,
        fileName: `${title}.mp3`
    }, { quoted: mek });
}

// API 1: Y2Mate (Working)
async function fetchFromY2Mate(videoUrl) {
    try {
        // Using y2mate.sx API
        const response = await fetch('https://y2mate.sx/api/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({
                url: videoUrl,
                format: 'mp3',
                quality: '128'
            })
        });
        
        const data = await response.json();
        
        if (data && (data.downloadUrl || data.dlink)) {
            return data.downloadUrl || data.dlink;
        }
        throw new Error('No download URL from Y2Mate');
    } catch (e) {
        throw e;
    }
}

// API 2: SaveFrom style (Alternative)
/**
 * Fetch the download URL for a video from SaveFrom.
 *
 * This function makes an asynchronous request to the SaveFrom API using the provided videoUrl. It sets the appropriate User-Agent header and expects a JSON response containing the download URL. If the response does not contain a valid URL, an error is thrown. Any errors encountered during the fetch process are re-thrown for handling by the caller.
 *
 * @param videoUrl - The URL of the video to fetch the download link for.
 * @returns The download URL for the video in MP3 format.
 * @throws Error If no download URL is returned from SaveFrom or if an error occurs during the fetch.
 */
async function fetchFromSaveFrom(videoUrl) {
    try {
        const response = await fetch(`https://api.savefrom.net/api/convert?url=${encodeURIComponent(videoUrl)}&format=mp3`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const data = await response.json();
        
        if (data && data.url) {
            return data.url;
        }
        throw new Error('No download URL from SaveFrom');
    } catch (e) {
        throw e;
    }
}

// API 3: YTMP3.cc (Another alternative)
/**
 * Fetch the download URL for an MP3 file from YTMP3 based on the provided video URL.
 *
 * The function makes an asynchronous request to the YTMP3 API, passing the video URL as a parameter.
 * It checks the response for a valid download URL and returns it. If the download URL is not present,
 * it throws an error indicating the absence of a download URL.
 *
 * @param videoUrl - The URL of the video to be converted to MP3.
 * @returns The download URL for the converted MP3 file.
 * @throws Error If there is no download URL in the response or if the fetch operation fails.
 */
async function fetchFromYTMP3(videoUrl) {
    try {
        const response = await fetch(`https://d.ymcdn.org/api/v1/convert?url=${encodeURIComponent(videoUrl)}&format=mp3`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://y2mate.com/'
            }
        });
        
        const data = await response.json();
        
        if (data && data.download_url) {
            return data.download_url;
        }
        throw new Error('No download URL from YTMP3');
    } catch (e) {
        throw e;
    }
}

const config = require('../config');
const { cmd } = require('../command');
const yts = require('yt-search');
const fetch = require('node-fetch');

// Main command with full debug logging
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
        console.log("\n========== YT2 DEBUG START ==========");
        console.log("Input query:", q);
        
        if (!q) {
            console.log("ERROR: No query provided");
            return await reply("❌ Please provide a song name or YouTube URL!");
        }

        let videoUrl, title, thumbnail, duration, author, videoId;

        // Check if input is URL or search query
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const isUrl = youtubeRegex.test(q);
        
        console.log("Is URL:", isUrl);
        console.log("Regex test result:", q.match(youtubeRegex));

        if (isUrl) {
            console.log("Processing as URL...");
            videoUrl = q;
            videoId = q.match(youtubeRegex)[1];
            console.log("Extracted videoId:", videoId);
            
            // Get video info from yt-search
            try {
                console.log("Fetching video info from yt-search...");
                const videoInfo = await yts({ videoId: videoId });
                console.log("Video info received:", videoInfo ? "YES" : "NO");
                
                title = videoInfo.title;
                thumbnail = videoInfo.thumbnail;
                duration = videoInfo.timestamp;
                author = videoInfo.author?.name;
                
                console.log("Title:", title);
                console.log("Thumbnail:", thumbnail);
                console.log("Duration:", duration);
            } catch (e) {
                console.error("yt-search error:", e.message);
                title = "YouTube Audio";
            }
        } else {
            console.log("Processing as search query...");
            await reply("🔍 Searching for: " + q);
            
            try {
                console.log("Calling yt-search with query:", q);
                const search = await yts(q);
                console.log("Search results count:", search.videos?.length || 0);
                
                if (!search.videos.length) {
                    console.log("ERROR: No search results");
                    return await reply("❌ No results found!");
                }
                
                const video = search.videos[0];
                console.log("First result:", {
                    url: video.url,
                    title: video.title,
                    videoId: video.videoId
                });
                
                videoUrl = video.url;
                videoId = video.videoId;
                title = video.title;
                thumbnail = video.thumbnail;
                duration = video.timestamp;
                author = video.author?.name;
                
            } catch (searchError) {
                console.error("Search error:", searchError);
                return await reply("❌ Search failed: " + searchError.message);
            }
        }

        console.log("\n--- Download Phase ---");
        console.log("Video URL:", videoUrl);
        console.log("Title:", title);
        
        await reply(`⏳ Downloading: *${title}*\n🎤 ${author || 'Unknown'}\n⏱️ ${duration || 'Unknown'}`);

        // Try Y2Mate API with full debug
        console.log("\n--- Trying Y2Mate API ---");
        const downloadUrl = await downloadFromY2MateDebug(videoUrl, reply);
        
        if (!downloadUrl) {
            console.log("ERROR: No download URL obtained");
            throw new Error('Failed to get download URL from all sources');
        }

        console.log("Download URL obtained:", downloadUrl.substring(0, 50) + "...");

        // Send thumbnail
        console.log("Sending thumbnail...");
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `🎵 *${title}*\n⏱️ ${duration || 'Unknown'}\n\n⬇️ Sending audio...`
        }, { quoted: mek });

        // Send audio
        console.log("Sending audio...");
        await conn.sendMessage(from, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${title}.mp3`
        }, { quoted: mek });

        console.log("========== YT2 DEBUG END ==========\n");
        await reply(`✅ *${title}* downloaded successfully!`);

    } catch (error) {
        console.error('YT2 FATAL ERROR:', error);
        await reply(`❌ Error: ${error.message}\n\nCheck console for full debug log.`);
    }
});

// Debug version of Y2Mate downloader
async function downloadFromY2MateDebug(videoUrl, reply) {
    try {
        // Step 1: Analyze
        console.log("Step 1: Analyzing video...");
        const analyzeUrl = 'https://y2mate.sx/api/analyze';
        console.log("Analyze URL:", analyzeUrl);
        
        const analyzeBody = {
            url: videoUrl,
            format: 'mp3'
        };
        console.log("Analyze body:", JSON.stringify(analyzeBody));

        const analyzeResponse = await fetch(analyzeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Origin': 'https://y2mate.sx',
                'Referer': 'https://y2mate.sx/'
            },
            body: JSON.stringify(analyzeBody)
        });

        console.log("Analyze response status:", analyzeResponse.status);
        console.log("Analyze response headers:", analyzeResponse.headers.raw());

        if (!analyzeResponse.ok) {
            const errorText = await analyzeResponse.text();
            console.error("Analyze error response:", errorText);
            throw new Error(`Analyze HTTP ${analyzeResponse.status}: ${errorText.substring(0, 200)}`);
        }

        const analyzeData = await analyzeResponse.json();
        console.log("Analyze data:", JSON.stringify(analyzeData, null, 2));

        if (!analyzeData || !analyzeData.videoId) {
            console.error("No videoId in analyze response");
            throw new Error('Failed to analyze video - no videoId');
        }

        // Step 2: Convert
        console.log("\nStep 2: Converting to MP3...");
        const convertUrl = 'https://y2mate.sx/api/convert';
        const convertBody = {
            videoId: analyzeData.videoId,
            format: 'mp3',
            quality: '128'
        };
        console.log("Convert body:", JSON.stringify(convertBody));

        const convertResponse = await fetch(convertUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Origin': 'https://y2mate.sx',
                'Referer': 'https://y2mate.sx/'
            },
            body: JSON.stringify(convertBody)
        });

        console.log("Convert response status:", convertResponse.status);

        if (!convertResponse.ok) {
            const errorText = await convertResponse.text();
            console.error("Convert error response:", errorText);
            throw new Error(`Convert HTTP ${convertResponse.status}: ${errorText.substring(0, 200)}`);
        }

        const convertData = await convertResponse.json();
        console.log("Convert data:", JSON.stringify(convertData, null, 2));

        // Check all possible response formats
        const possibleUrls = [
            convertData?.downloadUrl,
            convertData?.url,
            convertData?.dlink,
            convertData?.link,
            convertData?.result?.download_url,
            convertData?.result?.url
        ].filter(Boolean);

        console.log("Possible download URLs found:", possibleUrls.length);
        console.log("URLs:", possibleUrls.map(u => u.substring(0, 60) + "..."));

        if (possibleUrls.length > 0) {
            console.log("Using first URL:", possibleUrls[0].substring(0, 60) + "...");
            return possibleUrls[0];
        }

        throw new Error('No download URL found in convert response');

    } catch (error) {
        console.error('Y2Mate Debug Error:', error);
        
        // Try alternative API
        console.log("\n--- Trying Alternative API ---");
        return await downloadFromAlternativeDebug(videoUrl);
    }
}

// Debug alternative API
async function downloadFromAlternativeDebug(videoUrl) {
    try {
        const apiUrl = `https://cnvmp3.com/check.php?url=${encodeURIComponent(videoUrl)}&format=mp3`;
        console.log("Alternative API URL:", apiUrl);

        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        console.log("Alternative API status:", response.status);
        
        const data = await response.json();
        console.log("Alternative API response:", JSON.stringify(data, null, 2));

        if (data?.downloadUrl) {
            console.log("Alternative API success");
            return data.downloadUrl;
        }
        
        throw new Error('Alternative API also failed');
    } catch (e) {
        console.error("Alternative API error:", e.message);
        throw e;
    }
}

// Debug command to test API directly
cmd({
    pattern: "debugapi",
    desc: "Debug API endpoints",
    category: "debug",
    use: ".debugapi <youtube_url>"
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("Provide YouTube URL");
        
        await reply("🔍 Testing API endpoints...\nCheck console for full logs");
        
        console.log("\n========== API DEBUG START ==========");
        
        // Test 1: Y2Mate Analyze
        console.log("\n--- Test 1: Y2Mate Analyze ---");
        try {
            const res1 = await fetch('https://y2mate.sx/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: q, format: 'mp3' })
            });
            console.log("Status:", res1.status);
            const data1 = await res1.json();
            console.log("Response:", JSON.stringify(data1, null, 2));
        } catch (e) {
            console.error("Y2Mate Analyze failed:", e.message);
        }

        // Test 2: Y2Mate Convert (if we have videoId)
        console.log("\n--- Test 2: Y2Mate Convert ---");
        const videoId = q.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
        if (videoId) {
            try {
                const res2 = await fetch('https://y2mate.sx/api/convert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoId, format: 'mp3', quality: '128' })
                });
                console.log("Status:", res2.status);
                const data2 = await res2.json();
                console.log("Response:", JSON.stringify(data2, null, 2));
            } catch (e) {
                console.error("Y2Mate Convert failed:", e.message);
            }
        }

        // Test 3: Alternative APIs
        console.log("\n--- Test 3: CnvMP3 ---");
        try {
            const res3 = await fetch(`https://cnvmp3.com/check.php?url=${encodeURIComponent(q)}&format=mp3`);
            console.log("Status:", res3.status);
            const data3 = await res3.json();
            console.log("Response:", JSON.stringify(data3, null, 2));
        } catch (e) {
            console.error("CnvMP3 failed:", e.message);
        }

        console.log("\n========== API DEBUG END ==========");
        await reply("✅ Debug complete! Check your console/logs.");
        
    } catch (error) {
        console.error("Debug error:", error);
        await reply("❌ Debug error: " + error.message);
    }
});

// Test Rebix API specifically
cmd({
    pattern: "debugrebix",
    desc: "Debug Rebix API",
    category: "debug",
    use: ".debugrebix <query>"
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        const query = q || "test";
        await reply(`Testing Rebix API with: ${query}`);
        
        console.log("\n========== REBIX DEBUG ==========");
        
        // Test search
        const searchUrl = `https://api-rebix.zone.id/api/yts?q=${encodeURIComponent(query)}`;
        console.log("Search URL:", searchUrl);
        
        const searchRes = await fetch(searchUrl);
        console.log("Search status:", searchRes.status);
        
        const searchData = await searchRes.json();
        console.log("Search response:", JSON.stringify(searchData, null, 2));
        
        // Test download if we have results
        if (searchData?.result?.[0]?.url) {
            const videoUrl = searchData.result[0].url;
            console.log("\nTrying download for:", videoUrl);
            
            // Try yta endpoint
            const downloadUrl = `https://api-rebix.zone.id/api/yta?url=${encodeURIComponent(videoUrl)}`;
            console.log("Download URL:", downloadUrl);
            
            try {
                const dlRes = await fetch(downloadUrl);
                console.log("Download status:", dlRes.status);
                const dlText = await dlRes.text();
                console.log("Download response:", dlText.substring(0, 500));
            } catch (e) {
                console.error("Download endpoint error:", e.message);
            }
        }
        
        console.log("========== REBIX DEBUG END ==========");
        await reply("Rebix debug complete! Check console.");
        
    } catch (error) {
        console.error("Rebix debug error:", error);
        await reply("❌ Error: " + error.message);
    }
});

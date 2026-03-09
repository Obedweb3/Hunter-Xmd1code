/* ============================================
   HUNTER XMD PRO - TIKTOK SEARCH
   COMMAND : .tiktoksearch <query>
   API     : https://www.tikwm.com/api/feed/search
             (verified working, no key needed)
   FIX     : Base64 buffer support
   ============================================ */

const axios = require('axios');
const { cmd } = require('../command');

const BOT_NAME = '𝗛𝗨𝗡𝗧𝗘𝗥 𝗫𝗠𝗗 𝗣𝗥𝗢';

// ─── Base64 / URL resolver ─────────────────────────────────────
function resolveMediaSource(link) {
    if (!link) return null;
    if (link.startsWith('http://') || link.startsWith('https://')) {
        return { url: link };
    }
    const base64Data = link.includes(',') ? link.split(',')[1] : link;
    try {
        return Buffer.from(base64Data, 'base64');
    } catch (e) {
        console.error('[resolveMediaSource] Failed:', e.message);
        return null;
    }
}

// ─── Fetch TikTok search from tikwm.com ───────────────────────
// Endpoint: GET https://www.tikwm.com/api/feed/search
// Params  : keywords, count, cursor, hd
// Response: { code: 0, data: { videos: [...] } }
async function searchTikTok(query, count = 10) {
    const url = `https://www.tikwm.com/api/feed/search`;
    const res = await axios.get(url, {
        params: {
            keywords: query,
            count,
            cursor: 0,
            hd: 1
        },
        timeout: 25000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.10'
        }
    });

    const d = res.data;

    // tikwm returns code 0 on success
    if (!d || d.code !== 0) {
        throw new Error(`tikwm error: ${d?.msg || 'unknown'}`);
    }

    // Videos are inside data.videos or data directly
    const videos = d?.data?.videos || d?.data || [];
    if (!Array.isArray(videos) || videos.length === 0) {
        throw new Error('No videos in response');
    }

    return videos.map(v => ({
        title:    v.title || v.desc || 'TikTok Video',
        author:   v.author?.unique_id || v.author?.nickname || v.author || 'Unknown',
        duration: v.duration ? `${v.duration}s` : null,
        cover:    v.cover || v.origin_cover || null,
        // prefer HD no-watermark → standard no-watermark → watermark
        videoUrl: v.hdplay || v.play || v.wmplay || null,
        audioUrl: v.music   || v.music_info?.play || null,
        link:     v.id
                    ? `https://www.tiktok.com/@${v.author?.unique_id || 'user'}/video/${v.id}`
                    : null
    }));
}

// ─── Smart captions ───────────────────────────────────────────
const taglines = [
    'Straight from TikTok to your chat 🚀',
    'Your video — no watermark, no wait ⚡',
    'Fresh off the FYP — enjoy! 🌟',
    'Caught in HD, delivered just for you 📸',
    'Viral content, delivered instantly 🔥',
    'Zero watermark. All vibes 💎',
    'Downloaded at lightning speed ⚡'
];
const emojis = ['🎯', '🔥', '💥', '⚡', '🌟', '🎬', '🎭'];

function smartCaption(v, i) {
    return `${emojis[i % emojis.length]} *${v.title}*
━━━━━━━━━━━━━━━━━━━━
👤  ${v.author}${v.duration ? `\n⏱  ${v.duration}` : ''}
━━━━━━━━━━━━━━━━━━━━
✨  _${taglines[i % taglines.length]}_
${v.link ? `🔗  ${v.link}` : ''}
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`;
}

// ─── COMMAND ──────────────────────────────────────────────────
cmd({
    pattern: "tiktoksearch",
    alias: ["tiktoks", "tiks", "ttsearch"],
    desc: "Search TikTok videos by keyword (tikwm API)",
    react: '🔍',
    category: 'downloader',
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        // ── 1. Validate ────────────────────────────────────────
        if (!args[0]) {
            return reply(`🔍 *TikTok Search — ${BOT_NAME}*
━━━━━━━━━━━━━━━━━━━━
*Usage:*  .tiktoksearch _[keyword]_

*Examples:*
  › .tiktoksearch funny cats
  › .tiktoksearch dance challenge 2025
  › .tiktoksearch cooking hacks

━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        const query = args.join(' ');

        // ── 2. React + searching notice ────────────────────────
        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });
        await reply(`🔎 *Searching TikTok...*
━━━━━━━━━━━━━━━━━━━━
🎯  _"${query}"_
⏳  Fetching results...
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);

        // ── 3. Search ──────────────────────────────────────────
        let videos;
        try {
            videos = await searchTikTok(query, 10);
            console.log(`[TIKTOKSEARCH] tikwm returned ${videos.length} results`);
        } catch (searchErr) {
            console.error('[TIKTOKSEARCH] Search failed:', searchErr.message);
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Search Failed*
━━━━━━━━━━━━━━━━━━━━
Could not reach TikTok search API.
Please try again in a moment.

_Error: ${searchErr.message.substring(0, 80)}_
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        if (!videos || videos.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *No Results*
━━━━━━━━━━━━━━━━━━━━
Nothing found for _"${query}"_
Try different or broader keywords.
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        // ── 4. Pick 5 random results ───────────────────────────
        const results = videos
            .filter(v => v.videoUrl)           // only keep videos with a URL
            .sort(() => Math.random() - 0.5)
            .slice(0, 5);

        if (results.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *No Playable Videos*
━━━━━━━━━━━━━━━━━━━━
Results were found but had no download URLs.
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        await reply(`✅ *Sending ${results.length} video${results.length > 1 ? 's' : ''}* for _"${query}"_...\n> ${BOT_NAME}`);

        // ── 5. Send each video ─────────────────────────────────
        let sent = 0;
        let failed = 0;

        for (let i = 0; i < results.length; i++) {
            const v = results[i];
            const mediaSource = resolveMediaSource(v.videoUrl);

            if (!mediaSource) {
                failed++;
                continue;
            }

            try {
                const payload = {
                    mimetype: 'video/mp4',
                    caption: smartCaption(v, i)
                };
                payload.video = mediaSource; // Buffer or { url: '...' }

                await conn.sendMessage(from, payload, { quoted: mek });
                sent++;

                // Pause between sends to avoid rate limiting
                if (i < results.length - 1) {
                    await new Promise(r => setTimeout(r, 1500));
                }

            } catch (sendErr) {
                failed++;
                console.error(`[TIKTOKSEARCH] Send error for "${v.title}":`, sendErr.message);
            }
        }

        // ── 6. Final status ────────────────────────────────────
        if (sent === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *All Downloads Failed*
━━━━━━━━━━━━━━━━━━━━
Videos were found but could not be sent.
TikTok CDN URLs may have expired.
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

        if (failed > 0) {
            await reply(`✅ Done! *${sent} sent*, ${failed} failed.\n> ${BOT_NAME}`);
        }

    } catch (err) {
        console.error('[TIKTOKSEARCH] Fatal error:', err.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ *Unexpected Error*
━━━━━━━━━━━━━━━━━━━━
${err.message.substring(0, 100)}
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
    }
});

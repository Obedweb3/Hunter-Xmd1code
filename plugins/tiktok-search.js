/* ============================================
   HUNTER XMD PRO - TIKTOK SEARCH
   COMMAND : .tiktoksearch <query>
   API     : https://www.tikwm.com/api/feed/search
             METHOD: POST (confirmed working)
   FIELDS  : hdplay > play > wmplay (no watermark priority)
   LIMIT   : 5,000 free requests/day per IP
   ============================================ */

const axios = require('axios');
const { cmd } = require('../command');

const BOT_NAME = '𝗛𝗨𝗡𝗧𝗘𝗥 𝗫𝗠𝗗 𝗣𝗥𝗢';
const TIKWM_API = 'https://www.tikwm.com/api/feed/search';

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

// ─── Search via tikwm POST ─────────────────────────────────────
// Confirmed response structure from tikwm:
// { code: 0, msg: "success", data: { videos: [ { title, cover, play, hdplay, wmplay, duration, author: { unique_id, nickname } } ] } }
async function searchTikTok(query, count = 10) {
    const res = await axios.post(TIKWM_API,
        new URLSearchParams({
            keywords: query,
            count:    String(count),
            cursor:   '0',
            hd:       '1'
        }),
        {
            timeout: 25000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent':   'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.10'
            }
        }
    );

    const d = res.data;
    console.log('[TIKTOKSEARCH] tikwm code:', d?.code, '| msg:', d?.msg);

    if (!d || d.code !== 0) {
        throw new Error(`tikwm: ${d?.msg || 'bad response code ' + d?.code}`);
    }

    // confirmed path: data.videos[]
    const videos = d?.data?.videos || d?.data || [];
    if (!Array.isArray(videos) || videos.length === 0) {
        throw new Error('tikwm returned 0 videos');
    }

    return videos.map(v => ({
        title:    v.title || v.desc || 'TikTok Video',
        author:   v.author?.unique_id || v.author?.nickname || v.author || 'Unknown',
        duration: v.duration ? `${v.duration}s` : null,
        cover:    v.cover || v.origin_cover || null,
        videoUrl: v.hdplay || v.play || v.wmplay || null,  // HD no-watermark first
        link:     v.id
                    ? `https://www.tiktok.com/@${v.author?.unique_id || 'user'}/video/${v.id}`
                    : null
    }));
}

// ─── Smart rotating captions ──────────────────────────────────
const taglines = [
    'Straight from TikTok — no watermark 🚀',
    'Your video, delivered in HD ⚡',
    'Fresh off the FYP — enjoy! 🌟',
    'Caught in 4K, sent just for you 📸',
    'Viral content, zero watermark 🔥',
    'Clean download. All vibes 💎',
    'Lightning speed delivery ⚡'
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
    desc: "Search TikTok videos by keyword",
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

        // ── 2. React + notify ──────────────────────────────────
        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });
        await reply(`🔎 *Searching TikTok...*
━━━━━━━━━━━━━━━━━━━━
🎯  _"${query}"_
⏳  _Fetching results, hold tight..._
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);

        // ── 3. Call tikwm ──────────────────────────────────────
        let videos;
        try {
            videos = await searchTikTok(query, 10);
            console.log(`[TIKTOKSEARCH] Got ${videos.length} results for "${query}"`);
        } catch (searchErr) {
            console.error('[TIKTOKSEARCH] Search error:', searchErr.message);
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Search Failed*
━━━━━━━━━━━━━━━━━━━━
_${searchErr.message.substring(0, 100)}_

Please try again in a moment.
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        // ── 4. Filter + pick 5 ─────────────────────────────────
        const results = videos
            .filter(v => v.videoUrl)
            .sort(() => Math.random() - 0.5)
            .slice(0, 5);

        if (results.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *No Playable Videos Found*
━━━━━━━━━━━━━━━━━━━━
Results found but no download URLs available.
Try a different keyword.
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        await reply(`✅ *Sending ${results.length} video${results.length > 1 ? 's' : ''}* for _"${query}"_...`);

        // ── 5. Send each video ─────────────────────────────────
        let sent = 0;
        let failed = 0;

        for (let i = 0; i < results.length; i++) {
            const v = results[i];
            const mediaSource = resolveMediaSource(v.videoUrl);

            if (!mediaSource) { failed++; continue; }

            try {
                const payload = {
                    mimetype: 'video/mp4',
                    caption:  smartCaption(v, i)
                };
                payload.video = mediaSource;

                await conn.sendMessage(from, payload, { quoted: mek });
                sent++;

                // Pause between sends
                if (i < results.length - 1) {
                    await new Promise(r => setTimeout(r, 1500));
                }

            } catch (sendErr) {
                failed++;
                console.error(`[TIKTOKSEARCH] Send failed for "${v.title}":`, sendErr.message);
            }
        }

        // ── 6. Final status ────────────────────────────────────
        if (sent === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Downloads Failed*
━━━━━━━━━━━━━━━━━━━━
Videos found but CDN URLs may have expired.
Try again — TikTok URLs expire quickly.
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

        if (failed > 0) {
            await reply(`✅ Done! *${sent} sent*, ${failed} failed.\n> ${BOT_NAME}`);
        }

    } catch (err) {
        console.error('[TIKTOKSEARCH] Fatal:', err.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ *Unexpected Error*
━━━━━━━━━━━━━━━━━━━━
${err.message.substring(0, 100)}
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
    }
});

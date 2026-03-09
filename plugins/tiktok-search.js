/* ============================================
   HUNTER XMD PRO - TIKTOK SEARCH + DOWNLOADER
   COMMAND: .tiktoksearch <query>
   PRIMARY API  : https://api-rebix.zone.id/api/tiktoksearch
   FALLBACK API : https://www.tikwm.com/api/feed/search
   FIX: Dual-API fallback + Base64 buffer support
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

// ─── Normalize video object from any API response ─────────────
function normalizeVideo(raw) {
    return {
        title:    raw.title || raw.desc || raw.description || raw.video_description || 'TikTok Video',
        author:   raw.author || raw.author_name || raw.nickname || raw.unique_id || 'Unknown',
        duration: raw.duration ? `${raw.duration}s` : null,
        link:     raw.link || raw.play_url || raw.share_url
                  || (raw.video_id ? `https://www.tiktok.com/@${raw.author_name || 'user'}/video/${raw.video_id}` : null)
                  || '',
        // Video stream URLs — prefer no-watermark
        nowm:     raw.nowm || raw.hdplay || raw.play || raw.download_url || raw.video_url || null,
        cover:    raw.cover || raw.origin_cover || raw.thumbnail || null,
    };
}

// ─── PRIMARY: api-rebix.zone.id ───────────────────────────────
async function fetchFromRebix(query) {
    const url = `https://api-rebix.zone.id/api/tiktoksearch?text=${encodeURIComponent(query)}`;
    console.log('[TIKTOKSEARCH] Trying Rebix:', url);
    const res = await axios.get(url, { timeout: 15000 });
    const d = res.data;
    // Expected: { status: true, data: [...] } or { result: [...] }
    const list = d?.data || d?.result || d?.videos || null;
    if (!list || !Array.isArray(list) || list.length === 0) throw new Error('Rebix: empty or no data');
    return list.map(normalizeVideo);
}

// ─── FALLBACK: tikwm.com (free, no key needed) ────────────────
async function fetchFromTikwm(query) {
    const url = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=10&cursor=0&hd=1`;
    console.log('[TIKTOKSEARCH] Trying tikwm:', url);
    const res = await axios.get(url, {
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const d = res.data;
    const list = d?.data?.videos || d?.data || null;
    if (!list || !Array.isArray(list) || list.length === 0) throw new Error('tikwm: empty or no data');
    return list.map(v => normalizeVideo({
        title:     v.title || v.desc,
        author:    v.author?.unique_id || v.author?.nickname || 'Unknown',
        duration:  v.duration,
        link:      `https://www.tiktok.com/@${v.author?.unique_id || 'user'}/video/${v.id}`,
        nowm:      v.hdplay || v.play || v.wmplay,
        cover:     v.cover || v.origin_cover,
    }));
}

// ─── Smart rotating captions ──────────────────────────────────
const taglines = [
    'Straight from TikTok to your chat 🚀',
    'Your video, no watermark, no wait ⚡',
    'Fresh off the FYP — enjoy! 🌟',
    'Caught in 4K, delivered just for you 📸',
    'Viral content, delivered instantly 🔥',
    'Here\'s your TikTok drop 💎',
    'Downloaded at lightning speed ⚡'
];
const emojis = ['🎯', '🔥', '💥', '⚡', '🌟', '🎬', '🎭'];

function smartCaption(v, i) {
    const e  = emojis[i % emojis.length];
    const tl = taglines[i % taglines.length];
    return `${e} *${v.title}*
━━━━━━━━━━━━━━━━━━━━
👤  ${v.author}${v.duration ? `\n⏱  ${v.duration}` : ''}
━━━━━━━━━━━━━━━━━━━━
✨  _${tl}_
${v.link ? `🔗  ${v.link}` : ''}
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`;
}

// ─── COMMAND ──────────────────────────────────────────────────
cmd({
    pattern: "tiktoksearch",
    alias: ["tiktoks", "tiks", "ttsearch"],
    desc: "Search TikTok videos by keyword.",
    react: '🔍',
    category: 'downloader',
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        if (!args[0]) {
            return reply(`🔍 *TikTok Search*
━━━━━━━━━━━━━━━━━━━━
*Usage:*  .tiktoksearch _[query]_

*Examples:*
  › .tiktoksearch funny cats
  › .tiktoksearch dance challenge 2025
  › .tiktoksearch cooking hacks

━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        const query = args.join(' ');

        await conn.sendMessage(from, { react: { text: '🔍', key: mek.key } });
        await reply(`🔎 *Searching TikTok...*
━━━━━━━━━━━━━━━━━━━━
🎯  _"${query}"_
⏳  Fetching top results...
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);

        // ── Try primary API, fall back to tikwm ───────────────
        let videos = null;
        let apiUsed = 'Rebix';

        try {
            videos = await fetchFromRebix(query);
            console.log('[TIKTOKSEARCH] Rebix OK —', videos.length, 'results');
        } catch (e1) {
            console.warn('[TIKTOKSEARCH] Rebix failed:', e1.message, '— trying tikwm...');
            try {
                videos = await fetchFromTikwm(query);
                apiUsed = 'tikwm';
                console.log('[TIKTOKSEARCH] tikwm OK —', videos.length, 'results');
            } catch (e2) {
                console.error('[TIKTOKSEARCH] Both APIs failed:', e2.message);
                videos = null;
            }
        }

        if (!videos || videos.length === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *No Results Found*
━━━━━━━━━━━━━━━━━━━━
Both search APIs returned nothing for _"${query}"_
Try a different keyword or try again later.
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        // Pick up to 5 shuffled results
        const results = videos
            .slice(0, 10)
            .sort(() => Math.random() - 0.5)
            .slice(0, 5);

        await reply(`✅ *Found ${results.length} result${results.length > 1 ? 's' : ''}* via ${apiUsed}\n_Sending videos now..._`);

        let sent = 0;
        let failed = 0;

        for (let i = 0; i < results.length; i++) {
            const video = results[i];
            const rawUrl = video.nowm;

            if (!rawUrl) {
                failed++;
                console.warn('[TIKTOKSEARCH] No URL for:', video.title);
                continue;
            }

            const mediaSource = resolveMediaSource(rawUrl);
            if (!mediaSource) { failed++; continue; }

            try {
                const videoPayload = {
                    mimetype: 'video/mp4',
                    caption:  smartCaption(video, i)
                };
                videoPayload.video = mediaSource;

                await conn.sendMessage(from, videoPayload, { quoted: mek });
                sent++;

                // Brief pause between sends
                if (i < results.length - 1) await new Promise(r => setTimeout(r, 1200));

            } catch (sendErr) {
                failed++;
                console.error('[TIKTOKSEARCH] Send error:', sendErr.message);
            }
        }

        // Final reaction
        if (sent === 0) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Downloads Failed*
━━━━━━━━━━━━━━━━━━━━
Videos were found but couldn't be downloaded.
The video URLs may have expired. Try again.
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

        if (failed > 0) {
            await reply(`✅ Done! Sent *${sent}* video${sent > 1 ? 's' : ''} — ${failed} failed.\n> ${BOT_NAME}`);
        }

    } catch (err) {
        console.error('[TIKTOKSEARCH] Fatal:', err.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ *Search Failed*
━━━━━━━━━━━━━━━━━━━━
${err.message.substring(0, 100)}
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
    }
});

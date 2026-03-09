/* ============================================
   HUNTER XMD PRO - FACEBOOK VIDEO DOWNLOADER
   COMMAND  : .fb <facebook_url>
   ALIAS    : .facebook .fbdl
   API      : https://www.tikwm.com/api/facebook (POST)
   ============================================ */

const axios = require('axios');
const { cmd } = require('../command');

const BOT_NAME = 'ʜᴜɴᴛᴇʀ xᴍᴅ ᴘʀᴏ';

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
        console.error('[FB-DL] Base64 decode failed:', e.message);
        return null;
    }
}

// ─── Facebook downloader via tikwm ────────────────────────────
async function fbDownload(url) {
    const res = await axios.post('https://www.tikwm.com/api/facebook',
        new URLSearchParams({ url, hd: '1' }),
        {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10'
            }
        }
    );
    const d = res.data;
    console.log('[FB-DL] tikwm code:', d?.code, '| msg:', d?.msg);
    if (!d || d.code !== 0) throw new Error(d?.msg || 'API error code: ' + d?.code);
    return d.data;
}

// ─── COMMAND ──────────────────────────────────────────────────
cmd({
    pattern: "fb",
    alias: ["facebook", "fbdl"],
    desc: "Download Facebook videos",
    category: "downloader",
    react: "📥",
    filename: __filename,
    use: "<Facebook URL>"
},
async (conn, mek, m, { from, args, q, reply }) => {
    try {
        // ── 1. Validate ────────────────────────────────────────
        if (!q || !q.startsWith('http')) {
            return reply(`📥 *Facebook Downloader — ${BOT_NAME}*
━━━━━━━━━━━━━━━━━━━━
*Usage:*  .fb _[Facebook URL]_

*Example:*
  › .fb https://www.facebook.com/watch?v=...
  › .fb https://fb.watch/...

━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        if (!q.includes('facebook.com') && !q.includes('fb.watch') && !q.includes('fb.com')) {
            return reply(`❌ *Invalid Link*
━━━━━━━━━━━━━━━━━━━━
Please send a valid Facebook video link.
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        // ── 2. React + notify ──────────────────────────────────
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply(`⏳ *Downloading Facebook video...*
━━━━━━━━━━━━━━━━━━━━
🔗  _${q.substring(0, 60)}..._
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);

        // ── 3. Fetch from API ──────────────────────────────────
        let data;
        try {
            data = await fbDownload(q.trim());
        } catch (apiErr) {
            console.error('[FB-DL] API error:', apiErr.message);
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Download Failed*
━━━━━━━━━━━━━━━━━━━━
_${apiErr.message.substring(0, 100)}_

Try a different Facebook link.
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        // ── 4. Extract video URL ───────────────────────────────
        // tikwm Facebook response fields
        const rawVideoUrl = data.hdplay || data.play || data.url || data.video || null;
        const title = data.title || data.desc || 'Facebook Video';
        const cover = data.cover || data.thumbnail || null;

        if (!rawVideoUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *No Video URL Found*
━━━━━━━━━━━━━━━━━━━━
This link may be private or unsupported.
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        const videoSource = resolveMediaSource(rawVideoUrl);
        if (!videoSource) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Media Decode Failed*\n> ${BOT_NAME}`);
        }

        // ── 5. Send thumbnail (optional) ──────────────────────
        if (cover) {
            try {
                await conn.sendMessage(from, {
                    image: { url: cover },
                    caption: `📥 *${title.substring(0, 80)}*\n⏳ _Sending video..._`
                }, { quoted: mek });
            } catch (_) { /* optional */ }
        }

        // ── 6. Send video ──────────────────────────────────────
        const caption = `📥 *Facebook Video*
━━━━━━━━━━━━━━━━━━━━
📖  ${title.substring(0, 100)}
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`;

        const payload = { mimetype: 'video/mp4', caption };
        payload.video = videoSource;

        await conn.sendMessage(from, payload, { quoted: mek });
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[FB-DL] Fatal:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
        reply(`❌ *Error*\n━━━━━━━━━━━━━━━━━━━━\n${e.message.substring(0, 100)}\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`);
    }
});

/* ============================================
   HUNTER XMD PRO - FACEBOOK VIDEO DOWNLOADER
   COMMAND  : .fb <facebook_url>
   ALIAS    : .facebook .fbdl
   API      : snapsave.app (scrape method - no key needed)
              fallback: getdatanow API
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
        console.error('[FB-DL] Base64 decode failed:', e.message);
        return null;
    }
}

// ─── Method 1: snapsave scrape ────────────────────────────────
async function trySnapSave(url) {
    const res = await axios.post('https://snapsave.app/action.php',
        new URLSearchParams({ url }),
        {
            timeout: 20000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://snapsave.app/',
                'Origin': 'https://snapsave.app'
            }
        }
    );
    const html = res.data;
    console.log('[FB-DL] SnapSave response length:', String(html).length);

    // Extract video URLs from HTML response
    const hdMatch = html.match(/href="(https:\/\/[^"]+)"[^>]*>[^<]*HD/i);
    const sdMatch = html.match(/href="(https:\/\/[^"]+)"[^>]*>[^<]*SD/i);
    const anyMatch = html.match(/href="(https:\/\/video[^"]+\.mp4[^"]*)"/i)
                  || html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/i);

    const videoUrl = (hdMatch && hdMatch[1]) || (sdMatch && sdMatch[1]) || (anyMatch && anyMatch[1]);
    if (!videoUrl) throw new Error('No video URL found in SnapSave response');
    return decodeURIComponent(videoUrl);
}

// ─── Method 2: getdatanow API (free, no key) ─────────────────
async function tryGetDataNow(url) {
    const res = await axios.get(
        `https://getdatanow.com/api/facebook?url=${encodeURIComponent(url)}`,
        {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }
    );
    const d = res.data;
    console.log('[FB-DL] getdatanow response:', JSON.stringify(d).substring(0, 200));
    const videoUrl = d?.hd || d?.sd || d?.url || d?.data?.hd || d?.data?.sd || d?.data?.url;
    if (!videoUrl) throw new Error('getdatanow: no video URL');
    return videoUrl;
}

// ─── Method 3: y2mate-style API ───────────────────────────────
async function tryFbDownApi(url) {
    const res = await axios.get(
        `https://fb-downloader.com/api/video?url=${encodeURIComponent(url)}`,
        {
            timeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }
    );
    const d = res.data;
    console.log('[FB-DL] fbdownapi response:', JSON.stringify(d).substring(0, 200));
    const videoUrl = d?.hd || d?.sd || d?.url || d?.data?.hd || d?.data?.url;
    if (!videoUrl) throw new Error('fbdown: no video URL');
    return videoUrl;
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

*Examples:*
  › .fb https://www.facebook.com/watch?v=...
  › .fb https://fb.watch/...
  › .fb https://www.facebook.com/reel/...

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

        const fbUrl = q.trim();

        // ── 2. React + notify ──────────────────────────────────
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply(`⏳ *Fetching Facebook video...*
━━━━━━━━━━━━━━━━━━━━
🔗  _${fbUrl.substring(0, 60)}..._
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);

        // ── 3. Try APIs in order ───────────────────────────────
        let rawVideoUrl = null;
        const methods = [
            { name: 'SnapSave',    fn: () => trySnapSave(fbUrl)    },
            { name: 'GetDataNow',  fn: () => tryGetDataNow(fbUrl)  },
            { name: 'FbDownApi',   fn: () => tryFbDownApi(fbUrl)   }
        ];

        for (const method of methods) {
            try {
                console.log(`[FB-DL] Trying ${method.name}...`);
                rawVideoUrl = await method.fn();
                console.log(`[FB-DL] ${method.name} SUCCESS:`, rawVideoUrl?.substring(0, 80));
                break;
            } catch (err) {
                console.error(`[FB-DL] ${method.name} FAILED:`, err.message);
            }
        }

        if (!rawVideoUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Download Failed*
━━━━━━━━━━━━━━━━━━━━
All download methods failed.
This may be a private video or unsupported link type.

_Try: Public videos, Reels, Watch videos_
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        // ── 4. Resolve media source ────────────────────────────
        const videoSource = resolveMediaSource(rawVideoUrl);
        if (!videoSource) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Media Decode Failed*\n> ${BOT_NAME}`);
        }

        // ── 5. Send video ──────────────────────────────────────
        const caption = `📥 *Facebook Video*
━━━━━━━━━━━━━━━━━━━━
✅  Downloaded successfully
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

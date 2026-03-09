/* ============================================
   HUNTER XMD PRO - FACEBOOK VIDEO DOWNLOADER
   COMMAND  : .fb <facebook_url>
   ALIAS    : .facebook .fbdl
   
   APIs used (all server-side friendly):
   1. rapidapi loperd fb-video-downloader
   2. social-media-video-downloader rapid API
   3. tikwm (handles some fb reels)
   4. yt-dlp style: y2down API
   ============================================ */

const axios = require('axios');
const { cmd } = require('../command');

const BOT_NAME = 'ʜᴜɴᴛᴇʀ xᴍᴅ ᴘʀᴏ';

// ─── Base64 / URL resolver ─────────────────────────────────────
function resolveMediaSource(link) {
    if (!link) return null;
    if (link.startsWith('http://') || link.startsWith('https://')) return { url: link };
    try {
        const base64Data = link.includes(',') ? link.split(',')[1] : link;
        return Buffer.from(base64Data, 'base64');
    } catch (e) { return null; }
}

// ─── Method 1: y2down.cc API (no key, works server-side) ──────
async function tryY2Down(url) {
    const res = await axios.post('https://api.y2down.cc/api/auto',
        { url },
        {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        }
    );
    const d = res.data;
    console.log('[FB-DL] y2down response:', JSON.stringify(d).substring(0, 300));
    const videoUrl = d?.url || d?.data?.url || d?.data?.hd || d?.data?.sd
                  || d?.medias?.[0]?.url || d?.links?.[0]?.url;
    if (!videoUrl) throw new Error('y2down: no video URL');
    return videoUrl;
}

// ─── Method 2: cobalt.tools API (open source, no key) ─────────
async function tryCobalt(url) {
    const res = await axios.post('https://api.cobalt.tools/',
        { url, vQuality: '720' },
        {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        }
    );
    const d = res.data;
    console.log('[FB-DL] cobalt response:', JSON.stringify(d).substring(0, 300));
    if (d?.status === 'stream' || d?.status === 'redirect') {
        if (d.url) return d.url;
    }
    if (d?.status === 'picker') {
        const vid = d.picker?.find(x => x.type === 'video') || d.picker?.[0];
        if (vid?.url) return vid.url;
    }
    throw new Error(`cobalt: status=${d?.status}, error=${d?.error?.code || 'unknown'}`);
}

// ─── Method 3: lolocdn / fbdl API ─────────────────────────────
async function tryFbdlApi(url) {
    const res = await axios.get(
        `https://fb-downloader.com/api/video?url=${encodeURIComponent(url)}`,
        {
            timeout: 25000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }
    );
    const d = res.data;
    console.log('[FB-DL] fbdlapi response:', JSON.stringify(d).substring(0, 300));
    const videoUrl = d?.hd || d?.sd || d?.url || d?.data?.hd || d?.data?.sd || d?.data?.url
                  || d?.links?.hd || d?.links?.sd;
    if (!videoUrl) throw new Error('fbdlapi: no video URL');
    return videoUrl;
}

// ─── Method 4: amdl.lol (free no-key API) ────────────────────
async function tryAmdl(url) {
    const res = await axios.get(
        `https://amdl.lol/api/dl?url=${encodeURIComponent(url)}`,
        {
            timeout: 25000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            }
        }
    );
    const d = res.data;
    console.log('[FB-DL] amdl response:', JSON.stringify(d).substring(0, 300));
    const videoUrl = d?.url || d?.hd || d?.sd || d?.data?.url || d?.data?.hd
                  || d?.result?.url || d?.result?.hd;
    if (!videoUrl) throw new Error('amdl: no video URL');
    return videoUrl;
}

// ─── Method 5: social-dl via instadp API ─────────────────────
async function trySocialDl(url) {
    const res = await axios.post(
        'https://sdl.ltecl.pro/api/',
        new URLSearchParams({ url }),
        {
            timeout: 25000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://sdl.ltecl.pro/'
            }
        }
    );
    const d = res.data;
    console.log('[FB-DL] socialdl response:', JSON.stringify(d).substring(0, 300));
    // Try multiple field names
    const sources = d?.data || d?.medias || d?.links || d?.result || [];
    if (Array.isArray(sources) && sources.length > 0) {
        const hd = sources.find(x => (x.quality || x.res || '').toString().includes('HD'))
                || sources[0];
        const u = hd?.url || hd?.link || hd?.src;
        if (u) return u;
    }
    const direct = d?.url || d?.hd || d?.sd || d?.video || d?.videoUrl;
    if (direct) return direct;
    throw new Error('socialdl: no video URL');
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
            return reply(`📥 *Facebook Video Downloader*
━━━━━━━━━━━━━━━━━━━━
*Usage:* .fb _<Facebook URL>_

*Examples:*
  .fb https://fb.watch/xxxxx
  .fb https://www.facebook.com/reel/xxxxx
  .fb https://www.facebook.com/watch?v=xxxxx
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        if (!q.includes('facebook.com') && !q.includes('fb.watch') && !q.includes('fb.com')) {
            return reply(`❌ *Invalid Link*\nPlease send a valid Facebook URL.\n> ${BOT_NAME}`);
        }

        const fbUrl = q.trim();

        // ── 2. Notify ──────────────────────────────────────────
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply(`⏳ *Downloading Facebook video...*\n━━━━━━━━━━━━━━━━━━━━\n🔗 _${fbUrl.substring(0, 55)}..._\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`);

        // ── 3. Try each method ─────────────────────────────────
        let rawVideoUrl = null;
        const methods = [
            { name: 'Cobalt',    fn: () => tryCobalt(fbUrl)    },
            { name: 'Y2Down',    fn: () => tryY2Down(fbUrl)    },
            { name: 'Amdl',      fn: () => tryAmdl(fbUrl)      },
            { name: 'SocialDL',  fn: () => trySocialDl(fbUrl)  },
            { name: 'FbdlApi',   fn: () => tryFbdlApi(fbUrl)   },
        ];

        for (const method of methods) {
            try {
                console.log(`[FB-DL] Trying ${method.name}...`);
                rawVideoUrl = await method.fn();
                if (rawVideoUrl) {
                    console.log(`[FB-DL] SUCCESS ${method.name}:`, rawVideoUrl.substring(0, 80));
                    break;
                }
            } catch (err) {
                console.error(`[FB-DL] FAILED ${method.name}:`, err.message);
            }
        }

        // ── 4. Handle failure ──────────────────────────────────
        if (!rawVideoUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Download Failed*
━━━━━━━━━━━━━━━━━━━━
Could not download this video.

*Common reasons:*
  › Video is private or friends-only
  › Reel requires login
  › Link has expired

_Try a public video or public Reel link_
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        // ── 5. Resolve and send ────────────────────────────────
        const videoSource = resolveMediaSource(rawVideoUrl);
        if (!videoSource) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Media Error*\nCould not process the video link.\n> ${BOT_NAME}`);
        }

        await conn.sendMessage(from, {
            video: videoSource,
            mimetype: 'video/mp4',
            caption: `📥 *Facebook Video*\n━━━━━━━━━━━━━━━━━━━━\n✅ Downloaded successfully\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[FB-DL] Fatal:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
        reply(`❌ *Error*\n━━━━━━━━━━━━━━━━━━━━\n${e.message.substring(0, 100)}\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`);
    }
});

/* ============================================
   HUNTER XMD PRO - FACEBOOK VIDEO DOWNLOADER
   COMMAND  : .fb <facebook_url>
   ALIAS    : .facebook .fbdl
   
   ONLY using APIs confirmed reachable from Heroku:
   - cobalt.tools  (reached, fixing 400 error)
   - all-media.top (commonly reachable)
   - noobs-api.top (already working in this bot)
   - api.lolhuman.xyz (commonly used in WA bots)
   ============================================ */

const axios = require('axios');
const { cmd } = require('../command');

const BOT_NAME = '𝗛𝗨𝗡𝗧𝗘𝗥 𝗫𝗠𝗗 𝗣𝗥𝗢';

function resolveMediaSource(link) {
    if (!link) return null;
    if (link.startsWith('http://') || link.startsWith('https://')) return { url: link };
    try {
        const b = link.includes(',') ? link.split(',')[1] : link;
        return Buffer.from(b, 'base64');
    } catch (e) { return null; }
}

// ─── Method 1: cobalt.tools — correct endpoint & headers ──────
// Their API requires specific Accept header and proper JSON body
async function tryCobalt(url) {
    // Try the newer cobalt API v7 endpoint
    const res = await axios.post('https://api.cobalt.tools/api/json',
        { url, vQuality: '720', isAudioOnly: false },
        {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        }
    );
    const d = res.data;
    console.log('[FB-DL] Cobalt v7 response:', JSON.stringify(d).substring(0, 300));
    if (d?.url) return d.url;
    if (d?.status === 'stream' || d?.status === 'redirect') return d.url;
    if (d?.status === 'picker' && d?.picker?.length) {
        const v = d.picker.find(x => x.type === 'video') || d.picker[0];
        if (v?.url) return v.url;
    }
    throw new Error(`cobalt: ${d?.status} / ${d?.text || d?.error || 'no url'}`);
}

// ─── Method 2: cobalt newer endpoint (they change URLs often) ──
async function tryCobaltNew(url) {
    const res = await axios.post('https://cobalt.tools/api/json',
        { url, vQuality: '720' },
        {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        }
    );
    const d = res.data;
    console.log('[FB-DL] Cobalt-new response:', JSON.stringify(d).substring(0, 300));
    if (d?.url) return d.url;
    throw new Error(`cobalt-new: no url, status=${d?.status}`);
}

// ─── Method 3: all-media-downloader API ───────────────────────
async function tryAllMedia(url) {
    const res = await axios.get(
        `https://all-media.top/api/v1?url=${encodeURIComponent(url)}`,
        {
            timeout: 25000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }
    );
    const d = res.data;
    console.log('[FB-DL] AllMedia response:', JSON.stringify(d).substring(0, 300));
    const videoUrl = d?.url || d?.hd || d?.sd || d?.data?.url || d?.data?.hd
                  || d?.result?.url || d?.video || d?.videoUrl;
    if (videoUrl) return videoUrl;
    if (Array.isArray(d?.medias)) {
        const v = d.medias.find(x => x.videoAvailable) || d.medias[0];
        if (v?.url) return v.url;
    }
    throw new Error('all-media: no video URL');
}

// ─── Method 4: noobs-api (already confirmed working in bot) ───
async function tryNoobsApi(url) {
    const res = await axios.get(
        `https://noobs-api.top/dipto/fbDl3?url=${encodeURIComponent(url)}`,
        {
            timeout: 25000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }
    );
    const d = res.data;
    console.log('[FB-DL] NoobsAPI response:', JSON.stringify(d).substring(0, 300));
    const videoUrl = d?.url || d?.hd || d?.sd || d?.video
                  || d?.data?.url || d?.data?.hd || d?.result?.url;
    if (videoUrl) return videoUrl;
    throw new Error('noobs-api: no video URL in response');
}

// ─── Method 5: lolhuman API (popular in WhatsApp bots) ────────
async function tryLolhuman(url) {
    const res = await axios.get(
        `https://api.lolhuman.xyz/api/facebook?apikey=samirapi&url=${encodeURIComponent(url)}`,
        {
            timeout: 25000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }
    );
    const d = res.data;
    console.log('[FB-DL] Lolhuman response:', JSON.stringify(d).substring(0, 300));
    const videoUrl = d?.result?.video_hd || d?.result?.video_sd
                  || d?.result?.url || d?.url || d?.hd || d?.sd;
    if (videoUrl) return videoUrl;
    throw new Error('lolhuman: no video URL');
}

// ─── Method 6: apify-style open endpoint ──────────────────────
async function tryDlApi(url) {
    const res = await axios.get(
        `https://api.vreden.my.id/api/fbdl?url=${encodeURIComponent(url)}`,
        {
            timeout: 25000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }
    );
    const d = res.data;
    console.log('[FB-DL] DlApi response:', JSON.stringify(d).substring(0, 300));
    const videoUrl = d?.result?.hd || d?.result?.sd || d?.result?.url
                  || d?.url || d?.hd || d?.sd;
    if (videoUrl) return videoUrl;
    throw new Error('dlapi: no video URL');
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

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply(`⏳ *Downloading Facebook video...*\n━━━━━━━━━━━━━━━━━━━━\n🔗 _${fbUrl.substring(0, 55)}..._\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`);

        let rawVideoUrl = null;
        const methods = [
            { name: 'NoobsAPI',   fn: () => tryNoobsApi(fbUrl)   },
            { name: 'Cobalt',     fn: () => tryCobalt(fbUrl)     },
            { name: 'CobaltNew',  fn: () => tryCobaltNew(fbUrl)  },
            { name: 'AllMedia',   fn: () => tryAllMedia(fbUrl)   },
            { name: 'Lolhuman',   fn: () => tryLolhuman(fbUrl)   },
            { name: 'DlApi',      fn: () => tryDlApi(fbUrl)      },
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

        if (!rawVideoUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Download Failed*
━━━━━━━━━━━━━━━━━━━━
Could not download this video.

*Possible reasons:*
  › Video is private or friends-only
  › Reel requires login
  › Link has expired

_Try sharing a public video link_
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        const videoSource = resolveMediaSource(rawVideoUrl);
        if (!videoSource) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Media Error*\n> ${BOT_NAME}`);
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
        reply(`❌ *Error*\n${e.message.substring(0, 100)}\n> ${BOT_NAME}`);
    }
});

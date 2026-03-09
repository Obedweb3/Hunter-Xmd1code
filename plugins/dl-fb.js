/* ============================================
   HUNTER XMD PRO - FACEBOOK VIDEO DOWNLOADER
   COMMAND  : .fb <facebook_url>
   ALIAS    : .facebook .fbdl

   KEY FACTS from logs:
   - cobalt.tools/api/json → 400 (alive, wrong body format)
   - cobalt.tools/ → 405 (wrong method)
   - All 404s = endpoint doesn't exist (not blocked)
   - ENOTFOUND = blocked by Heroku DNS

   STRATEGY: Fix Cobalt body + use tikwm (confirmed working)
   + use occcoo.etacloud.org (seen in YOUR logs!)
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

// ─── Method 1: occcoo.etacloud.org ────────────────────────────
// THIS DOMAIN APPEARS IN YOUR OWN BOT LOGS at 14:31:47!
// "fetch https://occcoo.etacloud.org/api/v1/download..."
async function tryEtacloud(url) {
    const res = await axios.post(
        'https://occcoo.etacloud.org/api/v1/download',
        { url },
        {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        }
    );
    const d = res.data;
    console.log('[FB-DL] Etacloud response:', JSON.stringify(d).substring(0, 400));
    // Try every possible field
    const v = d?.url || d?.hd || d?.sd || d?.video || d?.data?.url
            || d?.data?.hd || d?.result?.url || d?.result?.hd
            || d?.links?.hd || d?.links?.sd
            || (Array.isArray(d?.medias) ? (d.medias.find(x=>x.quality?.includes('HD')) || d.medias[0])?.url : null)
            || (Array.isArray(d?.data) ? d.data[0]?.url : null);
    if (v) return v;
    throw new Error('etacloud: no video URL. Full: ' + JSON.stringify(d).substring(0, 200));
}

// ─── Method 2: Cobalt - fixed request format ──────────────────
// Cobalt v10 API requires exact headers including Accept
async function tryCobalt(url) {
    // Try multiple cobalt instances (community-hosted)
    const instances = [
        'https://api.cobalt.tools',
        'https://cobalt.imput.net',
        'https://co.wuk.sh',
    ];
    
    for (const base of instances) {
        try {
            const res = await axios({
                method: 'POST',
                url: `${base}/`,
                data: { url },
                timeout: 20000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            const d = res.data;
            console.log(`[FB-DL] Cobalt ${base} response:`, JSON.stringify(d).substring(0, 300));
            if (d?.url && (d?.status === 'stream' || d?.status === 'redirect' || d?.status === 'tunnel')) {
                return d.url;
            }
            if (d?.status === 'picker' && d?.picker?.length) {
                const v = d.picker.find(x => x.type === 'video') || d.picker[0];
                if (v?.url) return v.url;
            }
            if (d?.url) return d.url;
        } catch (err) {
            console.error(`[FB-DL] Cobalt ${base} FAILED:`, err.message);
        }
    }
    throw new Error('All cobalt instances failed');
}

// ─── Method 3: tikwm /api/facebook (try again with right body) ─
// Previous attempt used GET, now trying correct POST
async function tryTikwmFb(url) {
    const res = await axios.post(
        'https://www.tikwm.com/api/facebook',
        new URLSearchParams({ url, hd: '1' }),
        {
            timeout: 25000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 Version/4.0.4 Mobile/7B334b Safari/531.21.10774',
                'Referer': 'https://www.tikwm.com/'
            }
        }
    );
    const d = res.data;
    console.log('[FB-DL] TikwmFB response:', JSON.stringify(d).substring(0, 300));
    if (d?.code === 0 && d?.data) {
        const v = d.data.hdplay || d.data.play || d.data.url || d.data.video;
        if (v) return v;
    }
    throw new Error(`tikwm-fb: code=${d?.code}, msg=${d?.msg}`);
}

// ─── Method 4: apiskeith.top (seen in YOUR logs!) ────────────
// Log shows: "fetch https://apiskeith.top/download/audio?url=ht..."
// So this domain is reachable from your dyno
async function tryApisKeith(url) {
    const res = await axios.get(
        `https://apiskeith.top/download/facebook?url=${encodeURIComponent(url)}`,
        {
            timeout: 25000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }
    );
    const d = res.data;
    console.log('[FB-DL] ApisKeith response:', JSON.stringify(d).substring(0, 300));
    const v = d?.url || d?.hd || d?.sd || d?.video || d?.data?.url
            || d?.data?.hd || d?.result?.url;
    if (v) return v;
    throw new Error('apiskeith: no video URL. Response: ' + JSON.stringify(d).substring(0, 150));
}

// ─── Method 5: apiskeith alternate endpoint ──────────────────
async function tryApisKeithV2(url) {
    const res = await axios.get(
        `https://apiskeith.top/api/fbdl?url=${encodeURIComponent(url)}`,
        {
            timeout: 25000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }
    );
    const d = res.data;
    console.log('[FB-DL] ApisKeith v2 response:', JSON.stringify(d).substring(0, 300));
    const v = d?.url || d?.hd || d?.sd || d?.data?.url || d?.data?.hd || d?.result?.url;
    if (v) return v;
    throw new Error('apiskeith-v2: no URL. Response: ' + JSON.stringify(d).substring(0, 150));
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
            { name: 'Etacloud',    fn: () => tryEtacloud(fbUrl)    },
            { name: 'ApisKeith',   fn: () => tryApisKeith(fbUrl)   },
            { name: 'ApisKeithV2', fn: () => tryApisKeithV2(fbUrl) },
            { name: 'Cobalt',      fn: () => tryCobalt(fbUrl)      },
            { name: 'TikwmFB',     fn: () => tryTikwmFb(fbUrl)     },
        ];

        for (const method of methods) {
            try {
                console.log(`[FB-DL] Trying ${method.name}...`);
                rawVideoUrl = await method.fn();
                if (rawVideoUrl) {
                    console.log(`[FB-DL] ✅ SUCCESS ${method.name}:`, rawVideoUrl.substring(0, 80));
                    break;
                }
            } catch (err) {
                console.error(`[FB-DL] ❌ FAILED ${method.name}:`, err.message);
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

_Try a public video or Reel link_
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

/* ============================================
   HUNTER XMD PRO - FACEBOOK VIDEO DOWNLOADER
   COMMAND  : .fb <facebook_url>
   ALIAS    : .facebook .fbdl
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
    try {
        const base64Data = link.includes(',') ? link.split(',')[1] : link;
        return Buffer.from(base64Data, 'base64');
    } catch (e) {
        return null;
    }
}

// ─── Method 1: snapsave.app ────────────────────────────────────
async function trySnapSave(url) {
    const res = await axios.post('https://snapsave.app/action.php',
        new URLSearchParams({ url }),
        {
            timeout: 25000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://snapsave.app/',
                'Origin': 'https://snapsave.app'
            }
        }
    );
    const html = String(res.data);
    console.log('[FB-DL] SnapSave HTML snippet:', html.substring(0, 500));

    // Multiple patterns to catch different SnapSave HTML layouts
    const patterns = [
        /href="(https?:\/\/[^"]+?\.mp4[^"]*?)"/gi,
        /href="(https?:\/\/video\.[^"]+?)"/gi,
        /href="(https?:\/\/[^"]+?fbcdn[^"]+?)"/gi,
        /href="(https?:\/\/[^"]+?facebook[^"]+?\.mp4[^"]*?)"/gi,
        /"url":"(https?:\/\/[^"]+?\.mp4[^"]*?)"/gi,
        /data-url="(https?:\/\/[^"]+?)"/gi,
        /source src="(https?:\/\/[^"]+?)"/gi,
    ];

    for (const pattern of patterns) {
        const match = pattern.exec(html);
        if (match && match[1]) {
            const decoded = match[1].replace(/&amp;/g, '&');
            console.log('[FB-DL] SnapSave found URL with pattern:', pattern.toString().substring(0, 40));
            return decoded;
        }
    }

    console.log('[FB-DL] SnapSave full HTML (first 1000):', html.substring(0, 1000));
    throw new Error('SnapSave: no video URL found in HTML');
}

// ─── Method 2: savefrom.net ───────────────────────────────────
async function trySaveFrom(url) {
    const res = await axios.get(
        `https://worker.sf-tools.com/savefrom.php?sf_url=${encodeURIComponent(url)}`,
        {
            timeout: 25000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': 'https://en.savefrom.net/'
            }
        }
    );
    const d = res.data;
    console.log('[FB-DL] SaveFrom raw:', JSON.stringify(d).substring(0, 300));

    if (Array.isArray(d) && d.length > 0) {
        const hd = d.find(x => x.quality && x.quality.includes('HD')) || d[0];
        if (hd && hd.url) return hd.url;
    }
    if (d && d.url) return d.url;
    throw new Error('SaveFrom: no video URL');
}

// ─── Method 3: fdown.net ──────────────────────────────────────
async function tryFdown(url) {
    const res = await axios.post('https://fdown.net/download.php',
        new URLSearchParams({ URLz: url }),
        {
            timeout: 25000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://fdown.net/',
                'Origin': 'https://fdown.net'
            }
        }
    );
    const html = String(res.data);
    console.log('[FB-DL] Fdown snippet:', html.substring(0, 400));

    const hdMatch = html.match(/id="hdlink"[^>]*href="([^"]+)"/i)
                 || html.match(/href="([^"]+\.mp4[^"]*)"/i);
    if (hdMatch && hdMatch[1]) return hdMatch[1].replace(/&amp;/g, '&');
    throw new Error('Fdown: no video URL');
}

// ─── Method 4: getfvid.com ────────────────────────────────────
async function tryGetFvid(url) {
    const res = await axios.post('https://www.getfvid.com/downloader',
        new URLSearchParams({ url }),
        {
            timeout: 25000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://www.getfvid.com/',
                'Origin': 'https://www.getfvid.com'
            }
        }
    );
    const html = String(res.data);
    console.log('[FB-DL] Getfvid snippet:', html.substring(0, 400));

    const match = html.match(/href="(https?:\/\/[^"]+\.mp4[^"]*)"/i)
               || html.match(/data-link="(https?:\/\/[^"]+)"/i);
    if (match && match[1]) return match[1].replace(/&amp;/g, '&');
    throw new Error('Getfvid: no video URL');
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

*Supported:*
  › fb.watch links
  › facebook.com/watch
  › facebook.com/reel
  › facebook.com/videos

━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        if (!q.includes('facebook.com') && !q.includes('fb.watch') && !q.includes('fb.com')) {
            return reply(`❌ *Invalid Link*\nPlease send a valid Facebook video URL.\n> ${BOT_NAME}`);
        }

        const fbUrl = q.trim();

        // ── 2. React + notify ──────────────────────────────────
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply(`⏳ *Fetching Facebook video...*\n━━━━━━━━━━━━━━━━━━━━\n🔗 _${fbUrl.substring(0, 55)}_\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`);

        // ── 3. Try APIs in order ───────────────────────────────
        let rawVideoUrl = null;
        const methods = [
            { name: 'SnapSave',  fn: () => trySnapSave(fbUrl)  },
            { name: 'SaveFrom',  fn: () => trySaveFrom(fbUrl)  },
            { name: 'Fdown',     fn: () => tryFdown(fbUrl)     },
            { name: 'GetFvid',   fn: () => tryGetFvid(fbUrl)   },
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
All download methods failed for this link.

*Possible reasons:*
  › Video is private or restricted
  › Reel is no longer available
  › Region-locked content

_Try a direct public Facebook video link_
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        // ── 4. Resolve media ───────────────────────────────────
        const videoSource = resolveMediaSource(rawVideoUrl);
        if (!videoSource) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
            return reply(`❌ *Media Decode Failed*\n> ${BOT_NAME}`);
        }

        // ── 5. Send video ──────────────────────────────────────
        await conn.sendMessage(from, {
            video: videoSource,
            mimetype: 'video/mp4',
            caption: `📥 *Facebook Video*\n━━━━━━━━━━━━━━━━━━━━\n✅ Downloaded successfully\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('[FB-DL] Fatal error:', e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
        reply(`❌ *Error*\n━━━━━━━━━━━━━━━━━━━━\n${e.message.substring(0, 100)}\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`);
    }
});

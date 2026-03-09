/* ============================================
   HUNTER XMD PRO - TIKTOK DOWNLOADER
   COMMAND: .tiktok2 <link>
   API: https://api-rebix.zone.id/api/tiktok
   FIX: Base64 buffer support included
   ============================================ */

const { cmd } = require('../command');
const axios = require('axios');

// ─── Base64 / URL resolver (same pattern as play.js) ──────────
function resolveMediaSource(link) {
    if (!link) return null;

    // Direct URL — use as-is
    if (link.startsWith('http://') || link.startsWith('https://')) {
        return { url: link };
    }

    // Data URI → strip prefix, decode base64
    const base64Data = link.includes(',') ? link.split(',')[1] : link;
    try {
        return Buffer.from(base64Data, 'base64');
    } catch (e) {
        console.error('[resolveMediaSource] Failed:', e.message);
        return null;
    }
}

// ─── Message Templates ────────────────────────────────────────
const BOT_NAME = '𝗛𝗨𝗡𝗧𝗘𝗥 𝗫𝗠𝗗 𝗣𝗥𝗢';

function previewCard(data) {
    return `🎵 *TikTok Downloader*
━━━━━━━━━━━━━━━━━━━━
👤  *${data.author || 'Unknown'}*
📝  ${data.title || data.titulo || 'No title'}
━━━━━━━━━━━━━━━━━━━━
📥  *Reply to this message:*
  › *1* — Download Video 🎥
  › *2* — Download Audio 🎵
━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`;
}

function errCard(detail) {
    return `❌ *TikTok Error*\n━━━━━━━━━━━━━━━━━━━━\n${detail}\n━━━━━━━━━━━━━━━━━━━━\n> ${BOT_NAME}`;
}

// ─── TIKTOK COMMAND ───────────────────────────────────────────
cmd({
    pattern: "tiktok2",
    alias: ["tt2", "tiktokdl2", "ttdown2", "tiktokvid2", "ttdl"],
    desc: "Download TikTok video or audio from a link.",
    category: "downloader",
    react: "🎵",
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        // ── 1. Validate input ──────────────────────────────────
        if (!args[0]) {
            return reply(`🎵 *TikTok Downloader*
━━━━━━━━━━━━━━━━━━━━
*Usage:*  .tiktok2 _[tiktok link]_

*Example:*
  › .tiktok2 https://vt.tiktok.com/ZSrRVYRUJ/

━━━━━━━━━━━━━━━━━━━━
> ${BOT_NAME}`);
        }

        const tiktokUrl = args[0];

        // ── 2. React & notify ──────────────────────────────────
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });
        await reply("⏳ _Fetching TikTok details... Please wait._");

        // ── 3. Fetch from API ──────────────────────────────────
        const apiURL = `https://api-rebix.zone.id/api/tiktok?url=${encodeURIComponent(tiktokUrl)}`;
        console.log('[TIKTOK2] Fetching:', apiURL);

        const response = await axios.get(apiURL, { timeout: 30000 });
        const data = response.data;

        console.log('[TIKTOK2] Response keys:', Object.keys(data));

        // ── 4. Validate response ───────────────────────────────
        // Handle both { success, result } and flat response shapes
        const result = data.result || data.data || data;

        if (!result) {
            return reply(errCard('Could not parse API response. Try again later.'));
        }

        // Normalize field names (API may use different keys)
        const videoUrl = result.mp4 || result.video || result.videoUrl || result.play || null;
        const audioUrl = result.mp3 || result.audio || result.audioUrl || result.music || null;
        const thumb    = result.thumbnail || result.thumbanail || result.cover || result.thumb || null;
        const author   = result.author || result.nickname || result.username || 'Unknown';
        const title    = result.title || result.titulo || result.desc || result.description || 'TikTok Video';

        if (!videoUrl && !audioUrl) {
            return reply(errCard('No downloadable media found. The link may be invalid or private.'));
        }

        // ── 5. Send preview card ───────────────────────────────
        const previewPayload = thumb
            ? { image: { url: thumb }, caption: previewCard({ author, title }) }
            : { text: previewCard({ author, title }) };

        const menuMsg = await conn.sendMessage(from, previewPayload, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

        // ── 6. Listen for user reply ───────────────────────────
        const listener = async (msgUpdate) => {
            try {
                const msg = msgUpdate.messages[0];
                if (!msg?.message) return;

                // Accept both plain text and extended text replies
                const extText = msg.message?.extendedTextMessage;
                const plainText = msg.message?.conversation;
                const userReply = (extText?.text || plainText || '').trim();

                if (!userReply) return;

                // Only respond if user is replying to OUR menu message
                const contextId = extText?.contextInfo?.stanzaId;
                if (contextId !== menuMsg.key.id) return;

                // Remove listener after first valid reply
                conn.ev.off('messages.upsert', listener);

                if (userReply === '1') {
                    // ── Video ──────────────────────────────────
                    if (!videoUrl) {
                        return reply(errCard('No video available for this TikTok.'));
                    }

                    await conn.sendMessage(from, { react: { text: "⬇️", key: mek.key } });

                    const videoSource = resolveMediaSource(videoUrl);
                    if (!videoSource) return reply(errCard('Failed to read video data.'));

                    const videoPayload = {
                        mimetype: 'video/mp4',
                        caption: `🎥 *TikTok Video*\n👤 ${author}\n📝 ${title}\n\n> ${BOT_NAME}`
                    };
                    videoPayload.video = videoSource;

                    await conn.sendMessage(from, videoPayload, { quoted: msg });
                    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

                } else if (userReply === '2') {
                    // ── Audio ──────────────────────────────────
                    if (!audioUrl) {
                        return reply(errCard('No audio available for this TikTok.'));
                    }

                    await conn.sendMessage(from, { react: { text: "⬇️", key: mek.key } });

                    const audioSource = resolveMediaSource(audioUrl);
                    if (!audioSource) return reply(errCard('Failed to read audio data.'));

                    const audioPayload = {
                        mimetype: 'audio/mpeg',
                        ptt: false
                    };
                    audioPayload.audio = audioSource;

                    await conn.sendMessage(from, audioPayload, { quoted: msg });
                    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

                } else {
                    reply(errCard('Invalid option.\nReply *1* for Video or *2* for Audio.'));
                    // Re-attach listener so user can try again
                    conn.ev.on('messages.upsert', listener);
                }

            } catch (innerErr) {
                console.error('[TIKTOK2] Listener error:', innerErr);
            }
        };

        conn.ev.on('messages.upsert', listener);

        // ── 7. Auto-remove listener after 2 minutes ───────────
        setTimeout(() => {
            conn.ev.off('messages.upsert', listener);
        }, 2 * 60 * 1000);

    } catch (err) {
        console.error('[TIKTOK2] Error:', err.message);
        await reply(errCard(err.message.substring(0, 100)));
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
    }
});


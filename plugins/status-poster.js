/**
 * ╔══════════════════════════════════════════╗
 * ║     HUNTER XMD PRO — STATUS POSTER      ║
 * ║   Powered by hunter-baileys giftedStatus ║
 * ╚══════════════════════════════════════════╝
 *
 * Commands:
 *   .textstatus <text>         — Post a text WhatsApp status
 *   .imgstatus [caption]       — Post an image status (reply to image)
 *   .videostatus [caption]     — Post a video status (reply to video)
 *   .audiostatus               — Post an audio status (reply to audio)
 *   .groupstatus <jid> <text>  — Post to a specific group's story
 *   .poststatus <text>         — Alias for textstatus
 *   .statusinfo                — Show status module info
 */

const { cmd } = require('../command');
const { downloadMediaMessage } = require('hunter-baileys');

// ─── helpers ────────────────────────────────────────────────────────────────

function getGiftedStatus(client) {
    // Prefer conn-level, fall back to global
    return client.giftedStatus || global.giftedStatus || null;
}

function randomHex() {
    return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
}

const FONTS = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // WhatsApp status font indices

// ─── .textstatus / .poststatus ──────────────────────────────────────────────

cmd({
    pattern: 'textstatus',
    alias: ['poststatus', 'tstatus'],
    react: '📝',
    desc: 'Post a text WhatsApp status using hunter-baileys',
    category: 'status',
    filename: __filename
}, async (client, message, match, { from, isOwner }) => {
    if (!isOwner) return client.sendMessage(from, { text: '❌ Only the owner can post statuses.' }, { quoted: message });

    const gs = getGiftedStatus(client);
    if (!gs) return client.sendMessage(from, { text: '❌ giftedStatus not available. Make sure hunter-baileys is installed and bot restarted.' }, { quoted: message });

    const text = match.body || match || '';
    if (!text) return client.sendMessage(from, { text: '❌ Usage: `.textstatus <your text here>`' }, { quoted: message });

    try {
        await client.sendMessage(from, { text: '⏳ Posting your text status...' }, { quoted: message });

        await gs.sendStatusToGroups(
            {
                text,
                backgroundColor: randomHex(),
                textColor: randomHex(),
                font: FONTS[Math.floor(Math.random() * FONTS.length)]
            },
            [] // [] = send to all contacts; pass group JIDs to target specific groups
        );

        await client.sendMessage(from, { text: '✅ Text status posted successfully!' }, { quoted: message });
    } catch (err) {
        console.error('[status-poster] textstatus error:', err);
        await client.sendMessage(from, { text: `❌ Failed to post status:\n${err.message}` }, { quoted: message });
    }
});

// ─── .imgstatus ─────────────────────────────────────────────────────────────

cmd({
    pattern: 'imgstatus',
    alias: ['imagestatus', 'iststatus'],
    react: '🖼️',
    desc: 'Post an image as WhatsApp status (reply to an image)',
    category: 'status',
    filename: __filename
}, async (client, message, match, { from, isOwner, quoted, reply }) => {
    if (!isOwner) return client.sendMessage(from, { text: '❌ Only the owner can post statuses.' }, { quoted: message });

    const gs = getGiftedStatus(client);
    if (!gs) return client.sendMessage(from, { text: '❌ giftedStatus not available. Make sure hunter-baileys is installed and bot restarted.' }, { quoted: message });

    const q = quoted || message;
    const mtype = q?.mtype || Object.keys(q?.message || {})[0];

    if (!mtype?.includes('image')) {
        return client.sendMessage(from, { text: '❌ Please reply to an image to post it as a status.\n\nUsage: Reply to an image and send `.imgstatus [optional caption]`' }, { quoted: message });
    }

    try {
        await client.sendMessage(from, { text: '⏳ Uploading image status...' }, { quoted: message });

        const buffer = await downloadMediaMessage(q, 'buffer', {}, { logger: console });
        const caption = match.body || match || '';

        await gs.sendStatusToGroups(
            {
                image: buffer,
                caption,
                mimetype: 'image/jpeg'
            },
            []
        );

        await client.sendMessage(from, { text: '✅ Image status posted successfully!' }, { quoted: message });
    } catch (err) {
        console.error('[status-poster] imgstatus error:', err);
        await client.sendMessage(from, { text: `❌ Failed to post image status:\n${err.message}` }, { quoted: message });
    }
});

// ─── .videostatus ────────────────────────────────────────────────────────────

cmd({
    pattern: 'videostatus',
    alias: ['vstatus', 'vidstatus'],
    react: '🎥',
    desc: 'Post a video as WhatsApp status (reply to a video)',
    category: 'status',
    filename: __filename
}, async (client, message, match, { from, isOwner, quoted }) => {
    if (!isOwner) return client.sendMessage(from, { text: '❌ Only the owner can post statuses.' }, { quoted: message });

    const gs = getGiftedStatus(client);
    if (!gs) return client.sendMessage(from, { text: '❌ giftedStatus not available. Make sure hunter-baileys is installed and bot restarted.' }, { quoted: message });

    const q = quoted || message;
    const mtype = q?.mtype || Object.keys(q?.message || {})[0];

    if (!mtype?.includes('video')) {
        return client.sendMessage(from, { text: '❌ Please reply to a video to post it as a status.\n\nUsage: Reply to a video and send `.videostatus [optional caption]`' }, { quoted: message });
    }

    try {
        await client.sendMessage(from, { text: '⏳ Uploading video status...' }, { quoted: message });

        const buffer = await downloadMediaMessage(q, 'buffer', {}, { logger: console });
        const caption = match.body || match || '';

        await gs.sendStatusToGroups(
            {
                video: buffer,
                caption,
                mimetype: 'video/mp4'
            },
            []
        );

        await client.sendMessage(from, { text: '✅ Video status posted successfully!' }, { quoted: message });
    } catch (err) {
        console.error('[status-poster] videostatus error:', err);
        await client.sendMessage(from, { text: `❌ Failed to post video status:\n${err.message}` }, { quoted: message });
    }
});

// ─── .audiostatus ────────────────────────────────────────────────────────────

cmd({
    pattern: 'audiostatus',
    alias: ['astatus', 'voicestatus'],
    react: '🎵',
    desc: 'Post an audio/voice as WhatsApp status (reply to audio)',
    category: 'status',
    filename: __filename
}, async (client, message, match, { from, isOwner, quoted }) => {
    if (!isOwner) return client.sendMessage(from, { text: '❌ Only the owner can post statuses.' }, { quoted: message });

    const gs = getGiftedStatus(client);
    if (!gs) return client.sendMessage(from, { text: '❌ giftedStatus not available. Make sure hunter-baileys is installed and bot restarted.' }, { quoted: message });

    const q = quoted || message;
    const mtype = q?.mtype || Object.keys(q?.message || {})[0];

    if (!mtype?.includes('audio')) {
        return client.sendMessage(from, { text: '❌ Please reply to a voice note or audio file.\n\nUsage: Reply to audio and send `.audiostatus`' }, { quoted: message });
    }

    try {
        await client.sendMessage(from, { text: '⏳ Uploading audio status...' }, { quoted: message });

        const buffer = await downloadMediaMessage(q, 'buffer', {}, { logger: console });

        await gs.sendStatusToGroups(
            {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: true,
                backgroundColor: randomHex()
            },
            []
        );

        await client.sendMessage(from, { text: '✅ Audio status posted successfully!' }, { quoted: message });
    } catch (err) {
        console.error('[status-poster] audiostatus error:', err);
        await client.sendMessage(from, { text: `❌ Failed to post audio status:\n${err.message}` }, { quoted: message });
    }
});

// ─── .groupstatus ────────────────────────────────────────────────────────────

cmd({
    pattern: 'groupstatus',
    alias: ['gstatus', 'gcstatus'],
    react: '👥',
    desc: 'Post a text to a specific group story. Usage: .groupstatus <groupJid> <text>',
    category: 'status',
    filename: __filename
}, async (client, message, match, { from, isOwner }) => {
    if (!isOwner) return client.sendMessage(from, { text: '❌ Only the owner can post group statuses.' }, { quoted: message });

    const gs = getGiftedStatus(client);
    if (!gs) return client.sendMessage(from, { text: '❌ giftedStatus not available.' }, { quoted: message });

    const args = (match.body || match || '').trim().split(' ');
    const groupJid = args[0];
    const text = args.slice(1).join(' ');

    if (!groupJid || !text) {
        return client.sendMessage(from, {
            text: '❌ Usage: `.groupstatus <groupJid> <text>`\n\nExample:\n`.groupstatus 1234567890-1234567890@g.us Hello group!`'
        }, { quoted: message });
    }

    if (!groupJid.endsWith('@g.us')) {
        return client.sendMessage(from, { text: '❌ Invalid group JID. It must end with `@g.us`' }, { quoted: message });
    }

    try {
        await client.sendMessage(from, { text: `⏳ Posting to group story: ${groupJid}` }, { quoted: message });

        await gs.sendGroupStatus(groupJid, { text });

        await client.sendMessage(from, { text: '✅ Group status posted successfully!' }, { quoted: message });
    } catch (err) {
        console.error('[status-poster] groupstatus error:', err);
        await client.sendMessage(from, { text: `❌ Failed to post group status:\n${err.message}` }, { quoted: message });
    }
});

// ─── .statusinfo ─────────────────────────────────────────────────────────────

cmd({
    pattern: 'statusinfo',
    alias: ['statushelp'],
    react: 'ℹ️',
    desc: 'Show status poster module info',
    category: 'status',
    filename: __filename
}, async (client, message, match, { from }) => {
    const gs = getGiftedStatus(client);
    const available = !!gs;

    const info = `╭──『 *STATUS POSTER* 』──
│
│ 🔌 *Engine:* hunter-baileys
│ ✅ *giftedStatus:* ${available ? 'Available ✅' : 'NOT FOUND ❌'}
│
│ 📋 *Commands:*
│ ▸ \`.textstatus <text>\`
│   Post a text status
│
│ ▸ \`.imgstatus [caption]\`
│   Reply to image → post as status
│
│ ▸ \`.videostatus [caption]\`
│   Reply to video → post as status
│
│ ▸ \`.audiostatus\`
│   Reply to audio → post as status
│
│ ▸ \`.groupstatus <jid> <text>\`
│   Post to specific group story
│
│ 👑 *Owner-only commands*
│ ⚡ *Powered by ObedTech*
╰────────────────────`;

    await client.sendMessage(from, { text: info }, { quoted: message });
});

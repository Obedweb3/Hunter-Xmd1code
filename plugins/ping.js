const config = require('../config');
const { cmd, commands } = require('../command');
const os = require('os');

// ============================================================
//  🏹 PING COMMAND — Hunter XMD  (improved)
// ============================================================
cmd({
    pattern: "ping",
    alias: ["speed", "pong", "latency"],
    use: '.ping',
    desc: "Check bot's response speed & system stats.",
    category: "main",
    react: "🏹",
    filename: __filename
},
async (conn, mek, m, {
    from, sender, pushname, reply
}) => {
    try {
        // ── Timing ──────────────────────────────────────────
        const start = Date.now();

        // ── System stats ────────────────────────────────────
        const uptimeSec  = Math.floor(process.uptime());
        const uptimeStr  = formatUptime(uptimeSec);
        const memUsed    = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        const memTotal   = (os.totalmem() / 1024 / 1024).toFixed(1);
        const cpuLoad    = (os.loadavg()[0]).toFixed(2);
        const platform   = os.platform();
        const nodeVer    = process.version;

        // ── Cosmetics ────────────────────────────────────────
        const EMOJIS = ['⚡','🔥','🚀','💥','🎯','🌟','🛸','💫','🎆','🏆'];
        const spark  = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

        // ── Send reaction ────────────────────────────────────
        await conn.sendMessage(from, {
            react: { text: spark, key: mek.key }
        });

        // ── Calculate latency ────────────────────────────────
        const ping = Date.now() - start;

        // ── Speed tier label ─────────────────────────────────
        const { tier, bar } = getSpeedTier(ping);

        // ── Build message ────────────────────────────────────
        const name = pushname || "User";
        const text =
`╭━━━━━━━━━━━━━━━━━━━━━╮
┃  🏹 *ʜᴜɴᴛᴇʀ xᴍᴅ — ᴘɪɴɢ* ${spark}
╰━━━━━━━━━━━━━━━━━━━━━╯

👤 *User :* ${name}
${bar}
⚡ *Latency :* \`${ping} ms\`
🏅 *Speed Tier :* ${tier}

╭── 🖥️ *ꜱʏꜱᴛᴇᴍ ꜱᴛᴀᴛꜱ* ──╮
│ 🕒 Uptime  : ${uptimeStr}
│ 🧠 Memory  : ${memUsed} / ${memTotal} MB
│ 📊 CPU     : ${cpuLoad} (load avg)
│ 🐧 OS      : ${platform}
│ 🟢 Node    : ${nodeVer}
╰──────────────────────╯

> *Powered by* 🏹 *ʜᴜɴᴛᴇʀ xᴍᴅ*`;

        // ── Send reply ───────────────────────────────────────
        await conn.sendMessage(from, {
            text,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363416335506023@newsletter',
                    newsletterName: "Obedtech",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Ping command error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ── Helpers ──────────────────────────────────────────────────

/**
 * Returns a speed tier label + a visual progress bar based on latency.
 * @param {number} ms
 */
function getSpeedTier(ms) {
    const bars = 10;
    let filled, tier;

    if (ms <= 50) {
        filled = 10; tier = "🟢 *Ultra Fast* 🚀";
    } else if (ms <= 150) {
        filled = 8;  tier = "🔵 *Fast* ⚡";
    } else if (ms <= 300) {
        filled = 6;  tier = "🟡 *Normal* 🙂";
    } else if (ms <= 600) {
        filled = 4;  tier = "🟠 *Slow* 😐";
    } else {
        filled = 2;  tier = "🔴 *Very Slow* 😴";
    }

    const bar = "▰".repeat(filled) + "▱".repeat(bars - filled);
    return { tier, bar: `📶 *Speed :* \`${bar}\`` };
}

/**
 * Converts seconds into a human-readable uptime string.
 * @param {number} seconds
 */
function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

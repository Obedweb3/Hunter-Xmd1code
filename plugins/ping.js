const { cmd } = require('../command');
const os = require('os');

cmd({
    pattern: "ping",
    alias: ["speed", "pong"],
    desc: "Check bot response speed.",
    category: "main",
    react: "🏹",
    filename: __filename
},
async (conn, mek, m, { from, sender, pushname, reply }) => {
    try {
        const start = Date.now();

        await conn.sendMessage(from, { react: { text: "⚡", key: mek.key } });

        const ping = Date.now() - start;
        const uptime = Math.floor(process.uptime());
        const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        const tier = ping < 100 ? "🟢 Fast" : ping < 300 ? "🟡 Normal" : "🔴 Slow";

        const text =
`⚡ *ʜᴜɴᴛᴇʀ xᴍᴅ ᴘʀᴏ ᴘɪɴɢ*

🏓 Latency : *${ping}ms* ${tier}
🕒 Uptime  : *${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m*
🧠 Memory  : *${mem} MB*

> 🚀 *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴏʙᴇᴅ ᴛᴇᴄʜ*`;

        await conn.sendMessage(from, {
            text,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363416335506023@newsletter',
                    newsletterName: "ʜᴜɴᴛᴇʀ xᴍᴅ ᴘʀᴏ",
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Ping error:", e);
        reply(`❌ ${e.message}`);
    }
});

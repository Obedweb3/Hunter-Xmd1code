const { cmd } = require('../command');
const { getAnti, setAnti } = require('../data/antidel');

cmd({
    pattern: "antidelete",
    alias: ['antidel', 'del', 'ad'],
    desc: "Toggle anti-delete feature",
    category: "owner",
    filename: __filename,
    react: "🛡️"
},
async (conn, mek, m, { from, reply, text, isCreator, isOwner }) => {
    // Check if owner
    if (!isCreator && !isOwner) {
        return reply('❌ *This command is only for the bot owner!*');
    }
    
    try {
        const currentStatus = await getAnti();
        
        // Show status if no argument
        if (!text || text.toLowerCase() === 'status') {
            const statusMsg = `*🛡️ ANTI-DELETE STATUS*\n\n` +
                           `Current Status: ${currentStatus ? '✅ *ENABLED*' : '❌ *DISABLED*'}\n\n` +
                           `*Usage:*\n` +
                           `• ${m.prefix}antidelete on - Enable protection\n` +
                           `• ${m.prefix}antidelete off - Disable protection\n` +
                           `• ${m.prefix}antidelete status - Check status`;
            return reply(statusMsg);
        }
        
        const action = text.toLowerCase().trim();
        
        if (action === 'on' || action === 'enable' || action === 'true') {
            if (currentStatus) {
                return reply('✅ Anti-delete is *already enabled*!');
            }
            await setAnti(true);
            
            // Confirm it's working
            const confirmStatus = await getAnti();
            if (confirmStatus) {
            return reply('✅ *Anti-delete has been ENABLED!*\n\n' +
                      '🛡️ Deleted messages will be sent to the *sender\'s DM*.\n' +
                      '📲 Works for text, images, video, audio, stickers & documents.\n' +
                      '_Make sure the bot is running to monitor deletions._');
            } else {
                return reply('❌ Failed to enable anti-delete. Check database.');
            }
        } 
        else if (action === 'off' || action === 'disable' || action === 'false') {
            if (!currentStatus) {
                return reply('❌ Anti-delete is *already disabled*!');
            }
            await setAnti(false);
            return reply('❌ *Anti-delete has been DISABLED!*\n\n' +
                      '_Deleted messages will no longer be recovered._');
        } 
        else {
            return reply('❌ *Invalid command!*\n\n' +
                      `*Usage:*\n` +
                      `• ${m.prefix}antidelete on\n` +
                      `• ${m.prefix}antidelete off\n` +
                      `• ${m.prefix}antidelete status`);
        }
    } catch (e) {
        console.error("❌ Error in antidelete command:", e);
        return reply(`❌ *Error:* ${e.message}`);
    }
});

// Also register a test command to verify it's working
cmd({
    pattern: "testantidel",
    alias: ['testad'],
    desc: "Test antidelete system",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, { from, reply, isCreator }) => {
    if (!isCreator) return reply('Owner only!');
    
    try {
        const status = await getAnti();
        const storeSize = global.messageStore ? global.messageStore.size : 0;
        const mediaSize = global.mediaStore ? global.mediaStore.size : 0;
        
        reply(`*🧪 ANTI-DELETE TEST*\n\n` +
              `Status: ${status ? '✅ ON' : '❌ OFF'}\n` +
              `Stored Messages: ${storeSize}\n` +
              `Stored Media: ${mediaSize}\n` +
              `Prefix: ${m.prefix}\n\n` +
              `_Send a message and delete it to test!_`);
    } catch (e) {
        reply(`Error: ${e.message}`);
    }
});

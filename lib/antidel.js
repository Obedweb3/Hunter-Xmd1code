const { getAnti } = require('../data/antidel');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// Store messages temporarily (you might already have a store system)
const messageStore = new Map();

// Function to save incoming messages
async function saveMessage(msg) {
    try {
        const messageKey = msg.key.id;
        const chatId = msg.key.remoteJid;
        
        // Store message data
        messageStore.set(messageKey, {
            message: msg,
            timestamp: Date.now(),
            chatId: chatId
        });

        // Clean old messages (keep last 1000)
        if (messageStore.size > 1000) {
            const oldestKey = messageStore.keys().next().value;
            messageStore.delete(oldestKey);
        }
    } catch (e) {
        console.error("Error saving message:", e);
    }
}

// Main anti-delete handler
function setupAntiDelete(conn) {
    
    // Listen for ALL incoming messages to store them
    conn.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.key.fromMe) { // Don't store bot's own messages
                await saveMessage(msg);
            }
        }
    });

    // Listen for message updates (deletions)
    conn.ev.on('messages.update', async (updates) => {
        try {
            const isAntiDeleteOn = await getAnti();
            if (!isAntiDeleteOn) return;

            for (const update of updates) {
                const { key, update: updateData } = update;
                
                // Check if message was deleted
                if (updateData?.messageStubType === 2 || // Protocol message (delete)
                    updateData?.status === 2 || // Deleted status
                    (updateData?.message?.protocolMessage?.type === 0)) { // REVOKE message
                    
                    const deletedKey = key.id || updateData?.message?.protocolMessage?.key?.id;
                    const chatId = key.remoteJid;
                    
                    // Retrieve stored message
                    const storedData = messageStore.get(deletedKey);
                    
                    if (storedData) {
                        const { message: originalMsg } = storedData;
                        
                        // ── Always send to the SENDER's personal DM ──────────────
                        const sender = originalMsg.key.participant || originalMsg.key.remoteJid;
                        const senderNumber = sender.split('@')[0];
                        const dmJid = senderNumber + '@s.whatsapp.net'; // sender's DM JID

                        const isGroup = chatId.endsWith('@g.us');
                        let caption = `*🗑️ ANTI-DELETE ALERT*\n\n`;
                        caption += `*👤 You deleted a message in:* ${isGroup ? `Group (${chatId.split('@')[0]})` : 'Private Chat'}\n`;
                        caption += `*⏰ Time:* ${new Date().toLocaleString()}\n\n`;
                        caption += `*📄 Deleted Content:*`;

                        // Handle different message types — send to dmJid (sender's DM)
                        if (originalMsg.message?.conversation) {
                            await conn.sendMessage(dmJid, {
                                text: caption + `\n\n💬 "${originalMsg.message.conversation}"\n\n_🤖 HUNTER XMD AntiDelete_`
                            });

                        } else if (originalMsg.message?.extendedTextMessage?.text) {
                            await conn.sendMessage(dmJid, {
                                text: caption + `\n\n💬 "${originalMsg.message.extendedTextMessage.text}"\n\n_🤖 HUNTER XMD AntiDelete_`
                            });

                        } else if (originalMsg.message?.imageMessage) {
                            const buffer = await downloadMediaMessage(originalMsg, 'buffer', {}, {
                                logger: conn.logger
                            });
                            await conn.sendMessage(dmJid, {
                                image: buffer, // Baileys encodes this as base64 internally
                                caption: caption + '\n📸 Image\n\n_🤖 HUNTER XMD AntiDelete_'
                            });

                        } else if (originalMsg.message?.videoMessage) {
                            const buffer = await downloadMediaMessage(originalMsg, 'buffer', {}, {
                                logger: conn.logger
                            });
                            await conn.sendMessage(dmJid, {
                                video: buffer,
                                caption: caption + '\n🎬 Video\n\n_🤖 HUNTER XMD AntiDelete_'
                            });

                        } else if (originalMsg.message?.audioMessage) {
                            const buffer = await downloadMediaMessage(originalMsg, 'buffer', {}, {
                                logger: conn.logger
                            });
                            await conn.sendMessage(dmJid, {
                                audio: buffer,
                                mimetype: 'audio/mp4',
                                ptt: originalMsg.message.audioMessage.ptt || false
                            });
                            await conn.sendMessage(dmJid, {
                                text: caption + '\n🎵 Audio/Voice Note\n\n_🤖 HUNTER XMD AntiDelete_'
                            });

                        } else if (originalMsg.message?.stickerMessage) {
                            const buffer = await downloadMediaMessage(originalMsg, 'buffer', {}, {
                                logger: conn.logger
                            });
                            await conn.sendMessage(dmJid, { sticker: buffer });
                            await conn.sendMessage(dmJid, {
                                text: caption + '\n🩹 Sticker\n\n_🤖 HUNTER XMD AntiDelete_'
                            });

                        } else if (originalMsg.message?.documentMessage) {
                            const buffer = await downloadMediaMessage(originalMsg, 'buffer', {}, {
                                logger: conn.logger
                            });
                            await conn.sendMessage(dmJid, {
                                document: buffer,
                                mimetype: originalMsg.message.documentMessage.mimetype,
                                fileName: originalMsg.message.documentMessage.fileName || 'document',
                                caption: caption + '\n📄 Document\n\n_🤖 HUNTER XMD AntiDelete_'
                            });

                        } else {
                            await conn.sendMessage(dmJid, {
                                text: caption + `\n\n[Unsupported message type deleted]\n\n_🤖 HUNTER XMD AntiDelete_`
                            });
                        }

                        // Clean up stored message
                        messageStore.delete(deletedKey);

                        console.log(`AntiDelete: Recovered deleted message → sent to ${senderNumber} DM`);
                    }
                }
            }
        } catch (e) {
            console.error("Error in anti-delete handler:", e);
        }
    });
}

module.exports = { setupAntiDelete, saveMessage };

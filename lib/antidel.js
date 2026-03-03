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
                        
                        // Prepare notification
                        const sender = originalMsg.key.participant || originalMsg.key.remoteJid;
                        const senderName = originalMsg.pushName || sender.split('@')[0];
                        
                        let caption = `*🚨 ANTI-DELETE ALERT*\n\n`;
                        caption += `*👤 Deleted By:* @${sender.split('@')[0]}\n`;
                        caption += `*⏰ Time:* ${new Date().toLocaleString()}\n`;
                        caption += `*💬 Chat:* ${chatId.endsWith('@g.us') ? 'Group' : 'Private'}\n\n`;
                        caption += `*📄 Original Message:*`;

                        // Handle different message types
                        if (originalMsg.message?.conversation) {
                            // Text message
                            await conn.sendMessage(chatId, {
                                text: caption + `\n\n"${originalMsg.message.conversation}"`,
                                mentions: [sender]
                            });

                        } else if (originalMsg.message?.extendedTextMessage?.text) {
                            // Extended text
                            await conn.sendMessage(chatId, {
                                text: caption + `\n\n"${originalMsg.message.extendedTextMessage.text}"`,
                                mentions: [sender]
                            });

                        } else if (originalMsg.message?.imageMessage) {
                            // Image
                            const buffer = await downloadMediaMessage(originalMsg, 'buffer', {}, {
                                logger: conn.logger
                            });
                            
                            await conn.sendMessage(chatId, {
                                image: buffer,
                                caption: caption,
                                mentions: [sender]
                            });

                        } else if (originalMsg.message?.videoMessage) {
                            // Video
                            const buffer = await downloadMediaMessage(originalMsg, 'buffer', {}, {
                                logger: conn.logger
                            });
                            
                            await conn.sendMessage(chatId, {
                                video: buffer,
                                caption: caption,
                                mentions: [sender]
                            });

                        } else if (originalMsg.message?.audioMessage) {
                            // Audio/Voice note
                            const buffer = await downloadMediaMessage(originalMsg, 'buffer', {}, {
                                logger: conn.logger
                            });
                            
                            await conn.sendMessage(chatId, {
                                audio: buffer,
                                caption: caption,
                                mimetype: 'audio/mp4',
                                ptt: originalMsg.message.audioMessage.ptt || false
                            });

                        } else if (originalMsg.message?.stickerMessage) {
                            // Sticker
                            const buffer = await downloadMediaMessage(originalMsg, 'buffer', {}, {
                                logger: conn.logger
                            });
                            
                            await conn.sendMessage(chatId, {
                                sticker: buffer
                            });
                            
                            await conn.sendMessage(chatId, {
                                text: caption,
                                mentions: [sender]
                            });

                        } else if (originalMsg.message?.documentMessage) {
                            // Document
                            const buffer = await downloadMediaMessage(originalMsg, 'buffer', {}, {
                                logger: conn.logger
                            });
                            
                            await conn.sendMessage(chatId, {
                                document: buffer,
                                mimetype: originalMsg.message.documentMessage.mimetype,
                                fileName: originalMsg.message.documentMessage.fileName || 'document',
                                caption: caption
                            });

                        } else {
                            // Unknown type
                            await conn.sendMessage(chatId, {
                                text: caption + `\n\n[Unsupported message type was deleted]`,
                                mentions: [sender]
                            });
                        }

                        // Clean up stored message
                        messageStore.delete(deletedKey);
                        
                        console.log(`AntiDelete: Recovered deleted message from ${sender}`);
                    }
                }
            }
        } catch (e) {
            console.error("Error in anti-delete handler:", e);
        }
    });
}

module.exports = { setupAntiDelete, saveMessage };

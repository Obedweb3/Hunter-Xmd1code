// data.js - Database for HUNTER XMD PRO
const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const antiDeletePath = path.join(dbDir, 'antidelete.json');

/**
 * Initializes anti-delete settings with default values.
 *
 * This function checks if the antiDeletePath exists; if not, it creates a new file with default settings
 * including enabled status, media saving option, owner notification, maximum storage limit, and log path.
 * In case of any errors during the file system operations, it returns the default settings.
 */
function initializeAntiDeleteSettings() {
    const defaultSettings = { enabled: true, saveMedia: true, notifyOwner: true, maxStorage: 5000, logPath: 'log' };
    try {
        if (!fs.existsSync(antiDeletePath)) {
            fs.writeFileSync(antiDeletePath, JSON.stringify({ settings: defaultSettings, messages: {} }, null, 2));
        }
        return defaultSettings;
    } catch (error) { return defaultSettings; }
}

const AntiDelDB = {
    save: (data) => { try { fs.writeFileSync(antiDeletePath, JSON.stringify(data, null, 2)); return true; } catch (e) { return false; } },
    load: () => { try { if (!fs.existsSync(antiDeletePath)) initializeAntiDeleteSettings(); return JSON.parse(fs.readFileSync(antiDeletePath, 'utf8')); } catch (e) { return { settings: {}, messages: {} }; } }
};

const setAnti = (chatId, enabled) => { const data = AntiDelDB.load(); if (!data.settings) data.settings = {}; data.settings[chatId] = enabled; AntiDelDB.save(data); return true; };
/**
 * Checks if anti settings are enabled for a given chat ID.
 */
const getAnti = (chatId) => { const data = AntiDelDB.load(); if (!data.settings) return true; return data.settings[chatId] !== false; };
/** Retrieves anti-delete settings from the database. */
const getAllAntiDeleteSettings = () => { const data = AntiDelDB.load(); return data.settings || {}; };
/**
 * Saves a message to the AntiDelDB database.
 *
 * This function loads the current messages from the database, adds the new message with a timestamp,
 * and ensures that the total number of messages does not exceed 5000. If the limit is exceeded,
 * it removes the oldest messages based on their savedAt timestamp. Finally, it saves the updated
 * messages back to the database. If any error occurs during this process, it returns false.
 *
 * @param {Object} msg - The message object to be saved, which must include a key with an id.
 */
const saveMessage = (msg) => { try { const data = AntiDelDB.load(); if (!data.messages) data.messages = {}; data.messages[msg.key.id] = { ...msg, savedAt: Date.now() }; const keys = Object.keys(data.messages); if (keys.length > 5000) { const sortedKeys = keys.sort((a, b) => (data.messages[a].savedAt || 0) - (data.messages[b].savedAt || 0)); sortedKeys.slice(0, keys.length - 4000).forEach(key => delete data.messages[key]); } AntiDelDB.save(data); return true; } catch (e) { return false; } };
/**
 * Loads a message from the AntiDelDB using the provided message ID.
 *
 * This function attempts to retrieve the message data from the AntiDelDB.
 * It first loads the database and then checks for the message with the given
 * messageId. If the message is found, it is returned; otherwise, null is returned.
 * In case of any errors during the loading process, null is also returned.
 *
 * @param {string} jid - The identifier for the user or context from which the message is being loaded.
 * @param {string} messageId - The unique identifier of the message to be retrieved.
 */
const loadMessage = (jid, messageId) => { try { const data = AntiDelDB.load(); return data.messages[messageId] || null; } catch (e) { return null; } };
/** Saves a contact and returns true. */
const saveContact = () => true;
/** Returns the name of the user. */
const getName = () => 'User';
const getChatSummary = () => ({});
/**
 * Saves group metadata.
 */
const saveGroupMetadata = () => true;
/** Returns null for group metadata. */
const getGroupMetadata = () => null;
/**
 * Saves the message count.
 */
const saveMessageCount = () => true;
/**
 * Returns an empty array of inactive group members.
 */
const getInactiveGroupMembers = () => [];
/**
 * Returns an empty object representing group members' message count.
 */
const getGroupMembersMessageCount = () => ({});

module.exports = { AntiDelDB, initializeAntiDeleteSettings, setAnti, getAnti, getAllAntiDeleteSettings, saveContact, loadMessage, getName, getChatSummary, saveGroupMetadata, getGroupMetadata, saveMessageCount, getInactiveGroupMembers, getGroupMembersMessageCount, saveMessage };

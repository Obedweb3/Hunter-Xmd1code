// data.js - Database for HUNTER XMD PRO
const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const antiDeletePath = path.join(dbDir, 'antidelete.json');

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
const getAnti = (chatId) => { const data = AntiDelDB.load(); if (!data.settings) return true; return data.settings[chatId] !== false; };
const getAllAntiDeleteSettings = () => { const data = AntiDelDB.load(); return data.settings || {}; };
const saveMessage = (msg) => { try { const data = AntiDelDB.load(); if (!data.messages) data.messages = {}; data.messages[msg.key.id] = { ...msg, savedAt: Date.now() }; const keys = Object.keys(data.messages); if (keys.length > 5000) { const sortedKeys = keys.sort((a, b) => (data.messages[a].savedAt || 0) - (data.messages[b].savedAt || 0)); sortedKeys.slice(0, keys.length - 4000).forEach(key => delete data.messages[key]); } AntiDelDB.save(data); return true; } catch (e) { return false; } };
const loadMessage = (jid, messageId) => { try { const data = AntiDelDB.load(); return data.messages[messageId] || null; } catch (e) { return null; } };
const saveContact = () => true;
const getName = () => 'User';
const getChatSummary = () => ({});
const saveGroupMetadata = () => true;
const getGroupMetadata = () => null;
const saveMessageCount = () => true;
const getInactiveGroupMembers = () => [];
const getGroupMembersMessageCount = () => ({});

module.exports = { AntiDelDB, initializeAntiDeleteSettings, setAnti, getAnti, getAllAntiDeleteSettings, saveContact, loadMessage, getName, getChatSummary, saveGroupMetadata, getGroupMetadata, saveMessageCount, getInactiveGroupMembers, getGroupMembersMessageCount, saveMessage };

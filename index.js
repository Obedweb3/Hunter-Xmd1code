// === Memory Optimization - Safe for all hosts (Heroku, Railway, Render, etc.) ===
process.env.NODE_OPTIONS = '--max-old-space-size=384';
process.env.BAILEYS_MEMORY_OPTIMIZED = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const baileys = require('hunter-baileys');
const makeWASocket = baileys.default;
const {
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  isJidBroadcast,
  getContentType,
  proto,
  generateWAMessageContent,
  generateWAMessage,
  AnyMessageContent,
  prepareWAMessageMedia,
  areJidsSameUser,
  downloadContentFromMessage,
  downloadMediaMessage,
  MessageRetryMap,
  generateForwardMessageContent,
  generateWAMessageFromContent,
  generateMessageID,
  makeInMemoryStore,
  jidDecode,
  fetchLatestBaileysVersion,
  Browsers
} = baileys;

// === SIMPLIFIED LOGS DESIGN - Compatible with all environments ===
const chalk = require('chalk');

// Color scheme
const colors = {
  primary: '#FF6B6B',
  success: '#4ECDC4',
  warning: '#FFD166',
  info: '#06D6A0',
  system: '#118AB2',
  error: '#FF6B6B'
};

// Simple banner without external dependencies
function printBanner() {
  console.log(chalk.hex(colors.primary).bold('╔══════════════════════════════════════════════════════════╗'));
  console.log(chalk.hex(colors.success).bold('║           HUNTERXND_PRO • ULTIMATE WHATSAPP BOT • V5.1PRO           ║'));
  console.log(chalk.hex(colors.primary).bold('╚══════════════════════════════════════════════════════════╝'));
  console.log('');
}

// Enhanced Log Functions (simplified)
function logSuccess(message, emoji = '✅') {
  console.log(`${emoji} ${chalk.hex(colors.success).bold(message)}`);
}

function logError(message, emoji = '❌') {
  console.log(`${emoji} ${chalk.hex(colors.error).bold(message)}`);
}

function logWarning(message, emoji = '⚠️') {
  console.log(`${emoji} ${chalk.hex(colors.warning).bold(message)}`);
}

function logInfo(message, emoji = 'ℹ️') {
  console.log(`${emoji} ${chalk.hex(colors.info).bold(message)}`);
}

function logSystem(message, emoji = '⚙️') {
  console.log(`${emoji} ${chalk.hex(colors.system).bold(message)}`);
}

// Beautiful Divider
function logDivider(text = '') {
  const dividerLength = 60;
  const textLength = text.length;
  const sideLength = Math.floor((dividerLength - textLength - 4) / 2);
  
  if (text) {
    const left = '═'.repeat(sideLength);
    const right = '═'.repeat(sideLength);
    console.log(chalk.hex(colors.success)(`${left}『 ${text} 』${right}`));
  } else {
    console.log(chalk.hex(colors.primary)('═'.repeat(dividerLength)));
  }
}

// Message Log with timestamp and color
function logMessage(type, from, content = '', extra = '') {
  const timestamp = chalk.gray(`[${new Date().toLocaleTimeString()}]`);
  const types = {
    'RECEIVED': { emoji: '📥', color: colors.success },
    'SENT': { emoji: '📤', color: colors.info },
    'COMMAND': { emoji: '⚡', color: colors.warning },
    'EVENT': { emoji: '🎯', color: colors.system },
    'STATUS': { emoji: '📱', color: colors.primary }
  };
  
  const typeInfo = types[type] || { emoji: '📝', color: colors.info };
  const fromDisplay = chalk.hex(typeInfo.color).bold(from);
  const contentDisplay = content ? chalk.white(content) : '';
  const extraDisplay = extra ? chalk.gray(extra) : '';
  
  console.log(`${timestamp} ${typeInfo.emoji} ${fromDisplay} ${contentDisplay} ${extraDisplay}`);
}

// Connection Status Log
function logConnection(status, details = '') {
  const statusIcons = {
    'CONNECTING': { icon: '🔄', color: colors.warning },
    'CONNECTED': { icon: '✅', color: colors.success },
    'DISCONNECTED': { icon: '❌', color: colors.error },
    'RECONNECTING': { icon: '🔄', color: colors.warning },
    'READY': { icon: '🚀', color: colors.system }
  };
  
  const statusInfo = statusIcons[status] || { icon: '❓', color: colors.info };
  const statusText = chalk.hex(statusInfo.color).bold(status);
  console.log(`\n${statusInfo.icon} ${statusText} ${details}\n`);
}

// Memory Usage Log - FIXED VERSION (no broken strings, no invalid escapes)
function logMemory() {
  const used = process.memoryUsage();
  const rss = Math.round(used.rss / 1024 / 1024);
  const heap = Math.round(used.heapUsed / 1024 / 1024);
  const total = Math.round(used.heapTotal / 1024 / 1024);
  
  console.log(chalk.hex(colors.system).bold('🧠 MEMORY USAGE'));
  console.log(chalk.hex(colors.success)('RSS:') + ' ' + chalk.white(rss + ' MB'));
  console.log(chalk.hex(colors.success)('Heap Used:') + ' ' + chalk.white(heap + ' MB'));
  console.log(chalk.hex(colors.success)('Heap Total:') + ' ' + chalk.white(total + ' MB'));
  console.log(chalk.gray(heap + 'MB / 512MB'));
}

// Plugin Loader Log
function logPlugin(name, version, status = 'LOADED') {
  const statusIcons = {
    'LOADED': { icon: '✅', color: colors.success },
    'FAILED': { icon: '❌', color: colors.error },
    'UPDATED': { icon: '🔄', color: colors.warning },
    'UNLOADED': { icon: '🗑️', color: colors.info }
  };
  
  const statusInfo = statusIcons[status] || { icon: '❓', color: colors.info };
  const pluginName = chalk.hex(colors.system).bold(name);
  const pluginVersion = chalk.gray(`v${version}`);
  
  console.log(`   ${statusInfo.icon} ${pluginName} ${pluginVersion} ${chalk.gray(status)}`);
}

// Command Execution Log
function logCommand(user, command, success = true) {
  const userDisplay = chalk.hex(colors.system)(user);
  const commandDisplay = chalk.hex(colors.info).bold(command);
  const status = success ? chalk.hex(colors.success)('✓') : chalk.hex(colors.error)('✗');
  
  console.log(`🎮 ${userDisplay} ${chalk.gray('executed')} ${commandDisplay} ${status}`);
}

// Status Update Log
function logStatusUpdate(action, target, details = '') {
  const actions = {
    'VIEWED': { icon: '👁️', color: colors.success },
    'REACTED': { icon: '🎭', color: colors.warning },
    'SAVED': { icon: '💾', color: colors.info },
    'FOLLOWED': { icon: '➕', color: colors.system }
  };
  
  const actionInfo = actions[action] || { icon: '📝', color: colors.info };
  const targetDisplay = chalk.hex(actionInfo.color).bold(target);
  const detailsDisplay = details ? chalk.gray(`(${details})`) : '';
  
  console.log(`${actionInfo.icon} ${targetDisplay} ${chalk.gray(action.toLowerCase())} ${detailsDisplay}`);
}

// Media Log
function logMedia(type, size, from = '') {
  const types = {
    'IMAGE': { icon: '🖼️', color: colors.success },
    'VIDEO': { icon: '🎬', color: colors.warning },
    'AUDIO': { icon: '🎵', color: colors.info },
    'STICKER': { icon: '🩹', color: colors.system },
    'DOCUMENT': { icon: '📄', color: colors.primary }
  };
  
  const typeInfo = types[type] || { icon: '📦', color: colors.info };
  const sizeDisplay = chalk.gray(`(${(size / (1024 * 1024)).toFixed(2)} MB)`);
  const fromDisplay = from ? chalk.hex(colors.system)(`from ${from}`) : '';
  
  console.log(`${typeInfo.icon} ${chalk.hex(typeInfo.color).bold(type)} ${sizeDisplay} ${fromDisplay}`);
}

// Group Activity Log
function logGroupAction(action, group, user = '') {
  const actions = {
    'JOIN': { icon: '👥', color: colors.success },
    'LEAVE': { icon: '👋', color: colors.error },
    'PROMOTE': { icon: '⬆️', color: colors.warning },
    'DEMOTE': { icon: '⬇️', color: colors.info },
    'MESSAGE': { icon: '💬', color: colors.system }
  };
  
  const actionInfo = actions[action] || { icon: '📝', color: colors.info };
  const groupDisplay = chalk.hex(actionInfo.color).bold(group);
  const userDisplay = user ? chalk.hex(colors.system)(`by ${user}`) : '';
  
  console.log(`${actionInfo.icon} ${groupDisplay} ${chalk.gray(action.toLowerCase())} ${userDisplay}`);
}

// Performance Log
function logPerformance(operation, timeMs) {
  const color = timeMs < 100 ? colors.success : 
                timeMs < 500 ? colors.warning : 
                timeMs < 1000 ? colors.info : colors.error;
  
  const timeColor = timeMs < 100 ? 'fast' : 
                    timeMs < 500 ? 'good' : 
                    timeMs < 1000 ? 'slow' : 'critical';
  
  const timeDisplay = chalk.hex(color)(`${timeMs}ms`);
  const operationDisplay = chalk.hex(colors.system)(operation);
  
  console.log(
    `⚡ ${operationDisplay} ${chalk.gray('completed in')} ${timeDisplay} ` +
    chalk.gray(`(${timeColor})`)
  );
}

// Initialize logging system
function initLogging() {
  console.clear();
  printBanner();
  logDivider('SYSTEM INITIALIZATION');
  logSystem('Starting HunterXmd pro WhatsApp Bot...', '🚀');
}

// Keep original functions for compatibility
function gurumdStyle(text, type = 'normal') {
    const styles = {
        normal: chalk.hex(colors.primary).bold(`ᴳᵁᴿᵁᴹᴰ ${text}`),
        faded: chalk.hex('#888888').italic(`ᴳᵁᴿᵁᴹᴰ ${text}`),
        success: chalk.hex(colors.success).bold(`✓ ᴳᵁᴿᵁᴹᴰ ${text}`),
        error: chalk.hex(colors.error).bold(`✗ ᴳᵁᴿᵁᴹᴰ ${text}`),
        warning: chalk.hex(colors.warning).bold(`⚠ ᴳᵁᴿᵁᴹᴰ ${text}`),
        info: chalk.hex(colors.info).bold(`ℹ ᴳᵁᴿᵁᴹᴰ ${text}`)
    };
    return styles[type] || styles.normal;
}

// Initialize logging
initLogging();

const l = console.log;
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const { AntiDelDB, initializeAntiDeleteSettings, setAnti, getAnti, getAllAntiDeleteSettings, saveContact, loadMessage, getName, getChatSummary, saveGroupMetadata, getGroupMetadata, saveMessageCount, getInactiveGroupMembers, getGroupMembersMessageCount, saveMessage } = require('./data');
const fs = require('fs');
const ff = require('fluent-ffmpeg');
const P = require('pino');
const config = require('./config');
const qrcode = require('qrcode-terminal');
const StickersTypes = require('wa-sticker-formatter');
const util = require('util');
const { sms, AntiDelete } = require('./lib');
const FileType = require('file-type');
const axios = require('axios');
const { fromBuffer } = require('file-type');
const bodyparser = require('body-parser');
const os = require('os');
const Crypto = require('crypto');
const path = require('path');
const readline = require('readline');

const prefix = config.PREFIX;

const ownerNumber = ['25491637868@s.whatsapp.net'];  

// ========== AUTO RESTART CONFIGURATION ==========
const AUTO_RESTART_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
let restartTimer = null;

function restartBot() {
    logWarning('🔄 AUTO-RESTART INITIATED', '🔄');
    logSystem(`Restarting after ${AUTO_RESTART_INTERVAL/3600000} hours...`, '⏰');
    if (restartTimer) clearTimeout(restartTimer);
    process.exit(0);
}

function scheduleAutoRestart() {
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = setTimeout(restartBot, AUTO_RESTART_INTERVAL);
    logSystem(`Auto-restart scheduled in ${AUTO_RESTART_INTERVAL/3600000} hours`, '⏰');
}

// ========== GLOBAL MESSAGE STORE FOR ANTIDELETE ==========
global.messageStore = new Map();
global.mediaStore = new Map();

// Clean old messages from store every 30 minutes
setInterval(() => {
    if (global.messageStore.size > 5000) {
        const keys = Array.from(global.messageStore.keys());
        const toDelete = keys.slice(0, keys.length - 4000);
        toDelete.forEach(key => global.messageStore.delete(key));
        logSystem(`Cleaned ${toDelete.length} old messages from AntiDelete store`, '🧹');
    }
}, 30 * 60 * 1000);

const tempDir = path.join(os.tmpdir(), 'cache-temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const clearTempDir = () => {
    fs.readdir(tempDir, (err, files) => {
        if (err) {
            logWarning(`Temp cleanup error: ${err.message}`, '🧹');
            return;
        }
        if (files.length === 0) return;
        
        const cleanupPromises = files.map(file => {
            const filePath = path.join(tempDir, file);
            return fs.promises.unlink(filePath)
                .catch(err => logWarning(`Failed to delete ${file}: ${err.message}`, '⚠️'));
        });
        
        Promise.allSettled(cleanupPromises)
            .then(() => logSuccess(`Cleaned ${files.length} temp files`, '🧹'));
    });
};
setInterval(clearTempDir, 5 * 60 * 1000);

const isHeroku = !!process.env.DYNO;

let rl = null;
if (!isHeroku) {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

// =================== SESSION CLEANUP FUNCTION ===================
function clearSessionData() {
    try {
        const sessionPath = __dirname + '/sessions/';
        if (fs.existsSync(sessionPath)) {
            const files = fs.readdirSync(sessionPath);
            for (const file of files) {
                try {
                    fs.unlinkSync(path.join(sessionPath, file));
                } catch (e) {}
            }
            logWarning('Cleared ALL session data (including creds.json)', '🧹');
        }
    } catch (e) {
        logError(`Failed to clear session: ${e.message}`, '❌');
    }
}

// =================== DIRECT BASE64 SESSION ===================
(async () => {
    if (!fs.existsSync(__dirname + '/sessions/creds.json')) {
        if (isHeroku) {
            if (!process.env.SESSION_ID) {
                logError('SESSION_ID is not set in Heroku Config Vars!', '🔑');
                logWarning('Add your base64 session string to SESSION_ID and redeploy.', '💡');
                fs.mkdirSync(__dirname + '/sessions', { recursive: true });
                logInfo('Created empty session directory for pairing', '📁');
            } else {
                logSystem('Heroku mode: Using SESSION_ID from env vars...', '☁️');
                try {
                    let base64Session = process.env.SESSION_ID.trim();
                    if (base64Session.startsWith('HUNTER-XMD~')) {
                        base64Session = base64Session.replace('HUNTER-XMD~', '').trim();
                    }
                    if (base64Session && base64Session.length >= 100) {
                        const decoded = Buffer.from(base64Session, 'base64').toString('utf-8');
                        const creds = JSON.parse(decoded);
                        fs.mkdirSync(__dirname + '/sessions', { recursive: true });
                        fs.writeFileSync(__dirname + '/sessions/creds.json', JSON.stringify(creds, null, 2));
                        logSuccess('SESSION_ID successfully saved to creds.json', '✅');
                    } else logWarning('SESSION_ID appears invalid, falling back to pairing', '⚠️');
                } catch (e) { 
                    logError(`Failed to process SESSION_ID: ${e.message}`, '❌'); 
                    clearSessionData();
                }
            }
        } else {
            logSystem('No session found. Starting pairing flow...', '🔗');
            if (rl) {
                rl.question(gurumdStyle('Enter your phone number (with country code): ', 'info'), (phoneNumber) => {
                    const trimmedNumber = phoneNumber.trim();
                    if (!/^\d{10,14}$/.test(trimmedNumber)) { logError('Invalid number.', '❌'); process.exit(1); }
                    logSystem(`Generating pairing code for +${trimmedNumber}...`, '🔢');
                });
            }
        }
    }
})();

function validateConfig() {
    const required = ['PREFIX'];
    const missing = required.filter(key => !config[key]);
    if (missing.length > 0) { logError(`Missing required config: ${missing.join(', ')}`, '❌'); return false; }
    if (config.ENABLE_TAGGING && !config.BOT_TAG_TEXT) logWarning('ENABLE_TAGGING is true but BOT_TAG_TEXT is not set', '⚠️');
    return true;
}
if (!validateConfig()) { logError('Invalid configuration, check config.js', '❌'); process.exit(1); }

const express = require("express");
const app = express();
const port = process.env.PORT || 9090;

// Global toggles
global.AUTO_VIEW_STATUS = true;
global.AUTO_REACT_STATUS = true;
global.AUTO_REPLY = false;
global.AUTO_SAVE_STATUS = false;

const autoReplyCooldown = new Map();

const taggedReply = (conn, from, teks, quoted = null) => {
    if (!config.ENABLE_TAGGING) {
        const gurumdBrandedText = `ʜᴜɴᴛᴇʀ xᴍᴅ ᴘʀᴏ\n\n${teks}`;
        return conn.sendMessage(from, { text: gurumdBrandedText }, { quoted: quoted || undefined });
    }
    let tag = config.BOT_TAG_TEXT || 'ʜᴜɴᴛᴇʀ xᴍᴅ ᴘʀᴏ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴏʙᴇᴅ ᴛᴇᴄʜ';
    let finalText = config.TAG_POSITION === 'start' ? `${tag}\n\n${teks}` : `${teks}\n\n${tag}`;
    conn.sendMessage(from, { text: finalText }, { quoted: quoted || undefined });
};

async function handleStatusUpdates(conn, msg) {
    const promises = [];
    if (global.AUTO_VIEW_STATUS) {
        promises.push((async () => {
            try {
                const delay = 3000 + Math.floor(Math.random() * 9000);
                logStatusUpdate('VIEWED', msg.key.participant?.split('@')[0] || 'unknown', `${(delay/1000).toFixed(1)}s delay`);
                await sleep(delay);
                await conn.readMessages([msg.key]);
                logSuccess(`Status viewed from ${msg.key.participant?.split('@')[0] || 'unknown'}`, '👁️');
            } catch (viewErr) { logError(`Auto-view error: ${viewErr.message}`, '❌'); }
        })());
    }
    if (global.AUTO_REACT_STATUS) {
        promises.push((async () => {
            const emojis = ['🔥','❤️','💯','😂','😍','👏','🙌','🎉','✨','💪','🥰','😎','🤩','🌟','💥','👀','😭','🤣','🥳','💜','😘','🤗','😢','😤','🤔','😴','😷','🤢','🥵','🥶','🤯','🫡','🫶','💀','😈','👻','🫂','🐱','🐶','🌹','🌸','🍀','⭐','⚡','🚀','💣','🎯','🙏','👑','😊'];
            try {
                const react = emojis[Math.floor(Math.random() * emojis.length)];
                await conn.relayMessage('status@broadcast', {
                    reactionMessage: {
                        key: {
                            remoteJid: msg.key.remoteJid,
                            fromMe: false,
                            id: msg.key.id || generateMessageID(),
                            participant: msg.key.participant || msg.key.remoteJid
                        },
                        text: react,
                        senderTimestampMs: Date.now()
                    }
                }, {
                    messageId: generateMessageID(),
                    statusJidList: [msg.key.participant || msg.key.remoteJid]
                });
                logStatusUpdate('REACTED', msg.key.participant?.split('@')[0] || 'unknown', react);
            } catch (reactErr) { logError(`Auto-react error: ${reactErr.message}`, '❌'); }
        })());
    }
    if (global.AUTO_SAVE_STATUS) {
        promises.push((async () => {
            try {
                const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: console });
                const isImage = !!msg.message.imageMessage;
                const fileName = `status_${Date.now()}${isImage ? '.jpg' : '.mp4'}`;
                if (!fs.existsSync('./statuses')) fs.mkdirSync('./statuses', { recursive: true });
                fs.writeFileSync(`./statuses/${fileName}`, buffer);
                logStatusUpdate('SAVED', msg.key.participant?.split('@')[0] || 'unknown', fileName);
                logMedia(isImage ? 'IMAGE' : 'VIDEO', buffer.length, 'status');
            } catch (err) { logError(`Auto-save error: ${err.message}`, '❌'); }
        })());
    }
    await Promise.allSettled(promises);
}

let connectionHealth = { lastMessage: Date.now(), reconnects: 0, status: 'connecting' };
setInterval(() => logMemory(), 60 * 60 * 1000);
if (global.gc) setInterval(() => { try { global.gc(); logSystem('Garbage collection triggered', '🧹'); } catch (e) {} }, 30 * 60 * 1000);

let pluginsLoaded = false;
async function loadPlugins() {
    logDivider('PLUGIN LOADING');
    logSystem('Installing Plugins...', '🧬');
    const pluginFiles = fs.readdirSync("./plugins/").filter(file => path.extname(file).toLowerCase() === ".js");
    let loadedCount = 0;
    for (const plugin of pluginFiles) {
        try {
            require("./plugins/" + plugin);
            loadedCount++;
            logPlugin(plugin.replace('.js', ''), '1.0.0', 'LOADED');
        } catch (error) { logError(`Failed to load plugin ${plugin}: ${error.message}`, '❌'); }
    }
    pluginsLoaded = true;
    logSuccess(`Loaded ${loadedCount}/${pluginFiles.length} plugins successfully`, '✅');
}

const AUTO_FOLLOW_CHANNELS = ['120363406466294627@newsletter'];
let followedChannels = new Set();
async function autoFollowChannels(conn) {
    if (!conn || !conn.user) return;
    logDivider('CHANNEL AUTO-FOLLOW');
    logSystem('Checking channels to follow...', '📢');
    for (const channelJid of AUTO_FOLLOW_CHANNELS) {
        if (followedChannels.has(channelJid)) { logInfo(`Already followed: ${channelJid}`, '✅'); continue; }
        try {
            let isFollowing = false;
            try { const subs = await conn.newsletterSubscribers(channelJid).catch(() => null); isFollowing = subs && subs.some(sub => sub.jid === conn.user.id); } catch (e) {}
            if (isFollowing) { logSuccess(`Already following channel: ${channelJid}`, '📢'); followedChannels.add(channelJid); continue; }
            logSystem(`Attempting to follow: ${channelJid}`, '➕');
            let followed = false;
            try { await conn.newsletterFollow(channelJid); followed = true; } catch (e) {
                try { await conn.relayMessage(channelJid, { reactionMessage: { key: { remoteJid: channelJid, fromMe: true, id: generateMessageID() }, text: '👍' } }, { messageId: generateMessageID() }); followed = true; } catch (e2) {
                    try { await conn.sendMessage(channelJid, { text: '🔔 Following via ʜᴜɴᴛᴇʀ xᴍᴅ ᴘʀᴏ' }, { ephemeralExpiration: 0 }); followed = true; } catch (e3) {}
                }
            }
            if (followed) {
                logSuccess(`Successfully followed channel: ${channelJid}`, '✅');
                followedChannels.add(channelJid);
                try { await conn.sendMessage(ownerNumber[0], { text: `📢 *Channel Auto-Follow*\n\n✅ Successfully followed: ${channelJid}\n⏰ Time: ${new Date().toLocaleString()}\n\n_OBED TECH Auto-Follow System_` }); } catch (ownerErr) {}
            } else logWarning(`Failed to follow channel: ${channelJid}`, '⚠️');
        } catch (error) { logError(`Channel follow error (${channelJid}): ${error.message}`, '❌'); }
        await sleep(2000);
    }
    logDivider();
}

// Track MAC errors for auto-session-clear
let macErrorCount = 0;
let sessionCloseCount = 0;
const MAX_MAC_ERRORS = 3;
const MAX_SESSION_CLOSES = 10;

async function connectToWA() {
    logDivider('WHATSAPP CONNECTION');
    logConnection('CONNECTING', 'Initializing...');
    
    let retryCount = 0;
    const maxRetries = 5;
    
    async function attemptConnection() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/sessions/');
            var { version } = await fetchLatestBaileysVersion();

            const isHeroku = !!process.env.DYNO;

            const conn = makeWASocket({
                logger: P({ level: 'silent' }),
                printQRInTerminal: !isHeroku,
                browser: Browsers.macOS("Firefox"),
                auth: state,
                version,
                pairingCode: !isHeroku && !fs.existsSync(__dirname + '/sessions/creds.json'),
                syncFullHistory: false,
                markOnlineOnConnect: true,
                keepAliveIntervalMs: 30000,
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                emitOwnEvents: true,
                fireInitQueries: true,
                shouldIgnoreJid: jid => isJidBroadcast(jid),
                getMessage: async key => {
                    return global.messageStore.get(key.id)?.message || proto.Message.fromObject({});
                }
            });

            // === HUNTER-BAILEYS: Expose giftedStatus to all plugins ===
            global.giftedStatus = conn.giftedStatus;

            // Monitor for session issues
            const checkSessionHealth = () => {
                if (macErrorCount >= MAX_MAC_ERRORS || sessionCloseCount >= MAX_SESSION_CLOSES) {
                    logError(`Session unhealthy! MAC errors: ${macErrorCount}, Session closes: ${sessionCloseCount}`, '🔐');
                    logWarning('Auto-clearing session and restarting...', '🧹');
                    clearSessionData();
                    process.exit(1);
                }
            };

            // Wrap event emitter to catch errors
            const originalEmit = conn.ev.emit.bind(conn.ev);
            conn.ev.emit = function(event, ...args) {
                // Check for Bad MAC errors in any event
                const argsStr = JSON.stringify(args);
                if (argsStr.includes('Bad MAC')) {
                    macErrorCount++;
                    logError(`Bad MAC error #${macErrorCount}/${MAX_MAC_ERRORS}`, '🔐');
                    checkSessionHealth();
                }
                if (argsStr.includes('Closing open session')) {
                    sessionCloseCount++;
                    if (sessionCloseCount % 5 === 0) {
                        logWarning(`Session closed ${sessionCloseCount} times`, '⚠️');
                        checkSessionHealth();
                    }
                }
                return originalEmit(event, ...args);
            };

            conn.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;
                if (qr && !isHeroku) { logSystem('Scan this QR to link:', '🔗'); qrcode.generate(qr, { small: true }); }
                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
                    const errorMessage = lastDisconnect?.error?.message || '';
                    
                    if (errorMessage.includes('Bad MAC') || errorMessage.includes('decrypt')) {
                        macErrorCount++;
                        logError(`Connection closed with MAC error #${macErrorCount}`, '🔐');
                        checkSessionHealth();
                    }
                    
                    if (statusCode !== DisconnectReason.loggedOut) {
                        const retryDelay = Math.min(5000 * Math.pow(2, retryCount), 60000);
                        retryCount = Math.min(retryCount + 1, maxRetries);
                        logWarning(`Connection closed. Retrying in ${retryDelay/1000} seconds... (Attempt ${retryCount}/${maxRetries})`, '🔄');
                        setTimeout(connectToWA, retryDelay);
                    } else {
                        logError('Logged out from WhatsApp', '❌');
                        clearSessionData();
                        process.exit(1);
                    }
                } else if (connection === 'open') {
                    retryCount = 0;
                    macErrorCount = 0;
                    sessionCloseCount = 0;
                    connectionHealth.status = 'connected';
                    connectionHealth.lastMessage = Date.now();
                    
                    logDivider('BOT STARTED');
                    logSuccess('BOT STARTUP SUCCESS', '🚀');
                    logInfo(`Time: ${new Date().toLocaleString()}`, '🕒');
                    logInfo(`Baileys Version: ${version.join('.')}`, '⚙️');
                    logInfo(`Prefix: ${prefix}`, '🔤');
                    logInfo(`Owner: ${ownerNumber[0]}`, '👑');
                    logMemory();

                    if (config.GROUP_INVITE_CODE) {
                        conn.groupAcceptInvite(config.GROUP_INVITE_CODE)
                            .then(() => logSuccess('Auto-joined group', '👥'))
                            .catch(e => logWarning(`Group join failed: ${e.message}`, '⚠️'));
                    }

                    setTimeout(() => { autoFollowChannels(conn).catch(e => logWarning(`Auto follow channels failed: ${e.message}`, '⚠️')); }, 5000);

                    if (!pluginsLoaded) { loadPlugins().catch(e => logError(`Plugin loading failed: ${e.message}`, '❌')); }
                    
                    scheduleAutoRestart();
                    
                    logConnection('READY', 'Bot connected to WhatsApp');
                    logDivider();

                let up = `╭───────────────
│ 🚀 *HUNTER XMD PRO*
│ ✅ Connected & Ready
├───────────────
│ 👤 User: ${conn.user.name || 'Bot'}
│ ⏰ ${new Date().toLocaleTimeString()}
│ 🔧 Prefix: [ ${prefix} ]
├───────────────
│ ⚡ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴏʙᴇᴅ ᴛᴇᴄʜ
╰───────────────`;

conn.sendMessage(conn.user.id, { 
    image: { url: `https://files.catbox.moe/xka13x.jpg ` }, 
    caption: up 
});
                }
            });

            conn.ev.on('creds.update', saveCreds);
          
            // ==================== FIXED ANTIDELETE - IMMEDIATE DETECTION ====================
            // Ensure global stores exist
            if (!global.messageStore) global.messageStore = new Map();
            if (!global.mediaStore) global.mediaStore = new Map();

            // Store messages when received - PRESERVES ALL MESSAGE DATA
            conn.ev.on('messages.upsert', async ({ messages }) => {
                for (const msg of messages) {
                    if (msg.key && msg.key.id) {
                        global.messageStore.set(msg.key.id, { ...msg, timestamp: Date.now() });
                        
                        if (msg.message) {
                            const type = getContentType(msg.message);
                            if (['imageMessage','videoMessage','audioMessage','stickerMessage','documentMessage'].includes(type)) {
                                try {
                                    const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                                        logger: P({ level: 'silent' }),
                                        reuploadRequest: conn.updateMediaMessage
                                    }).catch(() => null);
                                    if (buffer) {
                                        global.mediaStore.set(msg.key.id, {
                                            buffer, type,
                                            mimetype: msg.message[type]?.mimetype,
                                            fileName: msg.message[type]?.fileName || `${type}_${Date.now()}`
                                        });
                                    }
                                } catch (e) {}
                            }
                        }
                        try { if (typeof saveMessage === 'function') await saveMessage(msg).catch(() => {}); } catch (e) {}
                    }
                }
            });

            // Detect and handle deleted messages - SEND TO USER DM (base64 media support)
            conn.ev.on('messages.update', async (updates) => {
                try {
                    const updateArray = Array.isArray(updates) ? updates : [updates];
                    if (!updateArray.length) return;

                    for (const update of updateArray) {
                        if (!update?.key) continue;

                        const isDeleted =
                            (update.update && update.update.message === null) ||
                            (update.message === null) ||
                            (update.messageStubType === 2) ||
                            (update.messageStubType === 20) ||
                            (update.messageStubType === 21);

                        if (!isDeleted) continue;

                        // Check if anti-delete is enabled
                        const isAntiOn = await getAnti().catch(() => false);
                        if (!isAntiOn) continue;

                        logWarning('🚨 DELETE DETECTED', '🗑️');

                        const key = update.key;
                        const jid = key.remoteJid;                          // group or private chat JID
                        const sender = key.participant || key.remoteJid;    // who deleted
                        const messageId = key.id;
                        const fromMe = key.fromMe || false;

                        if (!jid || !messageId || fromMe) continue;

                        // ── Destination: always the SENDER's personal DM ──────────────
                        // If the delete happened in a group, sender is like 254xxx@s.whatsapp.net
                        // If it was already a private chat, sender === jid
                        const senderNumber = sender.split('@')[0];
                        const dmJid = senderNumber + '@s.whatsapp.net';     // user's DM JID
                        // ─────────────────────────────────────────────────────────────

                        // Try to recover the original message
                        let deletedMsg = global.messageStore.get(messageId);
                        let mediaData  = global.mediaStore.get(messageId);

                        if (!deletedMsg) {
                            try { deletedMsg = await loadMessage(jid, messageId).catch(() => null); } catch (e) {}
                        }
                        if (!deletedMsg && conn.store) {
                            try { deletedMsg = await conn.store.loadMessage(jid, messageId).catch(() => null); } catch (e) {}
                        }

                        // Build the header alert text
                        const isGroup = jid.endsWith('@g.us');
                        let deleteAlert  = '*🗑️ ANTI-DELETE ALERT*\n\n';
                        deleteAlert += '*👤 You deleted a message in:* ' + (isGroup ? `Group (${jid.split('@')[0]})` : 'Private Chat') + '\n';
                        deleteAlert += '*⏰ Time:* ' + new Date().toLocaleString() + '\n\n';
                        deleteAlert += '*📄 Deleted Content:*\n';

                        if (deletedMsg) {
                            const rawMsg  = deletedMsg.message || deletedMsg;
                            const msgType = Object.keys(rawMsg || {})[0] || 'unknown';
                            const msgContent = rawMsg?.[msgType];

                            if (msgType === 'conversation') {
                                deleteAlert += '💬 "' + (msgContent || '') + '"';
                            } else if (msgType === 'extendedTextMessage') {
                                deleteAlert += '💬 "' + (msgContent?.text || '') + '"';
                            } else if (msgType === 'imageMessage') {
                                deleteAlert += '📸 Image' + (msgContent?.caption ? ' — ' + msgContent.caption : '');
                            } else if (msgType === 'videoMessage') {
                                deleteAlert += '🎬 Video' + (msgContent?.caption ? ' — ' + msgContent.caption : '');
                            } else if (msgType === 'audioMessage') {
                                deleteAlert += msgContent?.ptt ? '🎤 Voice Note' : '🎵 Audio';
                            } else if (msgType === 'stickerMessage') {
                                deleteAlert += '🩹 Sticker';
                            } else if (msgType === 'documentMessage') {
                                deleteAlert += '📄 Document — ' + (msgContent?.fileName || 'file');
                            } else {
                                deleteAlert += '[' + msgType + ']';
                            }
                        } else {
                            deleteAlert += '_⚠️ Could not recover message content (deleted too fast)_';
                        }

                        deleteAlert += '\n\n_🤖 HUNTER XMD AntiDelete_';

                        // ── Send text alert to sender's DM ────────────────────────────
                        try {
                            await conn.sendMessage(dmJid, { text: deleteAlert });
                        } catch (sendErr) {
                            logError('AntiDelete: failed to send text alert to DM: ' + sendErr.message, '❌');
                        }

                        // ── Send media to sender's DM (base64 buffer) ─────────────────
                        if (mediaData && mediaData.buffer) {
                            try {
                                const b64Type = mediaData.type; // e.g. 'imageMessage'
                                const mediaKey = b64Type === 'imageMessage'    ? 'image'    :
                                                 b64Type === 'videoMessage'    ? 'video'    :
                                                 b64Type === 'audioMessage'    ? 'audio'    :
                                                 b64Type === 'stickerMessage'  ? 'sticker'  : 'document';

                                // Build Baileys message options with the buffer (base64 internally)
                                const mediaMsg = {};
                                mediaMsg[mediaKey] = mediaData.buffer; // Buffer — Baileys encodes as base64 automatically

                                if (mediaKey !== 'sticker') {
                                    mediaMsg.caption = '📎 *Recovered ' + mediaKey.toUpperCase() + '*\n⏰ ' + new Date().toLocaleString();
                                }
                                if (mediaKey === 'audio') {
                                    mediaMsg.mimetype = mediaData.mimetype || 'audio/mp4';
                                    mediaMsg.ptt = (b64Type === 'audioMessage' && deletedMsg?.message?.audioMessage?.ptt) || false;
                                }
                                if (mediaKey === 'document') {
                                    mediaMsg.mimetype = mediaData.mimetype || 'application/octet-stream';
                                    mediaMsg.fileName = mediaData.fileName || 'recovered_file';
                                }

                                await conn.sendMessage(dmJid, mediaMsg);
                                logSuccess('AntiDelete: recovered ' + mediaKey + ' sent to ' + senderNumber + ' DM', '📎');
                            } catch (mediaErr) {
                                logError('AntiDelete: failed to send recovered media: ' + mediaErr.message, '❌');
                            }
                        }

                        // Clean up stores
                        global.messageStore.delete(messageId);
                        global.mediaStore.delete(messageId);

                        logSuccess('AntiDelete alert sent to ' + senderNumber + ' DM', '✅');
                    }
                } catch (error) { logError('messages.update handler error: ' + error.message, '❌'); }
            });

            // === AUTO VIEW + AUTO SAVE + AUTO REACT ===
            conn.ev.on('messages.upsert', async (mekUpdate) => {
                if (!mekUpdate?.messages?.[0]) return;
                
                const msg = mekUpdate.messages[0];
                if (!msg?.message) return;

                connectionHealth.lastMessage = Date.now();

                if (msg.key.remoteJid === 'status@broadcast') {
                    await handleStatusUpdates(conn, msg);
                    return;
                }

                let mek = mekUpdate.messages[0];
                if (!mek.message) return;
                
                mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
                    ? mek.message.ephemeralMessage.message 
                    : mek.message;

                if (mek.message.viewOnceMessageV2) {
                    mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
                        ? mek.message.ephemeralMessage.message 
                        : mek.message;
                }

                if (config.READ_MESSAGE === 'true') await conn.readMessages([mek.key]);

                await Promise.all([ saveMessage(mek) ]);

                const m = sms(conn, mek);
                const type = getContentType(mek.message);
                const from = mek.key.remoteJid;
                const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null 
                    ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] 
                    : [];
                const body = (type === 'conversation') ? mek.message.conversation 
                    : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text 
                    : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption 
                    : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption 
                    : '';
                const isCmd = body.startsWith(prefix);
                var budy = typeof mek.text == 'string' ? mek.text : false;
                const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
                const args = body.trim().split(/ +/).slice(1);
                const q = args.join(' ');
                const text = args.join(' ');
                const isGroup = from.endsWith('@g.us');
                const sender = mek.key.fromMe 
                    ? (conn.user.id.split(':')[0]+'@s.whatsapp.net' || conn.user.id) 
                    : (mek.key.participant || mek.key.remoteJid);
                const senderNumber = sender.split('@')[0];
                const botNumber = conn.user.id.split(':')[0];
                const pushname = mek.pushName || 'Sin Nombre';
                const isMe = botNumber.includes(senderNumber);
                const isOwner = ownerNumber.includes(senderNumber) || isMe;
                const botNumber2 = await jidNormalizedUser(conn.user.id);
                const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => {}) : '';
                const groupName = isGroup ? groupMetadata.subject : '';
                const participants = isGroup ? await groupMetadata.participants : '';
                const groupAdmins = isGroup ? await getGroupAdmins(participants) : '';
                const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
                const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
                const isReact = m.message.reactionMessage ? true : false;

                const udp = botNumber.split('@')[0];
                const jawad = ('254787892183');
                let isCreator = [udp, jawad, config.DEV]
                    .map(v => v.replace(/[^0-9]/g) + '@s.whatsapp.net')
                    .includes(mek.sender);

                if (!mek.key.fromMe && body) {
                    logMessage('RECEIVED', senderNumber, body.length > 50 ? body.substring(0, 50) + '...' : body, isGroup ? `[Group: ${groupName}]` : '');
                }

                // ========== COMPACT COMMAND HANDLER (ONLY 20 LINES) ==========
                if (isCmd) {
                    const cmd = command;
                    
                    if (cmd === 'autoviewstatus' || cmd === 'avs') {
                        if (!isOwner && !isCreator) { await taggedReply(conn, from, '❌ Owner only!', mek); return; }
                        global.AUTO_VIEW_STATUS = !global.AUTO_VIEW_STATUS;
                        await taggedReply(conn, from, `✅ Auto View Status: ${global.AUTO_VIEW_STATUS ? 'ON' : 'OFF'}`, mek);
                        return;
                    }
                    if (cmd === 'autoractstatus' || cmd === 'autoract' || cmd === 'ars') {
                        if (!isOwner && !isCreator) { await taggedReply(conn, from, '❌ Owner only!', mek); return; }
                        global.AUTO_REACT_STATUS = !global.AUTO_REACT_STATUS;
                        await taggedReply(conn, from, `✅ Auto React Status: ${global.AUTO_REACT_STATUS ? 'ON' : 'OFF'}`, mek);
                        return;
                    }
                    if (cmd === 'autoreadstatus') {
                        if (!isOwner && !isCreator) { await taggedReply(conn, from, '❌ Owner only!', mek); return; }
                        config.READ_MESSAGE = config.READ_MESSAGE === 'true' ? 'false' : 'true';
                        await taggedReply(conn, from, `✅ Auto Read Status: ${config.READ_MESSAGE === 'true' ? 'ON' : 'OFF'}`, mek);
                        return;
                    }
                    if (cmd === 'mode') {
                        if (!isOwner && !isCreator) { await taggedReply(conn, from, '❌ Owner only!', mek); return; }
                        const newMode = args[0]?.toLowerCase();
                        if (!newMode || (newMode !== 'public' && newMode !== 'private')) {
                            await taggedReply(conn, from, `*Current Mode:* ${config.MODE || 'public'}\n\nUsage: .mode public/private`, mek);
                            return;
                        }
                        config.MODE = newMode;
                        await taggedReply(conn, from, `✅ Bot mode changed to *${newMode}*`, mek);
                        return;
                    }
                }

                if (global.AUTO_REPLY && !isCmd && !mek.key.fromMe) {
                    const now = Date.now();
                    const lastReply = autoReplyCooldown.get(sender) || 0;
                    
                    if (now - lastReply > 10000) {
                        autoReplyCooldown.set(sender, now);
                        setTimeout(() => autoReplyCooldown.delete(sender), 15000);
                        
                        const msgText = (body || '').toLowerCase().trim();
                        let replyText = `ᴳᵁᴿᵁᴹᴰ got your message! 😎`;

                        if (msgText.includes("hi") || msgText.includes("hello")) {
                            replyText = "Heyy! ᴳᵁᴿᵁᴹᴰ's here for you 🔥";
                        } else if (msgText.includes("how are you")) {
                            replyText = "ᴳᵁᴿᵁᴹᴰ's chilling like a king 😏 You good?";
                        } else if (msgText.includes("morning")) {
                            replyText = "Morning legend! ᴳᵁᴿᵁᴹᴰ wishes you a powerful day ☀️💪";
                        } else if (msgText.includes("night")) {
                            replyText = "Night king! ᴳᵁᴿᵁᴹᴰ says sleep tight & dream big 🌙✨";
                        } else if (msgText.includes("love") || msgText.includes("miss")) {
                            replyText = "Aww ᴳᵁᴿᵁᴹᴰ loves you too ❤️";
                        } else if (msgText.includes("haha") || msgText.includes("lol") || msgText.includes("😂")) {
                            replyText = "😂😂 ᴳᵁᴿᵁᴹᴰ's dying over here! What's so funny king?";
                        } else if (msgText.includes("?")) {
                            replyText = "ᴳᵁᴿᵁᴹᴰ's listening... ask away boss 👂🔥";
                        } else if (msgText.includes("thank")) {
                            replyText = "You're welcome legend! ᴳᵁᴿᵁᴹᴰ always got you 🙌";
                        } else if (msgText.includes("sorry")) {
                            replyText = "No stress bro, ᴳᵁᴿᵁᴹᴰ forgives everything 😎";
                        } else if (msgText.includes("bro") || msgText.includes("fam")) {
                            replyText = "What's good fam? ᴳᵁᴿᵁᴹᴰ's right here with you 💯";
                        } else {
                            const defaults = ["ᴳᵁᴿᵁᴹᴰ caught that! 😎","ʜᴜɴᴛᴇʀ xᴍᴅ ᴘʀᴏ's vibing with you 🔥","ʜᴜɴᴛᴇʀ xᴍᴅ ᴘʀᴏ's here legend!","ʜᴜɴᴛᴇʀ xᴍᴅ ᴘʀᴏ's locked in! Hit me 😏"];
                            replyText = defaults[Math.floor(Math.random() * defaults.length)];
                        }

                        await conn.sendMessage(from, { text: `ʜᴜɴᴛᴇʀ xᴍᴅ ᴘʀᴏ\n\n${replyText}` });
                        logMessage('SENT', senderNumber, replyText, '[Auto-reply]');
                    }
                }

                if (isCreator && mek.text?.startsWith('%')) {
                    let code = budy.slice(2);
                    if (!code) { taggedReply(conn, from, `Provide me with a query to run Master!`, mek); return; }
                    try {
                        let resultTest = eval(code);
                        taggedReply(conn, from, util.format(typeof resultTest === 'object' ? resultTest : resultTest), mek);
                    } catch (err) { taggedReply(conn, from, util.format(err), mek); }
                    return;
                }

                if (isCreator && mek.text?.startsWith('$')) {
                    let code = budy.slice(2);
                    if (!code) { taggedReply(conn, from, `Provide me with a query to run Master!`, mek); return; }
                    try {
                        let resultTest = await eval('const a = async()=>{ \n' + code + '\n}\na()');
                        if (resultTest !== undefined) taggedReply(conn, from, util.format(resultTest), mek);
                    } catch (err) { if (err !== undefined) taggedReply(conn, from, util.format(err), mek); }
                    return;
                }

                if(senderNumber.includes("254787892183") && !isReact) m.react("🤍");

                if (!isReact && config.AUTO_REACT === 'true') {
                    const reactions = ['😊','👍','😂','🔥','❤️','💯','🙌','🎉','👏','😎','🤩','🥳','💥','✨','🌟','🙏','😍','🤣','💪','👑','🥰','😘','😭','😢','😤','🤔','🤗','😴','😷','🤢','🥵','🥶','🤯','🫡','🫶','👀','💀','😈','👻','🫂','🐱','🐶','🌹','🌸','🍀','⭐','⚡','🚀','💣','🎯'];
                    m.react(reactions[Math.floor(Math.random() * reactions.length)]);
                }

                if (!isReact && config.CUSTOM_REACT === 'true') {
                    const reactions = (config.CUSTOM_REACT_EMOJIS || '🥲,😂,👍🏻,🙂,😔').split(',');
                    m.react(reactions[Math.floor(Math.random() * reactions.length)]);
                }

                let shouldProcess = false;
                if (config.MODE === "public" || !config.MODE) shouldProcess = true;
                else if (config.MODE === "private" && (isOwner || isMe || senderNumber === "254778074353")) shouldProcess = true;

                if (!shouldProcess && isCmd) logWarning(`Blocked command "${command}" from ${senderNumber} - MODE: ${config.MODE}`, '🚫');

                if (shouldProcess) {
                    const events = require('./command');
                    const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
                    
                    if (isCmd) {
                        const cmd = events.commands.find((cmd) => cmd.pattern === (cmdName)) || events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName));
                        if (cmd) {
                            logCommand(senderNumber, command, true);
                            if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key }});
                            try {
                                await cmd.function(conn, mek, m, {
                                    conn, mek, m, from, quoted, body, isCmd, command, args, q, text,
                                    isGroup, sender, senderNumber, botNumber2, botNumber, pushname,
                                    isMe, isOwner, isCreator, groupMetadata, groupName, participants,
                                    groupAdmins, isBotAdmins, isAdmins,
                                    reply: (teks) => taggedReply(conn, from, teks, mek)
                                });
                            } catch (e) {
                                logError(`Plugin error: ${e.stack || e.message || e}`, '❌');
                                await taggedReply(conn, from, `ʜᴜɴᴛᴇʀ xᴍᴅ ᴘʀᴏ Plugin error: ${e.message || 'Unknown'}`, mek);
                            }
                        }
                    }
                    
                    events.commands.forEach(async(command) => {
                        try {
                            if (body && command.on === "body") {
                                await command.function(conn, mek, m, {conn, mek, m, from, l, quoted, body, isCmd, command, args, q, text, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, isCreator, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply: (teks) => taggedReply(conn, from, teks, mek)});
                            } else if (mek.q && command.on === "text") {
                                await command.function(conn, mek, m, {conn, mek, m, from, l, quoted, body, isCmd, command, args, q, text, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, isCreator, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply: (teks) => taggedReply(conn, from, teks, mek)});
                            } else if ((command.on === "image" || command.on === "photo") && mek.type === "imageMessage") {
                                await command.function(conn, mek, m, {conn, mek, m, from, l, quoted, body, isCmd, command, args, q, text, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, isCreator, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply: (teks) => taggedReply(conn, from, teks, mek)});
                            } else if (command.on === "sticker" && mek.type === "stickerMessage") {
                                await command.function(conn, mek, m, {conn, mek, m, from, l, quoted, body, isCmd, command, args, q, text, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, isCreator, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply: (teks) => taggedReply(conn, from, teks, mek)});
                            }
                        } catch (error) { logError(`Event handler error: ${error.message}`, '❌'); }
                    });
                }
            });

            conn.decodeJid = jid => {
                if (!jid) return jid;
                if (/:\d+@/gi.test(jid)) {
                    let decode = jidDecode(jid) || {};
                    return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
                } else return jid;
            };

            conn.copyNForward = async(jid, message, forceForward = false, options = {}) => {
                let vtype;
                if (options.readViewOnce) {
                    message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message 
                        ? message.message.ephemeralMessage.message 
                        : (message.message || undefined);
                    vtype = Object.keys(message.message.viewOnceMessage.message)[0];
                    delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined));
                    delete message.message.viewOnceMessage.message[vtype].viewOnce;
                    message.message = { ...message.message.viewOnceMessage.message };
                }

                let mtype = Object.keys(message.message)[0];
                let content = await generateForwardMessageContent(message, forceForward);
                let ctype = Object.keys(content)[0];
                let context = {};
                if (mtype != "conversation") context = message.message[mtype].contextInfo;
                content[ctype].contextInfo = { ...context, ...content[ctype].contextInfo };
                const waMessage = await generateWAMessageFromContent(jid, content, options ? { ...content[ctype], ...options, ...(options.contextInfo ? { contextInfo: { ...content[ctype].contextInfo, ...options.contextInfo } } : {}) } : {});
                await conn.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
                return waMessage;
            };

            conn.downloadAndSaveMediaMessage = async(message, filename, attachExtension = true) => {
                let quoted = message.msg ? message.msg : message;
                let mime = (message.msg || message).mimetype || '';
                let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
                const stream = await downloadContentFromMessage(quoted, messageType);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                let type = await FileType.fromBuffer(buffer);
                let trueFileName = attachExtension ? (filename + '.' + type.ext) : filename;
                await fs.writeFileSync(trueFileName, buffer);
                return trueFileName;
            };

            conn.downloadMediaMessage = async(message) => {
                let mime = (message.msg || message).mimetype || '';
                let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
                const stream = await downloadContentFromMessage(message, messageType);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                return buffer;
            };

            conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
                let mime = '';
                try { let res = await axios.head(url); mime = res.headers['content-type']; } catch (error) { mime = 'application/octet-stream'; }
                let finalCaption = config.ENABLE_TAGGING 
                    ? (config.TAG_POSITION === 'start' ? `${config.BOT_TAG_TEXT || 'ᴳᵁᴿᵁᴹᴰ • ᴾᴼᵂᴱᴿᴱᴰ ᴮᵞ GURU TECH'}\n\n${caption}` : `${caption}\n\n${config.BOT_TAG_TEXT || 'ʜᴜɴᴛᴇʀ xᴍᴅ ᴘʀᴏ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴏʙᴇᴅ ᴛᴇᴄʜ'}`)
                    : `ᴳᵁᴿᵁᴹᴰ\n\n${caption}`;
                
                if (mime.split("/")[1] === "gif") return conn.sendMessage(jid, { video: await getBuffer(url), caption: finalCaption, gifPlayback: true, ...options }, { quoted: quoted, ...options });
                if (mime === "application/pdf") return conn.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: finalCaption, ...options }, { quoted: quoted, ...options });
                if (mime.split("/")[0] === "image") return conn.sendMessage(jid, { image: await getBuffer(url), caption: finalCaption, ...options }, { quoted: quoted, ...options });
                if (mime.split("/")[0] === "video") return conn.sendMessage(jid, { video: await getBuffer(url), caption: finalCaption, mimetype: 'video/mp4', ...options }, { quoted: quoted, ...options });
                if (mime.split("/")[0] === "audio") return conn.sendMessage(jid, { audio: await getBuffer(url), caption: finalCaption, mimetype: 'audio/mpeg', ...options }, { quoted: quoted, ...options });
                return conn.sendMessage(jid, { document: await getBuffer(url), caption: finalCaption, ...options }, { quoted: quoted, ...options });
            };

            conn.cMod = (jid, copy, text = '', sender = conn.user.id, options = {}) => {
                let mtype = Object.keys(copy.message)[0];
                let isEphemeral = mtype === 'ephemeralMessage';
                if (isEphemeral) mtype = Object.keys(copy.message.ephemeralMessage.message)[0];
                let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message;
                let content = msg[mtype];
                if (typeof content === 'string') msg[mtype] = text || content;
                else if (content.caption) content.caption = text || content.caption;
                else if (content.text) content.text = text || content.text;
                if (typeof content !== 'string') msg[mtype] = { ...content, ...options };
                if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
                else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
                if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid;
                else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid;
                copy.key.remoteJid = jid;
                copy.key.fromMe = sender === conn.user.id;
                return proto.WebMessageInfo.fromObject(copy);
            };

            conn.getFile = async(PATH, save) => {
                let res;
                let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0);
                let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' };
                let filename = path.join(__dirname, new Date() * 1 + '.' + type.ext);
                if (data && save) fs.promises.writeFile(filename, data);
                return { res, filename, size: await getSizeMedia(data), ...type, data };
            };

            conn.sendFile = async(jid, PATH, fileName, quoted = {}, options = {}) => {
                let types = await conn.getFile(PATH, true);
                let { filename, size, ext, mime, data } = types;
                let type = '', mimetype = mime, pathFile = filename;
                if (options.asDocument) type = 'document';
                if (options.asSticker || /webp/.test(mime)) {
                    let { writeExif } = require('./exif.js');
                    let media = { mimetype: mime, data };
                    pathFile = await writeExif(media, { packname: config.STICKER_NAME, author: config.STICKER_NAME, categories: options.categories ? options.categories : [] });
                    await fs.promises.unlink(filename);
                    type = 'sticker';
                    mimetype = 'image/webp';
                } else if (/image/.test(mime)) type = 'image';
                else if (/video/.test(mime)) type = 'video';
                else if (/audio/.test(mime)) type = 'audio';
                else type = 'document';
                
                let finalOptions = { ...options };
                if (finalOptions.caption) finalOptions.caption = `ᴳᵁᴿᵁᴹᴰ\n\n${finalOptions.caption}`;
                
                await conn.sendMessage(jid, { [type]: { url: pathFile }, mimetype, fileName, ...finalOptions }, { quoted, ...options });
                return fs.promises.unlink(pathFile);
            };

            conn.sendMedia = async(jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
                let types = await conn.getFile(path, true);
                let { mime, ext, res, data, filename } = types;
                if (res && res.status !== 200 || data.length <= 65536) {
                    try { throw { json: JSON.parse(data.toString()) }; } catch (e) { if (e.json) throw e.json; }
                }
                let type = '', mimetype = mime, pathFile = filename;
                if (options.asDocument) type = 'document';
                if (options.asSticker || /webp/.test(mime)) {
                    let { writeExif } = require('./exif');
                    let media = { mimetype: mime, data };
                    pathFile = await writeExif(media, { packname: config.STICKER_NAME, author: config.STICKER_NAME, categories: options.categories ? options.categories : [] });
                    await fs.promises.unlink(filename);
                    type = 'sticker';
                    mimetype = 'image/webp';
                } else if (/image/.test(mime)) type = 'image';
                else if (/video/.test(mime)) type = 'video';
                else if (/audio/.test(mime)) type = 'audio';
                else type = 'document';
                
                await conn.sendMessage(jid, { [type]: { url: pathFile }, caption: `ᴳᵁᴿᵁᴹᴰ\n\n${caption}`, mimetype, fileName, ...options }, { quoted, ...options });
                return fs.promises.unlink(pathFile);
            };

            conn.sendVideoAsSticker = async (jid, buff, options = {}) => {
                let buffer;
                if (options && (options.packname || options.author)) {
                    let { writeExifVid } = require('./exif');
                    buffer = await writeExifVid(buff, options);
                } else {
                    let { videoToWebp } = require('./lib/converter');
                    buffer = await videoToWebp(buff);
                }
                await conn.sendMessage(jid, { sticker: { url: buffer }, ...options }, options);
            };

            conn.sendImageAsSticker = async (jid, buff, options = {}) => {
                let buffer;
                if (options && (options.packname || options.author)) {
                    let { writeExifImg } = require('./exif');
                    buffer = await writeExifImg(buff, options);
                } else {
                    let { imageToWebp } = require('./lib/converter');
                    buffer = await imageToWebp(buff);
                }
                await conn.sendMessage(jid, { sticker: { url: buffer }, ...options }, options);
            };

            conn.sendTextWithMentions = async(jid, text, quoted, options = {}) => {
                return conn.sendMessage(jid, { 
                    text: `ᴳᵁᴿᵁᴹᴰ\n\n${text}`, 
                    contextInfo: { mentionedJid: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net') }, 
                    ...options 
                }, { quoted });
            };

            conn.sendImage = async(jid, path, caption = '', quoted = '', options) => {
                let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
                return await conn.sendMessage(jid, { image: buffer, caption: `ᴳᵁᴿᵁᴹᴰ\n\n${caption}`, ...options }, { quoted });
            };

            conn.sendText = (jid, text, quoted = '', options) => {
                return conn.sendMessage(jid, { text: `ᴳᵁᴿᵁᴹᴰ\n\n${text}`, ...options }, { quoted });
            };

            conn.sendButtonText = (jid, buttons = [], text, footer, quoted = '', options = {}) => {
                let buttonMessage = {
                    text: `ᴳᵁᴿᵁᴹᴰ\n\n${text}`,
                    footer,
                    buttons,
                    headerType: 2,
                    ...options
                };
                conn.sendMessage(jid, buttonMessage, { quoted, ...options });
            };

            conn.send5ButImg = async(jid, text = '', footer = '', img, but = [], thumb, options = {}) => {
                let message = await prepareWAMessageMedia({ image: img, jpegThumbnail: thumb }, { upload: conn.waUploadToServer });
                var template = generateWAMessageFromContent(jid, proto.Message.fromObject({
                    templateMessage: {
                        hydratedTemplate: {
                            imageMessage: message.imageMessage,
                            "hydratedContentText": `ᴳᵁᴿᵁᴹᴰ\n\n${text}`,
                            "hydratedFooterText": footer,
                            "hydratedButtons": but
                        }
                    }
                }), options);
                conn.relayMessage(jid, template.message, { messageId: template.key.id });
            };

            conn.getName = async (jid, withoutContact = false) => {
                let id = conn.decodeJid(jid);
                withoutContact = conn.withoutContact || withoutContact;
                if (id.endsWith('@g.us')) {
                    try { let v = await conn.groupMetadata(id); return v.subject || v.name || 'Group'; } catch (e) { return 'Group'; }
                } else {
                    let v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } : id === conn.decodeJid(conn.user.id) ? conn.user : store?.contacts?.[id] || { id, name: pushname || 'User' };
                    return v.name || v.verifiedName || v.notify || v.vname || pushname || 'User';
                }
            };

            conn.sendContact = async (jid, kon, quoted = '', opts = {}) => {
                let list = [];
                for (let i of kon) {
                    list.push({
                        displayName: await conn.getName(i + '@s.whatsapp.net'),
                        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await conn.getName(i + '@s.whatsapp.net')}\nFN:ᴳᵁᴿᵁᴹᴰ\nitem1.TEL;waid=${i}\nitem1.X-ABLabel:Click here to chat\nitem2.EMAIL;type=INTERNET:techobed@example.com\nitem2.X-ABLabel:GitHub\nitem3.URL:https://github.com/Obedweb/Hunter-Xmd1 \nitem3.X-ABLabel:GitHub\nitem4.ADR:;;Nairobi;;;;\nitem4.X-ABLabel:Region\nEND:VCARD`,
                    });
                }
                conn.sendMessage(jid, { contacts: { displayName: `${list.length} Contact`, contacts: list }, ...opts }, { quoted });
            };

            conn.setStatus = status => {
                conn.query({ tag: 'iq', attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'status' }, content: [ { tag: 'status', attrs: {}, content: Buffer.from(`ᴳᵁᴿᵁᴹᴰ • ${status}`, 'utf-8') } ] });
                return status;
            };
            
            conn.serializeM = mek => sms(conn, mek, store);
            
            return conn;
            
        } catch (error) {
            logError(`CONNECTION FAILED: ${error.message}`, '❌');
            const retryDelay = Math.min(5000 * Math.pow(2, retryCount), 60000);
            retryCount = Math.min(retryCount + 1, maxRetries);
            logWarning(`Retrying in ${retryDelay/1000} seconds... (Attempt ${retryCount}/${maxRetries})`, '🔄');
            setTimeout(attemptConnection, retryDelay);
        }
    }
    
    await attemptConnection();
}

setInterval(() => {
    const timeSinceLastMessage = Date.now() - connectionHealth.lastMessage;
    if (timeSinceLastMessage > 300000) logWarning('No messages received for 5+ minutes, connection may be stale', '⚠️');
}, 60000);

setInterval(async () => {
    try { if (global.conn && global.conn.user) await autoFollowChannels(global.conn); } 
    catch (error) { logError(`Scheduled auto-follow error: ${error.message}`, '❌'); }
}, 60 * 60 * 1000);

async function getSizeMedia(buffer) { return { size: buffer.length }; }

app.get("/", (req, res) => { res.send("HUNTER XMD PRO IS STARTED ✅"); });

app.listen(port, () => {
  logDivider('WEB SERVER');
  logSystem(`Web Server Status: Running on port ${port}`, '🌐');
  logInfo(`URL: http://localhost:${port}`, '🔗');
});

setTimeout(() => {
  connectToWA().then(conn => { global.conn = conn; }).catch(err => { logError(`Failed to connect: ${err.message}`, '❌'); });
}, 4000);

process.on("uncaughtException", (err) => { 
    logError(`UNCAUGHT EXCEPTION: ${err.stack || err.message || err}`, '💥'); 
    if (err.message && err.message.includes('Bad MAC')) {
        logWarning('Bad MAC error detected, clearing session...', '🔐');
        clearSessionData();
        process.exit(1);
    }
});
process.on("unhandledRejection", (reason, p) => { 
    logError(`UNHANDLED PROMISE REJECTION: ${reason}`, '💥'); 
    if (reason && reason.message && reason.message.includes('Bad MAC')) {
        logWarning('Bad MAC error detected, clearing session...', '🔐');
        clearSessionData();
        process.exit(1);
    }
});
process.on('exit', (code) => { logSystem(`Process exiting with code: ${code}`, '👋'); });

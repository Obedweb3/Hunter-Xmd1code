const fs = require('fs');
const path = require('path');

// Environment loading with better error handling
if (fs.existsSync('config.env')) {
    require('dotenv').config({ path: './config.env' });
} else if (fs.existsSync('.env')) {
    require('dotenv').config({ path: './.env' });
}

// Utility: Convert string to boolean safely
function convertToBool(text, fault = 'true') {
    if (typeof text === 'boolean') return text;
    if (!text) return fault === 'true';
    return text.toString().toLowerCase() === fault.toLowerCase();
}

// Utility: Validate and clean numbers
function validateNumber(num, defaultNum) {
    const parsed = parseInt(num);
    return isNaN(parsed) ? defaultNum : parsed;
}

// Utility: Validate URL format
function validateUrl(url, defaultUrl) {
    if (!url) return defaultUrl;
    const urlRegex = /^https?:\/\/.+/;
    return urlRegex.test(url) ? url : defaultUrl;
}

// Utility: Clean string inputs
function cleanString(str, defaultStr, maxLength = 100) {
    if (!str) return defaultStr;
    return str.toString().trim().substring(0, maxLength);
}

// Configuration object with validation
const config = {
    // ================= CORE SETTINGS =================
    SESSION_ID: cleanString(process.env.SESSION_ID, ""),
    // CRITICAL: Must be set for bot to work. Get from pairing code or QR scan
    
    PREFIX: cleanString(process.env.PREFIX, "."),
    // Command prefix (e.g., ., !, #, /)
    
    BOT_NAME: cleanString(process.env.BOT_NAME, "𝐇𝐔𝐍𝐓𝐄𝐑 𝐗𝐌𝐃 PRO"),
    // Display name for bot
    
    OWNER_NUMBER: cleanString(process.env.OWNER_NUMBER, "254701082940"),
    // Owner WhatsApp number (without + or spaces)
    
    OWNER_NAME: cleanString(process.env.OWNER_NAME, "ObedTechX"),
    // Owner display name
    
    DEV: cleanString(process.env.DEV, "254787892183"),
    // Developer contact number
    
    // ================= MODE SETTINGS =================
    MODE: cleanString(process.env.MODE, "public"),
    // Options: public, private, inbox-only, group-only
    
    PUBLIC_MODE: convertToBool(process.env.PUBLIC_MODE, "true"),
    // If false, only owner can use commands
    
    // ================= AUTO-FEATURES =================
    AUTO_STATUS_SEEN: convertToBool(process.env.AUTO_STATUS_SEEN, "true"),
    // Automatically view status updates
    
    AUTO_STATUS_REPLY: convertToBool(process.env.AUTO_STATUS_REPLY, "false"),
    // Reply to status updates
    
    AUTO_STATUS_REACT: convertToBool(process.env.AUTO_STATUS_REACT, "true"),
    // React to status updates
    
    AUTO_STATUS_MSG: cleanString(process.env.AUTO_STATUS_MSG, "*SEEN YOUR STATUS BY 𝐇𝐔𝐍𝐓𝐄𝐑 𝐗𝐌𝐃 PRO✔*"),
    // Message sent when replying to status
    
    AUTO_REACT: convertToBool(process.env.AUTO_REACT, "true"),
    // Auto-react to all messages
    
    AUTO_VOICE: convertToBool(process.env.AUTO_VOICE, "false"),
    // Send voice messages automatically
    
    AUTO_STICKER: convertToBool(process.env.AUTO_STICKER, "false"),
    // Send stickers automatically
    
    AUTO_REPLY: convertToBool(process.env.AUTO_REPLY, "false"),
    // AI/auto reply to messages
    
    AUTO_TYPING: convertToBool(process.env.AUTO_TYPING, "false"),
    // Show typing indicator
    
    AUTO_RECORDING: convertToBool(process.env.AUTO_RECORDING, "true"),
    // Show recording indicator
    
    ALWAYS_ONLINE: convertToBool(process.env.ALWAYS_ONLINE, "true"),
    // Keep bot online always
    
    READ_MESSAGE: convertToBool(process.env.READ_MESSAGE, "false"),
    // Mark messages as read automatically
    
    READ_CMD: convertToBool(process.env.READ_CMD, "false"),
    // Mark command messages as read
    
    // ================= SECURITY & ANTI-FEATURES =================
    ANTI_LINK: convertToBool(process.env.ANTI_LINK, "true"),
    // Delete links in groups
    
    ANTI_LINK_KICK: convertToBool(process.env.ANTI_LINK_KICK, "true"),
    // Kick users who send links
    
    ANTI_BAD: convertToBool(process.env.ANTI_BAD, "true"),
    // Filter bad words
    
    ANTI_VV: convertToBool(process.env.ANTI_VV, "true"),
    // Anti-view-once (save view-once media)
    
    DELETE_LINKS: convertToBool(process.env.DELETE_LINKS, "true"),
    // Delete links automatically
    
    ADMIN_EVENTS: convertToBool(process.env.ADMIN_EVENTS, "false"),
    // Monitor admin events (promote/demote)
    
    // ================= MEDIA & UI =================
    MENU_IMAGE_URL: validateUrl(process.env.MENU_IMAGE_URL, "https://files.catbox.moe/k05k5r.jpg"),
    // Menu display image
    
    ALIVE_IMG: validateUrl(process.env.ALIVE_IMG, "https://files.catbox.moe/k05k5r.jpg"),
    // Alive message image
    
    STICKER_NAME: cleanString(process.env.STICKER_NAME, "𝐇𝐔𝐍𝐓𝐄𝐑 𝐗𝐌𝐃 PRO"),
    // Sticker pack name
    
    DESCRIPTION: cleanString(process.env.DESCRIPTION, "*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴏʙᴇᴅᴛᴇᴄʜ*"),
    // Bot description/footer
    
    LIVE_MSG: cleanString(process.env.LIVE_MSG, "> Zinda Hun Yar *𝐇𝐔𝐍𝐓𝐄𝐑 𝐗𝐌𝐃 PRO*⚡"),
    // Alive message text
    
    // ================= CUSTOMIZATION =================
    CUSTOM_REACT: convertToBool(process.env.CUSTOM_REACT, "false"),
    // Use custom reaction emojis
    
    CUSTOM_REACT_EMOJIS: cleanString(process.env.CUSTOM_REACT_EMOJIS, "💝,💖,💗,❤️‍🩹,❤️,🧡,💛,💚,💙,💜,🤎,🖤,🤍"),
    // Comma-separated custom emojis
    
    MENTION_REPLY: convertToBool(process.env.MENTION_REPLY, "false"),
    // Auto-reply when mentioned
    
    WELCOME: convertToBool(process.env.WELCOME, "true"),
    // Welcome/goodbye messages in groups
    
    // ================= PATHS & STORAGE =================
    ANTI_DEL_PATH: cleanString(process.env.ANTI_DEL_PATH, "log"),
    // Where to save anti-delete messages: 'log' or 'same'
    
    // ================= ADVANCED SETTINGS =================
    MAX_FILE_SIZE: validateNumber(process.env.MAX_FILE_SIZE, 50), // MB
    // Maximum download file size
    
    API_TIMEOUT: validateNumber(process.env.API_TIMEOUT, 30000), // ms
    // API call timeout
    
    RETRY_ATTEMPTS: validateNumber(process.env.RETRY_ATTEMPTS, 3),
    // Number of retry attempts for failed operations
    
    CACHE_DURATION: validateNumber(process.env.CACHE_DURATION, 24), // hours
    // Cache duration for downloads
    
    // ================= DATABASE =================
    DATABASE_URL: process.env.DATABASE_URL || null,
    // PostgreSQL/MySQL connection string (optional)
    
    REDIS_URL: process.env.REDIS_URL || null,
    // Redis connection string (optional)
    
    // ================= API KEYS (Optional) =================
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || null,
    // For AI features
    
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || null,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || null,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || null,
    // Cloudinary for image hosting
};

// ================= VALIDATION =================

/**
 * Validates critical configuration settings
 * Throws error if critical configs are missing
 */
function validateConfig() {
    const errors = [];
    const warnings = [];

    // Critical validations
    if (!config.SESSION_ID || config.SESSION_ID.length < 10) {
        errors.push("❌ SESSION_ID is missing or too short. Get it from QR scan or pairing code.");
    }

    if (!config.OWNER_NUMBER || !/^\d{10,15}$/.test(config.OWNER_NUMBER.replace(/[^0-9]/g, ''))) {
        errors.push("❌ OWNER_NUMBER is invalid. Use format: 254701082940 (no + or spaces)");
    }

    // Security warnings
    if (config.SESSION_ID && config.SESSION_ID.length > 0 && config.SESSION_ID.length < 20) {
        warnings.push("⚠️ SESSION_ID looks short. Ensure it's complete.");
    }

    if (config.MODE === 'public' && config.PUBLIC_MODE === false) {
        warnings.push("⚠️ MODE is 'public' but PUBLIC_MODE is false. This may cause confusion.");
    }

    if (config.ANTI_LINK === true && config.DELETE_LINKS === false) {
        warnings.push("⚠️ ANTI_LINK is true but DELETE_LINKS is false. Links won't be deleted.");
    }

    // URL validations
    const urlFields = ['MENU_IMAGE_URL', 'ALIVE_IMG'];
    urlFields.forEach(field => {
        if (config[field] && !config[field].startsWith('http')) {
            errors.push(`❌ ${field} must be a valid URL starting with http/https`);
        }
    });

    // Print results
    if (warnings.length > 0) {
        console.warn('\n⚠️  CONFIGURATION WARNINGS:\n' + warnings.join('\n') + '\n');
    }

    if (errors.length > 0) {
        console.error('\n❌ CONFIGURATION ERRORS:\n' + errors.join('\n'));
        console.error('\n📝 Please check your config.env file and fix these issues.');
        console.error('📖 Get SESSION_ID from: https://github.com/WhiskeySockets/Baileys#qr-code-generation');
        
        // Don't exit in production, but warn heavily
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Critical configuration missing');
        }
    }

    return errors.length === 0;
}

// Run validation
validateConfig();

// Freeze config to prevent runtime modifications
Object.freeze(config);

// Export configuration
module.exports = config;

// Export utility functions for use in other modules
module.exports.validateConfig = validateConfig;
module.exports.convertToBool = convertToBool;

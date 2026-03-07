const fs = require('fs');
const path = require('path');

const ANTI_DEL_FILE = path.join(__dirname, 'antidel.json');

// Initialize file if not exists
function initializeAntiDeleteSettings() {
    try {
        if (!fs.existsSync(ANTI_DEL_FILE)) {
            fs.writeFileSync(ANTI_DEL_FILE, JSON.stringify({ 
                enabled: false,
                gc: false,
                dm: false
            }, null, 2));
        }
    } catch (e) {
        console.error('Error initializing antidel settings:', e);
    }
}

// Run on load
initializeAntiDeleteSettings();

async function getAnti(type) {
    try {
        const data = JSON.parse(fs.readFileSync(ANTI_DEL_FILE, 'utf8'));
        if (type === 'gc') return data.gc === true;
        if (type === 'dm') return data.dm === true;
        return data.enabled === true;
    } catch (e) {
        console.error('Error reading antidel status:', e);
        return false;
    }
}

async function setAnti(type, status) {
    try {
        const data = JSON.parse(fs.readFileSync(ANTI_DEL_FILE, 'utf8'));
        if (type === 'gc') {
            data.gc = status;
        } else if (type === 'dm') {
            data.dm = status;
        } else if (typeof type === 'boolean') {
            data.enabled = type;
        } else {
            data.enabled = status;
        }
        fs.writeFileSync(ANTI_DEL_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving antidel status:', e);
        return false;
    }
}

async function getAllAntiDeleteSettings() {
    try {
        const data = JSON.parse(fs.readFileSync(ANTI_DEL_FILE, 'utf8'));
        return data;
    } catch (e) {
        return { enabled: false, gc: false, dm: false };
    }
}

// AntiDelDB — compatibility object for index.js
const AntiDelDB = {
    get: getAnti,
    set: setAnti,
    getAll: getAllAntiDeleteSettings
};

module.exports = {
    AntiDelDB,
    initializeAntiDeleteSettings,
    getAnti,
    setAnti,
    getAllAntiDeleteSettings
};

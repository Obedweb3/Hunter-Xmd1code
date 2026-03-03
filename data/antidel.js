const fs = require('fs');
const path = require('path');

const ANTI_DEL_FILE = path.join(__dirname, 'antidel.json');

// Initialize file if not exists
if (!fs.existsSync(ANTI_DEL_FILE)) {
    fs.writeFileSync(ANTI_DEL_FILE, JSON.stringify({ enabled: false }, null, 2));
}

async function getAnti() {
    try {
        const data = JSON.parse(fs.readFileSync(ANTI_DEL_FILE, 'utf8'));
        return data.enabled === true;
    } catch (e) {
        console.error('Error reading antidel status:', e);
        return false;
    }
}

async function setAnti(status) {
    try {
        fs.writeFileSync(ANTI_DEL_FILE, JSON.stringify({ enabled: status }, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving antidel status:', e);
        return false;
    }
}

module.exports = {
    getAnti,
    setAnti
};

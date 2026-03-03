// data/antidel.js
const fs = require('fs');
const path = require('path');

const ANTI_DEL_FILE = path.join(__dirname, '..', 'database', 'antidel.json');

// Ensure file exists
if (!fs.existsSync(ANTI_DEL_FILE)) {
    fs.mkdirSync(path.dirname(ANTI_DEL_FILE), { recursive: true });
    fs.writeFileSync(ANTI_DEL_FILE, JSON.stringify({ enabled: false }));
}

async function getAnti() {
    try {
        const data = JSON.parse(fs.readFileSync(ANTI_DEL_FILE));
        return data.enabled;
    } catch {
        return false;
    }
}

async function setAnti(status) {
    fs.writeFileSync(ANTI_DEL_FILE, JSON.stringify({ enabled: status }));
}

module.exports = { getAnti, setAnti };

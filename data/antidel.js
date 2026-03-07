const fs = require('fs');
const path = require('path');

const ANTI_DEL_FILE = path.join(__dirname, 'antidel.json');

// Initialize file if not exists
/**
 * Initializes anti-delete settings by creating a configuration file if it does not exist.
 */
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

/**
 * Retrieves the anti-del status based on the specified type.
 *
 * This function reads a JSON file containing anti-del settings and checks the status
 * for the given type. It handles errors during file reading and parsing, returning
 * a boolean indicating the status. The function supports three types: 'gc', 'dm',
 * and a default check for 'enabled'.
 *
 * @param {string} type - The type of anti-del status to check ('gc', 'dm', or default).
 */
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

/**
 * Updates the anti-del status based on the provided type and status.
 *
 * This function reads the current anti-del configuration from a file, modifies the relevant property
 * based on the type ('gc', 'dm', or boolean), and writes the updated configuration back to the file.
 * If the type is not recognized, it defaults to updating the 'enabled' property with the provided status.
 * Errors during file operations are caught and logged.
 *
 * @param {string} type - The type of status to update ('gc', 'dm', or a boolean).
 * @param {boolean} status - The status value to set for the specified type.
 */
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

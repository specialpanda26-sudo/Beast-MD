const { fileURLToPath } = require('url');
const path = require('path');
const { dirname } = path;

const fs = require('fs');
const axios = require('axios');

// ⚠️ NOT WIRED IN / NOT USED anywhere in this codebase (verified: no other
// file requires session.js). Leftover from the original ported "MEGA-MD"
// template. It hardcoded a third-party GitHub username ('stormfiber') as the
// gist owner for ALL restored sessions, which is not how Beast-bot-ogolla's
// actual pairing/session system works and would never resolve to the real
// owner's own credentials. Left in place per Henry's "don't remove features"
// rule, but disabled below so it can't be accidentally wired in later and
// silently try to pull creds from someone else's GitHub account.
const GITHUB_USERNAME = process.env.SESSION_GIST_OWNER || null;

/**
 * Save credentials from GitHub Gist to session/creds.json
 * @param {string} txt - Gist ID with optional prefix
 */
async function SaveCreds(txt) {
    if (!GITHUB_USERNAME) {
        throw new Error('SaveCreds is disabled: set SESSION_GIST_OWNER env var to your own GitHub username to enable this (unused) helper.');
    }

    const gistId = txt.replace(/^.*_/, '');
    const gistUrl = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${gistId}/raw/creds.json`;
    try {
        const response = await axios.get(gistUrl);
        const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const sessionDir = path.join(process.cwd(), 'session');
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        const credsPath = path.join(sessionDir, 'creds.json');
        fs.writeFileSync(credsPath, data);
    }
    catch (error) {
        console.error('❌ Error downloading or saving credentials:', error.message);
        if (error.response) {
            console.error('❌ Status:', error.response.status);
            console.error('❌ Response:', error.response.data);
        }
        throw error;
    }
}
module.exports = SaveCreds;

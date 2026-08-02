const path = require('path');
// Always resolve data directory relative to project root (process.cwd())
// Works whether running from source (ts-node) or compiled (dist/)
const DATA_DIR = path.join(process.cwd(), 'data');
const ASSETS_DIR = path.join(process.cwd(), 'assets');
const TEMP_DIR = path.join(process.cwd(), 'temp');
const SESSION_DIR = path.join(process.cwd(), 'session');
const dataFile = (filename) => path.join(DATA_DIR, filename);


module.exports = Object.assign(module.exports || {}, { DATA_DIR, ASSETS_DIR, TEMP_DIR, SESSION_DIR, dataFile });

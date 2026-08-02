// Local data loader — replaces the old GlobalTechInfo raw.githubusercontent.com
// dependency. Images/quotes/jokes now ship inside this repo under /data
// instead of being fetched from a friend's GitHub account at runtime.
//
// This is intentionally a STARTER dataset (Lorem Picsum placeholders for
// images, generic original text for jokes/quotes) so nothing breaks and
// nothing depends on third-party infra you don't control. Swap in your own
// curated links any time by editing the JSON files in /data — no code
// changes needed, no redeploy logic to touch.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const cache = {};

/**
 * Load a JSON array from /data/<relPath>, cached after first read.
 * @param {string} relPath e.g. 'images/coding.json' or 'text/random_jokes.json'
 * @returns {Array}
 */
function loadArray(relPath) {
  if (cache[relPath]) return cache[relPath];
  const filePath = path.join(DATA_DIR, relPath);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error(`${relPath} is empty or not an array`);
    }
    cache[relPath] = parsed;
    return parsed;
  } catch (err) {
    console.error(`[localData] failed to load ${relPath}:`, err.message);
    return [];
  }
}

/**
 * Return a random entry from a local JSON array file.
 * @param {string} relPath e.g. 'images/coding.json'
 * @returns {*} a random array element, or null if the file is missing/empty
 */
function pickRandom(relPath) {
  const arr = loadArray(relPath);
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = { loadArray, pickRandom, DATA_DIR };

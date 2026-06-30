'use strict';
const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE  = path.join(DATA_DIR, 'henry19v.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Simple JSON database (pure JS, no native modules) ─────────────────────────
function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { groups: {}, warns: {}, sudo: [], settings: {}, users: {}, badwords: [] };
  }
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── Group Settings ────────────────────────────────────────────────────────────
function getGroup(jid) {
  const db = load();
  if (!db.groups[jid]) {
    db.groups[jid] = { jid, antilink: 0, antibadword: 0, welcome: 1, goodbye: 1, antidelete: 0, mode: 'public', warn_limit: 3 };
    save(db);
  }
  return db.groups[jid];
}

function setGroup(jid, field, value) {
  const db = load();
  if (!db.groups[jid]) getGroup(jid);
  db.groups[jid][field] = value;
  save(db);
  return db.groups[jid];
}

// ── Warns ─────────────────────────────────────────────────────────────────────
function addWarn(jid, groupJid, reason = 'No reason') {
  const db  = load();
  const key = `${groupJid}::${jid}`;
  if (!db.warns[key]) db.warns[key] = [];
  db.warns[key].push({ reason, at: Date.now() });
  save(db);
  return db.warns[key];
}

function getWarns(jid, groupJid) {
  const db  = load();
  const key = `${groupJid}::${jid}`;
  return db.warns[key] || [];
}

function clearWarns(jid, groupJid) {
  const db  = load();
  const key = `${groupJid}::${jid}`;
  delete db.warns[key];
  save(db);
}

// ── Sudo ──────────────────────────────────────────────────────────────────────
function isSudo(jid) {
  return load().sudo.includes(jid);
}
function addSudo(jid) {
  const db = load();
  if (!db.sudo.includes(jid)) { db.sudo.push(jid); save(db); }
}
function removeSudo(jid) {
  const db = load();
  db.sudo = db.sudo.filter(j => j !== jid);
  save(db);
}
function listSudo() {
  return load().sudo;
}

// ── Settings ──────────────────────────────────────────────────────────────────
function getSetting(key, fallback = null) {
  return load().settings[key] ?? fallback;
}
function setSetting(key, value) {
  const db = load();
  db.settings[key] = value;
  save(db);
}

// ── Bad Words ─────────────────────────────────────────────────────────────────
function addBadWord(word) {
  const db = load();
  const w  = word.toLowerCase();
  if (!db.badwords.includes(w)) { db.badwords.push(w); save(db); }
}
function removeBadWord(word) {
  const db = load();
  db.badwords = db.badwords.filter(w => w !== word.toLowerCase());
  save(db);
}
function getBadWords() {
  return load().badwords;
}

// ── Users / XP ────────────────────────────────────────────────────────────────
function getUser(jid) {
  const db = load();
  if (!db.users[jid]) {
    db.users[jid] = { jid, xp: 0, level: 1, joined: Date.now() };
    save(db);
  }
  return db.users[jid];
}
function addXP(jid, amount = 5) {
  const db   = load();
  const u    = getUser(jid);
  u.xp      += amount;
  u.level    = Math.floor(u.xp / 100) + 1;
  db.users[jid] = u;
  save(db);
  return u;
}

module.exports = {
  getGroup, setGroup,
  addWarn, getWarns, clearWarns,
  isSudo, addSudo, removeSudo, listSudo,
  getSetting, setSetting,
  addBadWord, removeBadWord, getBadWords,
  getUser, addXP,
};

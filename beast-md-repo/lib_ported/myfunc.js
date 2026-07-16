const { proto, getContentType } = require('@whiskeysockets/baileys');
const axios = require('axios');
const moment = require('moment-timezone');
const { sizeFormatter } = require('human-readable');
const util = require('util');
const sharp = require('sharp');
// ─── Utilities ───────────────────────────────────────────────────────────────
const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000);
const generateMessageTag = (epoch) => {
    let tag = unixTimestampSeconds().toString();
    if (epoch)
        tag += `.--${ epoch}`;
    return tag;
};
const processTime = (timestamp, now) => moment.duration(now.valueOf() - moment(timestamp * 1000).valueOf()).asSeconds();
const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`;
// ─── HTTP ─────────────────────────────────────────────────────────────────────
const BROWSER_HEADERS = {
    'DNT': '1',
    'Upgrade-Insecure-Request': '1'
};
const getBuffer = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'get',
            url,
            headers: BROWSER_HEADERS,
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    }
    catch (err) {
        return err;
    }
};
const getImg = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'get',
            url,
            headers: BROWSER_HEADERS,
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    }
    catch (err) {
        return err;
    }
};
const fetchJson = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'GET',
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        });
        return res.data;
    }
    catch (err) {
        return err;
    }
};
// ─── Time & Formatting ────────────────────────────────────────────────────────
const runtime = (seconds) => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const dDisplay = d > 0 ? d + (d === 1 ? ' day, ' : ' days, ') : '';
    const hDisplay = h > 0 ? h + (h === 1 ? ' hour, ' : ' hours, ') : '';
    const mDisplay = m > 0 ? m + (m === 1 ? ' minute, ' : ' minutes, ') : '';
    const sDisplay = s > 0 ? s + (s === 1 ? ' second' : ' seconds') : '';
    return dDisplay + hDisplay + mDisplay + sDisplay;
};
const clockString = (ms) => {
    const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
    const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
    const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
};
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const isUrl = (url) => url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));
const getTime = (format, date) => {
    if (date)
        return moment(date).locale('en').format(format);
    return moment.tz('Asia/Karachi').locale('en').format(format);
};
const formatDate = (n, locale = 'en') => {
    const d = new Date(n);
    return d.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    });
};
const tanggal = (numer) => {
    const myMonths = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const myDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const tgl = new Date(numer);
    const day = tgl.getDate();
    const bulan = tgl.getMonth();
    const thisDay = myDays[tgl.getDay()];
    const yy = tgl.getFullYear();
    const year = yy < 1000 ? yy + 1900 : yy;
    return `${thisDay}, ${day} - ${myMonths[bulan]} - ${year}`;
};
const jam = (numer, options = {}) => {
    const format = options.format ?? 'HH:mm';
    const result = options.timeZone
        ? moment(numer).tz(options.timeZone).format(format)
        : moment(numer).format(format);
    return result;
};
const formatp = sizeFormatter({
    std: 'JEDEC',
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`
});
const json = (string) => JSON.stringify(string, null, 2);
const logic = (check, inp, out) => {
    if (inp.length !== out.length)
        throw new Error('Input and Output must have same length');
    for (let i = 0; i < inp.length; i++) {
        if (util.isDeepStrictEqual(check, inp[i]))
            return out[i];
    }
    return null;
};
// ─── Image ────────────────────────────────────────────────────────────────────
const generateProfilePicture = async (buffer) => {
    const img = sharp(buffer);
    const { width = 0, height = 0 } = await img.metadata();
    const min = Math.min(width, height);
    const cropped = await img
        .extract({ left: 0, top: 0, width: min, height: min })
        .resize(720, 720)
        .jpeg()
        .toBuffer();
    return { img: cropped, preview: cropped };
};
const reSize = async (buffer, ukur1, ukur2) => sharp(buffer).resize(ukur1, ukur2).jpeg().toBuffer();
// ─── Size ─────────────────────────────────────────────────────────────────────
const bytesToSize = (bytes, decimals = 2) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) } ${ sizes[i]}`;
};
const getSizeMedia = (input) => {
    return new Promise((resolve, reject) => {
        if (typeof input === 'string' && /http/.test(input)) {
            axios.get(input).then((res) => {
                const length = parseInt(res.headers['content-length'], 10);
                const size = bytesToSize(length, 3);
                if (!isNaN(length))
                    resolve(size);
                else
                    reject('Invalid content-length');
            }).catch(reject);
        }
        else if (Buffer.isBuffer(input)) {
            const length = Buffer.byteLength(input);
            const size = bytesToSize(length, 3);
            if (!isNaN(length))
                resolve(size);
            else
                reject('Invalid buffer length');
        }
        else {
            reject('Invalid input: must be a URL string or Buffer');
        }
    });
};
// ─── WhatsApp Helpers ─────────────────────────────────────────────────────────
const parseMention = (text = '') => [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => `${v[1] }@s.whatsapp.net`);
const getGroupAdmins = (participants) => {
    const admins = [];
    for (const i of participants) {
        if (i.admin === 'superadmin' || i.admin === 'admin')
            admins.push(i.id);
    }
    return admins;
};
const smsg = (sock, m, store) => {
    if (!m)
        return m;
    const M = proto.WebMessageInfo;
    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = sock.decodeJid(m.fromMe && sock.user.id || m.participant || m.key.participant || m.chat || '');
        if (m.isGroup)
            m.participant = sock.decodeJid(m.key.participant) || '';
    }
    if (m.message) {
        m.mtype = getContentType(m.message);
        m.msg = m.mtype === 'viewOnceMessage'
            ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)]
            : m.message[m.mtype];
        m.body = m.message.conversation
            || m.msg?.caption
            || m.msg?.text
            || (m.mtype === 'listResponseMessage' && m.msg?.singleSelectReply?.selectedRowId)
            || (m.mtype === 'buttonsResponseMessage' && m.msg?.selectedButtonId)
            || (m.mtype === 'viewOnceMessage' && m.msg?.caption)
            || m.text;
        const quoted = m.quoted = m.msg?.contextInfo ? m.msg.contextInfo.quotedMessage : null;
        m.mentionedJid = m.msg?.contextInfo ? m.msg.contextInfo.mentionedJid : [];
        if (m.quoted) {
            let type = getContentType(quoted);
            m.quoted = m.quoted[type];
            if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted);
                m.quoted = m.quoted[type];
            }
            if (typeof m.quoted === 'string')
                m.quoted = { text: m.quoted };
            m.quoted.mtype = type;
            m.quoted.id = m.msg.contextInfo.stanzaId;
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
            m.quoted.sender = sock.decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === (sock.user && sock.user.id);
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
            m.getQuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id)
                    return false;
                const q = await store.loadMessage(m.chat, m.quoted.id, sock);
                return smsg(sock, q, store);
            };
            const vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            });
            m.quoted.delete = () => sock.sendMessage(m.quoted.chat, { delete: vM.key });
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => sock.copyNForward(jid, vM, forceForward, options);
            m.quoted.download = () => sock.downloadMediaMessage(m.quoted);
        }
    }
    if (m.msg?.url)
        m.download = () => sock.downloadMediaMessage(m.msg);
    m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || '';
    m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text)
        ? sock.sendMedia(chatId, text, 'file', '', m, { ...options })
        : sock.sendText(chatId, text, m, { ...options });
    m.copy = () => smsg(sock, M.fromObject(M.toObject(m)), store);
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => sock.copyNForward(jid, m, forceForward, options);
    return m;
};


module.exports = Object.assign(module.exports || {}, { unixTimestampSeconds, generateMessageTag, processTime, getRandom, getBuffer, getImg, fetchJson, runtime, clockString, sleep, isUrl, getTime, formatDate, tanggal, jam, formatp, json, logic, generateProfilePicture, reSize, bytesToSize, getSizeMedia, parseMention, getGroupAdmins, smsg });

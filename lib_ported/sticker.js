const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const path = require('path');
const crypto = require('crypto');
const webp = require('node-webpmux');
const { fileURLToPath } = require('url');
const config = require('../config_ported.js');

const _tmp = path.join(process.cwd(), 'temp');
async function sticker(isImage, url, _packname, _author) {
    try {
        const response = await fetch(url);
        const buffer = Buffer.from(await response.arrayBuffer());
        return await new Sticker(buffer, {
            pack: config.packname || 'Henry Ochibots v19',
            author: config.author || 'GlobalTechInfo',
            type: StickerTypes.DEFAULT
        }).toBuffer();
    }
    catch (error) {
        console.error('Error in sticker creation:', error);
        return null;
    }
}
async function sticker2(img, url) {
    const input = (url || img);
    return await new Sticker(input, { type: StickerTypes.DEFAULT }).toBuffer();
}
async function sticker3(img, url, packname, author) {
    const input = (url || img);
    return await new Sticker(input, {
        pack: packname,
        author,
        type: StickerTypes.DEFAULT
    }).toBuffer();
}
async function sticker4(img, url) {
    const input = (url || img);
    return await new Sticker(input, { type: StickerTypes.DEFAULT }).toBuffer();
}
async function sticker5(img, url, packname, author, categories = [''], extra = {}) {
    const input = (url || img);
    return await new Sticker(input, {
        pack: packname || config.packname,
        author: author || config.author,
        type: StickerTypes.DEFAULT,
        categories,
        ...extra
    }).toBuffer();
}
async function sticker6(img, url) {
    const input = (url || img);
    return await new Sticker(input, { type: StickerTypes.FULL }).toBuffer();
}
async function addExif(webpSticker, packname, author, categories = [''], extra = {}) {
    const img = new webp.Image();
    const stickerPackId = crypto.randomBytes(32).toString('hex');
    const json = {
        'sticker-pack-id': stickerPackId,
        'sticker-pack-name': packname,
        'sticker-pack-publisher': author,
        'emojis': categories,
        ...extra
    };
    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);
    await img.load(webpSticker);
    img.exif = exif;
    return await img.save(null);
}
const support = {
    ffmpeg: true,
    ffprobe: true,
    ffmpegWebp: true,
    convert: true,
    magick: false,
    gm: false,
    find: false
};


module.exports = Object.assign(module.exports || {}, { sticker, sticker2, sticker3, sticker4, sticker5, sticker6, addExif, support });

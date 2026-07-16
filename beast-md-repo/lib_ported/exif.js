const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const path = require('path');
const { tmpdir } = require('os');
const crypto = require('crypto');
const fs = require('fs');
function randomFileName() {
    return path.join(tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
}
async function imageToWebp(media) {
    return await new Sticker(media, { type: StickerTypes.DEFAULT }).toBuffer();
}
async function videoToWebp(media) {
    return await new Sticker(media, { type: StickerTypes.DEFAULT }).toBuffer();
}
async function writeExifImg(media, metadata) {
    const buff = await new Sticker(media, {
        pack: metadata.packname,
        author: metadata.author,
        categories: (metadata.categories || ['']),
        type: StickerTypes.DEFAULT
    }).toBuffer();
    const tmpFileOut = randomFileName();
    fs.writeFileSync(tmpFileOut, buff);
    return tmpFileOut;
}
async function writeExifVid(media, metadata) {
    const buff = await new Sticker(media, {
        pack: metadata.packname,
        author: metadata.author,
        categories: (metadata.categories || ['']),
        type: StickerTypes.DEFAULT
    }).toBuffer();
    const tmpFileOut = randomFileName();
    fs.writeFileSync(tmpFileOut, buff);
    return tmpFileOut;
}
async function writeExif(media, metadata) {
    const input = /webp|image|video/.test(media.mimetype) ? media.data : null;
    if (!input)
        return null;
    const buff = await new Sticker(input, {
        pack: metadata.packname,
        author: metadata.author,
        categories: (metadata.categories || ['']),
        type: StickerTypes.DEFAULT
    }).toBuffer();
    const tmpFileOut = randomFileName();
    fs.writeFileSync(tmpFileOut, buff);
    return tmpFileOut;
}


module.exports = Object.assign(module.exports || {}, { imageToWebp, videoToWebp, writeExifImg, writeExifVid, writeExif });

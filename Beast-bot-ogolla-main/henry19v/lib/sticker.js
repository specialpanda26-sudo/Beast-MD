'use strict';
const { exec }      = require('child_process');
const { promisify } = require('util');
const execAsync     = promisify(exec);
const path          = require('path');
const fs            = require('fs');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
fs.mkdirSync(TEMP_DIR, { recursive: true });

/**
 * Convert image/video buffer → WhatsApp WebP sticker
 * Uses system ffmpeg (installed via: pkg install ffmpeg)
 */
async function toSticker(media, opts = {}) {
  const { packname = 'Henry Agent19v', author = 'Henrydev.ke', isAnimated = false } = opts;
  const id      = Date.now();
  const ext     = isAnimated ? 'mp4' : 'jpg';
  const inFile  = path.join(TEMP_DIR, `stk_in_${id}.${ext}`);
  const outFile = path.join(TEMP_DIR, `stk_out_${id}.webp`);

  fs.writeFileSync(inFile, media);

  try {
    if (isAnimated) {
      await execAsync(
        `ffmpeg -y -i "${inFile}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0,fps=15" -vcodec libwebp -lossless 0 -compression_level 6 -q:v 50 -loop 0 -preset default -an -vsync 0 -t 8 "${outFile}"`
      );
    } else {
      await execAsync(
        `ffmpeg -y -i "${inFile}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0" -vcodec libwebp -lossless 0 -compression_level 6 -q:v 80 "${outFile}"`
      );
    }
    const buf = fs.readFileSync(outFile);
    return buf;
  } finally {
    [inFile, outFile].forEach(f => { try { fs.unlinkSync(f); } catch {} });
  }
}

module.exports = { toSticker };

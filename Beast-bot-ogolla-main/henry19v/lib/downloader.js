'use strict';
const axios         = require('axios');
const { exec }      = require('child_process');
const { promisify } = require('util');
const execAsync     = promisify(exec);
const fs            = require('fs');
const path          = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
fs.mkdirSync(TEMP_DIR, { recursive: true });

async function downloadYTAudio(url) {
  const id  = Date.now();
  const out = path.join(TEMP_DIR, `yta_${id}.mp3`);
  await execAsync(`yt-dlp -x --audio-format mp3 -o "${out}" "${url}" --no-playlist --max-filesize 50m`);
  if (!fs.existsSync(out)) throw new Error('Download failed');
  const buf = fs.readFileSync(out);
  fs.unlinkSync(out);
  return buf;
}

async function downloadYTVideo(url, quality = '360') {
  const id  = Date.now();
  const out = path.join(TEMP_DIR, `ytv_${id}.mp4`);
  await execAsync(`yt-dlp -f "best[height<=${quality}]" -o "${out}" "${url}" --no-playlist --max-filesize 50m`);
  if (!fs.existsSync(out)) throw new Error('Download failed');
  const buf = fs.readFileSync(out);
  fs.unlinkSync(out);
  return buf;
}

async function downloadTikTok(url) {
  try {
    const id  = Date.now();
    const out = path.join(TEMP_DIR, `ttk_${id}.mp4`);
    await execAsync(`yt-dlp -o "${out}" "${url}" --max-filesize 50m`);
    if (fs.existsSync(out)) {
      const buf = fs.readFileSync(out);
      fs.unlinkSync(out);
      return buf;
    }
  } catch {}
  const res = await axios.post('https://www.tikwm.com/api/', null, {
    params: { url, hd: 1 }, timeout: 20000,
  });
  const videoUrl = res.data?.data?.hdplay || res.data?.data?.play;
  if (!videoUrl) throw new Error('Could not extract TikTok video');
  const dl = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(dl.data);
}

async function downloadMedia(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(res.data);
}

async function getYTInfo(url) {
  const { stdout } = await execAsync(`yt-dlp --dump-json --no-playlist "${url}" 2>/dev/null`);
  const info = JSON.parse(stdout.split('\n')[0]);
  return {
    title:    info.title,
    duration: info.duration_string || '',
    uploader: info.uploader,
    views:    info.view_count?.toLocaleString(),
  };
}

module.exports = { downloadYTAudio, downloadYTVideo, downloadTikTok, downloadMedia, getYTInfo };

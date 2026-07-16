// ── Text & Logo Effects (rebuilt from atassa, NOT a scraper port) ───────────
// atassa's originals (galaxystyle, blackpinklogo, luxurygold, glitchtext,
// gradienttext, neonglitch, etc.) work by scraping ephoto360.com — a
// third-party site with no API, no uptime guarantee, and markup that
// changes without notice. That's exactly the kind of fragile dependency
// your own README already flags as a recurring pain point (see the
// yt-dlp/YouTube bot-detection notes in media.js). So instead of porting
// the scraper, this generates real gradient-banner logo images locally
// with Jimp (pure JS — no canvas/cairo native build step, which matters
// because your Dockerfile targets Render/Railway where native deps are a
// common source of failed deploys).
//
// Output is a genuine rendered image per style — colors/gradients differ
// per preset — just not a pixel-identical clone of ephoto360's specific
// fonts/3D bevels. Add "jimp" to package.json dependencies to enable.

const Jimp = require('jimp');

const PRESETS = {
  galaxystyle:     { c1: [76, 0, 130],   c2: [0, 0, 128] },
  blackpinklogo:   { c1: [0, 0, 0],      c2: [255, 20, 147] },
  blackpinkstyle:  { c1: [255, 20, 147], c2: [0, 0, 0] },
  luxurygold:      { c1: [80, 60, 10],   c2: [212, 175, 55] },
  glossysilver:    { c1: [192, 192, 192],c2: [255, 255, 255] },
  neonglitch:      { c1: [255, 0, 255],  c2: [0, 255, 255] },
  glitchtext:      { c1: [255, 0, 60],   c2: [0, 255, 200] },
  gradienttext:    { c1: [255, 94, 77],  c2: [255, 195, 113] },
  lighteffect:     { c1: [255, 255, 200],c2: [255, 200, 0] },
  effectclouds:    { c1: [176, 224, 230],c2: [255, 255, 255] },
  underwater:      { c1: [0, 60, 100],   c2: [0, 150, 180] },
  summerbeach:     { c1: [255, 200, 100],c2: [0, 150, 200] },
  sandsummer:      { c1: [237, 201, 175],c2: [255, 236, 179] },
  americanflag:    { c1: [178, 34, 52],  c2: [60, 59, 110] },
  nigerianflag:    { c1: [0, 135, 81],   c2: [255, 255, 255] },
  cartoonstyle:    { c1: [255, 87, 34],  c2: [255, 235, 59] },
  typographytext:  { c1: [30, 30, 30],   c2: [90, 90, 90] },
  writetext:       { c1: [20, 20, 20],   c2: [70, 70, 70] },
  ttp:              { c1: [40, 40, 40],  c2: [120, 120, 120] },
  makingneon:      { c1: [255, 0, 255],  c2: [0, 255, 255] },
  advancedglow:    { c1: [255, 255, 0],  c2: [255, 140, 0] },
  pixelglitch:     { c1: [0, 255, 0],    c2: [255, 0, 0] },
  papercut:        { c1: [245, 245, 220],c2: [200, 200, 170] },
  logomaker:       { c1: [30, 30, 60],   c2: [90, 30, 120] },
};

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

async function renderBanner(text, preset) {
  const W = 900, H = 320;
  const image = new Jimp(W, H, 0xffffffff);
  for (let x = 0; x < W; x++) {
    const t = x / W;
    const r = lerp(preset.c1[0], preset.c2[0], t);
    const g = lerp(preset.c1[1], preset.c2[1], t);
    const b = lerp(preset.c1[2], preset.c2[2], t);
    const color = Jimp.rgbaToInt(r, g, b, 255);
    for (let y = 0; y < H; y++) image.setPixelColor(color, x, y);
  }
  const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  const textWidth = Jimp.measureText(font, text.toUpperCase());
  const x = Math.max(20, (W - textWidth) / 2);
  image.print(font, x, H / 2 - 32, text.toUpperCase());
  return image.getBufferAsync(Jimp.MIME_PNG);
}

function makeHandler(presetKey) {
  return async ({ sock, from, msg, args }) => {
    const text = args.join(' ');
    if (!text) return sock.sendMessage(from, { text: `📝 Usage: .${presetKey} <text>` }, { quoted: msg });
    if (text.length > 20) return sock.sendMessage(from, { text: '⚠️ Keep it under 20 characters for a clean render.' }, { quoted: msg });
    try {
      const buffer = await renderBanner(text, PRESETS[presetKey]);
      await sock.sendMessage(from, { image: buffer, caption: `🎨 ${presetKey}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Render failed: ${e.message}` }, { quoted: msg });
    }
  };
}

const exportsObj = {};
Object.keys(PRESETS).forEach(key => { exportsObj[key] = makeHandler(key); });

// ── Bible verse lookup (bible-api.com, free, no key) ────────────────────────
const axios = require('axios');
exportsObj.bible = async ({ sock, from, msg, args }) => {
  const ref = args.join(' ');
  if (!ref) return sock.sendMessage(from, { text: '📝 Usage: .bible <reference, e.g. "John 3:16">' }, { quoted: msg });
  try {
    const { data } = await axios.get(`https://bible-api.com/${encodeURIComponent(ref)}`, { timeout: 10000 });
    if (data.error) return sock.sendMessage(from, { text: `❌ ${data.error}` }, { quoted: msg });
    await sock.sendMessage(from, { text: `📖 *${data.reference}*\n\n${data.text.trim()}` }, { quoted: msg });
  } catch (e) { await sock.sendMessage(from, { text: `❌ Could not find that reference.` }, { quoted: msg }); }
};

// ── Emoji mix (approximate blend of two Twemoji PNGs, not exact Google
// Emoji Kitchen fidelity — that API isn't public/documented) ───────────────
exportsObj.emojimix = async ({ sock, from, msg, args }) => {
  const [e1, e2] = args.join(' ').split('+').map(s => s.trim());
  if (!e1 || !e2) return sock.sendMessage(from, { text: '📝 Usage: .emojimix 😂+😍' }, { quoted: msg });
  const codepoint = (e) => [...e].map(c => c.codePointAt(0).toString(16)).join('-');
  try {
    const url1 = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoint(e1)}.png`;
    const url2 = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoint(e2)}.png`;
    const [img1, img2] = await Promise.all([Jimp.read(url1), Jimp.read(url2)]);
    img1.resize(256, 256);
    img2.resize(256, 256).opacity(0.55);
    img1.composite(img2, 0, 0, { mode: Jimp.BLEND_SCREEN });
    const buffer = await img1.getBufferAsync(Jimp.MIME_PNG);
    await sock.sendMessage(from, { image: buffer, caption: `${e1}+${e2}` }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(from, { text: '❌ Could not mix those two emoji (one may not have a Twemoji asset).' }, { quoted: msg });
  }
};

module.exports = exportsObj;

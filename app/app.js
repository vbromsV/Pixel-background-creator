/* Pixel Bakgrund – enkel bakgrundsbildsskapare för Pixel 9a (1080 × 2424, 20:9). */
'use strict';

// ---------------------------------------------------------------- konstanter
const SCREEN_W = 1080;
const SCREEN_H = 2424;
const CANVAS_MODES = [
  { id: 'fixed', label: 'Fast 1080', width: 1080, desc: 'Exakt skärmstorlek (20:9). Bilden rör sig inte när du swipar.' },
  { id: 'wide15', label: 'Bred 1,5×', width: 1620, desc: '1620 × 2424 – lite rörelse i sidled när du swipar mellan hemskärmssidor.' },
  { id: 'wide2', label: 'Bred 2×', width: 2160, desc: '2160 × 2424 (klassisk "scrolling wallpaper") – mer rörelse vid swipe.' },
];
const FONTS = [
  ['Roboto', 'Roboto'], ['Inter', 'Inter'], ['Montserrat', 'Montserrat'], ['Space Grotesk', 'Space Grotesk'],
  ['Oswald', 'Oswald'], ['Bebas Neue', 'Bebas Neue'], ['Anton', 'Anton'], ['Playfair Display', 'Playfair Display'],
  ['Abril Fatface', 'Abril Fatface'], ['Comfortaa', 'Comfortaa'], ['Orbitron', 'Orbitron'], ['Righteous', 'Righteous'],
  ['Lobster', 'Lobster'], ['Pacifico', 'Pacifico'], ['Dancing Script', 'Dancing Script'], ['Caveat', 'Caveat'],
  ['Shadows Into Light', 'Shadows Into Light'], ['Permanent Marker', 'Permanent Marker'], ['Press Start 2P', 'Press Start 2P'],
  ['serif', 'System serif'], ['monospace', 'System monospace'],
];
const EMOJI_FONT = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
const EMOJIS = ('😀 😂 🥰 😍 😎 🤩 😇 🥳 😴 🤖 👻 💀 👽 🐱 🐶 🦊 🐼 🐸 🦄 🐝 🦋 🐢 🐙 🐳 ' +
  '🌸 🌺 🌻 🌷 🌹 🍀 🌿 🌵 🌴 🍁 🍄 🌈 ☀️ 🌙 ⭐ 🌟 ✨ ⚡ 🔥 ❄️ 🌊 💧 ☁️ 🪐 🌍 🚀 ' +
  '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💖 💫 💥 💯 ✅ ☮️ ☯️ ♾️ 🎵 🎧 🎮 📷 🎨 ✏️ 📚 💡 🔒 🏠 ⛰️ 🏔️ 🏖️ 🌅 🌃 ' +
  '🍕 🍔 🍩 🍓 🍉 🍋 🥑 ☕ 🍵 🧋 ⚽ 🏀 🎾 🏆 🎯 🚲 🚗 ✈️ ⚓ 👑 💎 🎁 🎈 🎉').split(' ');
const BG_COLORS = ['#000000', '#16131f', '#1e293b', '#0f3d3e', '#14532d', '#3b0764', '#7f1d1d', '#9a3412',
  '#f59e0b', '#fde68a', '#a7f3d0', '#bae6fd', '#c7d2fe', '#fbcfe8', '#f5f5f4', '#ffffff'];
const GRADIENTS = [
  ['#0f2027', '#2c5364'], ['#24243e', '#0f0c29'], ['#ff512f', '#dd2476'], ['#7f00ff', '#e100ff'],
  ['#11998e', '#38ef7d'], ['#fc466b', '#3f5efb'], ['#f7971e', '#ffd200'], ['#00c6ff', '#0072ff'],
  ['#ee9ca7', '#ffdde1'], ['#232526', '#414345'], ['#c94b4b', '#4b134f'], ['#a8edea', '#fed6e3'],
];
const TEXT_COLORS = ['#ffffff', '#000000', '#f5f5f4', '#fde047', '#fb923c', '#f87171', '#f472b6', '#c084fc', '#60a5fa', '#34d399'];

// ---------------------------------------------------------------- state
const defaultState = () => ({
  mode: 'fixed',
  width: SCREEN_W,
  height: SCREEN_H,
  bg: {
    type: 'gradient', color: '#16131f',
    g1: '#24243e', g2: '#0f0c29', gAngle: 160, gType: 'linear',
    assetId: null, fit: 'cover', zoom: 1, offX: 0, offY: 0, blur: 0, dim: 0,
  },
  items: [],
});

let state = defaultState();
const assets = new Map(); // id -> { img, dataUrl }
let selectedId = null;
let currentTab = 'bg';
const ui = { axisLock: 'none', snap: true, guides: true };
const view = { snapX: false, snapY: false };

const $ = (s, el = document) => el.querySelector(s);
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
const panel = $('#panel');
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const deg = (r) => (r * 180) / Math.PI;
const rad = (d) => (d * Math.PI) / 180;

function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

// ---------------------------------------------------------------- historik (ångra/gör om)
const history = { undo: [], redo: [], last: null };
function snapshot() { return JSON.stringify(state); }
function commit() {
  const s = snapshot();
  if (s === history.last) return;
  if (history.last !== null) history.undo.push(history.last);
  if (history.undo.length > 60) history.undo.shift();
  history.redo.length = 0;
  history.last = s;
  updateUndoButtons();
  scheduleSave();
}
function undo() {
  if (!history.undo.length) return;
  history.redo.push(history.last);
  history.last = history.undo.pop();
  state = JSON.parse(history.last);
  afterStateReplaced();
}
function redo() {
  if (!history.redo.length) return;
  history.undo.push(history.last);
  history.last = history.redo.pop();
  state = JSON.parse(history.last);
  afterStateReplaced();
}
function afterStateReplaced() {
  if (!state.items.find((i) => i.id === selectedId)) selectedId = null;
  applyCanvasSize();
  updateUndoButtons();
  renderPanel();
  render();
  scheduleSave();
}
function updateUndoButtons() {
  $('#btnUndo').disabled = !history.undo.length;
  $('#btnRedo').disabled = !history.redo.length;
}

// ---------------------------------------------------------------- lagring (IndexedDB)
const DB_NAME = 'pixel-bakgrund';
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbSet(key, val) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(val, key);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
async function idbGet(key) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readonly');
    const r = tx.objectStore('kv').get(key);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
function usedAssetIds() {
  const ids = new Set();
  if (state.bg.assetId) ids.add(state.bg.assetId);
  state.items.forEach((i) => i.assetId && ids.add(i.assetId));
  return ids;
}
let saveTimer;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const a = {};
      usedAssetIds().forEach((id) => { const x = assets.get(id); if (x) a[id] = x.dataUrl; });
      await idbSet('project', { state, assets: a });
    } catch (e) { console.warn('Kunde inte spara', e); }
  }, 600);
}
async function loadProject() {
  try {
    const p = await idbGet('project');
    if (!p || !p.state) return false;
    await Promise.all(Object.entries(p.assets || {}).map(([id, url]) => addAsset(url, id)));
    state = Object.assign(defaultState(), p.state);
    state.bg = Object.assign(defaultState().bg, p.state.bg);
    return true;
  } catch (e) { console.warn(e); return false; }
}

// ---------------------------------------------------------------- bilder
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}
async function addAsset(dataUrl, id = uid()) {
  const img = await loadImage(dataUrl);
  assets.set(id, { img, dataUrl });
  return id;
}
function readFile(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
/** Läser in en fil, krymper extremt stora bilder (behåller transparens) och returnerar asset-id. */
async function importImageFile(file, maxDim = 4096) {
  let url = await readFile(file);
  const img = await loadImage(url);
  const m = Math.max(img.naturalWidth, img.naturalHeight);
  if (m > maxDim) {
    const s = maxDim / m;
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    url = c.toDataURL('image/webp', 0.92);
    if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/png');
  }
  return addAsset(url);
}

// ---------------------------------------------------------------- typsnitt
const fontLoads = new Map();
function ensureFont(item) {
  if (item.type !== 'text') return;
  const key = `${item.bold ? 700 : 400}|${item.italic ? 'i' : ''}|${item.font}`;
  if (fontLoads.has(key) || !document.fonts) return;
  const p = document.fonts.load(fontString(item, 100), item.text || 'Aa').then(() => render()).catch(() => {});
  fontLoads.set(key, p);
}
function fontString(item, size) {
  if (item.type === 'emoji') return `${size}px ${EMOJI_FONT}`;
  const fam = ['serif', 'sans-serif', 'monospace'].includes(item.font) ? item.font : `"${item.font}", sans-serif`;
  return `${item.italic ? 'italic ' : ''}${item.bold ? 700 : 400} ${size}px ${fam}`;
}

// ---------------------------------------------------------------- objekt
function newText() {
  return {
    id: uid(), type: 'text', text: 'Din text', font: 'Roboto', size: 140, bold: true, italic: false,
    color: '#ffffff', align: 'center', lineHeight: 1.15, letterSpacing: 0, stacked: false,
    strokeWidth: 0, strokeColor: '#000000', shadow: true, shadowColor: '#000000', shadowBlur: 24,
    boxOn: false, boxColor: '#000000', boxOpacity: 0.45, boxPad: 30,
    x: state.width / 2, y: state.height * 0.4, scale: 1, rotation: 0, rotMode: 'h', opacity: 1,
    hidden: false, locked: false,
  };
}
function newEmoji(ch) {
  return {
    id: uid(), type: 'emoji', text: ch, size: 260, x: state.width / 2, y: state.height * 0.55,
    scale: 1, rotation: 0, rotMode: 'h', opacity: 1, shadow: false, shadowColor: '#000000', shadowBlur: 30,
    hidden: false, locked: false,
  };
}
function newImageItem(assetId) {
  const { img } = assets.get(assetId);
  const s = Math.min((state.width * 0.6) / img.naturalWidth, (state.height * 0.4) / img.naturalHeight, 1.5);
  return {
    id: uid(), type: 'image', assetId, x: state.width / 2, y: state.height / 2, scale: s, rotation: 0,
    rotMode: 'h', opacity: 1, flipX: false, shadow: false, shadowColor: '#000000', shadowBlur: 30,
    hidden: false, locked: false,
  };
}
const selected = () => state.items.find((i) => i.id === selectedId) || null;
function effRotation(item) {
  switch (item.rotMode) {
    case 'h': return 0;
    case 'v': return -90;
    case 'v2': return 90;
    default: return item.rotation || 0;
  }
}
function splitGraphemes(s) {
  if (window.Intl && Intl.Segmenter) return Array.from(new Intl.Segmenter().segment(s), (x) => x.segment);
  return Array.from(s);
}
function textLines(item) {
  const t = item.text || ' ';
  if (item.type === 'text' && item.stacked) return splitGraphemes(t.replace(/\n/g, ' ')).map((c) => (c === ' ' ? ' ' : c));
  return t.split('\n');
}
/** Objektets storlek (oskalad) i canvas-pixlar. */
function itemSize(item) {
  if (item.type === 'image') {
    const a = assets.get(item.assetId);
    return a ? { w: a.img.naturalWidth, h: a.img.naturalHeight } : { w: 100, h: 100 };
  }
  ctx.save();
  ctx.font = fontString(item, item.size);
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${item.letterSpacing || 0}px`;
  const lines = textLines(item);
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width), item.size * 0.3);
  ctx.restore();
  const lh = item.size * (item.type === 'text' ? item.lineHeight : 1.15);
  return { w, h: lines.length * lh, lh, lines };
}

// ---------------------------------------------------------------- rendering
function drawBackground(c, W, H) {
  const bg = state.bg;
  c.save();
  if (bg.type === 'color') {
    c.fillStyle = bg.color; c.fillRect(0, 0, W, H);
  } else if (bg.type === 'gradient') {
    let g;
    if (bg.gType === 'radial') {
      g = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
    } else {
      const a = rad(bg.gAngle - 90);
      const len = Math.abs(W * Math.cos(a)) / 2 + Math.abs(H * Math.sin(a)) / 2;
      const dx = Math.cos(a) * len, dy = Math.sin(a) * len;
      g = c.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
    }
    g.addColorStop(0, bg.g1); g.addColorStop(1, bg.g2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  } else if (bg.type === 'image') {
    c.fillStyle = bg.color; c.fillRect(0, 0, W, H);
    const a = assets.get(bg.assetId);
    if (a) {
      const iw = a.img.naturalWidth, ih = a.img.naturalHeight;
      const base = bg.fit === 'contain' ? Math.min(W / iw, H / ih) : Math.max(W / iw, H / ih);
      const s = base * bg.zoom;
      const dw = iw * s, dh = ih * s;
      if (bg.blur > 0) {
        c.filter = `blur(${bg.blur}px)`;
        // rita lite större så kanterna inte blir genomskinliga vid oskärpa
        const m = bg.blur * 2;
        c.drawImage(a.img, (W - dw) / 2 + bg.offX - m, (H - dh) / 2 + bg.offY - m, dw + 2 * m, dh + 2 * m);
        c.filter = 'none';
      } else {
        c.drawImage(a.img, (W - dw) / 2 + bg.offX, (H - dh) / 2 + bg.offY, dw, dh);
      }
    }
  }
  if (bg.dim) {
    c.fillStyle = bg.dim > 0 ? `rgba(0,0,0,${bg.dim})` : `rgba(255,255,255,${-bg.dim})`;
    c.fillRect(0, 0, W, H);
  }
  c.restore();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function drawItem(c, item) {
  if (item.hidden) return;
  c.save();
  c.translate(item.x, item.y);
  c.rotate(rad(effRotation(item)));
  c.scale(item.scale, item.scale);
  c.globalAlpha = item.opacity;
  const setShadow = () => {
    if (item.shadow) {
      c.shadowColor = item.shadowColor; c.shadowBlur = item.shadowBlur;
      c.shadowOffsetX = 0; c.shadowOffsetY = item.shadowBlur / 4;
    }
  };
  const clearShadow = () => { c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0; };

  if (item.type === 'image') {
    const a = assets.get(item.assetId);
    if (a) {
      const w = a.img.naturalWidth, h = a.img.naturalHeight;
      if (item.flipX) c.scale(-1, 1);
      setShadow();
      c.drawImage(a.img, -w / 2, -h / 2, w, h);
    }
  } else {
    const { w, h, lh, lines } = itemSize(item);
    if (item.type === 'text' && item.boxOn) {
      const p = item.boxPad;
      c.fillStyle = hexA(item.boxColor, item.boxOpacity);
      c.beginPath();
      const r = Math.min(item.size * 0.35, (h + 2 * p) / 2);
      if (c.roundRect) c.roundRect(-w / 2 - p, -h / 2 - p, w + 2 * p, h + 2 * p, r);
      else c.rect(-w / 2 - p, -h / 2 - p, w + 2 * p, h + 2 * p);
      c.fill();
    }
    c.font = fontString(item, item.size);
    if ('letterSpacing' in c) c.letterSpacing = `${item.type === 'text' ? item.letterSpacing || 0 : 0}px`;
    c.textBaseline = 'middle';
    const align = item.type === 'text' && !item.stacked ? item.align : 'center';
    c.textAlign = align;
    const ax = align === 'left' ? -w / 2 : align === 'right' ? w / 2 : 0;
    const n = lines.length;
    if (item.type === 'text' && item.strokeWidth > 0) {
      c.lineJoin = 'round';
      c.lineWidth = item.strokeWidth * 2;
      c.strokeStyle = item.strokeColor;
      setShadow();
      lines.forEach((l, i) => c.strokeText(l, ax, (i - (n - 1) / 2) * lh));
      clearShadow();
    } else {
      setShadow();
    }
    c.fillStyle = item.type === 'text' ? item.color : '#000';
    lines.forEach((l, i) => c.fillText(l, ax, (i - (n - 1) / 2) * lh));
  }
  c.restore();
}

function drawScene(c, W, H) {
  drawBackground(c, W, H);
  state.items.forEach((it) => drawItem(c, it));
}

function itemCorners(item) {
  const { w, h } = itemSize(item);
  const pad = item.type === 'text' && item.boxOn ? item.boxPad : 0;
  const hw = (w / 2 + pad) * item.scale, hh = (h / 2 + pad) * item.scale;
  const r = rad(effRotation(item));
  const cos = Math.cos(r), sin = Math.sin(r);
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [item.x + x * cos - y * sin, item.y + x * sin + y * cos]);
}

function displayScale() {
  const r = canvas.getBoundingClientRect();
  return r.width ? state.width / r.width : 1;
}

function drawOverlay() {
  const W = state.width, H = state.height, k = displayScale();
  ctx.save();
  if (ui.guides) {
    const left = (W - SCREEN_W) / 2;
    ctx.lineWidth = 2 * k;
    ctx.setLineDash([10 * k, 8 * k]);
    // synligt område (mittensidan) i bred-läge
    if (W > SCREEN_W) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(0, 0, left, H);
      ctx.fillRect(left + SCREEN_W, 0, W - left - SCREEN_W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.strokeRect(left, 0, SCREEN_W, H);
    }
    // ungefärliga UI-zoner på Pixel 9a
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    const zones = [[0, 110], [H - 470, H]]; // statusfält / dock + sökfält
    zones.forEach(([y0, y1]) => { ctx.fillRect(left, y0, SCREEN_W, y1 - y0); ctx.strokeRect(left, y0, SCREEN_W, y1 - y0); });
    // kamerahål
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(W / 2, 62, 34, 0, Math.PI * 2); ctx.stroke();
    // mittlinjer
    ctx.setLineDash([6 * k, 10 * k]);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  }
  // fästlinjer under drag
  ctx.setLineDash([]);
  ctx.strokeStyle = '#ff4fd8';
  ctx.lineWidth = 2.5 * k;
  if (view.snapX) { ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); }
  if (view.snapY) { ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke(); }
  // markering
  const it = selected();
  if (it && !it.hidden) {
    const pts = itemCorners(it);
    ctx.strokeStyle = '#c4a7ff';
    ctx.lineWidth = 2.5 * k;
    ctx.setLineDash([8 * k, 6 * k]);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]);
    if (!it.locked) {
      const [hx, hy] = pts[2];
      ctx.fillStyle = '#c4a7ff';
      ctx.beginPath(); ctx.arc(hx, hy, 14 * k, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#21123f'; ctx.lineWidth = 2 * k; ctx.stroke();
    }
  }
  ctx.restore();
}

let rafPending = false;
function render() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawScene(ctx, state.width, state.height);
    drawOverlay();
  });
}

function applyCanvasSize() {
  const m = CANVAS_MODES.find((x) => x.id === state.mode) || CANVAS_MODES[0];
  state.width = m.width;
  if (canvas.width !== state.width) canvas.width = state.width;
  if (canvas.height !== state.height) canvas.height = state.height;
  $('#sizeBadge').textContent = `${state.width} × ${state.height}`;
}
function setMode(id) {
  const m = CANVAS_MODES.find((x) => x.id === id);
  if (!m || m.id === state.mode) return;
  const dx = (m.width - state.width) / 2; // behåll objekt centrerade
  state.items.forEach((i) => { i.x += dx; });
  state.mode = id;
  applyCanvasSize();
  render(); commit(); renderPanel();
}

// ---------------------------------------------------------------- pekinteraktion
const pointers = new Map();
let gesture = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) * state.width) / r.width, y: ((e.clientY - r.top) * state.height) / r.height };
}
function hitTest(p) {
  for (let i = state.items.length - 1; i >= 0; i--) {
    const it = state.items[i];
    if (it.hidden) continue;
    const { w, h } = itemSize(it);
    const pad = (it.type === 'text' && it.boxOn ? it.boxPad : 0) + 12 / it.scale;
    const r = -rad(effRotation(it));
    const dx = p.x - it.x, dy = p.y - it.y;
    const lx = (dx * Math.cos(r) - dy * Math.sin(r)) / it.scale;
    const ly = (dx * Math.sin(r) + dy * Math.cos(r)) / it.scale;
    if (Math.abs(lx) <= w / 2 + pad && Math.abs(ly) <= h / 2 + pad) return it;
  }
  return null;
}
function hitHandle(p) {
  const it = selected();
  if (!it || it.hidden || it.locked) return false;
  const [hx, hy] = itemCorners(it)[2];
  return Math.hypot(p.x - hx, p.y - hy) < 34 * displayScale();
}
function snapAngle(a) {
  for (const t of [-180, -90, 0, 90, 180]) if (Math.abs(a - t) < 4) return t;
  return a;
}
function normAngle(a) { a = ((a + 180) % 360 + 360) % 360 - 180; return a; }

function startGesture() {
  const pts = [...pointers.values()];
  const it = selected();
  const bgMode = !it && state.bg.type === 'image';
  if (pts.length >= 2) {
    const [a, b] = pts;
    gesture = {
      kind: 'pinch', target: it ? 'item' : bgMode ? 'bg' : null,
      d0: Math.hypot(b.x - a.x, b.y - a.y) || 1, a0: Math.atan2(b.y - a.y, b.x - a.x),
      s0: it ? it.scale : state.bg.zoom, r0: it ? it.rotation : 0,
    };
  }
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = canvasPoint(e);
  pointers.set(e.pointerId, p);
  if (pointers.size === 2) { startGesture(); return; }
  if (pointers.size > 2) return;

  if (hitHandle(p)) {
    const it = selected();
    gesture = {
      kind: 'handle', d0: Math.hypot(p.x - it.x, p.y - it.y) || 1, a0: Math.atan2(p.y - it.y, p.x - it.x),
      s0: it.scale, r0: it.rotation,
    };
    return;
  }
  const hit = hitTest(p);
  if (hit) {
    if (hit.id !== selectedId) { selectedId = hit.id; renderPanel(); }
    gesture = hit.locked ? null : { kind: 'move', p0: p, x0: hit.x, y0: hit.y };
  } else {
    if (selectedId) { selectedId = null; renderPanel(); }
    gesture = state.bg.type === 'image' ? { kind: 'bgmove', p0: p, x0: state.bg.offX, y0: state.bg.offY } : null;
  }
  render();
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  const p = canvasPoint(e);
  pointers.set(e.pointerId, p);
  if (!gesture) return;
  const it = selected();
  const W = state.width, H = state.height;

  if (gesture.kind === 'move' && it) {
    let dx = p.x - gesture.p0.x, dy = p.y - gesture.p0.y;
    if (ui.axisLock === 'h') dy = 0;
    if (ui.axisLock === 'v') dx = 0;
    let nx = gesture.x0 + dx, ny = gesture.y0 + dy;
    view.snapX = view.snapY = false;
    if (ui.snap) {
      const tol = 18 * displayScale();
      if (Math.abs(nx - W / 2) < tol) { nx = W / 2; view.snapX = true; }
      if (Math.abs(ny - H / 2) < tol) { ny = H / 2; view.snapY = true; }
    }
    it.x = nx; it.y = ny;
  } else if (gesture.kind === 'bgmove') {
    let dx = p.x - gesture.p0.x, dy = p.y - gesture.p0.y;
    if (ui.axisLock === 'h') dy = 0;
    if (ui.axisLock === 'v') dx = 0;
    state.bg.offX = gesture.x0 + dx; state.bg.offY = gesture.y0 + dy;
  } else if (gesture.kind === 'handle' && it) {
    const d = Math.hypot(p.x - it.x, p.y - it.y);
    it.scale = clamp((gesture.s0 * d) / gesture.d0, 0.05, 20);
    if (it.rotMode === 'free') {
      const a = Math.atan2(p.y - it.y, p.x - it.x);
      it.rotation = snapAngle(normAngle(gesture.r0 + deg(a - gesture.a0)));
    }
  } else if (gesture.kind === 'pinch' && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    if (gesture.target === 'item' && it && !it.locked) {
      it.scale = clamp((gesture.s0 * d) / gesture.d0, 0.05, 20);
      if (it.rotMode === 'free') it.rotation = snapAngle(normAngle(gesture.r0 + deg(ang - gesture.a0)));
    } else if (gesture.target === 'bg') {
      state.bg.zoom = clamp((gesture.s0 * d) / gesture.d0, 0.2, 8);
    }
  }
  render();
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pointers.size === 0) {
    if (gesture) { commit(); syncPanelValues(); }
    gesture = null;
    view.snapX = view.snapY = false;
    render();
  } else if (pointers.size === 1 && gesture && gesture.kind === 'pinch') {
    gesture = null; // vänta tills alla fingrar släppts
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
window.addEventListener('resize', render);

// mushjul (dator): skala markerat objekt / bakgrundsbild
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const f = Math.exp(-e.deltaY * 0.0015);
  const it = selected();
  if (it && !it.locked) it.scale = clamp(it.scale * f, 0.05, 20);
  else if (state.bg.type === 'image') state.bg.zoom = clamp(state.bg.zoom * f, 0.2, 8);
  else return;
  render();
  clearTimeout(canvas._wt); canvas._wt = setTimeout(() => { commit(); syncPanelValues(); }, 300);
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && selected()) { deleteItem(selectedId); }
});

// ---------------------------------------------------------------- UI-byggare
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') el.style.cssText = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach((c) => c != null && el.append(c.nodeType ? c : document.createTextNode(c)));
  return el;
}
const syncers = [];
function row(label, ...ctl) { return h('div', { class: 'row' }, h('label', {}, label), h('div', { class: 'ctl' }, ...ctl)); }
function rangeCtl(label, obj, key, min, max, step, fmt = (v) => v, onInput) {
  const out = h('output', {}, fmt(obj[key]));
  const inp = h('input', {
    type: 'range', min, max, step, value: obj[key],
    oninput: () => { obj[key] = parseFloat(inp.value); out.textContent = fmt(obj[key]); onInput && onInput(); render(); },
    onchange: () => commit(),
  });
  syncers.push(() => { inp.value = obj[key]; out.textContent = fmt(obj[key]); });
  return row(label, inp, out);
}
function colorCtl(label, obj, key, presets = null, onInput) {
  const inp = h('input', {
    type: 'color', value: obj[key],
    oninput: () => { obj[key] = inp.value; onInput && onInput(); render(); markSw(); },
    onchange: () => commit(),
  });
  let sw = null;
  const markSw = () => sw && sw.querySelectorAll('.swatch').forEach((b) => b.classList.toggle('on', b.dataset.c === obj[key]));
  if (presets) {
    sw = h('div', { class: 'swatches' }, presets.map((c) => h('button', {
      class: 'swatch', 'data-c': c, style: `background:${c}`, 'aria-label': c,
      onclick: () => { obj[key] = c; inp.value = c; onInput && onInput(); markSw(); render(); commit(); },
    })));
    markSw();
  }
  return h('div', {}, row(label, inp), sw);
}
function segCtl(label, obj, key, options, onChange, cls = '') {
  const seg = h('div', { class: `seg ${cls}` }, options.map(([v, t]) => h('button', {
    class: obj[key] === v ? 'on' : '',
    onclick: () => {
      obj[key] = v;
      seg.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', options[i][0] === v));
      onChange && onChange(v); render(); commit();
    },
  }, t)));
  return label ? row(label, seg) : seg;
}
function checkCtl(label, obj, key, onChange) {
  const inp = h('input', { type: 'checkbox', checked: !!obj[key], onchange: () => { obj[key] = inp.checked; onChange && onChange(); render(); commit(); } });
  return row(label, inp);
}
function selectCtl(label, obj, key, options, onChange, cls = '') {
  const sel = h('select', {
    class: cls,
    onchange: () => { obj[key] = sel.value; onChange && onChange(); render(); commit(); },
  }, options.map(([v, t]) => h('option', { value: v, selected: obj[key] === v, style: `font-family:${['serif', 'monospace'].includes(v) ? v : `'${v}'`}` }, t)));
  return row(label, sel);
}
const append = (...k) => panel.append(...k.flat().filter((x) => x != null && x !== false));
function syncPanelValues() { syncers.forEach((f) => f()); }

// ---------------------------------------------------------------- paneler
function renderPanel() {
  syncers.length = 0;
  panel.replaceChildren();
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === currentTab));
  ({ bg: panelBg, add: panelAdd, edit: panelEdit, layers: panelLayers, export: panelExport })[currentTab]();
}

function panelBg() {
  const bg = state.bg;
  append(
    h('h3', {}, 'Typ av bakgrund'),
    segCtl(null, bg, 'type', [['color', 'Färg'], ['gradient', 'Gradient'], ['image', 'Bild']], () => renderPanel(), 'full'),
  );
  if (bg.type === 'color') {
    append(colorCtl('Färg', bg, 'color', BG_COLORS));
  } else if (bg.type === 'gradient') {
    append(
      h('div', { class: 'swatches' }, GRADIENTS.map(([a, b]) => h('button', {
        class: 'swatch', style: `background:linear-gradient(160deg,${a},${b})`,
        onclick: () => { bg.g1 = a; bg.g2 = b; render(); commit(); renderPanel(); },
      }))),
      colorCtl('Färg 1', bg, 'g1'),
      colorCtl('Färg 2', bg, 'g2'),
      segCtl('Form', bg, 'gType', [['linear', 'Linjär'], ['radial', 'Radiell']], () => renderPanel()),
      bg.gType === 'linear' ? rangeCtl('Vinkel', bg, 'gAngle', 0, 360, 1, (v) => `${v}°`) : null,
    );
  } else {
    append(
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn primary', onclick: () => $('#fileBg').click() }, bg.assetId ? 'Byt bild…' : 'Välj bild…'),
        bg.assetId ? h('button', { class: 'btn', onclick: () => { bg.zoom = 1; bg.offX = 0; bg.offY = 0; render(); commit(); syncPanelValues(); } }, 'Återställ läge') : null,
      ),
      h('p', { class: 'hint' }, 'Dra i förhandsvisningen för att flytta bilden, nyp med två fingrar för att zooma (när inget objekt är markerat).'),
      segCtl('Anpassa', bg, 'fit', [['cover', 'Fyll'], ['contain', 'Hela bilden']], () => renderPanel()),
      rangeCtl('Zoom', bg, 'zoom', 0.2, 8, 0.01, (v) => `${Math.round(v * 100)}%`),
      rangeCtl('Oskärpa', bg, 'blur', 0, 60, 1, (v) => `${v}px`),
      bg.fit === 'contain' ? colorCtl('Kantfärg', bg, 'color') : null,
    );
  }
  append(
    h('h3', {}, 'Ton'),
    rangeCtl('Mörka/ljusa', bg, 'dim', -0.8, 0.8, 0.01, (v) => (v > 0 ? `−${Math.round(v * 100)}%` : v < 0 ? `+${Math.round(-v * 100)}%` : '0')),
  );
}

function addItem(item) {
  state.items.push(item);
  selectedId = item.id;
  ensureFont(item);
  render(); commit();
}

function panelAdd() {
  const custom = h('input', { type: 'text', placeholder: 'Skriv/klistra in valfri emoji…', style: `font-family:${EMOJI_FONT}` });
  append(
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', onclick: () => { addItem(newText()); currentTab = 'edit'; renderPanel(); } }, '＋ Text'),
      h('button', { class: 'btn primary', onclick: () => $('#fileOverlay').click() }, '＋ Bild (PNG m.m.)'),
    ),
    h('h3', {}, 'Emoji'),
    h('div', { class: 'row' }, custom, h('button', {
      class: 'btn', onclick: () => { const v = custom.value.trim(); if (v) { addItem(newEmoji(v)); custom.value = ''; toast('Emoji tillagd'); } },
    }, 'Lägg till')),
    h('div', { class: 'emoji-grid' }, EMOJIS.filter(Boolean).map((e) => h('button', {
      onclick: () => { addItem(newEmoji(e)); toast(`${e} tillagd – dra för att flytta`); },
    }, e))),
  );
}

function panelEdit() {
  const it = selected();
  if (!it) {
    append(h('div', { class: 'empty' }, 'Tryck på ett objekt i bilden för att redigera det, eller lägg till text, emoji eller bild under "Lägg till".'));
    return;
  }
  const refit = () => render();
  if (it.type === 'text') {
    const ta = h('textarea', { rows: 2, oninput: () => { it.text = ta.value; ensureFont(it); render(); }, onchange: () => commit() });
    ta.value = it.text;
    append(
      h('h3', {}, 'Text'), ta,
      selectCtl('Typsnitt', it, 'font', FONTS, () => ensureFont(it), 'font-select'),
      rangeCtl('Storlek', it, 'size', 20, 600, 1, (v) => `${v}px`),
      row('Stil',
        segCtl(null, it, 'bold', [[false, 'Normal'], [true, 'Fet']], () => ensureFont(it)),
        segCtl(null, it, 'italic', [[false, 'Rak'], [true, 'Kursiv']], () => ensureFont(it))),
      segCtl('Justering', it, 'align', [['left', '⯇ Vänster'], ['center', 'Mitten'], ['right', 'Höger ⯈']]),
      colorCtl('Färg', it, 'color', TEXT_COLORS),
      rangeCtl('Radavstånd', it, 'lineHeight', 0.7, 2.5, 0.05, (v) => v.toFixed(2)),
      rangeCtl('Teckenavst.', it, 'letterSpacing', -20, 80, 1, (v) => `${v}px`),
      h('h3', {}, 'Kontur & platta'),
      rangeCtl('Kontur', it, 'strokeWidth', 0, 30, 1, (v) => `${v}px`),
      colorCtl('Konturfärg', it, 'strokeColor'),
      checkCtl('Platta bakom', it, 'boxOn', () => renderPanel()),
      it.boxOn ? colorCtl('Plattans färg', it, 'boxColor') : null,
      it.boxOn ? rangeCtl('Plattans alfa', it, 'boxOpacity', 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`) : null,
      it.boxOn ? rangeCtl('Marginal', it, 'boxPad', 0, 120, 1, (v) => `${v}px`) : null,
    );
  } else if (it.type === 'emoji') {
    const inp = h('input', { type: 'text', value: it.text, style: `font-family:${EMOJI_FONT};font-size:22px`, oninput: () => { it.text = inp.value || ' '; render(); }, onchange: () => commit() });
    append(h('h3', {}, 'Emoji'), row('Tecken', inp), rangeCtl('Storlek', it, 'size', 40, 1200, 1, (v) => `${v}px`));
  } else {
    append(h('h3', {}, 'Bild'), checkCtl('Spegelvänd', it, 'flipX'));
  }

  append(
    h('h3', {}, 'Placering & riktning'),
    segCtl('Riktning', it, 'rotMode', [['h', '— Vågrät'], ['v', '| Lodrät ↑'], ['v2', '| Lodrät ↓'], ['free', '⟳ Fri']], () => renderPanel()),
    it.type === 'text' ? checkCtl('Staplade tecken', it, 'stacked', refit) : null,
    it.rotMode === 'free' ? rangeCtl('Rotation', it, 'rotation', -180, 180, 1, (v) => `${Math.round(v)}°`) : null,
    rangeCtl('Skala', it, 'scale', 0.05, 6, 0.01, (v) => `${Math.round(v * 100)}%`),
    rangeCtl('Opacitet', it, 'opacity', 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', onclick: () => { it.x = state.width / 2; render(); commit(); } }, '⇹ Centrera vågrätt'),
      h('button', { class: 'btn', onclick: () => { it.y = state.height / 2; render(); commit(); } }, '⇳ Centrera lodrätt'),
    ),
    h('p', { class: 'hint' }, 'Tips: Lås flytt till bara ↔ eller ↕ med knapparna högst upp. Dra i det runda handtaget eller nyp med två fingrar för att ändra storlek (och vrida i läget "Fri").'),
    h('h3', {}, 'Skugga'),
    checkCtl('Skugga', it, 'shadow', () => renderPanel()),
    it.shadow ? colorCtl('Skuggfärg', it, 'shadowColor') : null,
    it.shadow ? rangeCtl('Mjukhet', it, 'shadowBlur', 0, 120, 1, (v) => `${v}px`) : null,
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', onclick: () => duplicateItem(it.id) }, '⧉ Duplicera'),
      h('button', { class: 'btn danger', onclick: () => deleteItem(it.id) }, '🗑 Ta bort'),
    ),
  );
}

function duplicateItem(id) {
  const i = state.items.findIndex((x) => x.id === id);
  if (i < 0) return;
  const c = JSON.parse(JSON.stringify(state.items[i]));
  c.id = uid(); c.x += 40; c.y += 40;
  state.items.splice(i + 1, 0, c);
  selectedId = c.id;
  render(); commit(); renderPanel();
}
function deleteItem(id) {
  state.items = state.items.filter((x) => x.id !== id);
  if (selectedId === id) selectedId = null;
  render(); commit(); renderPanel();
}
function moveItem(id, dir) {
  const i = state.items.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= state.items.length) return;
  [state.items[i], state.items[j]] = [state.items[j], state.items[i]];
  render(); commit(); renderPanel();
}

function panelLayers() {
  if (!state.items.length) {
    append(h('div', { class: 'empty' }, 'Inga lager ännu. Lägg till text, emoji eller bilder under "Lägg till".'));
    return;
  }
  const list = h('ul', { class: 'layer-list' });
  [...state.items].reverse().forEach((it) => {
    const thumb = it.type === 'image' ? h('img', { src: assets.get(it.assetId)?.dataUrl || '', style: 'width:30px;height:30px;object-fit:contain' })
      : it.type === 'emoji' ? h('span', { style: `font-family:${EMOJI_FONT}` }, it.text) : h('span', {}, 'T');
    const name = it.type === 'image' ? 'Bild' : it.type === 'emoji' ? 'Emoji' : (it.text || '').split('\n')[0].slice(0, 40) || 'Text';
    list.append(h('li', { class: `${it.id === selectedId ? 'sel' : ''} ${it.hidden ? 'hidden-item' : ''}` },
      h('span', { class: 'thumb' }, thumb),
      h('span', { class: 'name', onclick: () => { selectedId = it.id; render(); renderPanel(); } }, name),
      h('button', { title: 'Upp', onclick: () => moveItem(it.id, 1) }, '▲'),
      h('button', { title: 'Ner', onclick: () => moveItem(it.id, -1) }, '▼'),
      h('button', { title: it.hidden ? 'Visa' : 'Dölj', onclick: () => { it.hidden = !it.hidden; render(); commit(); renderPanel(); } }, it.hidden ? '🙈' : '👁'),
      h('button', { title: it.locked ? 'Lås upp' : 'Lås', onclick: () => { it.locked = !it.locked; render(); commit(); renderPanel(); } }, it.locked ? '🔒' : '🔓'),
      h('button', { title: 'Redigera', onclick: () => { selectedId = it.id; currentTab = 'edit'; render(); renderPanel(); } }, '✎'),
    ));
  });
  append(h('p', { class: 'hint' }, 'Översta raden ligger överst i bilden.'), list);
}

const exportOpts = { format: 'image/png', quality: 0.92 };
function panelExport() {
  const m = CANVAS_MODES.find((x) => x.id === state.mode);
  append(
    h('h3', {}, 'Bildformat'),
    segCtl(null, { mode: state.mode }, 'mode', CANVAS_MODES.map((x) => [x.id, x.label]), (v) => setMode(v), 'full'),
    h('p', { class: 'hint' }, m.desc, ' ', state.mode !== 'fixed'
      ? 'Den ljusa ramen visar vad som syns på mittensidan. När du väljer bakgrund i Pixel: välj bilden och låt beskärningen täcka hela bredden.'
      : ''),
    h('h3', {}, 'Filformat'),
    segCtl(null, exportOpts, 'format', [['image/png', 'PNG'], ['image/jpeg', 'JPG'], ['image/webp', 'WebP']], () => renderPanel(), 'full'),
    exportOpts.format !== 'image/png' ? rangeCtl('Kvalitet', exportOpts, 'quality', 0.5, 1, 0.01, (v) => `${Math.round(v * 100)}%`) : null,
    h('p', { class: 'hint' }, 'PNG = bäst kvalitet. JPG = mindre fil. WebP = liten fil med bra kvalitet.'),
    h('div', { class: 'btn-row' },
      navigator.canShare ? h('button', { class: 'btn primary', onclick: () => doExport('share') }, '📤 Dela / Ange som bakgrund') : null,
      h('button', { class: navigator.canShare ? 'btn' : 'btn primary', onclick: () => doExport('download') }, '⬇ Spara fil'),
    ),
    h('p', { class: 'hint' }, 'Så sätter du bakgrunden: tryck "Dela" och välj Foton (eller spara filen), öppna bilden och välj ⋮ → "Använd som" → Bakgrund. Eller: håll inne på hemskärmen → Bakgrund och stil → Mina foton.'),
    h('h3', {}, 'Projekt'),
    h('div', { class: 'btn-row' },
      h('button', {
        class: 'btn danger', onclick: () => {
          if (!confirm('Börja om med en tom bakgrund? (Du kan ångra med ↶)')) return;
          const mode = state.mode;
          state = defaultState(); state.mode = mode; selectedId = null;
          applyCanvasSize(); render(); commit(); renderPanel();
        },
      }, 'Ny bakgrund'),
    ),
    h('p', { class: 'hint' }, 'Ditt arbete sparas automatiskt på telefonen. Appen fungerar även offline.'),
  );
}

async function renderExportBlob() {
  const c = document.createElement('canvas');
  c.width = state.width; c.height = state.height;
  drawScene(c.getContext('2d'), c.width, c.height);
  const blob = await new Promise((res) => c.toBlob(res, exportOpts.format, exportOpts.quality));
  const actual = blob && blob.type ? blob.type : 'image/png';
  return { blob, ext: actual.split('/')[1].replace('jpeg', 'jpg') };
}

async function doExport(how) {
  try {
    const { blob, ext } = await renderExportBlob();
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    const name = `pixel9a-bakgrund-${state.width}x${state.height}-${stamp}.${ext}`;
    const file = new File([blob], name, { type: blob.type });
    if (how === 'share' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Bakgrundsbild' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(`Sparad: ${name}`);
  } catch (e) {
    console.error(e);
    toast('Kunde inte exportera bilden');
  }
}

// ---------------------------------------------------------------- filval
$('#fileBg').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  const id = await importImageFile(f, 5000);
  Object.assign(state.bg, { type: 'image', assetId: id, zoom: 1, offX: 0, offY: 0 });
  render(); commit(); renderPanel();
});
$('#fileOverlay').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  const id = await importImageFile(f, 3000);
  addItem(newImageItem(id));
  currentTab = 'edit'; renderPanel();
});

// ---------------------------------------------------------------- toppfält
$('#btnUndo').addEventListener('click', undo);
$('#btnRedo').addEventListener('click', redo);
function syncTopbar() {
  document.querySelectorAll('#axisLock button').forEach((b) => b.classList.toggle('on', b.dataset.v === ui.axisLock));
  $('#btnSnap').classList.toggle('on', ui.snap);
  $('#btnGuides').classList.toggle('on', ui.guides);
  try { localStorage.setItem('pb-ui', JSON.stringify(ui)); } catch (e) { /* ignore */ }
}
document.querySelectorAll('#axisLock button').forEach((b) => b.addEventListener('click', () => {
  ui.axisLock = b.dataset.v; syncTopbar();
  toast({ none: 'Flytta fritt', h: 'Flyttar endast horisontellt ↔', v: 'Flyttar endast vertikalt ↕' }[ui.axisLock]);
}));
$('#btnSnap').addEventListener('click', () => { ui.snap = !ui.snap; syncTopbar(); toast(ui.snap ? 'Fäster mot mittlinjerna' : 'Fästning av'); });
$('#btnGuides').addEventListener('click', () => { ui.guides = !ui.guides; syncTopbar(); render(); });
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { currentTab = b.dataset.tab; renderPanel(); panel.scrollTop = 0; }));

// ---------------------------------------------------------------- start
(async function init() {
  try { Object.assign(ui, JSON.parse(localStorage.getItem('pb-ui') || '{}')); } catch (e) { /* ignore */ }
  const loaded = await loadProject();
  if (!loaded) {
    const t = newText();
    t.text = 'Hej!'; t.y = state.height * 0.42;
    state.items.push(t);
  }
  applyCanvasSize();
  state.items.forEach(ensureFont);
  history.last = snapshot();
  updateUndoButtons();
  syncTopbar();
  renderPanel();
  render();
  if (document.fonts) document.fonts.ready.then(render);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  }
})();

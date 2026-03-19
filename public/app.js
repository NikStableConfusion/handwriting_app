/* ── Handwriting Font Maker — Frontend ──────────────────────────── */

// ── Character Definitions ─────────────────────────────────────────
const CHARS = [
  // Uppercase
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => ({ char: c, label: `Uppercase ${c}` })),
  // Lowercase
  ...'abcdefghijklmnopqrstuvwxyz'.split('').map(c => ({ char: c, label: `Lowercase ${c}` })),
  // Digits
  ...'0123456789'.split('').map(c => ({ char: c, label: `Number ${c}` })),
  // Punctuation
  { char: '.', label: 'Period' },
  { char: ',', label: 'Comma' },
  { char: '!', label: 'Exclamation' },
  { char: '?', label: 'Question mark' },
  { char: "'", label: 'Apostrophe' },
  { char: '-', label: 'Hyphen' },
  { char: '(', label: 'Left paren' },
  { char: ')', label: 'Right paren' },
  { char: ':', label: 'Colon' },
  { char: ';', label: 'Semicolon' },
  { char: '/', label: 'Slash' },
  { char: '&', label: 'Ampersand' },
  { char: '@', label: 'At sign' },
];

// ── State ─────────────────────────────────────────────────────────
const state = {
  fontId: null,
  fontName: 'MyHandwriting',
  currentIndex: 0,
  savedGlyphs: new Set(),
  strokes: [],       // completed strokes for current char
  currentStroke: [], // points in current stroke
  strokeWidth: 10,
  tool: 'pen',       // 'pen' | 'eraser'
  isDrawing: false,
};

// ── Canvas Setup ──────────────────────────────────────────────────
const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const area = canvas.parentElement;
  const size = Math.min(area.clientWidth - 32, area.clientHeight - 32, 520);
  canvas.width = size;
  canvas.height = size;
  redraw();
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw all saved strokes
  for (const stroke of state.strokes) {
    drawStroke(stroke.points, stroke.width, stroke.color);
  }

  // Draw current active stroke
  if (state.currentStroke.length > 1) {
    drawStroke(state.currentStroke, state.strokeWidth, penColor());
  }
}

function drawStroke(points, width, color) {
  if (points.length < 2) {
    // Single dot
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function penColor() {
  return state.tool === 'eraser' ? '#ffffff' : '#111111';
}

// ── Pointer Events ────────────────────────────────────────────────
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  let clientX, clientY;
  if (e.changedTouches) {
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function onPointerDown(e) {
  e.preventDefault();
  state.isDrawing = true;
  state.currentStroke = [getPos(e)];
  document.getElementById('canvas-hint').classList.add('hidden');
}

function onPointerMove(e) {
  e.preventDefault();
  if (!state.isDrawing) return;
  state.currentStroke.push(getPos(e));
  redraw();
}

function onPointerUp(e) {
  e.preventDefault();
  if (!state.isDrawing) return;
  state.isDrawing = false;
  if (state.currentStroke.length > 0) {
    state.strokes.push({
      points: [...state.currentStroke],
      width: state.tool === 'eraser' ? state.strokeWidth * 2.5 : state.strokeWidth,
      color: penColor(),
    });
    state.currentStroke = [];
  }
  redraw();
}

canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
canvas.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('touchstart', onPointerDown, { passive: false });
canvas.addEventListener('touchmove', onPointerMove, { passive: false });
canvas.addEventListener('touchend', onPointerUp, { passive: false });
canvas.addEventListener('touchcancel', onPointerUp, { passive: false });

// ── UI Helpers ────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function updateCharDisplay() {
  const item = CHARS[state.currentIndex];
  const dispChar = item.char === ' ' ? '␣' : item.char;
  document.getElementById('char-display').textContent = dispChar;
  document.getElementById('char-name').textContent = item.label;
  document.getElementById('progress-text').textContent =
    `${state.savedGlyphs.size} / ${CHARS.length}`;
  updateProgressBar();
  updateGridHighlight();
}

function updateProgressBar() {
  const fill = document.querySelector('.progress-bar-fill');
  if (fill) fill.style.width = `${(state.savedGlyphs.size / CHARS.length) * 100}%`;
}

function clearCanvas() {
  state.strokes = [];
  state.currentStroke = [];
  redraw();
  document.getElementById('canvas-hint').classList.remove('hidden');
}

// ── Character Grid ────────────────────────────────────────────────
function buildGrid() {
  const grid = document.getElementById('char-grid');
  grid.innerHTML = '';
  CHARS.forEach((item, idx) => {
    const cell = document.createElement('div');
    cell.className = 'char-cell';
    cell.textContent = item.char === ' ' ? '␣' : item.char;
    cell.title = item.label;
    if (state.savedGlyphs.has(item.char)) {
      cell.classList.add('done');
      const dot = document.createElement('div');
      dot.className = 'dot';
      cell.appendChild(dot);
    }
    if (idx === state.currentIndex) cell.classList.add('current');
    cell.addEventListener('click', () => {
      state.currentIndex = idx;
      clearCanvas();
      updateCharDisplay();
      closeGrid();
    });
    grid.appendChild(cell);
  });
}

function updateGridHighlight() {
  const cells = document.querySelectorAll('.char-cell');
  cells.forEach((cell, idx) => {
    cell.classList.toggle('current', idx === state.currentIndex);
    cell.classList.toggle('done', state.savedGlyphs.has(CHARS[idx].char));
    const existingDot = cell.querySelector('.dot');
    if (state.savedGlyphs.has(CHARS[idx].char) && !existingDot) {
      const dot = document.createElement('div');
      dot.className = 'dot';
      cell.appendChild(dot);
    } else if (!state.savedGlyphs.has(CHARS[idx].char) && existingDot) {
      existingDot.remove();
    }
  });
}

function openGrid() {
  buildGrid();
  document.getElementById('modal-grid').classList.remove('hidden');
}

function closeGrid() {
  document.getElementById('modal-grid').classList.add('hidden');
}

// ── Save glyph to server ──────────────────────────────────────────
async function saveCurrentGlyph() {
  const char = CHARS[state.currentIndex].char;
  // Filter to pen strokes only (not eraser, which is white)
  const penStrokes = state.strokes
    .filter(s => s.color !== '#ffffff')
    .map(s => ({ points: s.points, width: s.width }));

  if (penStrokes.length === 0) return false;

  try {
    const res = await fetch('/api/glyph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fontId: state.fontId,
        character: char,
        strokes: penStrokes,
        canvasSize: canvas.width,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      state.savedGlyphs.add(char);
      return true;
    }
  } catch (err) {
    console.error('Save failed:', err);
  }
  return false;
}

// ── Font Generation ───────────────────────────────────────────────
async function generateFont() {
  const btn = document.getElementById('btn-download');
  if (btn) { btn.textContent = '⏳ Generating font…'; btn.disabled = true; }

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fontId: state.fontId, fontName: state.fontName }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert('Error: ' + err.error);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.fontName.replace(/\s+/g, '_')}.ttf`;
    a.click();
    URL.revokeObjectURL(url);

    // Load preview font
    try {
      const fontData = await blob.arrayBuffer();
      const fontFace = new FontFace('PreviewFont', fontData);
      await fontFace.load();
      document.fonts.add(fontFace);
      document.getElementById('font-preview').style.fontFamily = "'PreviewFont', serif";
    } catch (e) { /* preview failed, no big deal */ }

  } catch (err) {
    alert('Generation failed: ' + err.message);
  } finally {
    if (btn) { btn.textContent = '⬇ Download Font (.ttf)'; btn.disabled = false; }
  }
}

// ── Navigation ────────────────────────────────────────────────────
function goToIndex(idx) {
  state.currentIndex = Math.max(0, Math.min(CHARS.length - 1, idx));
  clearCanvas();
  updateCharDisplay();
}

function goNext() {
  if (state.currentIndex < CHARS.length - 1) {
    goToIndex(state.currentIndex + 1);
  } else {
    // All done → go to finish
    showFinish();
  }
}

function goPrev() {
  if (state.currentIndex > 0) goToIndex(state.currentIndex - 1);
}

function showFinish() {
  const count = state.savedGlyphs.size;
  document.getElementById('finish-summary').textContent =
    `You've drawn ${count} character${count !== 1 ? 's' : ''}.`;
  showScreen('screen-finish');
}

// ── Event Wiring ──────────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', async () => {
  const nameInput = document.getElementById('font-name-input').value.trim();
  state.fontName = nameInput || 'MyHandwriting';
  state.fontId = `font_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  await fetch('/api/font-meta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fontId: state.fontId, fontName: state.fontName }),
  }).catch(() => {});

  showScreen('screen-draw');
  resizeCanvas();
  updateCharDisplay();
});

document.getElementById('btn-back-welcome').addEventListener('click', () => {
  showScreen('screen-welcome');
});

document.getElementById('btn-save-next').addEventListener('click', async () => {
  await saveCurrentGlyph();
  goNext();
});

document.getElementById('btn-skip').addEventListener('click', () => {
  goNext();
});

document.getElementById('btn-prev').addEventListener('click', () => {
  goPrev();
});

document.getElementById('btn-pen').addEventListener('click', () => {
  state.tool = 'pen';
  document.getElementById('btn-pen').classList.add('active');
  document.getElementById('btn-eraser').classList.remove('active');
});

document.getElementById('btn-eraser').addEventListener('click', () => {
  state.tool = 'eraser';
  document.getElementById('btn-eraser').classList.add('active');
  document.getElementById('btn-pen').classList.remove('active');
});

document.getElementById('btn-clear').addEventListener('click', clearCanvas);

document.getElementById('btn-undo').addEventListener('click', () => {
  state.strokes.pop();
  redraw();
});

document.getElementById('stroke-size').addEventListener('input', (e) => {
  state.strokeWidth = parseInt(e.target.value);
});

document.getElementById('btn-open-grid').addEventListener('click', openGrid);
document.getElementById('btn-close-grid').addEventListener('click', closeGrid);
document.getElementById('modal-grid').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-grid')) closeGrid();
});

document.getElementById('btn-generate-float').addEventListener('click', async () => {
  await saveCurrentGlyph();
  showFinish();
});

document.getElementById('btn-download').addEventListener('click', generateFont);

document.getElementById('btn-keep-drawing').addEventListener('click', () => {
  showScreen('screen-draw');
  resizeCanvas();
  updateCharDisplay();
});

document.getElementById('btn-start-over').addEventListener('click', () => {
  if (!confirm('Start over? All current glyphs will be lost.')) return;
  state.savedGlyphs.clear();
  state.currentIndex = 0;
  clearCanvas();
  showScreen('screen-welcome');
});

// ── Progress bar HTML injection ───────────────────────────────────
const drawScreen = document.getElementById('screen-draw');
const header = drawScreen.querySelector('.draw-header');
const progressWrap = document.createElement('div');
progressWrap.className = 'progress-bar-wrap';
const progressFill = document.createElement('div');
progressFill.className = 'progress-bar-fill';
progressFill.style.width = '0%';
progressWrap.appendChild(progressFill);
header.after(progressWrap);

// ── Init ──────────────────────────────────────────────────────────
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ══════════════════════════════════════════════════════════════════
// PHOTO-TO-FONT PIPELINE
// ══════════════════════════════════════════════════════════════════

// ── Template constants (must match generator AND parser) ──────────
const TMPL = {
  W: 1275, H: 1650,         // 8.5" × 11" at 150 dpi
  GRID_X: 62, GRID_Y: 100,  // top-left of character grid
  CELL_W: 120, CELL_H: 135, // each character cell
  GAP: 8,                   // gap between cells
  COLS: 9,                  // characters per row
  MK: 28,                   // corner marker size (px)
};
// Corner marker centres in template space
const TMPL_CORNERS = [
  { x: 5 + TMPL.MK / 2,          y: 5 + TMPL.MK / 2 },
  { x: TMPL.W - 5 - TMPL.MK / 2, y: 5 + TMPL.MK / 2 },
  { x: TMPL.W - 5 - TMPL.MK / 2, y: TMPL.H - 5 - TMPL.MK / 2 },
  { x: 5 + TMPL.MK / 2,          y: TMPL.H - 5 - TMPL.MK / 2 },
];

// ── 1. Template Sheet Generator ───────────────────────────────────
function generateTemplateCanvas() {
  const { W, H, GRID_X, GRID_Y, CELL_W, CELL_H, GAP, COLS, MK } = TMPL;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Corner registration markers (solid black squares)
  ctx.fillStyle = '#000000';
  ctx.fillRect(5, 5, MK, MK);
  ctx.fillRect(W - 5 - MK, 5, MK, MK);
  ctx.fillRect(W - 5 - MK, H - 5 - MK, MK, MK);
  ctx.fillRect(5, H - 5 - MK, MK, MK);

  // Title
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Handwriting Font Template', W / 2, 52);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#666666';
  ctx.fillText('Write each character naturally inside its box — use a dark pen or marker', W / 2, 78);

  // Character cells
  const ROWS = Math.ceil(CHARS.length / COLS);
  for (let i = 0; i < CHARS.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = GRID_X + col * (CELL_W + GAP);
    const cy = GRID_Y + row * (CELL_H + GAP);

    // Cell border
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, CELL_W, CELL_H);

    // Label (small, top-left)
    const { char, label } = CHARS[i];
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    const displayLabel = char === ' ' ? 'Space' : label || char;
    ctx.fillText(displayLabel.slice(0, 14), cx + 4, cy + 13);

    // Baseline guide (light blue, lower third)
    ctx.strokeStyle = '#c0d8f0';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const baseY = cy + CELL_H - 28;
    ctx.moveTo(cx + 6, baseY);
    ctx.lineTo(cx + CELL_W - 6, baseY);
    ctx.stroke();
  }

  // Footer hint
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('After filling, photograph straight-on (landscape ok), then upload to the app.', W / 2, H - 20);

  return c;
}

function downloadTemplate() {
  const c = generateTemplateCanvas();
  c.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'handwriting_font_template.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// ── 2. Image Processing Utilities ────────────────────────────────

// Otsu's threshold: returns Uint8Array where 1 = ink (dark), 0 = paper
function otsuThreshold(imageData, w, h) {
  const hist = new Int32Array(256);
  const total = w * h;
  for (let i = 0; i < total; i++) {
    const gray = Math.round(
      0.299 * imageData.data[i * 4] +
      0.587 * imageData.data[i * 4 + 1] +
      0.114 * imageData.data[i * 4 + 2]
    );
    hist[gray]++;
  }
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, maxVar = 0, thresh = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) ** 2;
    if (v > maxVar) { maxVar = v; thresh = i; }
  }
  const bin = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const gray = Math.round(
      0.299 * imageData.data[i * 4] +
      0.587 * imageData.data[i * 4 + 1] +
      0.114 * imageData.data[i * 4 + 2]
    );
    bin[i] = gray < thresh ? 1 : 0;
  }
  return bin;
}

// Zhang-Suen thinning: iteratively erodes binary image to 1-px skeleton
function zhangSuenThin(bin, w, h) {
  const p = new Uint8Array(bin);
  function g(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return 0;
    return p[y * w + x];
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      const toDelete = [];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          if (!g(x, y)) continue;
          const p2=g(x,y-1), p3=g(x+1,y-1), p4=g(x+1,y), p5=g(x+1,y+1);
          const p6=g(x,y+1), p7=g(x-1,y+1), p8=g(x-1,y), p9=g(x-1,y-1);
          const B = p2+p3+p4+p5+p6+p7+p8+p9;
          if (B < 2 || B > 6) continue;
          const nb = [p2,p3,p4,p5,p6,p7,p8,p9,p2];
          let A = 0;
          for (let k = 0; k < 8; k++) if (!nb[k] && nb[k+1]) A++;
          if (A !== 1) continue;
          if (pass === 0) {
            if (p2 * p4 * p6 !== 0) continue;
            if (p4 * p6 * p8 !== 0) continue;
          } else {
            if (p2 * p4 * p8 !== 0) continue;
            if (p2 * p6 * p8 !== 0) continue;
          }
          toDelete.push(y * w + x);
        }
      }
      for (const idx of toDelete) { p[idx] = 0; changed = true; }
    }
  }
  return p;
}

// Estimate average ink stroke width from the difference between
// raw binary and skeleton (roughly: ink area / skeleton pixel count)
function estimateInkWidth(bin, skeleton, w, h) {
  let inkPx = 0, skelPx = 0;
  for (let i = 0; i < w * h; i++) {
    if (bin[i]) inkPx++;
    if (skeleton[i]) skelPx++;
  }
  if (!skelPx) return 8;
  // width ≈ ink area / skeleton length (for a uniform stroke: area = w * length)
  return Math.max(3, Math.min(30, inkPx / skelPx));
}

// Walk the skeleton and return ordered strokes (arrays of {x,y} points)
function traceSkeletonToStrokes(skeleton, w, h) {
  const vis = new Uint8Array(w * h);
  const strokes = [];

  function get(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return 0;
    return skeleton[y * w + x];
  }
  function seen(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return 1;
    return vis[y * w + x];
  }
  function countN(x, y) {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (dx || dy) n += get(x+dx, y+dy);
    return n;
  }

  function walkFrom(sx, sy) {
    const pts = [];
    let cx = sx, cy = sy;
    while (true) {
      if (seen(cx, cy)) break;
      vis[cy * w + cx] = 1;
      pts.push({ x: cx, y: cy });
      let nx = -1, ny = -1;
      // Prefer 4-connected first, then diagonal (smoother traces)
      const dirs = [[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]];
      for (const [dx, dy] of dirs) {
        if (get(cx+dx, cy+dy) && !seen(cx+dx, cy+dy)) { nx=cx+dx; ny=cy+dy; break; }
      }
      if (nx < 0) break;
      cx = nx; cy = ny;
    }
    return pts;
  }

  // Start from endpoints (degree-1 skeleton pixels) for nicer stroke ordering
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (skeleton[y * w + x] && !seen(x, y) && countN(x, y) <= 1) {
        const pts = walkFrom(x, y);
        if (pts.length >= 3) strokes.push(pts);
      }
    }
  }
  // Catch any remaining unvisited skeleton pixels (isolated loops, etc.)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (skeleton[y * w + x] && !seen(x, y)) {
        const pts = walkFrom(x, y);
        if (pts.length >= 3) strokes.push(pts);
      }
    }
  }
  return strokes;
}

// RDP polyline simplification
function rdp(pts, eps) {
  if (pts.length <= 2) return pts;
  const [p1, p2] = [pts[0], pts[pts.length - 1]];
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const len = Math.sqrt(dx*dx + dy*dy) || 1;
  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i].x - dx * pts[i].y + p2.x * p1.y - p2.y * p1.x) / len;
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > eps) {
    const l = rdp(pts.slice(0, maxIdx + 1), eps);
    const r = rdp(pts.slice(maxIdx), eps);
    return [...l.slice(0, -1), ...r];
  }
  return [p1, p2];
}

// ── 3. Homography (4-point perspective transform) ─────────────────
// Compute homography H (3×3, row-major) mapping srcPts → dstPts
// Uses DLT: builds 8×8 linear system and solves with Gaussian elimination.
function computeHomography(src, dst) {
  const A = [];
  for (let i = 0; i < 4; i++) {
    const [sx, sy] = [src[i].x, src[i].y];
    const [dx, dy] = [dst[i].x, dst[i].y];
    A.push([sx, sy, 1, 0, 0, 0, -dx*sx, -dx*sy, dx]);
    A.push([0, 0, 0, sx, sy, 1, -dy*sx, -dy*sy, dy]);
  }
  // Gaussian elimination with partial pivoting
  const n = 8;
  // Augment A (9 columns — the 9th is the RHS)
  for (let i = 0; i < 8; i++) { /* already has 9 entries */ }
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < 8; row++)
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    [A[col], A[maxRow]] = [A[maxRow], A[col]];
    const pivot = A[col][col];
    if (Math.abs(pivot) < 1e-12) continue;
    for (let k = col; k < 9; k++) A[col][k] /= pivot;
    for (let row = 0; row < 8; row++) {
      if (row === col) continue;
      const f = A[row][col];
      for (let k = col; k < 9; k++) A[row][k] -= f * A[col][k];
    }
  }
  const h = A.map(r => r[8]);
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1],
  ];
}

// Apply homography H to point (x,y)
function applyH(H, x, y) {
  const w = H[2][0]*x + H[2][1]*y + H[2][2];
  return {
    x: (H[0][0]*x + H[0][1]*y + H[0][2]) / w,
    y: (H[1][0]*x + H[1][1]*y + H[1][2]) / w,
  };
}

// Invert 3×3 matrix
function inv3(M) {
  const [[a,b,c],[d,e,f],[g,h,i]] = M;
  const det = a*(e*i-f*h) - b*(d*i-f*g) + c*(d*h-e*g);
  const s = 1/det;
  return [
    [(e*i-f*h)*s, (c*h-b*i)*s, (b*f-c*e)*s],
    [(f*g-d*i)*s, (a*i-c*g)*s, (c*d-a*f)*s],
    [(d*h-e*g)*s, (b*g-a*h)*s, (a*e-b*d)*s],
  ];
}

// ── 4. Corner Marker Detection ────────────────────────────────────
// Finds centroids of the darkest blobs in each corner region.
function detectCornerMarkers(imgData, w, h) {
  const SEARCH = 0.15; // search in the outer 15% of width/height
  const THRESH = 80;   // pixels darker than this are "marker"
  const regions = [
    { x0: 0,            y0: 0,            x1: w*SEARCH, y1: h*SEARCH },  // TL
    { x0: w*(1-SEARCH), y0: 0,            x1: w,        y1: h*SEARCH },  // TR
    { x0: w*(1-SEARCH), y0: h*(1-SEARCH), x1: w,        y1: h },         // BR
    { x0: 0,            y0: h*(1-SEARCH), x1: w*SEARCH, y1: h },         // BL
  ];
  const corners = [];
  for (const { x0, y0, x1, y1 } of regions) {
    let sx = 0, sy = 0, n = 0;
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
        const idx = (y * w + x) * 4;
        const gray = 0.299*imgData.data[idx] + 0.587*imgData.data[idx+1] + 0.114*imgData.data[idx+2];
        if (gray < THRESH) { sx += x; sy += y; n++; }
      }
    }
    if (n < 4) return null; // couldn't detect this marker
    corners.push({ x: sx/n, y: sy/n });
  }
  return corners; // [TL, TR, BR, BL]
}

// ── 5. Extract & Process a Single Cell ───────────────────────────
// Warps a character cell from the uploaded photo into a 400×400 workspace
// using the inverse homography, then runs the full processing pipeline.
function extractAndProcessCell(photoImgData, photoW, photoH, invH, cellX, cellY, cellW, cellH) {
  const SIZE = 400;
  const PAD  = 20;
  const tmp = document.createElement('canvas');
  tmp.width = SIZE; tmp.height = SIZE;
  const tctx = tmp.getContext('2d');
  tctx.fillStyle = '#ffffff';
  tctx.fillRect(0, 0, SIZE, SIZE);

  // Map each pixel in the SIZE×SIZE workspace back to photo coordinates
  // via the inverse homography (template coords → photo coords)
  const scaleX = cellW / SIZE, scaleY = cellH / SIZE;
  const srcData = tctx.getImageData(0, 0, SIZE, SIZE);

  for (let v = 0; v < SIZE; v++) {
    for (let u = 0; u < SIZE; u++) {
      const tx = cellX + u * scaleX;
      const ty = cellY + v * scaleY;
      const { x, y } = applyH(invH, tx, ty);
      const px = Math.round(x), py = Math.round(y);
      if (px >= 0 && px < photoW && py >= 0 && py < photoH) {
        const si = (py * photoW + px) * 4;
        const di = (v * SIZE + u) * 4;
        srcData.data[di]   = photoImgData.data[si];
        srcData.data[di+1] = photoImgData.data[si+1];
        srcData.data[di+2] = photoImgData.data[si+2];
        srcData.data[di+3] = 255;
      }
    }
  }
  tctx.putImageData(srcData, 0, 0);

  // Skip the label area (top ~20% of cell)
  const charStartY = Math.floor(SIZE * 0.18);
  const charData = tctx.getImageData(PAD, charStartY, SIZE - PAD*2, SIZE - charStartY - PAD);
  const cw = SIZE - PAD*2, ch = SIZE - charStartY - PAD;

  const bin = otsuThreshold(charData, cw, ch);
  const skel = zhangSuenThin(new Uint8Array(bin), cw, ch);
  const inkWidth = estimateInkWidth(bin, skel, cw, ch);
  const rawStrokes = traceSkeletonToStrokes(skel, cw, ch);

  // Simplify strokes and re-offset to full cell coordinate space
  const strokes = rawStrokes.map(pts => ({
    points: rdp(pts, 1.5).map(p => ({ x: p.x + PAD, y: p.y + charStartY })),
    width: inkWidth,
  }));

  return { strokes, canvasSize: SIZE };
}

// ── 6. Main Template Processing ───────────────────────────────────
async function processTemplateImage(file) {
  showProcessing('Loading image…', 0);

  const img = await loadImage(file);

  // Downsample large photos (iPad cameras can be 12MP+) to max 2500px
  // to avoid hanging the browser with huge ImageData arrays.
  const MAX_DIM = 2500;
  let photoW = img.naturalWidth, photoH = img.naturalHeight;
  let scale = 1;
  if (Math.max(photoW, photoH) > MAX_DIM) {
    scale = MAX_DIM / Math.max(photoW, photoH);
    photoW = Math.round(photoW * scale);
    photoH = Math.round(photoH * scale);
  }

  // Draw photo to an offscreen canvas (at downsampled size)
  const photoCanvas = document.createElement('canvas');
  photoCanvas.width = photoW; photoCanvas.height = photoH;
  const photoCtx = photoCanvas.getContext('2d');
  photoCtx.drawImage(img, 0, 0, photoW, photoH);
  const photoImgData = photoCtx.getImageData(0, 0, photoW, photoH);

  showProcessing('Detecting template corners…', 5);
  let detected = detectCornerMarkers(photoImgData, photoW, photoH);

  // Compute homography from template coords → photo coords
  let H;
  if (detected) {
    // detected order from regions: [TL, TR, BR, BL]
    // TMPL_CORNERS order: [TL, TR, BR, BL]
    H = computeHomography(TMPL_CORNERS, detected);
  } else {
    // Fallback: assume photo is an aligned, full-frame crop of the template
    H = computeHomography(
      [{ x:0,y:0 }, { x:TMPL.W,y:0 }, { x:TMPL.W,y:TMPL.H }, { x:0,y:TMPL.H }],
      [{ x:0,y:0 }, { x:photoW,y:0 }, { x:photoW,y:photoH }, { x:0,y:photoH }]
    );
  }
  const invH = inv3(H);

  showProcessing('Extracting characters…', 10);
  const batchGlyphs = [];
  const { GRID_X, GRID_Y, CELL_W, CELL_H, GAP, COLS } = TMPL;

  for (let i = 0; i < CHARS.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = GRID_X + col * (CELL_W + GAP);
    const cy = GRID_Y + row * (CELL_H + GAP);

    const pct = 10 + Math.round((i / CHARS.length) * 85);
    showProcessing(`Processing "${CHARS[i].char}" (${i+1}/${CHARS.length})…`, pct);

    // Yield to browser on every character to keep iPad responsive
    await sleep(0);

    const { strokes, canvasSize } = extractAndProcessCell(
      photoImgData, photoW, photoH, invH, cx, cy, CELL_W, CELL_H
    );
    if (strokes.length > 0) {
      batchGlyphs.push({ character: CHARS[i].char, strokes, canvasSize });
    }
  }

  showProcessing('Saving glyphs…', 96);
  const res = await fetch('/api/glyphs-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fontId: state.fontId, glyphs: batchGlyphs }),
  });
  const data = await res.json();

  hideProcessing();

  if (data.ok) {
    // Sync saved glyphs state
    batchGlyphs.forEach(g => state.savedGlyphs.add(g.character));
    updateCharDisplay();
    showFinish();
  } else {
    alert('Import failed: ' + (data.error || 'unknown error'));
  }
}

// ── 7. Per-Character Photo Import ────────────────────────────────
async function importCharFromPhoto(file) {
  showProcessing(`Processing photo for "${CHARS[state.currentIndex].char}"…`, 20);

  const img = await loadImage(file);
  const SIZE = 400;
  const tmp = document.createElement('canvas');
  tmp.width = SIZE; tmp.height = SIZE;
  const tctx = tmp.getContext('2d');
  tctx.fillStyle = '#ffffff';
  tctx.fillRect(0, 0, SIZE, SIZE);

  // Fit image with padding
  const PAD = 20;
  const scl = Math.min((SIZE - PAD*2) / img.naturalWidth, (SIZE - PAD*2) / img.naturalHeight);
  const dw = img.naturalWidth * scl, dh = img.naturalHeight * scl;
  tctx.drawImage(img, (SIZE - dw)/2, (SIZE - dh)/2, dw, dh);

  showProcessing('Tracing strokes…', 50);
  await sleep(0);

  const imgData = tctx.getImageData(0, 0, SIZE, SIZE);
  const bin = otsuThreshold(imgData, SIZE, SIZE);
  const skel = zhangSuenThin(new Uint8Array(bin), SIZE, SIZE);
  const inkWidth = estimateInkWidth(bin, skel, SIZE, SIZE);
  const rawStrokes = traceSkeletonToStrokes(skel, SIZE, SIZE);
  const strokes = rawStrokes.map(pts => ({ points: rdp(pts, 1.5), width: inkWidth }));

  hideProcessing();

  if (!strokes.length) {
    alert('No handwriting detected — try a clearer photo with dark ink on white paper.');
    return;
  }

  // Load the result onto the draw canvas so the user can see & confirm
  state.strokes = strokes.map(s => ({ ...s, color: '#111111' }));
  redraw();
  document.getElementById('canvas-hint').classList.add('hidden');
}

// ── Helpers ────────────────────────────────────────────────────────
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function showProcessing(msg, pct) {
  const overlay = document.getElementById('overlay-processing');
  overlay.classList.remove('hidden');
  document.getElementById('proc-status').textContent = msg;
  document.getElementById('proc-bar').style.width = pct + '%';
}

function hideProcessing() {
  document.getElementById('overlay-processing').classList.add('hidden');
}

// ── Event Wiring for Photo Import ────────────────────────────────
document.getElementById('btn-download-template').addEventListener('click', downloadTemplate);

document.getElementById('btn-upload-template').addEventListener('click', () => {
  document.getElementById('template-file-input').click();
});

document.getElementById('template-file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  // Ensure we have a font session
  if (!state.fontId) {
    const nameInput = document.getElementById('font-name-input').value.trim();
    state.fontName = nameInput || 'MyHandwriting';
    state.fontId = `font_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await fetch('/api/font-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fontId: state.fontId, fontName: state.fontName }),
    }).catch(() => {});
  }

  await processTemplateImage(file);
});

document.getElementById('btn-upload-char').addEventListener('click', () => {
  document.getElementById('char-file-input').click();
});

document.getElementById('char-file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  await importCharFromPhoto(file);
});

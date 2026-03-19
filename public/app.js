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

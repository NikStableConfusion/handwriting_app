const express = require('express');
const path = require('path');
const fs = require('fs');
const opentype = require('opentype.js');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory glyph store (per session via font name key)
const fontSessions = {};

// ── Stroke → Outline path conversion ──────────────────────────────────────
// Expand a polyline of {x,y} points into a filled outline contour.
// Returns an array of {x,y} points representing the closed outline polygon.
function expandStroke(points, width) {
  if (points.length < 2) {
    // Single point → circle approximation via square
    const r = width / 2;
    const p = points[0];
    return [
      { x: p.x - r, y: p.y - r },
      { x: p.x + r, y: p.y - r },
      { x: p.x + r, y: p.y + r },
      { x: p.x - r, y: p.y + r },
    ];
  }

  const left = [];
  const right = [];

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const prev = i > 0 ? points[i - 1] : curr;
    const next = i < points.length - 1 ? points[i + 1] : curr;

    // Direction vector
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    // Normal (perpendicular)
    const nx = -dy / len;
    const ny = dx / len;

    const halfW = width / 2;
    left.push({ x: curr.x + nx * halfW, y: curr.y + ny * halfW });
    right.push({ x: curr.x - nx * halfW, y: curr.y - ny * halfW });
  }

  // Add round end caps (approximate with extra points)
  const startPt = points[0];
  const endPt = points[points.length - 1];

  // Start cap
  const startDx = points[0].x - points[1].x;
  const startDy = points[0].y - points[1].y;
  const startLen = Math.sqrt(startDx * startDx + startDy * startDy) || 1;
  const startNx = startDx / startLen;
  const startNy = startDy / startLen;
  const capStart = [
    { x: startPt.x + startNx * (width / 2), y: startPt.y + startNy * (width / 2) },
  ];

  // End cap
  const lastIdx = points.length - 1;
  const endDx = points[lastIdx].x - points[lastIdx - 1].x;
  const endDy = points[lastIdx].y - points[lastIdx - 1].y;
  const endLen = Math.sqrt(endDx * endDx + endDy * endDy) || 1;
  const endNx = endDx / endLen;
  const endNy = endDy / endLen;
  const capEnd = [
    { x: endPt.x + endNx * (width / 2), y: endPt.y + endNy * (width / 2) },
  ];

  return [...capStart, ...left, ...capEnd, ...[...right].reverse()];
}

// Convert an outline polygon (array of {x,y}) to an opentype.js Path
function polygonToPath(poly) {
  const p = new opentype.Path();
  if (poly.length === 0) return p;
  p.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) {
    p.lineTo(poly[i].x, poly[i].y);
  }
  p.close();
  return p;
}

// Smooth points using a simple moving average
function smoothPoints(points, windowSize = 3) {
  if (points.length <= windowSize) return points;
  const smoothed = [];
  for (let i = 0; i < points.length; i++) {
    let sx = 0, sy = 0, count = 0;
    for (let j = Math.max(0, i - windowSize); j <= Math.min(points.length - 1, i + windowSize); j++) {
      sx += points[j].x;
      sy += points[j].y;
      count++;
    }
    smoothed.push({ x: sx / count, y: sy / count });
  }
  return smoothed;
}

// Downsample points to avoid too many vertices
function downsample(points, minDist = 3) {
  if (points.length <= 2) return points;
  const result = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const dx = points[i].x - prev.x;
    const dy = points[i].y - prev.y;
    if (Math.sqrt(dx * dx + dy * dy) >= minDist) {
      result.push(points[i]);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

// Build an opentype.js Path from an array of strokes
// Each stroke: { points: [{x,y},...], width: number }
// The coordinate system here has y increasing upward (font space).
// Canvas has y increasing downward, so we flip y.
function buildGlyphPath(strokes, canvasSize, ascender) {
  // The cell extraction skips a label area at the top (18%) and a bottom pad (20px).
  // We map the bottom of the writing area → font y=0 (baseline),
  // and the top of the writing area → font y=ascender.
  const PAD        = 20;
  const charStartY = Math.floor(canvasSize * 0.18);  // top of writing area
  const charEndY   = canvasSize - PAD;               // bottom of writing area = baseline
  const writingH   = charEndY - charStartY;
  const scale      = ascender / writingH;

  const combinedPath = new opentype.Path();

  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length === 0) continue;

    const transformed = stroke.points.map((p) => ({
      x: (p.x - PAD) * scale,         // remove left padding offset, then scale
      y: (charEndY - p.y) * scale,    // flip Y: bottom of cell → 0, top → ascender
    }));

    const smoothed = smoothPoints(downsample(transformed, 2), 2);
    const strokeWidth = (stroke.width || 8) * scale;
    const outline = expandStroke(smoothed, strokeWidth);

    if (outline.length < 3) continue;

    const subPath = polygonToPath(outline);
    for (const cmd of subPath.commands) {
      combinedPath.commands.push(cmd);
    }
  }

  return combinedPath;
}

// ── Character definitions ──────────────────────────────────────────────────
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'.split('');
const DIGITS = '0123456789'.split('');
const PUNCTUATION = [' ', '.', ',', '!', '?', '\'', '"', '-', '(', ')', ':', ';', '/', '&', '@'];
const ALL_CHARS = [...UPPERCASE, ...LOWERCASE, ...DIGITS, ...PUNCTUATION];

// ── API Routes ─────────────────────────────────────────────────────────────

// Save strokes for a single glyph
app.post('/api/glyph', (req, res) => {
  const { fontId, character, strokes, canvasSize } = req.body;
  if (!fontId || character === undefined || !strokes) {
    return res.status(400).json({ error: 'fontId, character, and strokes are required' });
  }

  if (!fontSessions[fontId]) {
    fontSessions[fontId] = { glyphs: {}, name: fontId };
  }

  fontSessions[fontId].glyphs[character] = { strokes, canvasSize: canvasSize || 400 };
  res.json({ ok: true, saved: Object.keys(fontSessions[fontId].glyphs).length });
});

// Get progress for a font session
app.get('/api/progress/:fontId', (req, res) => {
  const session = fontSessions[req.params.fontId];
  if (!session) return res.json({ completed: [], total: ALL_CHARS.length });

  const completed = Object.keys(session.glyphs);
  res.json({ completed, total: ALL_CHARS.length, fontName: session.name });
});

// Update font metadata (name etc)
app.post('/api/font-meta', (req, res) => {
  const { fontId, fontName } = req.body;
  if (!fontSessions[fontId]) fontSessions[fontId] = { glyphs: {} };
  fontSessions[fontId].name = fontName || fontId;
  res.json({ ok: true });
});

// Generate and download the font as TTF
app.post('/api/generate', (req, res) => {
  const { fontId, fontName } = req.body;
  const session = fontSessions[fontId];

  if (!session || Object.keys(session.glyphs).length === 0) {
    return res.status(400).json({ error: 'No glyphs saved for this font ID' });
  }

  try {
    const font = buildFont(session, fontName);
    const buffer = Buffer.from(font.toArrayBuffer());
    const safeName = (fontName || session.name || 'MyHandwriting').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'font/ttf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.ttf"`);
    res.send(buffer);
  } catch (err) {
    console.error('Font generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Clear a session
app.delete('/api/session/:fontId', (req, res) => {
  delete fontSessions[req.params.fontId];
  res.json({ ok: true });
});

// Batch save glyphs (used by template photo import)
app.post('/api/glyphs-batch', (req, res) => {
  const { fontId, glyphs } = req.body;
  if (!fontId || !Array.isArray(glyphs)) {
    return res.status(400).json({ error: 'fontId and glyphs array required' });
  }
  if (!fontSessions[fontId]) {
    fontSessions[fontId] = { glyphs: {}, name: fontId };
  }
  let saved = 0;
  for (const { character, strokes, canvasSize } of glyphs) {
    if (!character || !strokes) continue;
    fontSessions[fontId].glyphs[character] = { strokes, canvasSize: canvasSize || 400 };
    saved++;
  }
  res.json({ ok: true, saved, total: Object.keys(fontSessions[fontId].glyphs).length });
});

// Generate and stream font as WOFF (for web use / Canva API)
app.post('/api/generate/woff', (req, res) => {
  const { fontId, fontName } = req.body;
  const session = fontSessions[fontId];
  if (!session || Object.keys(session.glyphs).length === 0) {
    return res.status(400).json({ error: 'No glyphs saved for this font ID' });
  }
  try {
    const font = buildFont(session, fontName);
    const buffer = Buffer.from(font.toArrayBuffer());
    const safeName = (fontName || session.name || 'MyHandwriting').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'font/woff');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.woff"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Shared font builder (used by both TTF and WOFF routes) ────────
function buildFont(session, overrideName) {
  const unitsPerEm = 1000;
  const ascender = 800;
  const descender = -200;
  const baseline = 600;
  const capHeight = 550;

  const notdefPath = new opentype.Path();
  notdefPath.moveTo(50, 0);
  notdefPath.lineTo(50, ascender);
  notdefPath.lineTo(350, ascender);
  notdefPath.lineTo(350, 0);
  notdefPath.close();

  const glyphs = [
    new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 400, path: notdefPath }),
  ];

  const name = overrideName || session.name || 'MyHandwriting';

  for (const [char, data] of Object.entries(session.glyphs)) {
    const { strokes, canvasSize } = data;
    const glyphPath = buildGlyphPath(strokes, canvasSize || 400, ascender);

    let maxX = 0;
    for (const cmd of glyphPath.commands) {
      if (cmd.x !== undefined) maxX = Math.max(maxX, cmd.x);
      if (cmd.x1 !== undefined) maxX = Math.max(maxX, cmd.x1);
      if (cmd.x2 !== undefined) maxX = Math.max(maxX, cmd.x2);
    }
    const advanceWidth = Math.max(100, maxX + 60);
    const unicode = char.codePointAt(0);

    glyphs.push(new opentype.Glyph({
      name: `uni${unicode.toString(16).toUpperCase().padStart(4, '0')}`,
      unicode,
      advanceWidth,
      path: glyphPath,
    }));
  }

  return new opentype.Font({
    familyName: name,
    styleName: 'Regular',
    unitsPerEm,
    ascender,
    descender,
    glyphs,
  });
}

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Handwriting Font Maker running at http://localhost:${PORT}`);
});

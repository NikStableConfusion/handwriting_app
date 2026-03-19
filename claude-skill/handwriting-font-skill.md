# Claude Skill: Handwriting Font for Notion & Canva

## Skill Name
`handwriting-render`

## Description
Renders text using a user's personal handwriting font, generating a downloadable
HTML/image snippet that can be embedded in Notion or uploaded to Canva.

## Trigger Phrases
- "write this in my handwriting"
- "convert to my handwriting font"
- "make this look handwritten"
- "render in my font [FontName]"

---

## Instructions for Claude

When the user asks to render text in their handwriting font:

1. **Ask for the font file** if not already provided:
   > "Please share your handwriting font (.ttf file) or tell me the font name if it's already installed."

2. **Ask for the text** to render.

3. **Generate an HTML snippet** using the font (see template below).

4. **Provide Canva and Notion instructions**.

---

## HTML Snippet Template

Generate this HTML for the user:

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @font-face {
    font-family: 'MyHandwriting';
    src: url('YOUR_FONT_FILE.ttf') format('truetype');
  }
  body {
    background: white;
    padding: 40px;
    font-family: 'MyHandwriting', cursive;
    font-size: 32px;
    line-height: 1.8;
    color: #1a1a1a;
    max-width: 800px;
  }
</style>
</head>
<body>
PLACEHOLDER_TEXT
</body>
</html>
```

Replace `YOUR_FONT_FILE.ttf` with the path to the downloaded font and
`PLACEHOLDER_TEXT` with the user's text.

---

## Notion Integration Steps

Tell the user:

1. **Save the font** (.ttf file) from the Handwriting Font Maker app.
2. **Open the HTML snippet** in a browser (Chrome/Safari).
3. **Screenshot** the rendered text (⌘+Shift+4 on Mac, or Snipping Tool on Windows).
4. **In Notion**: Type `/image` → Upload the screenshot.
5. *(Optional)* Install the font system-wide so Code blocks render in your font.

For **Notion Web Clipper** users: The font must be installed on your device for
web-rendered content to show correctly.

---

## Canva Integration Steps

Tell the user:

### Option A — Canva Pro (Brand Kit)
1. Open Canva → **Brand Hub** → **Fonts** → **Upload a font**.
2. Upload the `.ttf` file from the Handwriting Font Maker.
3. The font appears in **Brand fonts** across all designs.
4. Select text in any design → open Font picker → find your font under "Brand".

### Option B — Free Canva (Elements Upload)
1. Create a design.
2. Add a **Text** element.
3. In the font picker, click **Upload a font** (if available on your plan).
4. Upload `.ttf`.

### Option C — Image Render (any plan)
1. Use the HTML snippet above in a browser.
2. Screenshot the text.
3. Upload as an **image** to Canva.
4. Remove background if needed (Canva Pro: Background Remover).

---

## Example Claude Response

When a user says: *"Write 'Happy Birthday Sarah!' in my handwriting font MyScript"*

Claude should respond:

---
Here's your text rendered in **MyScript**:

```html
<!DOCTYPE html>
<html>
<head>
<style>
  @font-face {
    font-family: 'MyScript';
    src: url('MyScript.ttf') format('truetype');
  }
  body {
    background: white;
    padding: 60px;
    font-family: 'MyScript', cursive;
    font-size: 48px;
    line-height: 1.6;
    color: #1a1a1a;
  }
</style>
</head>
<body>
Happy Birthday Sarah!
</body>
</html>
```

**To use in Canva:**
1. Save `MyScript.ttf` to your device.
2. Place `MyScript.ttf` next to `render.html`, then open `render.html` in Chrome.
3. Screenshot the text → upload to Canva as an image.
4. *(Canva Pro)* Upload the font directly in Brand Hub → Fonts.

**To use in Notion:**
1. Screenshot the rendered text from the browser.
2. In Notion, press `/image` and upload the screenshot.

---

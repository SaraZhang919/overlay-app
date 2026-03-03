# overlay. — Batch Image Text Overlay Tool

Add aesthetic Instagram & Xiaohongshu-style text overlays to images in batch.

## Features
- Upload multiple images + import captions from CSV
- Confirm & drag-to-reorder image↔caption matches
- 8 curated overlay templates
- Export as ZIP (1080×1080, 1080×1350, or 1080×1920)

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Deploy to Vercel

### Option A — Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option B — Vercel Dashboard
1. Push this folder to a GitHub repository
2. Go to https://vercel.com → New Project
3. Import your GitHub repo
4. Leave all settings as default — Vercel auto-detects Vite
5. Click Deploy

Your app will be live at `https://your-project.vercel.app`

## Deploy to Netlify

### Option A — Drag & Drop
```bash
npm run build
```
Then drag the `dist/` folder to https://app.netlify.com/drop

### Option B — Netlify CLI
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

## CSV Format

Plain one-caption-per-row:
```
Golden hour never disappoints
The city that never sleeps
Living slowly, on purpose
```

Or with an optional header row:
```
caption
Golden hour never disappoints
The city that never sleeps
```

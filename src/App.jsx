import { useState, useRef, useCallback, useEffect } from "react";

// ─── CJK Font Support ────────────────────────────────────────────────────────
// Noto Sans SC is loaded via <link> in index.html at page start.
// We just wait for document.fonts.ready before any canvas render to ensure
// all fonts (including CJK) are fully available to the Canvas API.

async function ensureFontsReady() {
  await document.fonts.ready;
}

function hasCJK(text) {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef\u3000-\u303f]/.test(text);
}

// Pick the right font string depending on whether text contains CJK characters
function font(weight, sizePx, text) {
  if (hasCJK(text)) return `${weight} ${sizePx}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
  return `${weight} ${sizePx}px "DM Serif Display", Georgia, serif`;
}
function fontMono(weight, sizePx, text) {
  if (hasCJK(text)) return `${weight} ${sizePx}px "Noto Sans SC", "PingFang SC", sans-serif`;
  return `${weight} ${sizePx}px "Space Mono", monospace`;
}

// ─── Canvas Helpers ───────────────────────────────────────────────────────────

function getWrappedLines(ctx, text, maxWidth) {
  if (!text) return [""];
  // CJK: break at every character; Latin: break at spaces
  const isCJK = hasCJK(text);
  const tokens = isCJK ? [...text] : text.split(" ");
  const lines = [];
  let cur = "";
  for (const token of tokens) {
    const candidate = isCJK ? cur + token : (cur ? cur + " " + token : token);
    if (ctx.measureText(candidate).width > maxWidth && cur) {
      lines.push(cur);
      cur = token;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const lines = getWrappedLines(ctx, text, maxW);
  const totalH = lines.length * lh;
  lines.forEach((l, i) => ctx.fillText(l, x, y - totalH / 2 + i * lh + lh / 2));
}

function wrapTextLeft(ctx, text, x, y, maxW, lh) {
  getWrappedLines(ctx, text, maxW).forEach((l, i) => ctx.fillText(l, x, y + i * lh));
}

function strokeWrapText(ctx, text, x, y, maxW, lh) {
  const lines = getWrappedLines(ctx, text, maxW);
  const totalH = lines.length * lh;
  lines.forEach((l, i) => ctx.strokeText(l, x, y - totalH / 2 + i * lh + lh / 2));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath(); ctx.fill();
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: "minimal-bottom", name: "Minimal Bottom",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const oH = h * 0.3;
      const g = ctx.createLinearGradient(0, h - oH, 0, h);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = g; ctx.fillRect(0, h - oH, w, oH);
      ctx.fillStyle = "#fff";
      ctx.font = font(600, Math.round(w * 0.052), text);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      wrapText(ctx, text, w / 2, h - oH / 2.1, w * 0.82, w * 0.068);
    },
  },
  {
    id: "center-bold", name: "Center Bold",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.48)"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.font = font(700, Math.round(w * 0.066), text);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      wrapText(ctx, text, w / 2, h / 2, w * 0.78, w * 0.086);
    },
  },
  {
    id: "top-tag", name: "Top Tag",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const pad = w * 0.055, fs = Math.round(w * 0.04);
      ctx.font = fontMono(600, fs, text);
      const lines = getWrappedLines(ctx, text, w * 0.78);
      const boxH = lines.length * fs * 1.6 + pad;
      ctx.fillStyle = "rgba(255,255,255,0.93)";
      roundRect(ctx, pad * 0.7, pad * 0.7, w - pad * 1.4, boxH, 8);
      ctx.fillStyle = "#111"; ctx.textAlign = "left"; ctx.textBaseline = "top";
      lines.forEach((l, i) => ctx.fillText(l, pad * 1.1, pad + i * fs * 1.6));
    },
  },
  {
    id: "editorial-side", name: "Editorial Side",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const bW = w * 0.44;
      const g = ctx.createLinearGradient(0, 0, bW, 0);
      g.addColorStop(0, "rgba(0,0,0,0.9)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, bW, h);
      ctx.fillStyle = "#fff";
      ctx.font = font(400, Math.round(w * 0.046), text);
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      wrapText(ctx, text, w * 0.05, h / 2, bW * 0.84, w * 0.062);
    },
  },
  {
    id: "neon-outline", name: "Neon Outline",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      ctx.fillStyle = "rgba(10,0,30,0.55)"; ctx.fillRect(0, 0, w, h);
      const fs = Math.round(w * 0.062);
      ctx.font = font(800, fs, text);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2.5;
      ctx.shadowColor = "#a855f7"; ctx.shadowBlur = 18;
      strokeWrapText(ctx, text, w / 2, h / 2, w * 0.82, fs * 1.3);
      ctx.shadowBlur = 0; ctx.fillStyle = "#fff";
      wrapText(ctx, text, w / 2, h / 2, w * 0.82, fs * 1.3);
    },
  },
  {
    id: "xhs-soft", name: "小红书 Soft",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const oH = h * 0.33;
      ctx.fillStyle = "rgba(255,238,243,0.91)"; ctx.fillRect(0, h - oH, w, oH);
      ctx.fillStyle = "#e11d48"; ctx.fillRect(w * 0.1, h - oH + 16, w * 0.07, 3);
      ctx.fillStyle = "#1a1a1a";
      ctx.font = font(600, Math.round(w * 0.046), text);
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      wrapTextLeft(ctx, text, w * 0.1, h - oH + 30, w * 0.8, w * 0.062);
    },
  },
  {
    id: "stamp", name: "Stamp",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const bw = w * 0.72, bh = h * 0.24, bx = (w - bw) / 2, by = (h - bh) / 2;
      ctx.fillStyle = "rgba(255,255,255,0.96)"; ctx.strokeStyle = "#111"; ctx.lineWidth = 3;
      ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx + 6, by + 6, bw - 12, bh - 12);
      ctx.fillStyle = "#111";
      ctx.font = fontMono(700, Math.round(w * 0.04), text);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      wrapText(ctx, hasCJK(text) ? text : text.toUpperCase(), w / 2, h / 2, bw * 0.82, w * 0.054);
    },
  },
  {
    id: "xhs-top", name: "小红书 Top",
    render: (ctx, img, text, w, h, sizeScale = 1) => {
      ctx.drawImage(img, 0, 0, w, h);
      const fs = Math.round(w * 0.038 * sizeScale);
      ctx.font = font(400, fs, text);
      const lh = fs * 1.75;
      const maxTextW = w * 0.78;
      // Respect manual \n breaks, then auto-wrap each segment
      const segments = text.split("\n");
      const lines = segments.flatMap(seg => seg ? getWrappedLines(ctx, seg, maxTextW) : [""]);
      const startY = h * 0.07;
      const padX = fs * 0.55;  // horizontal padding on each side of the text
      const padY = fs * 0.18;  // vertical padding above/below each line
      const r = fs * 0.22;     // corner radius
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      lines.forEach((l, i) => {
        const lineW = ctx.measureText(l).width;
        const stripX = w / 2 - lineW / 2 - padX;
        const stripY = startY + i * lh - padY;
        const stripW = lineW + padX * 2;
        const stripH = fs + padY * 2;
        // Per-line white/cream highlight strip with rounded corners
        ctx.fillStyle = "rgba(255,253,248,0.82)";
        roundRect(ctx, stripX, stripY, stripW, stripH, r);
        // Dark text on top
        ctx.fillStyle = "#1a1a1a";
        ctx.fillText(l, w / 2, startY + i * lh);
      });
    },
  },
  {
    id: "cinematic", name: "Cinematic",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const bH = h * 0.13;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, bH); ctx.fillRect(0, h - bH, w, bH);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = font(300, Math.round(w * 0.04), text);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      wrapText(ctx, text, w / 2, h - bH / 2, w * 0.85, w * 0.054);
    },
  },
];

const ASPECT_RATIOS = [
  { label: "1:1 Square", value: "1:1", w: 1080, h: 1080 },
  { label: "4:5 Portrait", value: "4:5", w: 1080, h: 1350 },
  { label: "9:16 Story", value: "9:16", w: 1080, h: 1920 },
];

const tplBg = (id) => ({
  "minimal-bottom": "linear-gradient(to top,#000,#555)",
  "center-bold": "linear-gradient(135deg,#1a1a2e,#16213e)",
  "top-tag": "linear-gradient(135deg,#667eea,#764ba2)",
  "editorial-side": "linear-gradient(to right,#000,#6b7280)",
  "neon-outline": "linear-gradient(135deg,#1a001a,#4a0080)",
  "xhs-soft": "linear-gradient(135deg,#fce4ec,#f8bbd0)",
  "stamp": "linear-gradient(135deg,#fef3c7,#fde68a)",
  "xhs-top": "linear-gradient(180deg,#f5ede8 0%,#e8d5c4 40%,#d4b896 100%)",
  "cinematic": "linear-gradient(135deg,#0f0f0f,#374151)",
}[id] || "#222");

// ─── Template Preview Component ──────────────────────────────────────────────
// All cards share the same warm background and same sample text so users
// can compare styles fairly. 3:4 ratio to show position differences clearly.

const SAMPLE_TEXT = "慢一点也没关系，重要的是你没有停下";

function drawSharedBackground(ctx, W, H) {
  // Warm beige lifestyle photo feel
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0,   "#ede0d4");
  g.addColorStop(0.4, "#dfd0c0");
  g.addColorStop(1,   "#c9b49e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Soft blurred blob — suggests a product / object in background
  const drawBlob = (x, y, rx, ry, color, alpha) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawBlob(W * 0.72, H * 0.55, W * 0.28, H * 0.22, "#b8a090", 0.35);
  drawBlob(W * 0.25, H * 0.68, W * 0.20, H * 0.16, "#c8b8a8", 0.28);
  drawBlob(W * 0.55, H * 0.30, W * 0.18, H * 0.14, "#e8d8c8", 0.22);
}

function TemplatePreview({ template }) {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 180, H = 240; // 3:4 ratio
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    drawSharedBackground(ctx, W, H);

    document.fonts.ready.then(() => {
      template.render(ctx, canvas, SAMPLE_TEXT, W, H);
    });
  }, [template]);

  return <canvas ref={canvasRef} style={{width:"100%",height:"100%",display:"block"}} />;
}

// ─── PreviewCard — inline edit caption + font size on result page ────────────

function PreviewCard({ r, index, template, aspect, onUpdate, onDownload, onSaveTemplate }) {
  const [editing, setEditing] = useState(false);
  const [draftCaption, setDraftCaption] = useState(r.caption);
  const [draftSize, setDraftSize] = useState(r.sizeScale ?? 1);
  const [rerendering, setRerendering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saved, setSaved] = useState(false);
  const liveRef = useRef(r.dataUrl);

  const rerender = async (caption, sizeScale) => {
    setRerendering(true);
    await ensureFontsReady();
    const { w, h } = aspect;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    const img = await loadImage(r.imgUrl);
    const scale = Math.max(w / img.width, h / img.height);
    const sw = img.width * scale, sh = img.height * scale;
    const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;
    tmp.getContext("2d").drawImage(img, -(sw - w) / 2, -(sh - h) / 2, sw, sh);
    const cropped = await loadImage(tmp.toDataURL());
    template.render(ctx, cropped, caption, w, h, sizeScale);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.93);
    liveRef.current = dataUrl;
    onUpdate({ ...r, dataUrl, caption, sizeScale });
    setRerendering(false);
  };

  const handleSave = () => {
    rerender(draftCaption, draftSize);
    setEditing(false);
  };

  const handleSizeChange = (val) => {
    setDraftSize(val);
    rerender(draftCaption, val);
  };

  return (
    <div className="preview-card">
      <div style={{position:"relative"}}>
        <img src={r.dataUrl} alt={r.name} style={{width:"100%",display:"block"}}/>
        {rerendering && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div className="spinner"/>
          </div>
        )}
      </div>

      {editing ? (
        <div style={{padding:"10px 12px",background:"var(--card)",borderTop:"1px solid var(--border)"}}>
          <div className="label" style={{marginBottom:6}}>Edit caption — press Enter for line break</div>
          <textarea
            value={draftCaption}
            onChange={e => setDraftCaption(e.target.value)}
            rows={4}
            style={{width:"100%",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"8px 10px",fontSize:12,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",resize:"vertical",outline:"none",lineHeight:1.6}}
          />
          <div className="label" style={{marginTop:10,marginBottom:6}}>
            Font size — {Math.round(draftSize * 100)}%
          </div>
          <input
            type="range" min="0.5" max="2" step="0.05"
            value={draftSize}
            onChange={e => handleSizeChange(parseFloat(e.target.value))}
            style={{width:"100%",accentColor:"var(--accent)",marginBottom:10}}
          />
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={handleSave}>✓ Apply</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setDraftCaption(r.caption); setDraftSize(r.sizeScale??1); setEditing(false); }}>Cancel</button>
          </div>
        </div>
      ) : saving ? (
        <div style={{padding:"10px 12px",background:"var(--card)",borderTop:"1px solid var(--border)"}}>
          <div className="label" style={{marginBottom:6}}>Name this template</div>
          <input
            autoFocus
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && saveName.trim()) {
                onSaveTemplate(saveName.trim(), template.id, r.sizeScale ?? 1);
                setSaving(false); setSaveName(""); setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              }
            }}
            placeholder="e.g. 小红书 冬日风格"
            style={{width:"100%",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"8px 10px",fontSize:13,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",outline:"none",marginBottom:8}}
          />
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-primary btn-sm" style={{flex:1}} disabled={!saveName.trim()} onClick={() => {
              onSaveTemplate(saveName.trim(), template.id, r.sizeScale ?? 1);
              setSaving(false); setSaveName(""); setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSaving(false); setSaveName(""); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="preview-card-footer">
          <div style={{minWidth:0}}>
            <div className="preview-name">{r.name}</div>
            <div className="caption-preview">{r.caption}</div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            {saved && <span style={{fontSize:10,color:"var(--ok)",alignSelf:"center"}}>✓ Saved</span>}
            <button className="btn btn-ghost btn-sm" title="Save as template" onClick={() => setSaving(true)} style={{padding:"4px 10px",fontSize:11}}>☆</button>
            <button className="btn btn-ghost btn-sm" title="Edit caption & size" onClick={() => setEditing(true)} style={{padding:"4px 10px",fontSize:11}}>✎</button>
            <button className="btn btn-ghost btn-sm" title="Download" onClick={onDownload} style={{padding:"4px 10px",fontSize:11}}>↓</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep] = useState("upload");
  const [images, setImages] = useState([]);
  const [captions, setCaptions] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [aspect, setAspect] = useState(ASPECT_RATIOS[0]);
  const [rendered, setRendered] = useState([]);
  const [rendering, setRendering] = useState(false);
  const [csvError, setCsvError] = useState("");
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [savedTemplates, setSavedTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem("overlay_saved_templates") || "[]"); } catch { return []; }
  });

  const saveTemplate = (name, templateId, sizeScale) => {
    const newT = { id: `saved_${Date.now()}`, name, baseTemplateId: templateId, sizeScale, savedAt: Date.now() };
    const updated = [...savedTemplates, newT];
    setSavedTemplates(updated);
    localStorage.setItem("overlay_saved_templates", JSON.stringify(updated));
  };

  const deleteSavedTemplate = (id) => {
    const updated = savedTemplates.filter(t => t.id !== id);
    setSavedTemplates(updated);
    localStorage.setItem("overlay_saved_templates", JSON.stringify(updated));
  };
  const imgInputRef = useRef();
  const csvInputRef = useRef();

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    setImages(files.map(f => ({ file: f, url: URL.createObjectURL(f), name: f.name })));
  };

  const handleCSV = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    // Read raw bytes to handle both UTF-8 and GBK/GB18030 (common from Chinese Excel exports)
    reader.onload = (ev) => {
      const bytes = new Uint8Array(ev.target.result);
      // Try UTF-8 first; if replacement chars detected, retry with GB18030
      let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      if (text.includes("\uFFFD")) {
        try { text = new TextDecoder("gb18030").decode(bytes); } catch (_) {}
      }
      text = text.replace(/^\uFEFF/, ""); // strip BOM
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (!lines.length) { setCsvError("CSV is empty."); return; }
      const first = lines[0].toLowerCase();
      const hasHeader = ["caption","text","quote","标题","文字","内容","文案"].some(k => first.includes(k));
      const parsed = (hasHeader ? lines.slice(1) : lines).map(l => l.replace(/^["'\uFEFF]|["']$/g, "").trim());
      setCaptions(parsed); setCsvError("");
    };
    reader.readAsArrayBuffer(file);
  };

  const goToConfirm = () => {
    setPairs(images.map((img, i) => ({
      img,
      caption: captions[i] ?? captions[captions.length - 1] ?? "",
      id: `${img.name}-${i}`,
    })));
    setStep("confirm");
  };

  // Only captions reorder — images stay fixed in their positions
  const onDragStart = (i) => setDragIdx(i);
  const onDragEnter = (i) => setDragOver(i);
  const onDragEnd = () => {
    if (dragIdx !== null && dragOver !== null && dragIdx !== dragOver) {
      const caps = pairs.map(p => p.caption);
      const [moved] = caps.splice(dragIdx, 1);
      caps.splice(dragOver, 0, moved);
      setPairs(pairs.map((p, i) => ({ ...p, caption: caps[i] })));
    }
    setDragIdx(null); setDragOver(null);
  };

  const editCaption = (i, val) => {
    setPairs(prev => prev.map((p, idx) => idx === i ? { ...p, caption: val } : p));
  };

  const renderAll = useCallback(async () => {
    setRendering(true);
    // Wait for all fonts (including Noto Sans SC for CJK) to be ready
    await ensureFontsReady();

    const { w, h } = aspect;
    const results = [];
    for (const pair of pairs) {
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      const img = await loadImage(pair.img.url);
      const scale = Math.max(w / img.width, h / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;
      tmp.getContext("2d").drawImage(img, -(sw - w) / 2, -(sh - h) / 2, sw, sh);
      const cropped = await loadImage(tmp.toDataURL());
      template.render(ctx, cropped, pair.caption, w, h, pair.sizeScale ?? 1);
      results.push({
        dataUrl: canvas.toDataURL("image/jpeg", 0.93),
        name: pair.img.name,
        caption: pair.caption,
        imgUrl: pair.img.url,
        sizeScale: pair.sizeScale ?? 1,
        pairIdx: pairs.indexOf(pair),
      });
    }
    setRendered(results); setRendering(false); setStep("preview");
  }, [pairs, template, aspect]);

  const downloadAll = async () => {
    const JSZipMod = await import("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
    const JSZip = JSZipMod.default || JSZipMod;
    const zip = new JSZip();
    rendered.forEach((r, i) => zip.file(`overlay_${String(i + 1).padStart(3, "0")}_${r.name}`, r.dataUrl.split(",")[1], { base64: true }));
    const blob = await zip.generateAsync({ type: "blob" });
    Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "overlays.zip" }).click();
  };

  const downloadOne = (r) => {
    Object.assign(document.createElement("a"), { href: r.dataUrl, download: `overlay_${r.name}` }).click();
  };

  const STEPS = ["upload", "confirm", "configure", "preview"];
  const stepIdx = STEPS.indexOf(step);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0a0a0a; --surface: #141414; --border: #262626;
          --accent: #e11d48; --accent2: #f43f5e;
          --text: #f5f5f5; --muted: #737373; --card: #1a1a1a; --ok: #22c55e;
        }
        body { background: var(--bg); }
        .app { min-height: 100vh; background: var(--bg); font-family: 'DM Sans', sans-serif; color: var(--text); }

        /* Nav */
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 18px 40px; border-bottom: 1px solid var(--border); }
        .logo { font-family: 'DM Serif Display', serif; font-size: 22px; letter-spacing: -.5px; }
        .logo span { color: var(--accent); }
        .stepper { display: flex; align-items: center; }
        .st { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; font-family: 'Space Mono', monospace; }
        .st.active { color: var(--text); }
        .st.done { color: var(--ok); }
        .st-num { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
        .st.done .st-num { background: var(--ok); border-color: var(--ok); color: #000; }
        .st.active .st-num { border-color: var(--accent); color: var(--accent); }
        .st-line { width: 28px; height: 1px; background: var(--border); margin: 0 6px; }

        /* Layout */
        .main { max-width: 1000px; margin: 0 auto; padding: 48px 24px; }
        .section-title { font-family: 'DM Serif Display', serif; font-size: 30px; margin-bottom: 8px; }
        .section-sub { color: var(--muted); font-size: 14px; margin-bottom: 32px; }
        .label { font-size: 11px; font-family: 'Space Mono', monospace; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 12px; }
        .divider { height: 1px; background: var(--border); margin: 28px 0; }

        /* Buttons */
        .btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 26px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all .15s; font-family: 'DM Sans', sans-serif; }
        .btn-primary { background: var(--accent); color: #fff; }
        .btn-primary:hover { background: var(--accent2); transform: translateY(-1px); }
        .btn-primary:disabled { background: #3f3f46; color: var(--muted); cursor: not-allowed; transform: none; }
        .btn-ghost { background: transparent; color: var(--text); border: 1.5px solid var(--border); }
        .btn-ghost:hover { border-color: var(--muted); }
        .btn-sm { padding: 7px 14px; font-size: 12px; }
        .back-link { color: var(--muted); font-size: 13px; cursor: pointer; text-decoration: underline; display: inline-block; margin-bottom: 24px; }
        .back-link:hover { color: var(--text); }

        /* Upload */
        .upload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
        .drop-zone { border: 1.5px dashed var(--border); border-radius: 12px; padding: 36px 24px; text-align: center; cursor: pointer; transition: all .2s; background: var(--surface); }
        .drop-zone:hover { border-color: var(--accent); background: #1f0a10; }
        .drop-icon { font-size: 28px; margin-bottom: 10px; }
        .drop-label { font-size: 15px; font-weight: 500; margin-bottom: 4px; }
        .drop-hint { font-size: 12px; color: var(--muted); }
        .badge { display: inline-block; background: #14532d; color: #86efac; font-size: 11px; font-family: 'Space Mono', monospace; padding: 3px 10px; border-radius: 100px; margin-top: 10px; }
        .badge.warn { background: #431407; color: #fb923c; }
        .error { color: #f87171; font-size: 12px; margin-top: 8px; font-family: 'Space Mono', monospace; }
        .img-count { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; justify-content: center; }
        .img-pill { background: var(--card); border: 1px solid var(--border); font-size: 10px; font-family: 'Space Mono', monospace; padding: 2px 8px; border-radius: 100px; color: var(--muted); }

        /* ── CONFIRM STEP: Split-panel layout ── */
        .confirm-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }

        /* Left panel — images (locked) */
        .panel-images { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .panel-header { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
        .panel-header-title { font-size: 11px; font-family: 'Space Mono', monospace; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
        .panel-header-badge { font-size: 10px; background: var(--card); border: 1px solid var(--border); color: var(--muted); padding: 2px 8px; border-radius: 100px; font-family: 'Space Mono', monospace; }
        .image-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--border); min-height: 58px; }
        .image-row:last-child { border-bottom: none; }
        .img-num { font-family: 'Space Mono', monospace; font-size: 11px; color: var(--muted); width: 20px; text-align: right; flex-shrink: 0; }
        .img-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; flex-shrink: 0; border: 1px solid var(--border); }
        .img-filename { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'Space Mono', monospace; font-size: 10px; }
        .locked-icon { font-size: 11px; margin-left: auto; flex-shrink: 0; opacity: .4; }

        /* Right panel — captions (draggable) */
        .panel-captions { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .caption-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--border); cursor: default; transition: background .12s, border-color .12s; }
        .caption-row:last-child { border-bottom: none; }
        .caption-row.drag-active { background: #1f0a10; border-color: var(--accent); }
        .caption-row.drag-over-target { border-top: 2px solid var(--accent); }
        .caption-row.is-dragging { opacity: .35; }
        .drag-grip { cursor: grab; color: #444; font-size: 18px; line-height: 1; flex-shrink: 0; padding: 4px 4px 0; border-radius: 4px; transition: color .1s; user-select: none; margin-top: 6px; }
        .drag-grip:hover { color: var(--muted); background: var(--border); }
        .caption-input { flex: 1; background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; font-size: 13px; color: var(--text); font-family: 'DM Sans', sans-serif; outline: none; transition: border .15s; min-width: 0; resize: none; overflow: hidden; line-height: 1.6; min-height: 38px; }
        .caption-input:focus { border-color: var(--accent); }

        /* Connector arrows between panels */
        .confirm-connector { display: flex; flex-direction: column; justify-content: space-around; align-items: center; padding: 52px 0 12px; }
        .connector-arrow { font-size: 14px; color: #333; line-height: 1; }

        /* Template grid */
        .template-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 32px; }
        .template-card { border: 2px solid var(--border); border-radius: 10px; overflow: hidden; cursor: pointer; transition: all .15s; aspect-ratio: 3/4; position: relative; }
        .template-card:hover { border-color: var(--muted); }
        .template-card.selected { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(225,29,72,.2); }
        .template-card-label { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,.75); font-size: 10px; font-family: 'Space Mono', monospace; padding: 6px 8px; text-align: center; color: #fff; }
        .ratio-row { display: flex; gap: 10px; margin-bottom: 32px; flex-wrap: wrap; }
        .ratio-btn { padding: 8px 18px; border-radius: 6px; border: 1.5px solid var(--border); font-size: 12px; font-family: 'Space Mono', monospace; cursor: pointer; background: var(--surface); color: var(--text); transition: all .15s; }
        .ratio-btn.selected { border-color: var(--accent); color: var(--accent); background: #1f0a10; }

        /* Preview */
        .preview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 36px; }
        .preview-card { border-radius: 10px; overflow: hidden; border: 1px solid var(--border); }
        .preview-card img { width: 100%; display: block; }
        .preview-card-footer { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: var(--card); gap: 8px; }
        .preview-name { font-size: 10px; color: var(--muted); font-family: 'Space Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .caption-preview { font-size: 10px; color: #555; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .export-bar { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; background: var(--surface); border-radius: 12px; border: 1px solid var(--border); margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
        .export-info strong { display: block; font-size: 18px; font-family: 'DM Serif Display', serif; }
        .export-info span { color: var(--muted); font-size: 12px; }
        .spinner { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
        .preview-card textarea:focus { border-color: var(--accent); outline: none; }
        input[type=range] { height: 4px; border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Hint box */
        .hint-box { display: flex; align-items: flex-start; gap: 10px; font-size: 12px; color: var(--muted); margin-bottom: 20px; padding: 12px 16px; background: var(--surface); border-radius: 8px; border: 1px solid var(--border); line-height: 1.5; }
      `}</style>

      <div className="app">
        {/* Nav / Stepper */}
        <nav className="nav">
          <div className="logo">overlay<span>.</span></div>
          <div className="stepper">
            {[["upload","1","Upload"],["confirm","2","Match"],["configure","3","Template"],["preview","4","Export"]].map(([s,n,label], i) => (
              <div key={s} style={{display:"flex",alignItems:"center"}}>
                <div className={`st${stepIdx > i ? " done" : stepIdx === i ? " active" : ""}`}>
                  <div className="st-num">{stepIdx > i ? "✓" : n}</div>
                  <span>{label}</span>
                </div>
                {i < 3 && <div className="st-line"/>}
              </div>
            ))}
          </div>
        </nav>

        <div className="main">

          {/* ── STEP 1: Upload ── */}
          {step === "upload" && <>
            <div className="section-title">Start your batch</div>
            <div className="section-sub">Upload images and a CSV — one caption per row. Chinese captions fully supported.</div>

            <div className="upload-grid">
              <div className="drop-zone" onClick={() => imgInputRef.current.click()}>
                <div className="drop-icon">🖼</div>
                <div className="drop-label">Upload Images</div>
                <div className="drop-hint">JPG, PNG, WEBP — select multiple</div>
                {images.length > 0 && <div className="badge">{images.length} image{images.length > 1 ? "s" : ""} loaded</div>}
                {images.length > 0 && (
                  <div className="img-count">
                    {images.slice(0,5).map((img,i) => <span key={i} className="img-pill">{img.name.length > 14 ? img.name.slice(0,14)+"…" : img.name}</span>)}
                    {images.length > 5 && <span className="img-pill">+{images.length - 5} more</span>}
                  </div>
                )}
                <input ref={imgInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleImages}/>
              </div>

              <div className="drop-zone" onClick={() => csvInputRef.current.click()}>
                <div className="drop-icon">📄</div>
                <div className="drop-label">Import CSV</div>
                <div className="drop-hint">One caption per row. Supports Chinese text.</div>
                {captions.length > 0 && <div className="badge">{captions.length} caption{captions.length > 1 ? "s" : ""} loaded</div>}
                {csvError && <div className="error">{csvError}</div>}
                <input ref={csvInputRef} type="file" accept=".csv,.txt" style={{display:"none"}} onChange={handleCSV}/>
              </div>
            </div>

            {images.length > 0 && captions.length > 0 && images.length !== captions.length && (
              <div style={{marginBottom:16}}>
                <span className="badge warn">{images.length} images / {captions.length} captions — last caption repeats for extras</span>
              </div>
            )}

            <button className="btn btn-primary" disabled={!images.length || !captions.length} onClick={goToConfirm}>
              Review Matches →
            </button>
            {(!images.length || !captions.length) && (
              <div style={{marginTop:12,fontSize:12,color:"var(--muted)"}}>Need at least 1 image and 1 caption to continue.</div>
            )}
          </>}

          {/* ── STEP 2: Confirm matches — SPLIT PANEL ── */}
          {step === "confirm" && <>
            <span className="back-link" onClick={() => setStep("upload")}>← Back</span>
            <div className="section-title">Confirm matches</div>
            <div className="section-sub">Images are fixed on the left. Drag captions on the right to reorder them, or edit inline.</div>

            <div className="hint-box">
              <span style={{fontSize:18,lineHeight:1,flexShrink:0}}>↕</span>
              <span>
                Images stay in their original order (locked). Only the <strong style={{color:"#f5f5f5"}}>caption list</strong> on the right is draggable — grab the <strong style={{color:"#f5f5f5"}}>⠿</strong> handle to move a caption up or down until it lines up with the right image.
              </span>
            </div>

            <div className="confirm-panels">
              {/* Left: Images (locked) */}
              <div className="panel-images">
                <div className="panel-header">
                  <span className="panel-header-title">Images</span>
                  <span className="panel-header-badge">locked</span>
                </div>
                {pairs.map((pair, i) => (
                  <div key={pair.id} className="image-row">
                    <span className="img-num">{i + 1}</span>
                    <img className="img-thumb" src={pair.img.url} alt={pair.img.name}/>
                    <span className="img-filename" title={pair.img.name}>{pair.img.name}</span>
                    <span className="locked-icon">🔒</span>
                  </div>
                ))}
              </div>

              {/* Right: Captions (draggable independently) */}
              <div className="panel-captions">
                <div className="panel-header">
                  <span className="panel-header-title">Captions</span>
                  <span className="panel-header-badge">drag to reorder</span>
                </div>
                {pairs.map((pair, i) => (
                  <div
                    key={`cap-${i}`}
                    className={`caption-row${dragIdx === i ? " is-dragging" : ""}${dragOver === i && dragOver !== dragIdx ? " drag-active" : ""}`}
                    onDragOver={e => { e.preventDefault(); onDragEnter(i); }}
                    onDrop={onDragEnd}
                  >
                    <span
                      className="drag-grip"
                      draggable
                      onDragStart={() => onDragStart(i)}
                      onDragEnd={onDragEnd}
                      title="Drag to reorder"
                    >⠿</span>
                    <textarea
                      className="caption-input"
                      value={pair.caption}
                      onChange={e => {
                        editCaption(i, e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      onMouseDown={e => e.stopPropagation()}
                      onFocus={e => {
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      placeholder="Edit caption here… Enter for line break"
                      rows={1}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <button className="btn btn-primary" onClick={() => setStep("configure")}>
                Choose Template →
              </button>
              <span style={{fontSize:12,color:"var(--muted)"}}>
                {pairs.length} pair{pairs.length !== 1 ? "s" : ""} ready
              </span>
            </div>
          </>}

          {/* ── STEP 3: Template & format ── */}
          {step === "configure" && <>
            <span className="back-link" onClick={() => setStep("confirm")}>← Back to matches</span>
            <div className="section-title">Choose a template</div>
            <div className="section-sub">Pick the overlay style and output dimensions.</div>

            <div className="label">Overlay Style</div>
            <div className="template-grid">
              {TEMPLATES.map(t => (
                <div key={t.id} className={`template-card${template.id === t.id ? " selected" : ""}`} onClick={() => setTemplate(t)}>
                  <TemplatePreview template={t} />
                  <div className="template-card-label">{t.name}</div>
                  {template.id === t.id && (
                    <div style={{position:"absolute",top:6,right:6,width:18,height:18,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff"}}>✓</div>
                  )}
                </div>
              ))}
            </div>

            {savedTemplates.length > 0 && <>
              <div className="label" style={{marginTop:8}}>Your Saved Templates</div>
              <div className="template-grid">
                {savedTemplates.map(st => {
                  const base = TEMPLATES.find(t => t.id === st.baseTemplateId) || TEMPLATES[0];
                  const merged = { ...base, id: st.id, name: st.name };
                  return (
                    <div key={st.id} style={{position:"relative"}}>
                      <div className={`template-card${template.id === st.id ? " selected" : ""}`} onClick={() => setTemplate({ ...base, id: st.id, name: st.name })}>
                        <TemplatePreview template={base} />
                        <div className="template-card-label">{st.name}</div>
                        {template.id === st.id && (
                          <div style={{position:"absolute",top:6,right:6,width:18,height:18,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff"}}>✓</div>
                        )}
                      </div>
                      <button onClick={() => deleteSavedTemplate(st.id)} title="Delete template" style={{position:"absolute",top:4,left:4,background:"rgba(0,0,0,0.6)",border:"none",color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>×</button>
                    </div>
                  );
                })}
              </div>
            </>}

            <div className="divider"/>
            <div className="label">Output Format</div>
            <div className="ratio-row">
              {ASPECT_RATIOS.map(r => (
                <button key={r.value} className={`ratio-btn${aspect.value === r.value ? " selected" : ""}`} onClick={() => setAspect(r)}>
                  {r.label}
                </button>
              ))}
            </div>

            <button className="btn btn-primary" onClick={renderAll} disabled={rendering}>
              {rendering ? <><div className="spinner"/>Rendering…</> : `Render ${pairs.length} image${pairs.length > 1 ? "s" : ""} →`}
            </button>
          </>}

          {/* ── STEP 4: Preview & export ── */}
          {step === "preview" && <>
            <span className="back-link" onClick={() => setStep("configure")}>← Back to template</span>
            <div className="section-title">Preview & Export</div>
            <div className="section-sub">{rendered.length} images rendered · "{template.name}" · {aspect.label}</div>

            <div className="export-bar">
              <div className="export-info">
                <strong>{rendered.length} files ready</strong>
                <span>{aspect.label} · {template.name} · {aspect.w}×{aspect.h}px</span>
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep("confirm")}>Edit matches</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep("configure")}>Change template</button>
                <button className="btn btn-primary" onClick={downloadAll}>⬇ Download all (.zip)</button>
              </div>
            </div>

            <div className="preview-grid">
              {rendered.map((r, i) => (
                <PreviewCard
                  key={i}
                  r={r}
                  index={i}
                  template={template}
                  aspect={aspect}
                  onUpdate={(updated) => {
                    const next = [...rendered];
                    next[i] = updated;
                    setRendered(next);
                  }}
                  onDownload={() => downloadOne(r)}
                  onSaveTemplate={saveTemplate}
                />
              ))}
            </div>
          </>}

        </div>
      </div>
    </>
  );
}

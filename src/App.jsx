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
    id: "xhs-top", name: "好物分享-顶部居中",
    render: (ctx, img, text, w, h, sizeScale = 1) => {
      ctx.drawImage(img, 0, 0, w, h);
      const fs = Math.round(w * 0.038 * sizeScale);
      ctx.font = font(400, fs, text);
      const lh = fs * 1.75;
      const maxTextW = w * 0.78;
      const segments = text.split("\n");
      const lines = segments.flatMap(seg => seg ? getWrappedLines(ctx, seg, maxTextW) : [""]);
      const startY = h * 0.07;
      const padX = fs * 0.55;
      const padY = fs * 0.18;
      const r = fs * 0.22;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      lines.forEach((l, i) => {
        const lineW = ctx.measureText(l).width;
        const stripX = w / 2 - lineW / 2 - padX;
        const stripY = startY + i * lh - padY;
        const stripW = lineW + padX * 2;
        const stripH = fs + padY * 2;
        ctx.fillStyle = "rgba(255,253,248,0.82)";
        roundRect(ctx, stripX, stripY, stripW, stripH, r);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillText(l, w / 2, startY + i * lh);
      });
    },
  },
];

const ASPECT_RATIOS = [
  { label: "1:1 Square", value: "1:1", w: 1080, h: 1080 },
  { label: "4:5 Portrait", value: "4:5", w: 1080, h: 1350 },
  { label: "9:16 Story", value: "9:16", w: 1080, h: 1920 },
];

const WATERCOLOR_BG_B64 = "data:image/png;base64,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";

const tplBg = (id) => ""; // unused — preview uses real watercolor image

// ─── Template Preview Component ──────────────────────────────────────────────
// All cards share the same warm background and same sample text so users
// can compare styles fairly. 3:4 ratio to show position differences clearly.

const SAMPLE_TEXT = "慢一点也没关系，重要的是你没有停下";

function TemplatePreview({ template }) {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 180, H = 240;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Load watercolor background image
    const bg = new Image();
    bg.onload = () => {
      // Cover-crop the watercolor into the canvas
      const scale = Math.max(W / bg.width, H / bg.height);
      const sw = bg.width * scale, sh = bg.height * scale;
      ctx.drawImage(bg, -(sw - W) / 2, -(sh - H) / 2, sw, sh);
      document.fonts.ready.then(() => {
        template.render(ctx, canvas, SAMPLE_TEXT, W, H);
      });
    };
    bg.src = WATERCOLOR_BG_B64;
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

  const handleCaptionFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    setCsvError("");

    // ── XLSX handler ──
    if (ext === "xlsx" || ext === "xls") {
      try {
        const XLSX = await import("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (!rows.length) { setCsvError("Spreadsheet is empty."); return; }
        // Use first column; detect header by checking if first cell is a known keyword
        const first = String(rows[0][0] || "").toLowerCase();
        const hasHeader = ["caption","text","quote","标题","文字","内容","文案"].some(k => first.includes(k));
        const parsed = (hasHeader ? rows.slice(1) : rows)
          .map(r => String(r[0] || "").trim())
          .filter(Boolean);
        if (!parsed.length) { setCsvError("No captions found in first column."); return; }
        setCaptions(parsed);
      } catch (err) {
        setCsvError("Failed to read spreadsheet: " + err.message);
      }
      return;
    }

    // ── TXT / CSV handler (with encoding detection) ──
    const reader = new FileReader();
    reader.onload = (ev) => {
      const bytes = new Uint8Array(ev.target.result);
      // Try UTF-8 first; if replacement chars detected, retry with GB18030
      let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      if (text.includes("\uFFFD")) {
        try { text = new TextDecoder("gb18030").decode(bytes); } catch (_) {}
      }
      text = text.replace(/^\uFEFF/, ""); // strip BOM
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (!lines.length) { setCsvError("File is empty."); return; }
      const first = lines[0].toLowerCase();
      const hasHeader = ["caption","text","quote","标题","文字","内容","文案"].some(k => first.includes(k));
      const parsed = (hasHeader ? lines.slice(1) : lines)
        .map(l => l.replace(/^["'\uFEFF]|["']$/g, "").trim())
        .filter(Boolean);
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
                <div className="drop-label">Import Captions</div>
                <div className="drop-hint">CSV · TXT · XLSX · XLS — Chinese supported</div>
                {captions.length > 0 && <div className="badge">{captions.length} caption{captions.length > 1 ? "s" : ""} loaded</div>}
                {csvError && <div className="error">{csvError}</div>}
                <input ref={csvInputRef} type="file" accept=".csv,.txt,.xlsx,.xls" style={{display:"none"}} onChange={handleCaptionFile}/>
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

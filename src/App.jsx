import { useState, useRef, useCallback } from "react";

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: "minimal-bottom", name: "Minimal Bottom",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const oH = h * 0.28;
      const g = ctx.createLinearGradient(0, h - oH, 0, h);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.82)");
      ctx.fillStyle = g; ctx.fillRect(0, h - oH, w, oH);
      ctx.fillStyle = "#fff"; ctx.font = `600 ${w*.055}px 'DM Serif Display',Georgia,serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      wrapText(ctx, text, w/2, h - oH/2.2, w*.82, w*.065);
    },
  },
  {
    id: "center-bold", name: "Center Bold",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff"; ctx.font = `700 ${w*.07}px 'DM Serif Display',Georgia,serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      wrapText(ctx, text, w/2, h/2, w*.78, w*.085);
    },
  },
  {
    id: "top-tag", name: "Top Tag",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const pad = w*.055, fs = w*.042;
      ctx.font = `600 ${fs}px 'Space Mono',monospace`;
      const lines = getWrappedLines(ctx, text, w*.78);
      const boxH = lines.length * fs * 1.5 + pad;
      ctx.fillStyle = "rgba(255,255,255,0.92)"; roundRect(ctx, pad*.7, pad*.7, w-pad*1.4, boxH, 8);
      ctx.fillStyle = "#111"; ctx.textAlign = "left"; ctx.textBaseline = "top";
      lines.forEach((l,i) => ctx.fillText(l, pad*1.1, pad*1.0 + i*fs*1.5));
    },
  },
  {
    id: "editorial-side", name: "Editorial Side",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const bW = w*.42, g = ctx.createLinearGradient(0, 0, bW, 0);
      g.addColorStop(0, "rgba(0,0,0,0.88)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, bW, h);
      ctx.fillStyle = "#fff"; ctx.font = `300 ${w*.048}px 'DM Serif Display',Georgia,serif`;
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      wrapText(ctx, text, w*.05, h/2, bW*.85, w*.058);
    },
  },
  {
    id: "neon-outline", name: "Neon Outline",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      ctx.fillStyle = "rgba(10,0,30,0.55)"; ctx.fillRect(0, 0, w, h);
      const fs = w*.065;
      ctx.font = `800 ${fs}px 'DM Serif Display',Georgia,serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2.5;
      ctx.shadowColor = "#a855f7"; ctx.shadowBlur = 18;
      strokeWrapText(ctx, text, w/2, h/2, w*.82, fs*1.3);
      ctx.shadowBlur = 0; ctx.fillStyle = "#fff";
      wrapText(ctx, text, w/2, h/2, w*.82, fs*1.3);
    },
  },
  {
    id: "xhs-soft", name: "小红书 Soft",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const oH = h*.32;
      ctx.fillStyle = "rgba(255,240,245,0.88)"; ctx.fillRect(0, h-oH, w, oH);
      ctx.fillStyle = "#e11d48"; ctx.fillRect(w*.1, h-oH+14, w*.08, 3);
      ctx.fillStyle = "#1a1a1a"; ctx.font = `600 ${w*.048}px 'DM Serif Display',Georgia,serif`;
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      wrapTextLeft(ctx, text, w*.1, h-oH+28, w*.8, w*.058);
    },
  },
  {
    id: "stamp", name: "Stamp",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const bw=w*.7, bh=h*.22, bx=(w-bw)/2, by=(h-bh)/2;
      ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.strokeStyle = "#111"; ctx.lineWidth = 3;
      ctx.fillRect(bx,by,bw,bh); ctx.strokeRect(bx+6,by+6,bw-12,bh-12);
      ctx.fillStyle = "#111"; ctx.font = `700 ${w*.042}px 'Space Mono',monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      wrapText(ctx, text.toUpperCase(), w/2, h/2, bw*.82, w*.052);
    },
  },
  {
    id: "cinematic", name: "Cinematic",
    render: (ctx, img, text, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
      const bH = h*.12;
      ctx.fillStyle = "#000"; ctx.fillRect(0,0,w,bH); ctx.fillRect(0,h-bH,w,bH);
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = `300 ${w*.042}px 'DM Serif Display',Georgia,serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      wrapText(ctx, text, w/2, h-bH/2, w*.85, w*.05);
    },
  },
];

const ASPECT_RATIOS = [
  { label: "1:1 Square", value: "1:1", w: 1080, h: 1080 },
  { label: "4:5 Portrait", value: "4:5", w: 1080, h: 1350 },
  { label: "9:16 Story", value: "9:16", w: 1080, h: 1920 },
];

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function getWrappedLines(ctx, text, maxWidth) {
  const words = text.split(" "); const lines = []; let cur = "";
  for (const w of words) {
    const t = cur ? cur+" "+w : w;
    if (ctx.measureText(t).width > maxWidth && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur); return lines;
}
function wrapText(ctx, text, x, y, maxW, lh) {
  const lines = getWrappedLines(ctx, text, maxW);
  const tot = lines.length * lh;
  lines.forEach((l,i) => ctx.fillText(l, x, y - tot/2 + i*lh + lh/2));
}
function wrapTextLeft(ctx, text, x, y, maxW, lh) {
  getWrappedLines(ctx, text, maxW).forEach((l,i) => ctx.fillText(l, x, y+i*lh));
}
function strokeWrapText(ctx, text, x, y, maxW, lh) {
  const lines = getWrappedLines(ctx, text, maxW);
  const tot = lines.length * lh;
  lines.forEach((l,i) => ctx.strokeText(l, x, y - tot/2 + i*lh + lh/2));
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); ctx.fill();
}
function loadImage(src) {
  return new Promise((res,rej) => { const i=new Image(); i.crossOrigin="anonymous"; i.onload=()=>res(i); i.onerror=rej; i.src=src; });
}

// ─── App ──────────────────────────────────────────────────────────────────────

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
  const imgInputRef = useRef();
  const csvInputRef = useRef();

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    setImages(files.map(f => ({ file: f, url: URL.createObjectURL(f), name: f.name })));
  };

  const handleCSV = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split("\n").map(l=>l.trim()).filter(Boolean);
      if (!lines.length) { setCsvError("CSV is empty."); return; }
      const first = lines[0].toLowerCase();
      const hasHeader = first.includes("caption")||first.includes("text")||first.includes("quote");
      const parsed = (hasHeader ? lines.slice(1) : lines).map(l=>l.replace(/^["']|["']$/g,"").trim());
      setCaptions(parsed); setCsvError("");
    };
    reader.readAsText(file);
  };

  const goToConfirm = () => {
    const built = images.map((img, i) => ({
      img,
      caption: captions[i] ?? captions[captions.length - 1] ?? "",
      id: `${img.name}-${i}`,
    }));
    setPairs(built);
    setStep("confirm");
  };

  const onDragStart = (i) => setDragIdx(i);
  const onDragEnter = (i) => setDragOver(i);
  const onDragEnd = () => {
    if (dragIdx === null || dragOver === null || dragIdx === dragOver) {
      setDragIdx(null); setDragOver(null); return;
    }
    const next = [...pairs];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(dragOver, 0, moved);
    setPairs(next); setDragIdx(null); setDragOver(null);
  };

  const editCaption = (i, val) => {
    const next = [...pairs]; next[i] = { ...next[i], caption: val }; setPairs(next);
  };

  const renderAll = useCallback(async () => {
    setRendering(true);
    const { w, h } = aspect;
    const results = [];
    for (const pair of pairs) {
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      const img = await loadImage(pair.img.url);
      const scale = Math.max(w/img.width, h/img.height);
      const sw = img.width*scale, sh = img.height*scale;
      const tmp = document.createElement("canvas"); tmp.width=w; tmp.height=h;
      const tCtx = tmp.getContext("2d");
      tCtx.drawImage(img, -(sw-w)/2, -(sh-h)/2, sw, sh);
      const cropped = await loadImage(tmp.toDataURL());
      template.render(ctx, cropped, pair.caption, w, h);
      results.push({ dataUrl: canvas.toDataURL("image/jpeg", 0.92), name: pair.img.name, caption: pair.caption });
    }
    setRendered(results); setRendering(false); setStep("preview");
  }, [pairs, template, aspect]);

  const downloadAll = async () => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    rendered.forEach((r,i) => zip.file(`overlay_${String(i+1).padStart(3,"0")}_${r.name}`, r.dataUrl.split(",")[1], {base64:true}));
    const blob = await zip.generateAsync({type:"blob"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="overlays.zip"; a.click();
  };

  const downloadOne = (r) => {
    const a=document.createElement("a"); a.href=r.dataUrl; a.download=`overlay_${r.name}`; a.click();
  };

  const STEPS = ["upload","confirm","configure","preview"];
  const stepIdx = STEPS.indexOf(step);

  const tplBg = (id) => ({
    "minimal-bottom": "linear-gradient(to top,#000,#444)",
    "center-bold": "linear-gradient(135deg,#1a1a2e,#16213e)",
    "top-tag": "linear-gradient(135deg,#667eea,#764ba2)",
    "editorial-side": "linear-gradient(to right,#000,#6b7280)",
    "neon-outline": "linear-gradient(135deg,#1a001a,#4a0080)",
    "xhs-soft": "linear-gradient(135deg,#fce4ec,#f8bbd0)",
    "stamp": "linear-gradient(135deg,#fef3c7,#fde68a)",
    "cinematic": "linear-gradient(135deg,#0f0f0f,#374151)",
  }[id] || "#222");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#0a0a0a;--surface:#141414;--border:#262626;--accent:#e11d48;--accent2:#f43f5e;--text:#f5f5f5;--muted:#737373;--card:#1a1a1a;--ok:#22c55e}
        body{background:var(--bg)}
        .app{min-height:100vh;background:var(--bg);font-family:'DM Sans',sans-serif;color:var(--text)}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:20px 40px;border-bottom:1px solid var(--border)}
        .logo{font-family:'DM Serif Display',serif;font-size:22px;letter-spacing:-.5px}
        .logo span{color:var(--accent)}
        .stepper{display:flex;align-items:center}
        .st{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:12px;font-family:'Space Mono',monospace}
        .st.active{color:var(--text)}
        .st.done{color:var(--ok)}
        .st-num{width:22px;height:22px;border-radius:50%;border:1.5px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0}
        .st.done .st-num{background:var(--ok);border-color:var(--ok);color:#000}
        .st.active .st-num{border-color:var(--accent);color:var(--accent)}
        .st-line{width:28px;height:1px;background:var(--border);margin:0 6px}
        .main{max-width:960px;margin:0 auto;padding:48px 24px}
        .section-title{font-family:'DM Serif Display',serif;font-size:32px;margin-bottom:8px}
        .section-sub{color:var(--muted);font-size:14px;margin-bottom:36px}
        .label{font-size:11px;font-family:'Space Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
        .divider{height:1px;background:var(--border);margin:28px 0}
        .btn{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .15s;font-family:'DM Sans',sans-serif}
        .btn-primary{background:var(--accent);color:#fff}
        .btn-primary:hover{background:var(--accent2);transform:translateY(-1px)}
        .btn-primary:disabled{background:#3f3f46;color:var(--muted);cursor:not-allowed;transform:none}
        .btn-ghost{background:transparent;color:var(--text);border:1.5px solid var(--border)}
        .btn-ghost:hover{border-color:var(--muted)}
        .btn-sm{padding:7px 14px;font-size:12px}
        .back-link{color:var(--muted);font-size:13px;cursor:pointer;text-decoration:underline;display:inline-block;margin-bottom:24px}
        .back-link:hover{color:var(--text)}
        .upload-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
        .drop-zone{border:1.5px dashed var(--border);border-radius:12px;padding:36px 24px;text-align:center;cursor:pointer;transition:all .2s;background:var(--surface)}
        .drop-zone:hover{border-color:var(--accent);background:#1f0a10}
        .drop-icon{font-size:28px;margin-bottom:10px}
        .drop-label{font-size:15px;font-weight:500;margin-bottom:4px}
        .drop-hint{font-size:12px;color:var(--muted)}
        .badge{display:inline-block;background:#14532d;color:#86efac;font-size:11px;font-family:'Space Mono',monospace;padding:3px 10px;border-radius:100px;margin-top:10px}
        .badge.warn{background:#431407;color:#fb923c}
        .error{color:#f87171;font-size:12px;margin-top:8px;font-family:'Space Mono',monospace}
        .img-count{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;justify-content:center}
        .img-pill{background:var(--card);border:1px solid var(--border);font-size:10px;font-family:'Space Mono',monospace;padding:2px 8px;border-radius:100px;color:var(--muted)}
        /* Confirm step */
        .confirm-hint{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--muted);margin-bottom:20px;padding:12px 16px;background:var(--surface);border-radius:8px;border:1px solid var(--border)}
        .pair-list{display:flex;flex-direction:column;gap:6px;margin-bottom:28px}
        .pair-header{display:grid;grid-template-columns:28px 60px 1fr 2fr 28px;gap:12px;padding:0 14px;margin-bottom:6px}
        .pair-row{display:grid;grid-template-columns:28px 60px 1fr 2fr 28px;align-items:center;gap:12px;padding:10px 14px;background:var(--surface);border:1.5px solid var(--border);border-radius:10px;transition:all .15s;user-select:none}
        .pair-row.drag-over{border-color:var(--accent);background:#1f0a10;transform:scale(1.005)}
        .pair-row.dragging{opacity:0.35;border-style:dashed}
        .pair-num{font-family:'Space Mono',monospace;font-size:11px;color:var(--muted);text-align:center;line-height:1}
        .pair-thumb{width:60px;height:60px;object-fit:cover;border-radius:6px;display:block;border:1px solid var(--border)}
        .pair-filename{font-family:'Space Mono',monospace;font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .pair-caption-input{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px;color:var(--text);font-family:'DM Sans',sans-serif;width:100%;outline:none;transition:border .15s}
        .pair-caption-input:focus{border-color:var(--accent)}
        .drag-handle{color:#444;font-size:18px;cursor:grab;line-height:1;text-align:center}
        .drag-handle:hover{color:var(--muted)}
        /* Template */
        .template-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px}
        .template-card{border:2px solid var(--border);border-radius:10px;overflow:hidden;cursor:pointer;transition:all .15s;aspect-ratio:1;position:relative}
        .template-card:hover{border-color:var(--muted)}
        .template-card.selected{border-color:var(--accent);box-shadow:0 0 0 3px rgba(225,29,72,.2)}
        .template-card-label{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.75);font-size:10px;font-family:'Space Mono',monospace;padding:6px 8px;text-align:center;color:#fff}
        .ratio-row{display:flex;gap:10px;margin-bottom:32px;flex-wrap:wrap}
        .ratio-btn{padding:8px 18px;border-radius:6px;border:1.5px solid var(--border);font-size:12px;font-family:'Space Mono',monospace;cursor:pointer;background:var(--surface);color:var(--text);transition:all .15s}
        .ratio-btn.selected{border-color:var(--accent);color:var(--accent);background:#1f0a10}
        /* Preview */
        .preview-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:36px}
        .preview-card{border-radius:10px;overflow:hidden;border:1px solid var(--border)}
        .preview-card img{width:100%;display:block}
        .preview-card-footer{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--card)}
        .preview-name{font-size:10px;color:var(--muted);font-family:'Space Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
        .caption-preview{font-size:10px;color:#555;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
        .export-bar{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;background:var(--surface);border-radius:12px;border:1px solid var(--border);margin-bottom:24px;flex-wrap:wrap;gap:12px}
        .export-info strong{display:block;font-size:18px;font-family:'DM Serif Display',serif}
        .export-info span{color:var(--muted);font-size:12px}
        .spinner{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="app">
        <nav className="nav">
          <div className="logo">overlay<span>.</span></div>
          <div className="stepper">
            {[["upload","1","Upload"],["confirm","2","Confirm"],["configure","3","Template"],["preview","4","Export"]].map(([s,n,label],i) => (
              <div key={s} style={{display:"flex",alignItems:"center"}}>
                <div className={`st${stepIdx>i?" done":stepIdx===i?" active":""}`}>
                  <div className="st-num">{stepIdx>i?"✓":n}</div>
                  <span>{label}</span>
                </div>
                {i<3 && <div className="st-line"/>}
              </div>
            ))}
          </div>
        </nav>

        <div className="main">

          {/* ── STEP 1: Upload ── */}
          {step==="upload" && (
            <>
              <div className="section-title">Start your batch</div>
              <div className="section-sub">Upload your images and import a CSV — one caption per row.</div>
              <div className="upload-grid">
                <div className="drop-zone" onClick={()=>imgInputRef.current.click()}>
                  <div className="drop-icon">🖼</div>
                  <div className="drop-label">Upload Images</div>
                  <div className="drop-hint">JPG, PNG, WEBP — select multiple</div>
                  {images.length>0 && <div className="badge">{images.length} image{images.length>1?"s":""} loaded</div>}
                  {images.length>0 && (
                    <div className="img-count">
                      {images.slice(0,5).map((img,i)=><span key={i} className="img-pill">{img.name.length>14?img.name.slice(0,14)+"…":img.name}</span>)}
                      {images.length>5 && <span className="img-pill">+{images.length-5} more</span>}
                    </div>
                  )}
                  <input ref={imgInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleImages}/>
                </div>
                <div className="drop-zone" onClick={()=>csvInputRef.current.click()}>
                  <div className="drop-icon">📄</div>
                  <div className="drop-label">Import CSV</div>
                  <div className="drop-hint">One caption per row. Optional header: "caption"</div>
                  {captions.length>0 && <div className="badge">{captions.length} caption{captions.length>1?"s":""} loaded</div>}
                  {csvError && <div className="error">{csvError}</div>}
                  <input ref={csvInputRef} type="file" accept=".csv,.txt" style={{display:"none"}} onChange={handleCSV}/>
                </div>
              </div>

              {images.length>0 && captions.length>0 && images.length!==captions.length && (
                <div style={{marginBottom:16}}>
                  <span className="badge warn">{images.length} images / {captions.length} captions — last caption repeats for extras</span>
                </div>
              )}

              <button className="btn btn-primary" disabled={!images.length||!captions.length} onClick={goToConfirm}>
                Review Matches →
              </button>
              {(!images.length||!captions.length) && (
                <div style={{marginTop:12,fontSize:12,color:"var(--muted)"}}>Need at least 1 image and 1 caption to continue.</div>
              )}
            </>
          )}

          {/* ── STEP 2: Confirm & reorder ── */}
          {step==="confirm" && (
            <>
              <span className="back-link" onClick={()=>setStep("upload")}>← Back</span>
              <div className="section-title">Confirm matches</div>
              <div className="section-sub">Images are matched to captions by position. Drag to reorder, or edit captions inline.</div>

              <div className="confirm-hint">
                <span style={{fontSize:20,lineHeight:1}}>⠿</span>
                <span>Grab the <strong style={{color:"#f5f5f5"}}>⠿</strong> handle to drag rows into the correct order. Click any caption field to edit it directly.</span>
              </div>

              <div className="pair-list">
                <div className="pair-header">
                  <span className="label" style={{margin:0}}>#</span>
                  <span className="label" style={{margin:0}}>Image</span>
                  <span className="label" style={{margin:0}}>Filename</span>
                  <span className="label" style={{margin:0}}>Caption</span>
                  <span/>
                </div>

                {pairs.map((pair, i) => (
                  <div
                    key={pair.id}
                    className={`pair-row${dragOver===i?" drag-over":""}${dragIdx===i?" dragging":""}`}
                    onDragOver={e=>e.preventDefault()}
                    onDragEnter={()=>onDragEnter(i)}
                    onDragEnd={onDragEnd}
                  >
                    <span className="pair-num">{i+1}</span>
                    <img className="pair-thumb" src={pair.img.url} alt={pair.img.name}/>
                    <div className="pair-filename" title={pair.img.name}>{pair.img.name}</div>
                    <input
                      className="pair-caption-input"
                      value={pair.caption}
                      onChange={e=>editCaption(i,e.target.value)}
                      onClick={e=>e.stopPropagation()}
                      onMouseDown={e=>e.stopPropagation()}
                      placeholder="Enter caption…"
                    />
                    <span
                      className="drag-handle"
                      draggable
                      onDragStart={()=>onDragStart(i)}
                      title="Drag to reorder"
                    >⠿</span>
                  </div>
                ))}
              </div>

              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <button className="btn btn-primary" onClick={()=>setStep("configure")}>
                  Choose Template →
                </button>
                <span style={{fontSize:12,color:"var(--muted)"}}>
                  {pairs.length} pair{pairs.length!==1?"s":""} confirmed
                </span>
              </div>
            </>
          )}

          {/* ── STEP 3: Template & format ── */}
          {step==="configure" && (
            <>
              <span className="back-link" onClick={()=>setStep("confirm")}>← Back to matches</span>
              <div className="section-title">Choose a template</div>
              <div className="section-sub">Pick the overlay style and output dimensions for your batch.</div>

              <div className="label">Overlay Style</div>
              <div className="template-grid">
                {TEMPLATES.map(t=>(
                  <div key={t.id} className={`template-card${template.id===t.id?" selected":""}`} onClick={()=>setTemplate(t)}>
                    <div style={{width:"100%",height:"100%",background:tplBg(t.id),display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontFamily:"'DM Serif Display',serif",fontSize:10,color:t.id==="xhs-soft"||t.id==="stamp"?"#111":"#fff",opacity:.85}}>Aa</span>
                    </div>
                    <div className="template-card-label">{t.name}</div>
                    {template.id===t.id && <div style={{position:"absolute",top:6,right:6,width:18,height:18,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff"}}>✓</div>}
                  </div>
                ))}
              </div>

              <div className="divider"/>
              <div className="label">Output Format</div>
              <div className="ratio-row">
                {ASPECT_RATIOS.map(r=>(
                  <button key={r.value} className={`ratio-btn${aspect.value===r.value?" selected":""}`} onClick={()=>setAspect(r)}>
                    {r.label}
                  </button>
                ))}
              </div>

              <button className="btn btn-primary" onClick={renderAll} disabled={rendering}>
                {rendering?<><div className="spinner"/>Rendering…</>:`Render ${pairs.length} image${pairs.length>1?"s":""} →`}
              </button>
            </>
          )}

          {/* ── STEP 4: Preview & export ── */}
          {step==="preview" && (
            <>
              <span className="back-link" onClick={()=>setStep("configure")}>← Back to template</span>
              <div className="section-title">Preview & Export</div>
              <div className="section-sub">{rendered.length} images rendered · "{template.name}" · {aspect.label}</div>

              <div className="export-bar">
                <div className="export-info">
                  <strong>{rendered.length} files ready</strong>
                  <span>{aspect.label} · {template.name} · {aspect.w}×{aspect.h}px</span>
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setStep("confirm")}>Edit matches</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setStep("configure")}>Change template</button>
                  <button className="btn btn-primary" onClick={downloadAll}>⬇ Download all (.zip)</button>
                </div>
              </div>

              <div className="preview-grid">
                {rendered.map((r,i)=>(
                  <div key={i} className="preview-card">
                    <img src={r.dataUrl} alt={r.name}/>
                    <div className="preview-card-footer">
                      <div>
                        <div className="preview-name">{r.name}</div>
                        <div className="caption-preview">{r.caption}</div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={()=>downloadOne(r)} style={{padding:"4px 10px",fontSize:11,flexShrink:0}}>↓</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}

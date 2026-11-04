/* Flowline · util — helpers compartilhados por todos os módulos (carregar primeiro). */
window.FL = window.FL || {};

(function (FL) {
  const U = (FL.util = {});

  U.uid = (p = '') => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  U.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.$ = (sel, root = document) => root.querySelector(sel);
  U.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  U.el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
  U.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  U.sum = (a) => a.reduce((s, v) => s + (+v || 0), 0);
  U.initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  U.money = (v, short = true) => {
    v = +v || 0;
    if (short && Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    if (short && Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'k';
    return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };
  U.num = (v, d = 2) => (v == null || isNaN(v) ? '—' : (+v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));

  // Cor estável por pessoa (avatar)
  const AV = ['#2650E0', '#0F6E78', '#7A4CC2', '#B5470B', '#1F7A4D', '#B07A00', '#C0362C', '#344054'];
  U.personColor = (name) => { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV[h % AV.length]; };
  U.avatar = (name, size = 26) => name ? `<span class="av" title="${U.esc(name)}" style="background:${U.personColor(name)};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${U.initials(name)}</span>` : '';

  /* ---------- Datas (ISO YYYY-MM-DD, dias úteis seg–sex) ---------- */
  const D = (U.date = {});
  D.parse = (iso) => { if (!iso) return null; const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  D.iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  D.today = () => D.iso(new Date());
  D.addDays = (iso, n) => { const d = D.parse(iso); d.setDate(d.getDate() + n); return D.iso(d); };
  D.isWork = (iso) => { const g = D.parse(iso).getDay(); return g !== 0 && g !== 6; };
  D.nextWork = (iso) => { while (!D.isWork(iso)) iso = D.addDays(iso, 1); return iso; };
  D.prevWork = (iso) => { while (!D.isWork(iso)) iso = D.addDays(iso, -1); return iso; };
  /** Anda n dias úteis a partir de iso (n pode ser negativo). n=0 normaliza para dia útil. */
  D.addWork = (iso, n) => {
    iso = n >= 0 ? D.nextWork(iso) : D.prevWork(iso);
    const step = n >= 0 ? 1 : -1; let left = Math.abs(n);
    while (left > 0) { iso = D.addDays(iso, step); if (D.isWork(iso)) left--; }
    return iso;
  };
  /** Dias úteis entre a e b, inclusivo (duração). */
  D.workBetween = (a, b) => {
    if (!a || !b) return 0; if (b < a) return -D.workBetween(b, a);
    let n = 0, d = a; while (d <= b) { if (D.isWork(d)) n++; d = D.addDays(d, 1); } return n;
  };
  D.diff = (a, b) => Math.round((D.parse(b) - D.parse(a)) / 864e5);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  D.MON = MON;
  const pt = () => FL.lang && FL.lang() === 'pt';
  const mon = () => (FL.months ? FL.months() : MON);
  D.short = (iso) => { if (!iso) return '—'; const d = D.parse(iso); return pt() ? `${d.getDate()} ${mon()[d.getMonth()]}` : `${MON[d.getMonth()]} ${d.getDate()}`; };
  D.fmt = (iso) => { if (!iso) return '—'; const d = D.parse(iso); const mm = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0'), yy = String(d.getFullYear()).slice(2); return pt() ? `${dd}/${mm}/${yy}` : `${mm}/${dd}/${yy}`; };
  D.long = (iso) => { if (!iso) return '—'; const d = D.parse(iso); return pt() ? `${d.getDate()} ${mon()[d.getMonth()]} ${d.getFullYear()}` : `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
  D.rel = (ts) => {
    const s = Math.round((Date.now() - ts) / 1000);
    const p = pt();
    if (s < 45) return p ? 'agora há pouco' : 'just now'; if (s < 3600) return p ? `há ${Math.round(s / 60)} min` : Math.round(s / 60) + ' min ago';
    if (s < 86400) return p ? `há ${Math.round(s / 3600)} h` : Math.round(s / 3600) + ' h ago'; return p ? `há ${Math.round(s / 86400)} d` : Math.round(s / 86400) + ' d ago';
  };
  D.time = (ts) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  /* ---------- Ícones (traço 1.5, 16px, mesmo estilo das telas do Teardown) ---------- */
  const P = {
    home: 'M2.5 7 8 2.5 13.5 7v6.5h-11zM6.5 13.5v-4h3v4',
    menu: 'M2.5 4h11M2.5 8h11M2.5 12h11',
    moon: 'M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z',
    sun: 'M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1',
    plus: 'M8 3v10M3 8h10',
    search: 'M7 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM10.5 10.5l3 3',
    grid: 'M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z',
    user: 'M8 8a2.75 2.75 0 1 0 0-5.5A2.75 2.75 0 0 0 8 8zM3 13.5c.6-2.4 2.6-3.75 5-3.75s4.4 1.35 5 3.75',
    check: 'M3 8.5 6.5 12 13 4.5',
    x: 'M4 4l8 8M12 4l-8 8',
    chev: 'M4.5 6 8 9.5 11.5 6',
    chevR: 'M6 4.5 9.5 8 6 11.5',
    chevL: 'M10 4.5 6.5 8 10 11.5',
    flow: 'M2.5 3h4v3h-4zM9.5 10h4v3h-4zM4.5 6v2.5a1 1 0 0 0 1 1h6v.5',
    gantt: 'M2.5 3.5h6M5 7.5h7M3.5 11.5h5M2.5 2v12',
    board: 'M2.5 2.5h3.5v11H2.5zM7.25 2.5h3.5v7h-3.5zM12 2.5h1.5v9H12z',
    doc: 'M4 2.5h5.5l2.5 2.5v8.5H4zM9.5 2.5V5H12M6 8h4M6 10.5h4',
    target: 'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    book: 'M3 3h4a1.5 1.5 0 0 1 1 .5v10a1.5 1.5 0 0 0-1-.5H3zM13 3H9a1.5 1.5 0 0 0-1 .5v10a1.5 1.5 0 0 1 1-.5h4z',
    trend: 'M2.5 12.5 6 8l3 2.5 4.5-6',
    folder: 'M2.5 4.5h4l1.5 1.5h5.5v6.5h-11z',
    pointer: 'M3.5 2.5 12 8l-4 1-2 4z',
    hand: 'M5.5 8V3.75a1 1 0 0 1 2 0V7.5M7.5 7V3a1 1 0 0 1 2 0v4.5M9.5 7.5V4.25a1 1 0 0 1 2 0V9.5c0 2.2-1.6 4-4 4-1.6 0-2.6-.7-3.4-2L2.6 8.9a1 1 0 0 1 1.6-1.1l1.3 1.3',
    text: 'M3.5 4V3h9v1M8 3v10M6 13h4',
    sticky: 'M2.5 2.5h11v7l-4 4h-7zM13.5 9.5h-4v4',
    frame: 'M4.5 1.5v13M11.5 1.5v13M1.5 4.5h13M1.5 11.5h13',
    line: 'M3 13 13 3M9.5 3H13v3.5',
    image: 'M2.5 3h11v10h-11zM2.5 11l3.5-3.5 3 3 2-2 2.5 2.5M10 6.25a.75.75 0 1 0 0 .01',
    chart: 'M2.5 2.5v11h11M5 10.5l2.5-3 2 1.5L13 5',
    undo: 'M5.5 3.5 2.5 6.5l3 3M2.5 6.5H10a3.5 3.5 0 0 1 0 7H7',
    redo: 'M10.5 3.5l3 3-3 3M13.5 6.5H6a3.5 3.5 0 0 0 0 7h3',
    fit: 'M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10',
    minus: 'M3 8h10',
    download: 'M8 2.5v8M4.5 7 8 10.5 11.5 7M2.5 13.5h11',
    upload: 'M8 10.5v-8M4.5 6 8 2.5 11.5 6M2.5 13.5h11',
    trash: 'M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 9h6l.5-9',
    copy: 'M5.5 5.5h8v8h-8zM10.5 5.5V2.5h-8v8h3',
    link: 'M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1',
    indent: 'M2.5 3.5h11M7 6.5h6.5M7 9.5h6.5M2.5 12.5h11M2.5 6l2.5 2-2.5 2',
    outdent: 'M2.5 3.5h11M7 6.5h6.5M7 9.5h6.5M2.5 12.5h11M5 6 2.5 8 5 10',
    flag: 'M3.5 14V2.5M3.5 3h8l-1.5 3 1.5 3h-8',
    diamond: 'M8 2.5 13.5 8 8 13.5 2.5 8z',
    bolt: 'M9 1.5 3.5 9h4L7 14.5 12.5 7h-4z',
    layers: 'M8 2.5 13.5 5.5 8 8.5 2.5 5.5zM2.5 8.5 8 11.5l5.5-3',
    filter: 'M2.5 3h11l-4.25 5v5l-2.5-1.25V8z',
    dots: 'M3.5 8h.01M8 8h.01M12.5 8h.01',
    play: 'M5 3.5v9l7-4.5z',
    fish: 'M1.5 8h10M11.5 8l3-3v6zM4 8 2.5 5M4 8l-1.5 3M7 8 5.5 5M7 8l-1.5 3M10 8 8.5 5M10 8l-1.5 3',
    table: 'M2.5 3h11v10h-11zM2.5 6.5h11M2.5 10h11M6.5 3v10',
    sipoc: 'M2 4h2.4v8H2zM4.9 4h2.4v8H4.9zM7.8 4h2.4v8H7.8zM10.7 4h2.4v8h-2.4z',
    brain: 'M6 2.5a2 2 0 0 0-2 2 2 2 0 0 0-1.5 3.25A2 2 0 0 0 4 11a2 2 0 0 0 2 2.5V2.5zM10 2.5a2 2 0 0 1 2 2 2 2 0 0 1 1.5 3.25A2 2 0 0 1 12 11a2 2 0 0 1-2 2.5V2.5z',
    box: 'M8 2 13.5 5v6L8 14 2.5 11V5zM2.5 5 8 8l5.5-3M8 8v6',
    clock: 'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM8 5v3.25l2 1.25',
    alert: 'M8 2.5 14 13H2zM8 6.5v3M8 11.25v.01',
    eye: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    lock: 'M4 7.5h8v6H4zM5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2',
    gate: 'M3 13.5V4l5-1.5L13 4v9.5M3 8h10M8 2.5v11',
    connector: 'M3 12.5h3.5V3.5H13M11 1.5l2 2-2 2',
    sparkle: 'M8 2v3M8 11v3M2 8h3M11 8h3M4 4l1.75 1.75M10.25 10.25 12 12M4 12l1.75-1.75M10.25 5.75 12 4',
    save: 'M3 2.5h8l2.5 2.5v8.5h-11zM5 2.5v3.5h5V2.5M5 13.5V9h6v4.5',
    present: 'M2 3h12v8H2zM8 11v2.5M5.5 13.5h5',
    group: 'M2.5 2.5h7v7h-7zM6.5 6.5h7v7h-7z',
    alignL: 'M2.5 2v12M5 4.5h7v2.5H5zM5 9h4.5v2.5H5z',
    alignC: 'M8 2v12M4.5 4.5h7v2.5h-7zM5.75 9h4.5v2.5h-4.5z',
    alignR: 'M13.5 2v12M4 4.5h7v2.5H4zM6.5 9H11v2.5H6.5z',
    alignT: 'M2 2.5h12M4.5 5v7h2.5V5zM9 5v4.5h2.5V5z',
    alignM: 'M2 8h12M4.5 4.5v7h2.5v-7zM9 5.75v4.5h2.5v-4.5z',
    alignB: 'M2 13.5h12M4.5 4v7h2.5V4zM9 6.5V11h2.5V6.5z',
    distH: 'M2.5 2v12M13.5 2v12M6 5h4v6H6z',
    front: 'M5.5 5.5h8v8h-8zM2.5 2.5h8v3',
    back: 'M2.5 2.5h8v8h-8zM13.5 5.5v8h-8',
  };
  U.ICONS = P;
  U.ic = (name, size = 16, sw = name === 'dots' ? 3 : 1.5) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[name] || ''}"/></svg>`;

  /** Copiar texto — com fallback para o iframe do Apps Script, onde a Clipboard API pode estar bloqueada. */
  U.copy = (text) => {
    const fallback = () => { const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (_) { } t.remove(); };
    try { navigator.clipboard.writeText(text).catch(fallback); } catch (_) { fallback(); }
  };

  /* ---------- Download / arquivos ---------- */
  U.download = (name, data, type = 'application/octet-stream') => {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  U.readFile = (file, as = 'dataURL') => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej;
    as === 'text' ? r.readAsText(file) : r.readAsDataURL(file);
  });
  /** Reduz imagens grandes (prints do Minitab chegam a 4K) para manter o banco leve. */
  U.shrinkImage = (dataURL, max = 1600) => new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      if (k >= 1 && dataURL.length < 900000) return res({ src: dataURL, w: img.width, h: img.height });
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      res({ src: c.toDataURL('image/jpeg', 0.86), w: c.width, h: c.height });
    };
    img.onerror = () => res(null);
    img.src = dataURL;
  });

  /* ---------- Medição de texto (quebra de linha em SVG sem foreignObject) ---------- */
  const mctx = document.createElement('canvas').getContext('2d');
  U.measure = (text, size = 14, weight = 400) => { mctx.font = `${weight} ${size}px Geist, system-ui, sans-serif`; return mctx.measureText(text).width; };
  /** Quebra texto em linhas que cabem em maxW. Respeita \n. */
  U.wrap = (text, maxW, size = 14, weight = 400) => {
    const out = [];
    String(text ?? '').split('\n').forEach((para) => {
      const words = para.split(/(\s+)/).filter((w) => w.length);
      let line = '';
      if (!words.length) { out.push(''); return; }
      for (const w of words) {
        const test = line + w;
        if (U.measure(test.trimEnd(), size, weight) <= maxW || !line.trim()) {
          // palavra maior que a linha: quebra por caractere
          if (!line.trim() && U.measure(w, size, weight) > maxW && w.trim()) {
            let chunk = '';
            for (const ch of w) { if (U.measure(chunk + ch, size, weight) > maxW && chunk) { out.push(chunk); chunk = ch; } else chunk += ch; }
            line = chunk;
          } else line = test;
        } else { out.push(line.trimEnd()); line = w.trimStart(); }
      }
      out.push(line.trimEnd());
    });
    return out;
  };
})(window.FL);

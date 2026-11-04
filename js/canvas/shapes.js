/* Flowline · biblioteca de formas do canvas.
   Básicas, fluxograma, Lean Six Sigma (TMAP, PMAP, Product map, VSM, Kaizen) e gráficos vivos.
   Cada forma desenha em coordenadas locais (0..w, 0..h) e devolve SVG em string. */
(function (FL) {
  const U = FL.util;
  const SH = (FL.shapes = {});

  SH.FILLS = ['#FFFFFF', '#F0F3F7', '#E8EEFC', '#DDF0F1', '#E1F2E8', '#FBF1D9', '#FCE6D8', '#FBE4E2', '#EFE7FA', '#FCE38A', '#2650E0', '#0F6E78', '#2E9A63', '#B07A00', '#B5470B', '#C0362C', '#7A4CC2', '#344054', '#0E1726'];
  SH.STROKES = ['#0E1726', '#5B6577', '#CBD2DC', '#2650E0', '#0F6E78', '#1F7A4D', '#B07A00', '#B5470B', '#C0362C', '#7A4CC2'];
  const PH = { D: '#2650E0', M: '#0F6E78', A: '#7A4CC2', I: '#B5470B', C: '#1F7A4D', P: '#2650E0', S: '#344054' };

  const hexLum = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 1; const n = parseInt(m[1], 16); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255); };
  SH.onFill = (fill, c) => (!fill || fill === 'none' ? c.ink9 : hexLum(fill) > 0.42 ? '#0E1726' : '#FFFFFF');

  /** Texto quebrado e alinhado dentro de box. */
  const txt = (SH.text = (s, box, c, o = {}) => {
    const fs = s.fs || o.fs || 14, fw = s.bold || o.bold ? 600 : 400; const lh = fs * 1.3;
    const pad = o.pad ?? 8; const maxW = Math.max(10, box.w - pad * 2);
    const lines = U.wrap(s.text || '', maxW, fs, fw);
    const align = s.align || o.align || 'center';
    const totalH = lines.length * lh; const valign = o.valign || 'middle';
    let y0 = valign === 'top' ? box.y + pad + fs * 0.95 : box.y + (box.h - totalH) / 2 + fs * 0.95;
    const x = align === 'left' ? box.x + pad : align === 'right' ? box.x + box.w - pad : box.x + box.w / 2;
    const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
    const color = s.color || o.color || c.ink9;
    return `<text font-size="${fs}" font-weight="${fw}" fill="${color}" text-anchor="${anchor}" font-family="Geist, system-ui, sans-serif">${lines.map((l, i) => `<tspan x="${x}" y="${y0 + i * lh}">${U.esc(l) || ' '}</tspan>`).join('')}</text>`;
  });
  const fillOf = (s, def, c) => (s.fill === 'none' ? 'none' : s.fill || def || c.surface);
  const strokeOf = (s, def, c) => s.stroke || def || c.ink9;
  const sw = (s) => s.sw ?? 1.5;
  const dash = (s) => (s.dash ? 'stroke-dasharray="6 4"' : '');
  const full = (s) => ({ x: 0, y: 0, w: s.w, h: s.h });

  /* Gera forma geométrica simples a partir de um path(s) */
  const geo = (name, group, path, o = {}) => ({
    name, group, w: o.w || 140, h: o.h || 70,
    render(s, c) { const f = fillOf(s, o.fill, c); return `<path d="${path(s.w, s.h)}" fill="${f}" stroke="${strokeOf(s, o.stroke, c)}" stroke-width="${sw(s)}" ${dash(s)} stroke-linejoin="round"/>` + (o.extra ? o.extra(s, c) : '') + txt(s, o.tbox ? o.tbox(s) : full(s), c, { color: s.color || SH.onFill(f === 'none' ? null : f, c) }); },
    preview: (w, h) => path(w, h),
  });
  const R = (w, h, r = 0) => `M${r} 0H${w - r}${r ? `Q${w} 0 ${w} ${r}` : ''}V${h - r}${r ? `Q${w} ${h} ${w - r} ${h}` : ''}H${r}${r ? `Q0 ${h} 0 ${h - r}` : ''}V${r}${r ? `Q0 0 ${r} 0` : ''}Z`;

  const T = {};
  /* ---------- Básicas / fluxograma ---------- */
  T.process = geo('Process', 'Flowchart', (w, h) => R(w, h, 3));
  T.round = geo('Rounded box', 'Basic', (w, h) => R(w, h, Math.min(14, h / 3)));
  T.decision = geo('Decision', 'Flowchart', (w, h) => `M${w / 2} 0L${w} ${h / 2}L${w / 2} ${h}L0 ${h / 2}Z`, { w: 140, h: 90, tbox: (s) => ({ x: s.w * 0.18, y: s.h * 0.15, w: s.w * 0.64, h: s.h * 0.7 }) });
  T.terminator = geo('Start / end', 'Flowchart', (w, h) => R(w, h, h / 2), { h: 56 });
  T.data = geo('Data (I/O)', 'Flowchart', (w, h) => `M${w * 0.16} 0H${w}L${w * 0.84} ${h}H0Z`, { tbox: (s) => ({ x: s.w * 0.14, y: 0, w: s.w * 0.72, h: s.h }) });
  T.document = geo('Document', 'Flowchart', (w, h) => `M0 0H${w}V${h * 0.84}C${w * 0.75} ${h * 0.68} ${w * 0.25} ${h * 1.08} 0 ${h * 0.86}Z`, { tbox: (s) => ({ x: 0, y: 0, w: s.w, h: s.h * 0.84 }) });
  T.predefined = geo('Predefined process', 'Flowchart', (w, h) => `${R(w, h)}M${w * 0.1} 0V${h}M${w * 0.9} 0V${h}`, { tbox: (s) => ({ x: s.w * 0.1, y: 0, w: s.w * 0.8, h: s.h }) });
  T.database = geo('Database', 'Flowchart', (w, h) => { const r = Math.min(12, h * 0.16); return `M0 ${r}C0 ${-r / 3} ${w} ${-r / 3} ${w} ${r}V${h - r}C${w} ${h + r / 3} 0 ${h + r / 3} 0 ${h - r}ZM0 ${r}C0 ${r * 2.3} ${w} ${r * 2.3} ${w} ${r}`; }, { w: 110, h: 80, tbox: (s) => ({ x: 0, y: s.h * 0.25, w: s.w, h: s.h * 0.7 }) });
  T.manual = geo('Manual input', 'Flowchart', (w, h) => `M0 ${h * 0.28}L${w} 0V${h}H0Z`, { tbox: (s) => ({ x: 0, y: s.h * 0.2, w: s.w, h: s.h * 0.8 }) });
  T.delay = geo('Delay', 'Flowchart', (w, h) => `M0 0H${w - h / 2}A${h / 2} ${h / 2} 0 0 1 ${w - h / 2} ${h}H0Z`);
  T.hexagon = geo('Preparation', 'Flowchart', (w, h) => `M${w * 0.15} 0H${w * 0.85}L${w} ${h / 2}L${w * 0.85} ${h}H${w * 0.15}L0 ${h / 2}Z`, { tbox: (s) => ({ x: s.w * 0.12, y: 0, w: s.w * 0.76, h: s.h }) });
  T.offpage = geo('Off-page link', 'Flowchart', (w, h) => `M0 0H${w}V${h * 0.6}L${w / 2} ${h}L0 ${h * 0.6}Z`, { w: 70, h: 70, tbox: (s) => ({ x: 0, y: 0, w: s.w, h: s.h * 0.62 }) });
  T.ellipse = geo('Ellipse', 'Basic', (w, h) => `M0 ${h / 2}A${w / 2} ${h / 2} 0 1 0 ${w} ${h / 2}A${w / 2} ${h / 2} 0 1 0 0 ${h / 2}Z`, { w: 120, h: 80, tbox: (s) => ({ x: s.w * 0.12, y: s.h * 0.12, w: s.w * 0.76, h: s.h * 0.76 }) });
  T.triangle = geo('Triangle', 'Basic', (w, h) => `M${w / 2} 0L${w} ${h}H0Z`, { w: 100, h: 86, tbox: (s) => ({ x: s.w * 0.2, y: s.h * 0.4, w: s.w * 0.6, h: s.h * 0.6 }) });
  T.rect = geo('Rectangle', 'Basic', (w, h) => R(w, h));

  T.text = { name: 'Text', group: 'Basic', w: 200, h: 40, render: (s, c) => txt(s, full(s), c, { align: s.align || 'left', pad: 2 }), preview: () => '' };
  T.sticky = {
    name: 'Sticky note', group: 'Basic', w: 160, h: 140,
    render(s, c) { const f = s.fill || '#FCE38A'; return `<path d="M0 0H${s.w}V${s.h - 18}L${s.w - 18} ${s.h}H0Z" fill="${f}" stroke="rgba(14,23,38,.12)"/><path d="M${s.w} ${s.h - 18}H${s.w - 18}V${s.h}" fill="rgba(14,23,38,.08)"/>` + txt(s, full(s), c, { color: SH.onFill(f, c), valign: 'top', align: s.align || 'left', pad: 12 }); },
  };
  T.frame = {
    name: 'Frame / container', group: 'Basic', w: 520, h: 340, container: true,
    render(s, c) {
      const f = s.fill || c.surface2;
      return `<rect width="${s.w}" height="${s.h}" rx="8" fill="${f}" fill-opacity="${s.fill ? 0.55 : 0.8}" stroke="${s.stroke || c.lineStrong}" stroke-width="${s.sw ?? 1.2}" ${dash(s)}/>
        <path d="M0 8Q0 0 8 0H${s.w - 8}Q${s.w} 0 ${s.w} 8V34H0Z" fill="${s.stroke || c.ink9}" fill-opacity="${s.stroke ? 1 : 0.06}"/>` + txt({ ...s, fs: s.fs || 14, bold: true }, { x: 6, y: 0, w: s.w - 12, h: 34 }, c, { align: 'left', color: s.stroke ? '#fff' : c.ink9, pad: 8 });
    },
    tbox: (s) => ({ x: 6, y: 0, w: s.w - 12, h: 34 }),
  };
  T.lane = {
    name: 'Swimlane', group: 'Basic', w: 1200, h: 150, container: true,
    render(s, c) {
      const hw = 120; const f = s.fill || c.surface3;
      return `<rect width="${s.w}" height="${s.h}" fill="${c.board}" fill-opacity=".3" stroke="${c.lineStrong}"/><rect width="${hw}" height="${s.h}" fill="${f}" stroke="${c.lineStrong}"/>` + txt({ ...s, bold: true }, { x: 0, y: 0, w: hw, h: s.h }, c, { color: SH.onFill(f, c) });
    },
    tbox: (s) => ({ x: 0, y: 0, w: 120, h: s.h }),
  };
  T.image = {
    name: 'Image', group: 'Basic', w: 320, h: 220,
    render(s, c) {
      const src = s.img && FL.store.assets[s.img];
      return src ? `<image href="${src}" width="${s.w}" height="${s.h}" preserveAspectRatio="xMidYMid meet"/><rect width="${s.w}" height="${s.h}" fill="none" stroke="${c.line}"/>`
        : `<rect width="${s.w}" height="${s.h}" fill="${c.surface2}" stroke="${c.lineStrong}" stroke-dasharray="5 4"/><text x="${s.w / 2}" y="${s.h / 2}" text-anchor="middle" font-size="13" fill="${c.ink5}" font-family="Geist">Paste (Ctrl+V) or drop an image</text>`;
    },
    tbox: () => null,
  };

  /* ---------- Lean Six Sigma: TMAP ---------- */
  const node = (name, fill, o = {}) => ({
    name, group: 'Thought process map', w: 260, h: 84,
    render(s, c) {
      const f = s.fill || fill; const ink = SH.onFill(f, c);
      let extra = '';
      if (o.tag) extra = `<text x="12" y="17" font-size="10" font-weight="700" letter-spacing=".08em" fill="${ink}" fill-opacity=".75" font-family="Geist">${o.tag}</text>`;
      const shape = o.note ? `<path d="M0 0H${s.w}V${s.h - 14}L${s.w - 14} ${s.h}H0Z" fill="${f}" stroke="${s.stroke || 'rgba(14,23,38,.18)'}"/><path d="M${s.w} ${s.h - 14}H${s.w - 14}V${s.h}" fill="rgba(14,23,38,.1)"/>`
        : `<rect width="${s.w}" height="${s.h}" rx="${o.r ?? 6}" fill="${f}" stroke="${s.stroke || o.stroke || 'none'}" stroke-width="${sw(s)}"/>`;
      return shape + extra + txt({ ...s, bold: s.bold ?? o.bold }, o.tag ? { x: 0, y: 14, w: s.w, h: s.h - 14 } : full(s), c, { color: ink, align: o.align });
    },
    tbox: (s) => (o.tag ? { x: 0, y: 14, w: s.w, h: s.h - 14 } : full(s)),
    preview: o.preview,
  });
  T['tmap-q'] = node('Question / hypothesis', '#2E9A63', { tag: 'QUESTION', bold: true });
  T['tmap-a'] = node('Action / tool used', '#2650E0', { tag: 'ACTION' });
  T['tmap-d'] = node('Decision / finding', '#FCE38A', { note: true, align: 'left' });
  T['tmap-l'] = node('Key learning', '#0E1726', { tag: 'KEY LEARNING', align: 'left', stroke: '#5B6577' });
  T.phase = {
    name: 'Phase marker', group: 'Thought process map', w: 48, h: 48, fixedRatio: true,
    render(s, c) { const f = s.fill || PH[(s.text || 'D')[0]] || c.action; const r = Math.min(s.w, s.h) / 2; return `<circle cx="${s.w / 2}" cy="${s.h / 2}" r="${r}" fill="${f}"/><text x="${s.w / 2}" y="${s.h / 2 + r * 0.36}" text-anchor="middle" font-size="${r}" font-weight="700" fill="#fff" font-family="Geist Mono, monospace">${U.esc((s.text || 'D').slice(0, 2))}</text>`; },
    tbox: () => null,
  };

  /* ---------- PMAP: passo com saídas (Y) acima e entradas (X: C/N/S) abaixo ---------- */
  const PS = { box: 72, row: 20, head: 22, gap: 10 };
  T.pstep = {
    name: 'Process step (X/Y)', group: 'Process map', w: 220, h: 200,
    autoH: (s) => PS.head + Math.max(1, (s.outputs || []).length) * PS.row + PS.gap + PS.box + PS.gap + PS.head + Math.max(1, (s.inputs || []).length) * PS.row,
    body: (s) => { const y = PS.head + Math.max(1, (s.outputs || []).length) * PS.row + PS.gap; return { x: 0, y, w: s.w, h: PS.box }; },
    render(s, c) {
      const outs = s.outputs || [], ins = s.inputs || []; const b = T.pstep.body(s);
      const f = s.fill || '#E8EEFC';
      let o = `<text x="0" y="14" font-size="10.5" font-weight="700" letter-spacing=".08em" fill="${c.ink5}" font-family="Geist">OUTPUTS (Y)</text>`;
      outs.forEach((t, i) => { o += `<text x="4" y="${PS.head + i * PS.row + 13}" font-size="12.5" fill="${c.ink7}" font-family="Geist">▸ ${U.esc(t)}</text>`; });
      o += `<line x1="${s.w / 2}" y1="${b.y - PS.gap}" x2="${s.w / 2}" y2="${b.y}" stroke="${c.lineStrong}"/>`;
      o += `<rect x="0" y="${b.y}" width="${s.w}" height="${PS.box}" rx="6" fill="${f}" stroke="${s.stroke || c.action}" stroke-width="1.6"/>` + txt({ ...s, bold: true }, b, c, { color: SH.onFill(f, c) });
      const y2 = b.y + PS.box + PS.gap;
      o += `<line x1="${s.w / 2}" y1="${y2 - PS.gap}" x2="${s.w / 2}" y2="${y2}" stroke="${c.lineStrong}"/>`;
      o += `<text x="0" y="${y2 + 14}" font-size="10.5" font-weight="700" letter-spacing=".08em" fill="${c.ink5}" font-family="Geist">INPUTS (X)</text>`;
      const bc = { C: c.action, N: c.attention, S: c.done };
      ins.forEach((it, i) => {
        const y = y2 + PS.head + i * PS.row;
        o += `<rect x="0" y="${y + 2}" width="22" height="15" rx="3" fill="${bc[it.c] || c.ink5}"/><text x="11" y="${y + 13}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff" font-family="Geist Mono, monospace">${it.c === 'S' ? 'SOP' .slice(0, 1) : it.c || '?'}</text><text x="28" y="${y + 13.5}" font-size="12.5" fill="${c.ink7}" font-family="Geist">${U.esc(it.t)}</text>`;
      });
      return o;
    },
  };
  /* ---------- Product map: cartão de componente com características ---------- */
  T.card = {
    name: 'Component card', group: 'Product map', w: 260, h: 180,
    autoH: (s) => 40 + (s.img ? 120 : 0) + Math.max(1, (s.items || []).length) * 22 + 16,
    render(s, c) {
      const items = s.items || []; let y = 40; const src = s.img && FL.store.assets[s.img];
      let o = `<rect width="${s.w}" height="${s.h}" rx="8" fill="${s.fill || c.surface}" stroke="${s.stroke || c.lineStrong}" stroke-width="1.2"/>`;
      o += `<path d="M0 8Q0 0 8 0H${s.w - 8}Q${s.w} 0 ${s.w} 8V34H0Z" fill="${c.ink9}" fill-opacity=".06"/>` + txt({ ...s, bold: true, fs: s.fs || 13.5 }, { x: 0, y: 0, w: s.w, h: 34 }, c, { align: 'left', pad: 10 });
      if (src) { o += `<image href="${src}" x="10" y="${y}" width="${s.w - 20}" height="110" preserveAspectRatio="xMidYMid meet"/>`; y += 120; }
      o += `<rect x="8" y="${y - 4}" width="${s.w - 16}" height="${Math.max(1, items.length) * 22 + 8}" rx="4" fill="none" stroke="${c.error}" stroke-dasharray="4 3" stroke-opacity=".7"/>`;
      items.forEach((it, i) => {
        const yy = y + i * 22 + 13;
        const tag = it.tag ? `<rect x="${s.w - 16 - 8 - U.measure(it.tag, 10, 700) - 10}" y="${yy - 11}" width="${U.measure(it.tag, 10, 700) + 10}" height="15" rx="3" fill="${it.tag === 'CTQ' ? c.error : c.action}"/><text x="${s.w - 16 - 8 - 5}" y="${yy}" text-anchor="end" font-size="10" font-weight="700" fill="#fff" font-family="Geist Mono, monospace">${U.esc(it.tag)}</text>` : '';
        o += `<text x="16" y="${yy}" font-size="12.5" fill="${c.ink7}" font-family="Geist">${U.esc(it.t)}</text>${tag}`;
      });
      if (!items.length) o += `<text x="16" y="${y + 13}" font-size="12" fill="${c.ink5}" font-family="Geist">Add characteristics in the panel →</text>`;
      return o;
    },
    tbox: (s) => ({ x: 0, y: 0, w: s.w, h: 34 }),
  };
  /* ---------- Padrão Whirlpool GB (copiado do Lucid do Green Belt) ----------
     Process map: y's acima, passo verde, x's abaixo ("C - ...", "N - ...", "SO - ...", * = crítico).
     Product map: cartão com funções y{n}.{k} em vermelho tracejado, foto, nome em barra cinza
     (laranja = componente alterado) e características x{n}.{k} em caixa cinza tracejada. */
  const GB = (SH.GB = { green: '#C8F2C2', greenLine: '#3A8A3A', bar: '#57C35F', barLight: '#CBF0C9', grey: '#D9DCE1', red: '#D23F3F', orange: '#F7963A', panel: '#CDD3DB', ink: '#1E1E1E', sub: '#4A4A4A' });
  const FS = 11.5, LH = 14.5;
  const gbLines = (arr, w, bold) => arr.flatMap((t) => U.wrap(t, w, FS, bold ? 600 : 400));
  const gbText = (lines, x, y, o = {}) => lines.length ? `<text font-size="${FS}" font-weight="${o.bold ? 600 : 400}" fill="${o.color || GB.sub}" text-anchor="${o.anchor || 'middle'}" font-family="Geist, system-ui, sans-serif"${o.deco ? ` text-decoration="${o.deco}"` : ''}>${lines.map((l, i) => `<tspan x="${x}" y="${y + i * LH + FS}">${U.esc(l)}</tspan>`).join('')}</text>` : '';
  SH.gbX = (it) => `${it.c || 'C'} - ${it.t}${it.crit ? '*' : ''}`;
  SH.parseX = (line) => { const m = line.match(/^\s*(SO|C|N)\s*[-–:]\s*(.*?)\s*(\*)?\s*$/i); return m ? { c: m[1].toUpperCase(), t: m[2], crit: !!m[3] } : { c: 'C', t: line.replace(/\*\s*$/, '').trim(), crit: /\*\s*$/.test(line) }; };

  const gbStepParts = (s) => {
    const w = s.w - 4;
    const ys = (s.outputs || []).length ? ["y's:", ...gbLines(s.outputs, w)] : [];
    const xs = (s.inputs || []).length ? ["x's:", ...gbLines((s.inputs || []).map(SH.gbX), w)] : [];
    const top = ys.length ? ys.length * LH + 8 : 0; const bh = s.bh || 64;
    return { ys, xs, top, bh };
  };
  T['gb-step'] = {
    name: 'Process step (GB)', group: 'Process map', w: 170, h: 160,
    autoH: (s) => { const p = gbStepParts(s); return p.top + p.bh + (p.xs.length ? 8 + p.xs.length * LH : 0); },
    body: (s) => { const p = gbStepParts(s); return { x: 0, y: p.top, w: s.w, h: p.bh }; },
    render(s, c) {
      const p = gbStepParts(s); const f = s.fill || GB.green;
      let o = gbText(p.ys, s.w / 2, 0);
      o += `<rect y="${p.top}" width="${s.w}" height="${p.bh}" rx="2" fill="${f}" stroke="${s.stroke || GB.greenLine}" stroke-width="${s.sw ?? 1.3}"/>`;
      o += txt({ ...s, fs: s.fs || 12.5 }, { x: 0, y: p.top, w: s.w, h: p.bh }, c, { color: s.color || SH.onFill(f, c), pad: 6 });
      o += gbText(p.xs, s.w / 2, p.top + p.bh + 8);
      return o;
    },
    tbox: (s) => T['gb-step'].body(s),
  };

  const gbCompParts = (s) => {
    const n = s.n ?? 1, w = s.w - 36;
    const funcs = gbLines((s.funcs || []).map((f, i) => `y${n}.${i + 1} - ${f}`), w, true);
    const items = (s.items || []).map((it, i) => ({ ...it, lines: U.wrap(`x${n}.${i + 1} - ${it.t}${it.crit ? '*' : ''}`, w, FS, 400) }));
    const fh = funcs.length ? funcs.length * LH + 16 : 0;
    const ih = s.imgH || 120; const nameY = 10 + (fh ? fh + 10 : 0) + ih + 8;
    const xh = items.length ? U.sum(items.map((i) => i.lines.length)) * LH + 12 : 0;
    return { funcs, items, fh, ih, nameY, xh, h: nameY + 34 + (xh ? 6 + xh : 0) + 10 };
  };
  T['gb-comp'] = {
    name: 'Component (GB)', group: 'Product map', w: 280, h: 300,
    autoH: (s) => gbCompParts(s).h,
    render(s, c) {
      const p = gbCompParts(s); const src = s.img && FL.store.assets[s.img];
      let o = `<rect width="${s.w}" height="${s.h}" fill="${s.fill || '#FFFFFF'}" stroke="${s.stroke || '#4A4A4A'}" stroke-width="1"/>`;
      if (p.fh) o += `<rect x="10" y="10" width="${s.w - 20}" height="${p.fh}" fill="none" stroke="${GB.red}" stroke-width="1.5" stroke-dasharray="7 4"/>` + gbText(p.funcs, s.w / 2, 18, { color: GB.red, bold: true });
      const iy = 10 + (p.fh ? p.fh + 10 : 0);
      o += src ? `<image href="${src}" x="10" y="${iy}" width="${s.w - 20}" height="${p.ih}" preserveAspectRatio="xMidYMid meet"/>`
        : `<rect x="${s.w / 2 - 50}" y="${iy + 10}" width="100" height="${p.ih - 20}" fill="${c.surface2}" stroke="${c.lineStrong}" stroke-dasharray="4 3"/><text x="${s.w / 2}" y="${iy + p.ih / 2 + 4}" text-anchor="middle" font-size="11" fill="${c.ink5}" font-family="Geist">Photo</text>`;
      o += `<rect x="10" y="${p.nameY}" width="${s.w - 20}" height="34" rx="3" fill="${s.changed ? GB.orange : GB.grey}" stroke="#3C3C3C" stroke-width="1"/>`;
      o += `<text x="${s.w / 2}" y="${p.nameY + 21.5}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${GB.ink}" text-decoration="underline" font-family="Geist, system-ui, sans-serif">${U.esc(U.wrap((s.text || '').toUpperCase(), s.w - 30, 12.5, 700)[0] || '')}</text>`;
      if (p.xh) {
        const y0 = p.nameY + 40; o += `<rect x="10" y="${y0}" width="${s.w - 20}" height="${p.xh}" fill="none" stroke="#9A9A9A" stroke-width="1.2" stroke-dasharray="7 4"/>`;
        let y = y0 + 6; p.items.forEach((it) => { o += gbText(it.lines, 16, y, { anchor: 'start', color: it.st === '+' ? GB.red : it.st === '~' ? '#8A8A8A' : GB.ink, deco: it.st === '~' ? 'line-through' : '' }); y += it.lines.length * LH; });
      }
      return o;
    },
    tbox: (s) => ({ x: 10, y: gbCompParts(s).nameY, w: s.w - 20, h: 34 }),
  };

  /** Lista automática dos x's críticos (*) dos componentes / passos do mesmo grupo. */
  const critList = (s, page) => {
    const sh = ((page && page.data && page.data.shapes) || []).filter((q) => !s.grp || q.grp === s.grp);
    const out = [];
    sh.filter((q) => q.type === 'gb-comp').sort((a, b) => (a.n ?? 0) - (b.n ?? 0)).forEach((q) => (q.items || []).forEach((it, i) => { if (it.crit && it.st !== '~') out.push(`x${q.n ?? 1}.${i + 1} - ${(q.text || '').toLowerCase()} · ${it.t}*`); }));
    sh.filter((q) => q.type === 'gb-step').sort((a, b) => a.x - b.x).forEach((q) => (q.inputs || []).forEach((it) => { if (it.crit) out.push(`${it.c} - ${it.t}* (${q.text})`); }));
    return out;
  };
  SH.critList = critList;
  T['gb-crit'] = {
    name: "Critical X's (auto)", group: 'Product map', w: 420, h: 120,
    autoH: (s, page) => { if (!page) return s.h; const l = gbLines(critList(s, page), s.w - 32); return 34 + 6 + Math.max(1, l.length) * LH + 12; },
    render(s, c, page) {
      const l = gbLines(critList(s, page), s.w - 32);
      let o = `<rect width="${s.w}" height="30" rx="3" fill="${GB.grey}" stroke="#3C3C3C"/><text x="${s.w / 2}" y="19.5" text-anchor="middle" font-size="12.5" font-weight="700" fill="${GB.ink}" font-family="Geist">${U.esc(s.text || "CRITICAL X's")}</text>`;
      o += `<rect y="36" width="${s.w}" height="${s.h - 36}" fill="none" stroke="#9A9A9A" stroke-width="1.2" stroke-dasharray="7 4"/>`;
      o += l.length ? gbText(l, 10, 42, { anchor: 'start', color: GB.ink }) : `<text x="10" y="56" font-size="11.5" fill="${c.ink5}" font-family="Geist">Mark characteristics with * to list them here</text>`;
      return o;
    },
    tbox: (s) => ({ x: 0, y: 0, w: s.w, h: 30 }),
  };
  T['gb-legend'] = {
    name: 'Changed components legend', group: 'Product map', w: 230, h: 84,
    render(s) {
      return `<rect width="${s.w}" height="40" rx="2" fill="${GB.orange}" stroke="#3C3C3C"/><text x="${s.w / 2}" y="25" text-anchor="middle" font-size="12.5" font-weight="700" fill="${GB.ink}" font-family="Geist">CHANGED COMPONENTS</text>
        <rect y="46" width="${s.w}" height="38" fill="none" stroke="#9A9A9A" stroke-width="1.2" stroke-dasharray="7 4"/>${gbText(['excluded'], 6, 48, { anchor: 'start', color: '#8A8A8A', deco: 'line-through', bold: true })}${gbText(['included'], 6, 48 + LH, { anchor: 'start', color: GB.red, bold: true })}`;
    },
    tbox: () => null,
  };
  /** Moldura cinza do process map com título preto: "(Y: ...) Process Map". */
  T['gb-panel'] = {
    name: 'Process map panel (GB)', group: 'Process map', w: 1200, h: 360, container: true,
    render(s, c) {
      const tw = Math.min(s.w - 20, U.measure(s.text || '', 15, 700) + 48);
      return `<rect width="${s.w}" height="${s.h}" fill="${s.fill || GB.panel}" stroke="${s.stroke || '#8A939E'}" stroke-width="1.2"/><rect x="10" y="10" width="${tw}" height="32" fill="#0E1116"/>` + txt({ ...s, fs: s.fs || 15, bold: true }, { x: 10, y: 10, w: tw, h: 32 }, c, { color: '#FFFFFF', pad: 6 });
    },
    tbox: (s) => ({ x: 10, y: 10, w: Math.min(s.w - 20, U.measure(s.text || '', 15, 700) + 48), h: 32 }),
  };
  T.kaizen = {
    name: 'Kaizen burst', group: 'Value stream', w: 150, h: 90,
    render(s, c) {
      const n = 12, cx = s.w / 2, cy = s.h / 2; let d = '';
      for (let i = 0; i < n * 2; i++) { const a = (Math.PI * i) / n; const r = i % 2 ? 0.78 : 1; d += `${i ? 'L' : 'M'}${cx + Math.cos(a) * cx * r} ${cy + Math.sin(a) * cy * r}`; }
      const f = s.fill || '#FCE6D8';
      return `<path d="${d}Z" fill="${f}" stroke="${s.stroke || '#B5470B'}" stroke-width="1.6" stroke-linejoin="round"/>` + txt({ ...s, bold: true, fs: s.fs || 12.5 }, { x: s.w * 0.18, y: s.h * 0.18, w: s.w * 0.64, h: s.h * 0.64 }, c, { color: SH.onFill(f, c), pad: 0 });
    },
    tbox: (s) => ({ x: s.w * 0.18, y: s.h * 0.18, w: s.w * 0.64, h: s.h * 0.64 }),
  };
  /* ---------- VSM ---------- */
  T['vsm-proc'] = {
    name: 'VSM process + data box', group: 'Value stream', w: 170, h: 200,
    render(s, c) {
      const d = s.data || {}; const keys = Object.keys(d); const f = s.fill || c.surface;
      let o = `<rect width="${s.w}" height="56" fill="${f}" stroke="${s.stroke || c.ink9}" stroke-width="1.6"/>` + txt({ ...s, bold: true }, { x: 0, y: 0, w: s.w, h: 56 }, c, { color: SH.onFill(f, c) });
      o += `<rect y="62" width="${s.w}" height="${s.h - 62}" fill="${c.surface}" stroke="${s.stroke || c.ink9}" stroke-width="1.2"/>`;
      keys.forEach((k, i) => { const y = 84 + i * 24; o += `<text x="10" y="${y}" font-size="12" fill="${c.ink5}" font-family="Geist">${U.esc(k)}</text><text x="${s.w - 10}" y="${y}" text-anchor="end" font-size="12.5" font-weight="600" fill="${c.ink9}" font-family="Geist Mono, monospace">${U.esc(d[k])}</text>`; if (i < keys.length - 1) o += `<line x1="8" x2="${s.w - 8}" y1="${y + 8}" y2="${y + 8}" stroke="${c.line}"/>`; });
      return o;
    },
    tbox: (s) => ({ x: 0, y: 0, w: s.w, h: 56 }), autoH: (s) => 62 + Math.max(1, Object.keys(s.data || {}).length) * 24 + 12,
  };
  T['vsm-inv'] = {
    name: 'Inventory', group: 'Value stream', w: 70, h: 62,
    render(s, c) { const d = s.data || {}; return `<path d="M${s.w / 2} 0L${s.w} ${s.h}H0Z" fill="${s.fill || '#FBF1D9'}" stroke="${s.stroke || '#B07A00'}" stroke-width="1.6" stroke-linejoin="round"/><text x="${s.w / 2}" y="${s.h * 0.78}" text-anchor="middle" font-size="${s.h * 0.34}" font-weight="700" fill="#7A5400" font-family="Geist">I</text>${d.Days != null ? `<text x="${s.w / 2}" y="${s.h + 16}" text-anchor="middle" font-size="12" font-weight="600" fill="${c.ink7}" font-family="Geist Mono, monospace">${U.esc(d.Days)} d</text>` : ''}`; },
    tbox: () => null,
  };
  T['vsm-ext'] = {
    name: 'Supplier / customer', group: 'Value stream', w: 150, h: 100,
    render(s, c) { const w = s.w, h = s.h * 0.62; const f = s.fill || c.surface; return `<path d="M0 ${h}V${h * 0.35}L${w / 3} 0V${h * 0.35}L${(2 * w) / 3} 0V${h * 0.35}L${w} 0V${h}Z" transform="translate(0 ${s.h - h})" fill="${f}" stroke="${s.stroke || c.ink9}" stroke-width="1.6" stroke-linejoin="round"/>` + txt({ ...s, fs: s.fs || 12.5, bold: true }, { x: 0, y: s.h - h * 0.62, w: s.w, h: h * 0.62 }, c, { color: SH.onFill(f, c), pad: 4 }); },
    tbox: (s) => ({ x: 0, y: s.h * 0.62, w: s.w, h: s.h * 0.38 }),
  };
  T['vsm-time'] = {
    name: 'VSM timeline (auto)', group: 'Value stream', w: 1200, h: 90,
    render(s, c, page) {
      const shapes = (page && page.data.shapes) || [];
      const procs = shapes.filter((x) => x.type === 'vsm-proc').sort((a, b) => a.x - b.x);
      const invs = shapes.filter((x) => x.type === 'vsm-inv').sort((a, b) => a.x - b.x);
      const num = (v) => parseFloat(String(v ?? '').replace(',', '.')) || 0;
      const ct = (p) => num((p.data || {})['C/T (s)'] ?? (p.data || {})['C/T']);
      const lead = U.sum(invs.map((i) => num((i.data || {}).Days)));
      const va = U.sum(procs.map(ct));
      const pce = lead ? (va / (lead * 8 * 3600)) * 100 : 0; // 1 dia = 1 turno de 8 h
      const bw = s.w - 210; const n = Math.max(1, procs.length); const seg = bw / n;
      let o = `<rect width="${s.w}" height="${s.h}" fill="none"/>`; let x = 0; let d = '';
      for (let i = 0; i < n; i++) {
        const inv = invs[i]; const p = procs[i];
        d += `${i ? 'L' : 'M'}${x} 14H${x + seg * 0.5}V${s.h - 34}H${x + seg}V14`;
        o += `<text x="${x + seg * 0.25}" y="10" text-anchor="middle" font-size="11.5" font-weight="600" fill="${c.ink7}" font-family="Geist Mono, monospace">${inv ? num(inv.data && inv.data.Days) + ' d' : '—'}</text>`;
        o += `<text x="${x + seg * 0.75}" y="${s.h - 18}" text-anchor="middle" font-size="11.5" font-weight="600" fill="${c.action}" font-family="Geist Mono, monospace">${p ? ct(p) + ' s' : '—'}</text>`;
        x += seg;
      }
      o += `<path d="${d}" fill="none" stroke="${c.ink9}" stroke-width="1.6"/>`;
      const bx = bw + 20;
      o += `<rect x="${bx}" y="0" width="190" height="${s.h}" rx="8" fill="${c.surface}" stroke="${c.ink9}" stroke-width="1.2"/>
        <text x="${bx + 12}" y="22" font-size="11.5" fill="${c.ink5}" font-family="Geist">Lead time</text><text x="${bx + 178}" y="22" text-anchor="end" font-size="13" font-weight="700" fill="${c.ink9}" font-family="Geist Mono, monospace">${lead.toFixed(1)} d</text>
        <text x="${bx + 12}" y="46" font-size="11.5" fill="${c.ink5}" font-family="Geist">Value-add time</text><text x="${bx + 178}" y="46" text-anchor="end" font-size="13" font-weight="700" fill="${c.action}" font-family="Geist Mono, monospace">${va} s</text>
        <text x="${bx + 12}" y="70" font-size="11.5" fill="${c.ink5}" font-family="Geist">PCE</text><text x="${bx + 178}" y="70" text-anchor="end" font-size="13" font-weight="700" fill="${pce < 1 ? c.error : c.done}" font-family="Geist Mono, monospace">${pce.toFixed(3)}%</text>`;
      return o;
    },
    tbox: () => null,
  };
  /* ---------- Gráfico vivo ---------- */
  T.chart = {
    name: 'Live chart', group: 'Analysis', w: 560, h: 320,
    render(s, c) {
      return `<rect width="${s.w}" height="${s.h}" rx="8" fill="${c.surface}" stroke="${c.line}"/><g transform="translate(14 12)">${FL.charts.draw(s, s.w - 28, s.h - 24, c)}</g>`;
    },
    tbox: () => null,
  };

  SH.T = T;
  SH.def = (type) => T[type] || T.process;
  SH.textBox = (s) => { const d = SH.def(s.type); if (d.tbox) return d.tbox(s); return full(s); };
  SH.body = (s) => { const d = SH.def(s.type); return d.body ? d.body(s) : full(s); };
  SH.isContainer = (s) => !!SH.def(s.type).container;

  /** Valores iniciais ao criar uma forma pela biblioteca. */
  SH.create = (type, x, y, extra = {}) => {
    const d = SH.def(type);
    const s = { id: U.uid('s'), type, x, y, w: d.w, h: d.h, text: '' };
    const defaults = {
      process: 'Process step', decision: 'Decision?', terminator: 'Start', data: 'Data', document: 'Document', 'tmap-q': 'Question we need to answer?', 'tmap-a': 'Tool / action taken', 'tmap-d': 'What we learned / decided', 'tmap-l': 'Key learning', phase: 'D', frame: 'Evidence', lane: 'Role', pstep: 'Process step', card: 'Component', kaizen: 'Improvement', 'vsm-proc': 'Process', 'vsm-ext': 'Supplier', text: 'Text', sticky: '',
    };
    s.text = defaults[type] ?? '';
    if (type === 'pstep') { s.outputs = ['Output'], s.inputs = [{ t: 'Input', c: 'C' }]; }
    if (type === 'card') s.items = [{ t: 'Characteristic', tag: 'X' }];
    if (type === 'gb-step') { s.text = 'Process step'; s.outputs = ['Output of this step']; s.inputs = [{ c: 'C', t: 'Controllable input' }, { c: 'N', t: 'Noise' }]; }
    if (type === 'gb-comp') { s.text = 'Component'; s.n = 1; s.funcs = ['What is it for?']; s.items = [{ t: 'material' }, { t: 'size', crit: true }]; }
    if (type === 'gb-panel') s.text = '(Y: Output) Process Map';
    if (type === 'vsm-proc') s.data = { 'C/T (s)': 60, 'C/O (min)': 10, 'Uptime %': 95, Operators: 1 };
    if (type === 'vsm-inv') s.data = { Days: 1 };
    if (type === 'chart') Object.assign(s, { chart: 'imr', title: 'I-MR chart', values: [] });
    Object.assign(s, extra);
    if (d.autoH) s.h = d.autoH(s);
    return s;
  };

  /* Ícones da biblioteca (40×40) */
  SH.preview = (type) => {
    const d = SH.def(type); const st = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"';
    const special = {
      text: `<text x="20" y="27" text-anchor="middle" font-size="20" font-weight="600" fill="currentColor" font-family="Geist">T</text>`,
      sticky: `<path d="M6 6h28v20l-8 8H6z" fill="#FCE38A" stroke="#B07A00" stroke-width="1"/>`,
      frame: `<rect x="4" y="7" width="32" height="26" rx="3" ${st}/><path d="M4 13h32" ${st}/>`,
      lane: `<rect x="3" y="8" width="34" height="24" ${st}/><path d="M11 8v24M11 20h26" ${st}/>`,
      image: `<rect x="5" y="8" width="30" height="24" rx="2" ${st}/><path d="M5 28l9-8 7 6 5-4 9 8" ${st}/>`,
      'tmap-q': `<rect x="3" y="11" width="34" height="18" rx="3" fill="#2E9A63"/><text x="20" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="Geist">?</text>`,
      'tmap-a': `<rect x="3" y="11" width="34" height="18" rx="3" fill="#2650E0"/><path d="M17 15v10l8-5z" fill="#fff"/>`,
      'tmap-d': `<path d="M5 9h30v17l-5 5H5z" fill="#FCE38A" stroke="#B07A00" stroke-width="1"/>`,
      'tmap-l': `<rect x="3" y="11" width="34" height="18" rx="3" fill="#0E1726"/><path d="M12 20h16" stroke="#fff" stroke-width="2"/>`,
      phase: `<circle cx="20" cy="20" r="13" fill="#2650E0"/><text x="20" y="25" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="Geist Mono">D</text>`,
      pstep: `<path d="M8 6h14M8 10h10" stroke="currentColor" stroke-width="1.4"/><rect x="5" y="14" width="30" height="12" rx="2" fill="#E8EEFC" stroke="#2650E0" stroke-width="1.4"/><rect x="5" y="29" width="5" height="4" fill="#2650E0"/><path d="M13 31h14" stroke="currentColor" stroke-width="1.4"/>`,
      card: `<rect x="5" y="5" width="30" height="30" rx="3" ${st}/><path d="M5 12h30" ${st}/><rect x="9" y="16" width="22" height="15" rx="1" fill="none" stroke="#C0362C" stroke-dasharray="2 2"/>`,
      'gb-step': `<path d="M12 6h16M14 9h12" stroke="currentColor" stroke-width="1.2"/><rect x="6" y="13" width="28" height="14" rx="1" fill="#C8F2C2" stroke="#3A8A3A" stroke-width="1.3"/><path d="M11 31h18M13 34h14" stroke="currentColor" stroke-width="1.2"/>`,
      'gb-comp': `<rect x="7" y="3" width="26" height="34" fill="#fff" stroke="#4A4A4A"/><rect x="10" y="6" width="20" height="6" fill="none" stroke="#D23F3F" stroke-dasharray="2 1.5"/><rect x="10" y="20" width="20" height="5" fill="#D9DCE1" stroke="#3C3C3C" stroke-width=".8"/><rect x="10" y="27" width="20" height="7" fill="none" stroke="#9A9A9A" stroke-dasharray="2 1.5"/>`,
      'gb-crit': `<rect x="5" y="7" width="30" height="7" fill="#D9DCE1" stroke="#3C3C3C" stroke-width=".8"/><rect x="5" y="17" width="30" height="16" fill="none" stroke="#9A9A9A" stroke-dasharray="2 1.5"/><path d="M8 22h18M8 27h14" stroke="currentColor"/>`,
      'gb-legend': `<rect x="5" y="8" width="30" height="10" fill="#F7963A" stroke="#3C3C3C" stroke-width=".8"/><rect x="5" y="21" width="30" height="12" fill="none" stroke="#9A9A9A" stroke-dasharray="2 1.5"/><path d="M8 25h12" stroke="#8A8A8A"/><path d="M8 30h12" stroke="#D23F3F"/>`,
      'gb-panel': `<rect x="3" y="7" width="34" height="26" fill="#CDD3DB" stroke="#8A939E"/><rect x="5" y="9" width="16" height="5" fill="#0E1116"/><rect x="7" y="19" width="7" height="6" fill="#C8F2C2" stroke="#3A8A3A" stroke-width=".8"/><rect x="18" y="19" width="7" height="6" fill="#C8F2C2" stroke="#3A8A3A" stroke-width=".8"/><rect x="29" y="19" width="6" height="6" fill="#4F8FE8"/>`,
      kaizen: `<path d="M20 4l3 8 8-4-3 8 8 4-8 3 4 8-8-3-4 8-3-8-8 4 3-8-8-3 8-4-3-8 8 4z" fill="#FCE6D8" stroke="#B5470B" stroke-width="1.2"/>`,
      'vsm-proc': `<rect x="7" y="5" width="26" height="10" ${st}/><rect x="7" y="17" width="26" height="18" ${st}/><path d="M10 23h20M10 29h20" stroke="currentColor" stroke-width="1"/>`,
      'vsm-inv': `<path d="M20 7l14 25H6z" fill="#FBF1D9" stroke="#B07A00" stroke-width="1.4"/><text x="20" y="29" text-anchor="middle" font-size="11" font-weight="700" fill="#7A5400">I</text>`,
      'vsm-ext': `<path d="M4 32V18l10-7v7l10-7v7l10-7v21z" ${st}/>`,
      'vsm-time': `<path d="M3 14h7v12h8V14h7v12h8V14h4" ${st}/>`,
      chart: `<path d="M6 6v28h28" ${st}/><path d="M9 26l6-8 5 4 6-10 6 5" fill="none" stroke="#2650E0" stroke-width="1.8"/><path d="M8 12h26" stroke="#C0362C" stroke-dasharray="2 2"/>`,
    };
    if (special[type]) return `<svg viewBox="0 0 40 40">${special[type]}</svg>`;
    const w = 34, h = type === 'decision' || type === 'ellipse' || type === 'triangle' || type === 'database' || type === 'offpage' ? 28 : 22;
    return `<svg viewBox="0 0 40 40"><g transform="translate(${(40 - w) / 2} ${(40 - h) / 2})"><path d="${d.preview(w, h)}" ${st}/></g></svg>`;
  };

  SH.LIBRARY = [
    { name: 'Thought process map', items: ['tmap-q', 'tmap-a', 'tmap-d', 'tmap-l', 'phase', 'frame', 'image', 'chart'] },
    { name: 'Process map', items: ['gb-step', ['process', { text: 'Decision?', fill: '#4F8FE8', stroke: '#1F4E99', color: '#0E1726', w: 120, h: 70 }, 'Decision (GB)'], ['process', { text: 'Repeat for next sample', fill: '#CDBB8E', stroke: '#5B4A1F', color: '#0E1726', w: 120, h: 80 }, 'Loop back (GB)'], 'gb-panel', 'pstep', 'process', 'decision', 'terminator', 'lane', 'kaizen'] },
    { name: 'Product map', items: ['gb-comp', 'gb-crit', 'gb-legend', ['rect', { text: 'PRODUCT MAP - V1 (BEFORE CHANGES)', fill: '#57C35F', stroke: '#2D2D2D', color: '#0E1726', bold: true, fs: 20, w: 1100, h: 44, sw: 1 }, 'Section header'], ['rect', { text: 'PRODUCT MAP - UNDERSTANDING THE PRODUCT', fill: '#CBF0C9', stroke: '#7BC67B', color: '#0E1726', bold: true, fs: 16, w: 1100, h: 32, sw: 1 }, 'Map title'], 'card', 'image', 'frame', 'sticky'] },
    { name: 'Value stream', items: ['vsm-ext', 'vsm-proc', 'vsm-inv', 'kaizen', 'vsm-time'] },
    { name: 'Flowchart', items: ['process', 'decision', 'terminator', 'data', 'document', 'predefined', 'database', 'manual', 'delay', 'hexagon', 'offpage'] },
    { name: 'Basic', items: ['text', 'sticky', 'rect', 'round', 'ellipse', 'triangle', 'frame', 'lane'] },
    { name: 'Live analysis', items: [['chart', { chart: 'imr', title: 'I-MR chart' }, 'I-MR'], ['chart', { chart: 'pareto', title: 'Pareto', labels: [], values: [] }, 'Pareto'], ['chart', { chart: 'cap', title: 'Capability', values: [] }, 'Capability'], ['chart', { chart: 'run', title: 'Run chart', values: [] }, 'Run chart']] },
  ];

  /* ---------- Templates de página ---------- */
  FL.templates = {
    LIST: [
      { k: 'blank', name: 'Blank canvas', phase: 'D', type: 'canvas', desc: 'Free-form diagram with the full shape library.' },
      { k: 'gb-pmap', name: 'Process Map Maker (GB standard)', phase: 'M', type: 'canvas', maker: 'process', desc: 'Fill in the steps, y’s and x’s — the map is drawn in the Whirlpool GB layout, critical x’s included.' },
      { k: 'gb-product', name: 'Product Map Maker (GB standard)', phase: 'M', type: 'canvas', maker: 'product', desc: 'List components, functions and characteristics — numbered y/x cards around the assembly, with V2 and critical x’s.' },
      { k: 'tmap', name: 'Thought process map (TMAP)', phase: 'D', type: 'canvas', desc: 'Questions → tools → findings → decisions. The project storyline.' },
      { k: 'pmap', name: 'Process map (PMAP)', phase: 'M', type: 'canvas', desc: 'Steps with outputs (Y) and inputs (X) classified C / N / SOP.' },
      { k: 'product', name: 'Product map', phase: 'M', type: 'canvas', desc: 'Assembly + components with characteristics (CTQ / X).' },
      { k: 'vsm', name: 'Value stream map', phase: 'M', type: 'canvas', desc: 'Process + inventory boxes with automatic lead-time ladder and PCE.' },
      { k: 'swimlane', name: 'Swimlane flowchart', phase: 'M', type: 'canvas', desc: 'Cross-functional flow by role.' },
      { k: 'spc', name: 'SPC study (I-MR + capability)', phase: 'M', type: 'canvas', desc: 'Paste a data column and get I-MR, Cp/Cpk instantly.' },
      { k: 'sipoc', name: 'SIPOC', phase: 'D', type: 'sipoc', desc: 'Suppliers, inputs, process, outputs, customers.' },
      { k: 'fishbone', name: 'Fishbone (Ishikawa)', phase: 'A', type: 'fishbone', desc: '6M cause & effect, flag suspects and validated root causes.' },
      { k: 'fmea', name: 'FMEA', phase: 'A', type: 'fmea', desc: 'Failure modes ranked by RPN, actions become plan tasks.' },
    ],
    build(k) {
      const C = (t, x, y, e) => SH.create(t, x, y, e); const E = (a, b, o = {}) => ({ id: U.uid('e'), a: a.id, b: b.id, as: null, bs: null, text: '', arrow: 'end', dash: false, ...o });
      const out = { shapes: [], edges: [], view: { x: 80, y: 60, z: 1 }, rules: [] };
      if (k === 'gb-pmap') return FL.makers.buildProcess(FL.makers.SAMPLE_PROCESS);
      if (k === 'gb-product') return FL.makers.buildProduct(FL.makers.SAMPLE_PRODUCT);
      if (k === 'tmap') {
        const m = C('phase', 0, 18, { text: 'D' }), q = C('tmap-q', 70, 0, { text: 'What exactly is the problem we need to solve?' }), a = C('tmap-a', 70, 130, { text: 'Tool used (e.g. Pareto of field data)' }), f = C('frame', 420, 100, { text: 'Evidence', w: 420, h: 260 }), d = C('tmap-d', 70, 260, { text: 'Finding / decision' }), q2 = C('tmap-q', 70, 400, { text: 'Next question?' });
        out.shapes.push(f, m, q, a, d, q2); out.edges.push(E(m, q, { arrow: 'none', dash: true }), E(q, a), E(a, f), E(a, d), E(d, q2));
      } else if (k === 'pmap') {
        let prev = null; ['Step 1', 'Step 2', 'Step 3', 'Step 4'].forEach((t, i) => { const s = C('pstep', i * 290, 0, { text: t, outputs: ['Output (Y)'], inputs: [{ t: 'Controllable input', c: 'C' }, { t: 'Noise', c: 'N' }, { t: 'Procedure', c: 'S' }] }); out.shapes.push(s); if (prev) out.edges.push(E(prev, s)); prev = s; });
      } else if (k === 'product') {
        const core = C('card', 360, 220, { text: 'Assembly', items: [{ t: 'Customer CTQ', tag: 'CTQ' }] }); out.shapes.push(C('frame', -40, -40, { text: 'PRODUCT MAP', w: 1060, h: 620 }), core);
        [[0, 20], [720, 20], [0, 380], [720, 380]].forEach(([x, y], i) => { const c = C('card', x, y, { text: `Component ${i + 1}`, items: [{ t: 'Characteristic', tag: 'X' }] }); out.shapes.push(c); out.edges.push(E(c, core, { arrow: 'none' })); });
      } else if (k === 'vsm') {
        const sup = C('vsm-ext', 0, 0, { text: 'Supplier' }), cus = C('vsm-ext', 1060, 0, { text: 'Customer' }); out.shapes.push(sup, cus); let prev = sup;
        [0, 1, 2].forEach((i) => { const inv = C('vsm-inv', 80 + i * 320, 200), p = C('vsm-proc', 190 + i * 320, 160, { text: `Process ${i + 1}` }); out.shapes.push(inv, p); out.edges.push(E(prev, inv, { dash: true }), E(inv, p, { dash: true })); prev = p; });
        out.edges.push(E(prev, cus, { dash: true })); out.shapes.push(C('vsm-time', 80, 420, { w: 1100 }));
        out.view.z = 0.8;
      } else if (k === 'swimlane') {
        ['Operator', 'Supervisor', 'Quality'].forEach((l, i) => out.shapes.push(C('lane', 0, i * 150, { text: l })));
        const a = C('terminator', 160, 45, { text: 'Start' }), b = C('process', 380, 190, { text: 'Do something' }), c = C('decision', 600, 330, { text: 'OK?' });
        out.shapes.push(a, b, c); out.edges.push(E(a, b), E(b, c));
      } else if (k === 'spc') {
        out.shapes.push(C('chart', 0, 0, { chart: 'imr', title: 'I-MR chart', values: [], w: 700, h: 400 }), C('chart', 740, 0, { chart: 'cap', title: 'Capability', values: [], w: 520, h: 400 }), C('sticky', 0, 430, { text: 'Paste a column of numbers from Excel or Minitab onto the canvas (Ctrl+V) — or select a chart and paste in the Data box.', w: 360, h: 120 }));
      }
      return out;
    },
  };
})(window.FL);

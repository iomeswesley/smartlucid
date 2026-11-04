/* Flowline · gráficos vivos no canvas — substituem o print do Minitab colado no mapa.
   I-MR (com regras de Western Electric 1 e 2), Pareto, capabilidade (Cp/Cpk/Pp/Ppk) e run chart.
   Saída: SVG puro (exporta para PNG/SVG sem perder nada). */
(function (FL) {
  const U = FL.util;
  const CH = (FL.charts = {});

  CH.TYPES = { imr: 'I-MR control chart', pareto: 'Pareto chart', cap: 'Capability histogram', run: 'Run chart' };

  const mean = (a) => (a.length ? U.sum(a) / a.length : 0);
  const sd = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(U.sum(a.map((v) => (v - m) ** 2)) / (a.length - 1)); };
  const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
  const nice = (v) => { if (!isFinite(v) || v === 0) return 0; const a = Math.abs(v); const d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3; return +v.toFixed(d); };
  const fmt = (v) => (v == null || !isFinite(v) ? '—' : String(nice(v)));

  /** Estatísticas para o painel e para o desenho. */
  CH.stats = (s) => {
    const v = (s.values || []).map(Number).filter((x) => isFinite(x));
    const out = { n: v.length, mean: mean(v), sd: sd(v), median: median(v), min: Math.min(...v), max: Math.max(...v) };
    if (s.chart === 'imr' || s.chart === 'cap') {
      const mr = v.slice(1).map((x, i) => Math.abs(x - v[i]));
      out.mrbar = mean(mr); out.mr = mr;
      out.ucl = out.mean + 2.66 * out.mrbar; out.lcl = out.mean - 2.66 * out.mrbar; out.mrucl = 3.267 * out.mrbar;
      out.sw = out.mrbar / 1.128; // sigma within
      const lsl = s.lsl === '' || s.lsl == null ? null : +s.lsl, usl = s.usl === '' || s.usl == null ? null : +s.usl;
      if (lsl != null || usl != null) {
        const cpu = usl != null ? (usl - out.mean) / (3 * out.sw) : null, cpl = lsl != null ? (out.mean - lsl) / (3 * out.sw) : null;
        const ppu = usl != null ? (usl - out.mean) / (3 * out.sd) : null, ppl = lsl != null ? (out.mean - lsl) / (3 * out.sd) : null;
        out.cp = lsl != null && usl != null ? (usl - lsl) / (6 * out.sw) : null;
        out.cpk = Math.min(...[cpu, cpl].filter((x) => x != null));
        out.pp = lsl != null && usl != null ? (usl - lsl) / (6 * out.sd) : null;
        out.ppk = Math.min(...[ppu, ppl].filter((x) => x != null));
        const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
        out.ppm = Math.round(((lsl != null ? phi((lsl - out.mean) / out.sd) : 0) + (usl != null ? 1 - phi((usl - out.mean) / out.sd) : 0)) * 1e6);
      }
      // regras de Western Electric: 1 ponto fora dos limites; 8 seguidos do mesmo lado da média
      out.ooc = v.map((x) => x > out.ucl || x < out.lcl);
      out.run8 = v.map(() => false);
      for (let i = 7; i < v.length; i++) { const w = v.slice(i - 7, i + 1); if (w.every((x) => x > out.mean) || w.every((x) => x < out.mean)) for (let k = i - 7; k <= i; k++) out.run8[k] = true; }
      out.signals = out.ooc.filter(Boolean).length + (out.run8.some(Boolean) ? 1 : 0);
    }
    if (s.chart === 'pareto') {
      const items = (s.labels || []).map((l, i) => ({ l, v: +(s.values || [])[i] || 0 })).sort((a, b) => b.v - a.v);
      const tot = U.sum(items.map((x) => x.v)); let c = 0;
      items.forEach((x) => { c += x.v; x.cum = tot ? (c / tot) * 100 : 0; });
      out.items = items; out.total = tot; out.vital = items.filter((x, i) => i === 0 || items[i - 1].cum < 80).length;
    }
    return out;
  };
  function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }

  const T = (x, y, txt, o = {}) => `<text x="${x}" y="${y}" font-size="${o.fs || 10.5}" fill="${o.fill}" text-anchor="${o.anchor || 'start'}" font-weight="${o.fw || 400}" font-family="${o.mono ? 'Geist Mono, monospace' : 'Geist, system-ui, sans-serif'}">${U.esc(txt)}</text>`;

  /** Desenha o gráfico dentro de (0,0,w,h). col = cores resolvidas. */
  CH.draw = (s, w, h, col) => {
    const st = CH.stats(s);
    if (!st.n && s.chart !== 'pareto') return T(w / 2, h / 2, 'Paste or type data in the panel →', { fill: col.ink5, anchor: 'middle', fs: 12 });
    if (s.chart === 'pareto') return pareto(s, st, w, h, col);
    if (s.chart === 'cap') return cap(s, st, w, h, col);
    if (s.chart === 'run') return run(s, st, w, h, col);
    return imr(s, st, w, h, col);
  };

  function axisY(x0, y0, y1, lo, hi, col, ticks = 4, side = 'left', fmtf = fmt) {
    let out = '';
    for (let i = 0; i <= ticks; i++) {
      const v = lo + ((hi - lo) * i) / ticks; const y = y1 - ((y1 - y0) * i) / ticks;
      out += `<line x1="${x0}" x2="${x0 + (side === 'left' ? -3 : 3)}" y1="${y}" y2="${y}" stroke="${col.line}"/>` + T(side === 'left' ? x0 - 6 : x0 + 6, y + 3.5, fmtf(v), { fill: col.ink5, anchor: side === 'left' ? 'end' : 'start', mono: true, fs: 10 });
    }
    return out;
  }

  function panel(vals, flags, warn, center, ucl, lcl, x0, y0, w, h, col, label) {
    const lo0 = Math.min(...vals, lcl ?? Infinity), hi0 = Math.max(...vals, ucl ?? -Infinity);
    const pad = (hi0 - lo0) * 0.12 || 1; const lo = lo0 >= 0 && lo0 - pad < 0 ? 0 : lo0 - pad, hi = hi0 + pad;
    const X = (i) => x0 + (vals.length > 1 ? (i * w) / (vals.length - 1) : w / 2);
    const Y = (v) => y0 + h - ((v - lo) / (hi - lo)) * h;
    let o = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="none" stroke="${col.line}"/>`;
    o += axisY(x0, y0, y0 + h, lo, hi, col, 3);
    const ref = (v, c, dash, name) => v == null ? '' : `<line x1="${x0}" x2="${x0 + w}" y1="${Y(v)}" y2="${Y(v)}" stroke="${c}" stroke-width="1.2" ${dash ? 'stroke-dasharray="4 3"' : ''}/>` + T(x0 + w + 4, Y(v) + 3.5, `${name}=${fmt(v)}`, { fill: c, mono: true, fs: 9.5, fw: 600 });
    o += ref(ucl, col.error, true, 'UCL') + ref(center, col.done, false, label === 'MR' ? 'M̄R' : 'X̄') + (lcl != null && lcl > lo ? ref(lcl, col.error, true, 'LCL') : '');
    o += `<polyline points="${vals.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${col.action}" stroke-width="1.4"/>`;
    o += vals.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${flags[i] ? 3.6 : 2.4}" fill="${flags[i] ? col.error : warn[i] ? col.attention : col.action}"/>`).join('');
    o += T(x0 - 34, y0 + 10, label, { fill: col.ink7, fw: 600, fs: 10.5 });
    return o;
  }

  function imr(s, st, w, h, col) {
    const v = s.values.map(Number); const L = 44, R = 70, top = 30, gap = 22, bottom = 22;
    const ph = (h - top - gap - bottom) * 0.58, mh = h - top - gap - bottom - ph;
    let o = T(0, 14, s.title || 'I-MR chart', { fill: col.ink9, fw: 600, fs: 12.5 });
    o += T(w, 14, `n=${st.n} · ${st.signals ? st.signals + ' signal(s)' : 'in control'}`, { fill: st.signals ? col.error : col.done, anchor: 'end', fw: 600, fs: 10.5 });
    o += panel(v, st.ooc, st.run8, st.mean, st.ucl, st.lcl, L, top, w - L - R, ph, col, 'I');
    const mrv = [st.mr[0] ?? 0, ...st.mr]; const mrflag = mrv.map((x, i) => i > 0 && x > st.mrucl);
    o += panel(mrv.slice(1), mrflag.slice(1), mrv.slice(1).map(() => false), st.mrbar, st.mrucl, null, L, top + ph + gap, w - L - R, mh, col, 'MR');
    return o;
  }

  function run(s, st, w, h, col) {
    const v = s.values.map(Number); const L = 44, R = 64, top = 30, bottom = 22;
    let o = T(0, 14, s.title || 'Run chart', { fill: col.ink9, fw: 600, fs: 12.5 }) + T(w, 14, `n=${st.n} · median ${fmt(st.median)}`, { fill: col.ink5, anchor: 'end', fs: 10.5, mono: true });
    const lsl = s.lsl === '' || s.lsl == null ? null : +s.lsl; const flags = v.map((x) => lsl != null && x < lsl);
    o += panel(v, flags, v.map(() => false), st.median, null, null, L, top, w - L - R, h - top - bottom, col, '');
    if (lsl != null) { const lo0 = Math.min(...v, lsl), hi0 = Math.max(...v); const pad = (hi0 - lo0) * 0.12 || 1; const Y = (x) => top + (h - top - bottom) - ((x - (lo0 - pad)) / (hi0 + pad - (lo0 - pad))) * (h - top - bottom); o += `<line x1="${L}" x2="${w - R}" y1="${Y(lsl)}" y2="${Y(lsl)}" stroke="${col.error}" stroke-width="1.4"/>` + T(w - R + 4, Y(lsl) + 3.5, `LSL=${fmt(lsl)}`, { fill: col.error, mono: true, fs: 9.5, fw: 600 }); }
    return o;
  }

  function pareto(s, st, w, h, col) {
    const L = 44, R = 40, top = 30, bottom = 46; const items = st.items || [];
    let o = T(0, 14, s.title || 'Pareto chart', { fill: col.ink9, fw: 600, fs: 12.5 }) + T(w, 14, `total ${st.total} · vital few: ${st.vital}`, { fill: col.ink5, anchor: 'end', fs: 10.5, mono: true });
    if (!items.length) return o + T(w / 2, h / 2, 'Add categories and counts in the panel →', { fill: col.ink5, anchor: 'middle', fs: 12 });
    const pw = w - L - R, phh = h - top - bottom; const max = items[0].v || 1; const bw = pw / items.length;
    o += `<rect x="${L}" y="${top}" width="${pw}" height="${phh}" fill="none" stroke="${col.line}"/>`;
    o += axisY(L, top, top + phh, 0, max, col, 4);
    o += axisY(L + pw, top, top + phh, 0, 100, col, 4, 'right', (v) => Math.round(v) + '%');
    const y80 = top + phh * 0.2; o += `<line x1="${L}" x2="${L + pw}" y1="${y80}" y2="${y80}" stroke="${col.ink5}" stroke-dasharray="3 3" stroke-width="1"/>`;
    items.forEach((it, i) => {
      const bh = (it.v / max) * phh; const x = L + i * bw + bw * 0.14;
      o += `<rect x="${x}" y="${top + phh - bh}" width="${bw * 0.72}" height="${bh}" fill="${i < st.vital ? col.action : col.series2}" rx="2"/>`;
      o += T(x + bw * 0.36, top + phh - bh - 4, it.v, { fill: col.ink7, anchor: 'middle', mono: true, fs: 10 });
      const lab = U.wrap(it.l, bw - 4, 10)[0]; o += T(L + i * bw + bw / 2, top + phh + 14, lab + (U.wrap(it.l, bw - 4, 10).length > 1 ? '…' : ''), { fill: col.ink7, anchor: 'middle', fs: 10 });
    });
    const pts = items.map((it, i) => `${L + i * bw + bw / 2},${top + phh - (it.cum / 100) * phh}`);
    o += `<polyline points="${pts.join(' ')}" fill="none" stroke="${col.delta}" stroke-width="1.6"/>` + pts.map((p) => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="2.6" fill="${col.delta}"/>`).join('');
    o += T(L, h - 6, '■ vital few (to 80%)', { fill: col.action, fs: 10, fw: 600 }) + T(L + 130, h - 6, '— cumulative %', { fill: col.delta, fs: 10, fw: 600 });
    return o;
  }

  function cap(s, st, w, h, col) {
    const v = s.values.map(Number); const L = 36, R = 150, top = 30, bottom = 26;
    const lsl = s.lsl === '' || s.lsl == null ? null : +s.lsl, usl = s.usl === '' || s.usl == null ? null : +s.usl;
    let o = T(0, 14, s.title || 'Capability', { fill: col.ink9, fw: 600, fs: 12.5 });
    const lo = Math.min(st.min, lsl ?? Infinity, st.mean - 3.5 * st.sd), hi = Math.max(st.max, usl ?? -Infinity, st.mean + 3.5 * st.sd);
    const pw = w - L - R, phh = h - top - bottom; const bins = Math.max(6, Math.min(16, Math.round(Math.sqrt(st.n)) + 2));
    const bwv = (hi - lo) / bins; const counts = new Array(bins).fill(0); v.forEach((x) => counts[Math.min(bins - 1, Math.max(0, Math.floor((x - lo) / bwv)))]++);
    const X = (x) => L + ((x - lo) / (hi - lo)) * pw;
    const pdf = (x, sg) => Math.exp(-((x - st.mean) ** 2) / (2 * sg * sg)) / (sg * Math.sqrt(2 * Math.PI));
    const maxC = Math.max(...counts, (pdf(st.mean, st.sd || 1) * st.n * bwv) || 1);
    const Y = (c) => top + phh - (c / maxC) * phh * 0.92;
    o += `<line x1="${L}" x2="${L + pw}" y1="${top + phh}" y2="${top + phh}" stroke="${col.line}"/>`;
    counts.forEach((c, i) => { o += `<rect x="${X(lo + i * bwv) + 1}" y="${Y(c)}" width="${Math.max(1, (pw / bins) - 2)}" height="${top + phh - Y(c)}" fill="${col.series2}"/>`; });
    const curve = (sg, c, dash) => { if (!sg) return ''; let d = ''; for (let k = 0; k <= 60; k++) { const x = lo + ((hi - lo) * k) / 60; d += `${k ? 'L' : 'M'}${X(x)} ${Y(pdf(x, sg) * st.n * bwv)}`; } return `<path d="${d}" fill="none" stroke="${c}" stroke-width="1.6" ${dash ? 'stroke-dasharray="4 3"' : ''}/>`; };
    o += curve(st.sd, col.ink9, true) + curve(st.sw, col.action, false);
    const spec = (x, name) => x == null ? '' : `<line x1="${X(x)}" x2="${X(x)}" y1="${top - 4}" y2="${top + phh}" stroke="${col.error}" stroke-width="1.6"/>` + T(X(x), top - 8, `${name} ${fmt(x)}`, { fill: col.error, anchor: 'middle', fs: 10, fw: 600, mono: true });
    o += spec(lsl, 'LSL') + spec(usl, 'USL');
    o += `<line x1="${X(st.mean)}" x2="${X(st.mean)}" y1="${top}" y2="${top + phh}" stroke="${col.done}" stroke-dasharray="2 2"/>`;
    for (let k = 0; k <= 4; k++) { const x = lo + ((hi - lo) * k) / 4; o += T(X(x), top + phh + 14, fmt(x), { fill: col.ink5, anchor: 'middle', mono: true, fs: 10 }); }
    // caixa de índices
    const bx = w - R + 14; const good = (x) => (x == null ? col.ink5 : x >= 1.33 ? col.done : x >= 1 ? col.attention : col.error);
    const row = (y, k, val, c) => T(bx, y, k, { fill: col.ink5, fs: 10.5 }) + T(w, y, val, { fill: c || col.ink9, anchor: 'end', mono: true, fw: 600, fs: 11 });
    o += `<rect x="${bx - 8}" y="${top - 6}" width="${R - 6}" height="${Math.min(phh + 10, 176)}" rx="6" fill="${col.surface2}" stroke="${col.line}"/>`;
    o += row(top + 12, 'n', st.n) + row(top + 30, 'Mean', fmt(st.mean)) + row(top + 48, 'StDev (overall)', fmt(st.sd)) + row(top + 66, 'StDev (within)', fmt(st.sw));
    o += row(top + 90, 'Cp', fmt(st.cp), good(st.cp)) + row(top + 108, 'Cpk', fmt(st.cpk), good(st.cpk)) + row(top + 126, 'Ppk', fmt(st.ppk), good(st.ppk)) + row(top + 144, 'PPM out', st.ppm != null ? st.ppm.toLocaleString('en-US') : '—');
    o += T(L, h - 4, '— within   - - overall', { fill: col.ink5, fs: 10 });
    return o;
  }

  /** Lê dados colados (Excel/Minitab): uma coluna de números, ou rótulo<TAB>valor. */
  CH.parse = (text) => {
    const lines = String(text).trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const labels = [], values = [];
    lines.forEach((l) => {
      const parts = l.split(/\t|;|,(?=\s*-?\d)/).map((x) => x.trim()).filter(Boolean);
      const num = (x) => parseFloat(String(x).replace(',', '.'));
      if (parts.length >= 2 && isNaN(num(parts[0])) && !isNaN(num(parts[parts.length - 1]))) { labels.push(parts[0]); values.push(num(parts[parts.length - 1])); }
      else parts.forEach((p) => { const n = num(p); if (!isNaN(n)) values.push(n); });
    });
    return { labels, values, labeled: labels.length > 0 && labels.length === values.length };
  };
})(window.FL);

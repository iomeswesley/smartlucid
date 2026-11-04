/* Flowline · editor de mapas (estilo Lucidchart) + páginas da aba "Maps & analysis".
   SVG com reconciliação por id, pan/zoom, seleção, guias inteligentes, conectores ortogonais,
   containers, colar imagem/dados, regras de formatação condicional e vínculo forma ↔ tarefa. */
(function (FL) {
  const U = FL.util, D = U.date, S = FL.store, K = FL.kit, SH = FL.shapes;
  const MP = (FL.maps = {});
  const PAGE_ICON = { canvas: 'flow', sipoc: 'sipoc', fishbone: 'fish', fmea: 'table' };
  const GRID = 8;
  let E = null;

  /* ---------- Cores do tema (resolvidas, para SVG exportável) ---------- */
  const colors = () => {
    const cs = getComputedStyle(document.documentElement); const v = (n) => cs.getPropertyValue(n).trim();
    return { ink9: v('--c-ink-900'), ink7: v('--c-ink-700'), ink5: v('--c-ink-500'), line: v('--c-line'), lineStrong: v('--c-line-strong'), surface: v('--c-surface'), surface2: v('--c-surface-2'), surface3: v('--c-surface-3'), action: v('--c-action'), error: v('--c-error'), attention: v('--c-attention'), done: v('--c-done'), delta: v('--c-delta-up'), series2: v('--c-series-2'), board: v('--c-board'), sel: v('--c-sel'), guide: v('--c-guide') };
  };

  /* ================================================================
     Montagem
     ================================================================ */
  MP.render = (host, p, r) => {
    const prefs = (S.state.prefs.canvas = S.state.prefs.canvas || { lib: true, props: true, grid: true, snap: true, mini: true });
    E = { host, p, prefs, page: null, sel: new Set(), selEdge: null, hover: null, cache: new Map(), tool: 'select', col: colors(), guides: [], drag: null, space: false, clipboard: null };
    host.innerHTML = `
      <div class="cv">
        <aside class="lib" aria-label="Shape library"></aside>
        <div class="stage" tabindex="0">
          <svg class="world" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="fl-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1.1" style="fill:var(--c-grid-dot)"/></pattern></defs>
            <rect class="bg" x="0" y="0" width="100%" height="100%" fill="url(#fl-dots)"/>
            <g class="vp"><g class="L-cont"></g><g class="L-edges"></g><g class="L-shapes"></g><g class="L-over"></g></g>
          </svg>
          <div class="ctool"></div>
          <div class="zoombox"><button class="ib" data-z="out" aria-label="Zoom out">${U.ic('minus')}</button><span class="z" data-z="reset" title="Reset to 100%">100%</span><button class="ib" data-z="in" aria-label="Zoom in">${U.ic('plus')}</button><button class="ib" data-z="fit" aria-label="Fit to content" title="Fit (Shift+1)">${U.ic('fit')}</button></div>
          <div class="minimap" title="Click to navigate"></div>
        </div>
        <div class="tool" hidden></div>
        <aside class="props" aria-label="Properties"></aside>
        <nav class="pages" aria-label="Pages"></nav>
      </div>`;
    E.cv = U.$('.cv', host); E.stage = U.$('.stage', host); E.svg = U.$('svg.world', host); E.vp = U.$('.vp', host);
    E.Lc = U.$('.L-cont', host); E.Le = U.$('.L-edges', host); E.Ls = U.$('.L-shapes', host); E.Lo = U.$('.L-over', host);
    E.props = U.$('.props', host); E.lib = U.$('.lib', host); E.toolEl = U.$('.tool', host); E.pagesEl = U.$('.pages', host); E.mini = U.$('.minimap', host);
    drawLib(); drawToolbar(); wireStage(); wireZoombox();
    const onKey = (e) => keydown(e); const onUp = (e) => { if (e.code === 'Space') { E.space = false; E.stage.classList.remove('pan'); } };
    const onPaste = (e) => paste(e); const onCopy = (e) => copy(e, false); const onCut = (e) => copy(e, true);
    document.addEventListener('keydown', onKey); document.addEventListener('keyup', onUp);
    document.addEventListener('paste', onPaste); document.addEventListener('copy', onCopy); document.addEventListener('cut', onCut);
    const ro = new ResizeObserver(() => E && E.page && E.page.type === 'canvas' && drawMinimap()); ro.observe(E.stage);
    const offTheme = S.on((evt) => { if (evt === 'theme' && E) { E.col = colors(); E.cache.clear(); renderAll(); } });
    MP.switchPage(r.sub || p.activePage || (p.pages[0] && p.pages[0].id));
    return () => {
      document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onUp);
      document.removeEventListener('paste', onPaste); document.removeEventListener('copy', onCopy); document.removeEventListener('cut', onCut);
      ro.disconnect(); offTheme(); closeTextEdit(true); if (E && E.toolCleanup) E.toolCleanup(); E = null;
    };
  };

  MP.switchPage = (id) => {
    if (!E) return;
    if (E.page && id && E.page.id === id && E.p.pages.includes(E.page)) { drawPages(); return; }
    closeTextEdit(true);
    if (E.toolCleanup) { E.toolCleanup(); E.toolCleanup = null; }
    const p = E.p;
    let page = S.page(p, id) || p.pages[0] || null;
    E.page = page; E.sel.clear(); E.selEdge = null; E.cache.clear(); E.hover = null;
    E.Lc.innerHTML = E.Ls.innerHTML = E.Le.innerHTML = E.Lo.innerHTML = '';
    if (page && p.activePage !== page.id) { p.activePage = page.id; S.save(); }
    drawPages();
    if (!page) {
      E.cv.className = 'cv toolmode'; E.toolEl.hidden = false;
      E.toolEl.innerHTML = `<div class="empty" style="padding-top:12vh"><b>No maps yet</b><span>Start with a thought process map, a SIPOC or any template.</span><button class="btn btn-p" data-new>${U.ic('plus')}Add a page</button></div>`;
      E.toolEl.querySelector('[data-new]').onclick = (e) => newPageMenu(e.currentTarget);
      return;
    }
    if (page.type === 'canvas') {
      E.toolEl.hidden = true; E.toolEl.innerHTML = '';
      E.cv.className = 'cv' + (E.prefs.lib && !RO() ? '' : ' nolib') + (E.prefs.props ? '' : ' noprops') + (RO() ? ' readonly' : '');
      E.stage.style.display = ''; E.lib.style.display = ''; E.props.style.display = '';
      E.mini.style.display = E.prefs.mini ? '' : 'none';
      page.data.view = page.data.view || { x: 60, y: 40, z: 1 };
      renderAll(); drawProps();
      if (!page.data.shapes.length || !page.data.view.fitted) setTimeout(() => { if (E && E.page === page) { fitView(); page.data.view.fitted = true; } }, 240);
    } else {
      E.cv.className = 'cv toolmode' + (RO() ? ' readonly' : ''); E.toolEl.hidden = false; E.stage.style.display = 'none'; E.lib.style.display = 'none'; E.props.style.display = 'none';
      const api = { save: () => { S.touch(p); }, record: () => S.record('page:' + page.id, JSON.stringify(page.data)), project: p, page, log: (t) => S.log(p, t), redrawRec: () => FL.project.redrawRec() };
      E.toolCleanup = FL.tools[page.type].render(E.toolEl, page, p, api) || null;
    }
  };

  MP.focusShape = (id) => {
    if (!E) return;
    let page = E.page;
    if (!page || !page.data.shapes || !page.data.shapes.find((s) => s.id === id)) {
      const g = E.p.pages.find((x) => x.type === 'canvas' && x.data.shapes.some((s) => s.id === id));
      if (!g) { // linha de FMEA / causa do fishbone
        const t = E.p.pages.find((x) => x.type !== 'canvas' && JSON.stringify(x.data).includes(id)); if (!t) return;
        if (!E.page || E.page.id !== t.id) FL.shell.go(`#/p/${E.p.id}/maps/${t.id}`);
        setTimeout(() => { const el = E && U.$(`[data-rowid="${id}"]`, E.toolEl); if (el) { el.scrollIntoView({ block: 'center' }); el.animate([{ background: 'var(--c-attention-soft)' }, { background: 'transparent' }], { duration: 1600 }); } }, 60);
        return;
      }
      FL.shell.go(`#/p/${E.p.id}/maps/${g.id}`); page = g;
    }
    const s = page.data.shapes.find((x) => x.id === id); if (!s) return;
    if (!E.page || E.page.id !== page.id) MP.switchPage(page.id);
    const v = page.data.view; const W = E.stage.clientWidth, H = E.stage.clientHeight;
    v.z = Math.max(v.z, 0.9); v.x = W / 2 - (s.x + s.w / 2) * v.z; v.y = H / 2 - (s.y + s.h / 2) * v.z;
    E.sel = new Set([id]); E.selEdge = null; renderAll(); drawProps();
    const ring = `<rect x="${s.x - 8}" y="${s.y - 8}" width="${s.w + 16}" height="${s.h + 16}" rx="10" fill="none" stroke="${E.col.attention}" stroke-width="${4 / v.z}"><animate attributeName="opacity" values="1;0;1;0;1;0" dur="1.6s" fill="freeze"/></rect>`;
    E.Lo.insertAdjacentHTML('beforeend', ring);
  };

  /* ================================================================
     Páginas (barra inferior, como o Lucid)
     ================================================================ */
  function drawPages() {
    const p = E.p;
    E.pagesEl.innerHTML = p.pages.map((g) => `<button class="pg${E.page && g.id === E.page.id ? ' on' : ''}" data-pg="${g.id}" title="${U.esc(g.name)} · ${FL.phase(g.phase).name}"><span class="ph-tag" style="background:${FL.phase(g.phase).color}">${g.phase}</span>${U.ic(PAGE_ICON[g.type], 14)}${U.esc(g.name)}</button>`).join('') +
      `<button class="pg-add" data-add>${U.ic('plus')}Add page</button>`;
    U.$$('[data-pg]', E.pagesEl).forEach((b) => {
      b.onclick = () => { if (!E.page || b.dataset.pg !== E.page.id) FL.shell.go(`#/p/${p.id}/maps/${b.dataset.pg}`); };
      b.ondblclick = () => renamePage(S.page(p, b.dataset.pg));
      b.oncontextmenu = (e) => { e.preventDefault(); pageMenu(e, S.page(p, b.dataset.pg)); };
    });
    E.pagesEl.querySelector('[data-add]').onclick = (e) => newPageMenu(e.currentTarget);
    const on = U.$('.pg.on', E.pagesEl); on && on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function renamePage(g) { K.prompt('Rename page', 'Page name', g.name, (v) => { if (v) { g.name = v; S.touch(E.p); drawPages(); } }); }
  function pageMenu(e, g) {
    const p = E.p; const i = p.pages.indexOf(g);
    K.menu(e.clientX, e.clientY - 4, [
      { label: 'Rename', icon: 'text', onClick: () => renamePage(g) },
      { label: 'Duplicate', icon: 'copy', onClick: () => { const c = U.clone(g); c.id = U.uid('pg'); c.name = g.name + ' (copy)'; if (c.type === 'canvas') remapIds(c.data); p.pages.splice(i + 1, 0, c); S.touch(p); FL.shell.go(`#/p/${p.id}/maps/${c.id}`); } },
      { header: 'DMAIC phase' },
      ...FL.PHASES.map((ph) => ({ label: ph.name, check: g.phase === ph.k, onClick: () => { g.phase = ph.k; S.touch(p); drawPages(); } })),
      '-',
      { label: 'Move left', icon: 'chevL', onClick: () => { if (i > 0) { p.pages.splice(i - 1, 0, p.pages.splice(i, 1)[0]); S.touch(p); drawPages(); } } },
      { label: 'Move right', icon: 'chevR', onClick: () => { if (i < p.pages.length - 1) { p.pages.splice(i + 1, 0, p.pages.splice(i, 1)[0]); S.touch(p); drawPages(); } } },
      '-',
      { label: 'Delete page', icon: 'trash', danger: true, onClick: () => K.confirm('Delete page?', `“${g.name}” will be removed from this project.`, () => {
        p.pages.splice(i, 1); S.log(p, `deleted page “${g.name}”`); S.touch(p);
        p.tasks.forEach((t) => { if (t.link && t.link.pageId === g.id) t.link = null; });
        const nx = p.pages[Math.max(0, i - 1)]; FL.shell.go(`#/p/${p.id}/maps${nx ? '/' + nx.id : ''}`); if (!nx) MP.switchPage(null);
      }, { danger: true, ok: 'Delete' }) },
    ]);
  }
  function remapIds(data) {
    const map = {}; data.shapes.forEach((s) => { map[s.id] = s.id = U.uid('s'); delete s.taskId; });
    data.edges.forEach((e) => { e.id = U.uid('e'); e.a = map[e.a]; e.b = map[e.b]; });
  }
  function newPageMenu(anchor) {
    const p = E.p;
    const add = (t) => {
      if (t.maker) return FL.makers.open(t.maker, p);
      const g = FL.newPage(t.type, t.k === 'blank' ? 'Untitled map' : t.name.replace(/ \(.*\)$/, ''), t.phase, t.type === 'canvas' ? { kind: t.k, data: FL.templates.build(t.k) } : {});
      p.pages.push(g); S.log(p, `added page “${g.name}”`); S.touch(p); FL.shell.go(`#/p/${p.id}/maps/${g.id}`);
    };
    const r = anchor.getBoundingClientRect();
    K.menu(r.left, r.top - 8, [{ header: 'Canvas templates' }, ...FL.templates.LIST.filter((t) => t.type === 'canvas').map((t) => ({ label: t.name, icon: 'flow', kbd: t.phase, onClick: () => add(t) })), { header: 'Structured tools' }, ...FL.templates.LIST.filter((t) => t.type !== 'canvas').map((t) => ({ label: t.name, icon: PAGE_ICON[t.type], kbd: t.phase, onClick: () => add(t) }))], { flipGap: 0 });
    const m = U.$('.menu'); if (m) { const h = m.getBoundingClientRect().height; m.style.top = Math.max(8, r.top - h - 6) + 'px'; }
  }

  /* ================================================================
     Biblioteca de formas
     ================================================================ */
  function drawLib() {
    const closed = (S.state.prefs.libClosed = S.state.prefs.libClosed || {});
    E.lib.innerHTML = `<div class="lib-s"><input class="inp inp-sm" placeholder="Search shapes" data-q></div>` + SH.LIBRARY.map((g) => `
      <div class="lib-g${closed[g.name] ? ' closed' : ''}" data-g="${g.name}"><div class="lib-gh">${U.esc(g.name)}<span class="chev">${U.ic('chev', 14)}</span></div>
      <div class="lib-items">${g.items.map((it) => { const [type, extra, label] = Array.isArray(it) ? it : [it, null, null]; return label
        ? `<button class="lib-it lib-wide" draggable="true" data-type="${type}" data-extra='${U.esc(JSON.stringify(extra))}' title="${U.esc(label)}">${SH.preview(type).replace('<svg ', '<svg style="width:26px;height:26px" ')}<span>${U.esc(label)}</span></button>`
        : `<button class="lib-it" draggable="true" data-type="${type}" title="${U.esc(SH.def(type).name)}">${SH.preview(type)}</button>`; }).join('')}</div></div>`).join('');
    U.$$('.lib-gh', E.lib).forEach((h) => (h.onclick = () => { const g = h.parentElement; g.classList.toggle('closed'); closed[g.dataset.g] = g.classList.contains('closed'); S.save(); }));
    U.$$('.lib-it', E.lib).forEach((b) => {
      const extra = () => (b.dataset.extra ? JSON.parse(b.dataset.extra) : {});
      b.addEventListener('dragstart', (e) => { e.dataTransfer.setData('application/x-fl-shape', JSON.stringify({ type: b.dataset.type, extra: extra() })); e.dataTransfer.effectAllowed = 'copy'; });
      b.onclick = () => { const v = E.page.data.view; const c = { x: (E.stage.clientWidth / 2 - v.x) / v.z, y: (E.stage.clientHeight / 2 - v.y) / v.z }; addShape(b.dataset.type, c.x, c.y, extra(), true); };
    });
    E.lib.querySelector('[data-q]').oninput = (e) => {
      const q = e.target.value.toLowerCase();
      U.$$('.lib-it', E.lib).forEach((b) => { b.style.display = !q || (SH.def(b.dataset.type).name + ' ' + (b.title || '')).toLowerCase().includes(q) ? '' : 'none'; });
      U.$$('.lib-g', E.lib).forEach((g) => q && g.classList.remove('closed'));
    };
  }

  function drawToolbar() {
    const t = U.$('.ctool', E.stage);
    t.innerHTML = `
      <button class="ib${E.tool === 'select' ? ' on' : ''}" data-t="select" title="Select (V)">${U.ic('pointer')}</button>
      <button class="ib${E.tool === 'hand' ? ' on' : ''}" data-t="hand" title="Pan (H or hold Space)">${U.ic('hand')}</button>
      <span class="sep"></span>
      <button class="ib" data-add="text" title="Text (T)">${U.ic('text')}</button>
      <button class="ib" data-add="sticky" title="Sticky note (N)">${U.ic('sticky')}</button>
      <button class="ib" data-add="frame" title="Frame (F)">${U.ic('frame')}</button>
      <button class="ib" data-add="tmap-q" title="TMAP question (Q)">${U.ic('brain')}</button>
      <button class="ib" data-img title="Insert image">${U.ic('image')}</button>
      <button class="ib" data-add="chart" title="Live chart">${U.ic('chart')}</button>
      <span class="sep"></span>
      <button class="ib" data-a="undo" title="Undo (Ctrl+Z)">${U.ic('undo')}</button>
      <button class="ib" data-a="redo" title="Redo (Ctrl+Y)">${U.ic('redo')}</button>
      <span class="sep"></span>
      <button class="ib${E.prefs.lib ? ' on' : ''}" data-a="lib" title="Shape library">${U.ic('grid')}</button>
      <button class="ib${E.prefs.props ? ' on' : ''}" data-a="props" title="Properties panel">${U.ic('layers')}</button>
      <button class="ib" data-a="export" title="Export">${U.ic('download')}</button>`;
    U.$$('[data-t]', t).forEach((b) => (b.onclick = () => setTool(b.dataset.t)));
    U.$$('[data-add]', t).forEach((b) => (b.onclick = () => addAtCenter(b.dataset.add)));
    t.querySelector('[data-img]').onclick = pickImage;
    t.querySelector('[data-a=undo]').onclick = () => undo(false);
    t.querySelector('[data-a=redo]').onclick = () => undo(true);
    t.querySelector('[data-a=lib]').onclick = () => { E.prefs.lib = !E.prefs.lib; S.save(); E.cv.classList.toggle('nolib', !E.prefs.lib); drawToolbar(); };
    t.querySelector('[data-a=props]').onclick = () => { E.prefs.props = !E.prefs.props; S.save(); E.cv.classList.toggle('noprops', !E.prefs.props); drawToolbar(); };
    t.querySelector('[data-a=export]').onclick = (e) => K.menuAt(e.currentTarget, [
      { label: 'Export PNG', icon: 'image', onClick: () => exportImage('png') },
      { label: 'Export SVG', icon: 'download', onClick: () => exportImage('svg') },
      '-',
      { label: E.prefs.mini ? 'Hide minimap' : 'Show minimap', icon: 'eye', onClick: () => { E.prefs.mini = !E.prefs.mini; S.save(); E.mini.style.display = E.prefs.mini ? '' : 'none'; drawMinimap(); } },
      { label: E.prefs.grid ? 'Hide dot grid' : 'Show dot grid', icon: 'grid', onClick: () => { E.prefs.grid = !E.prefs.grid; S.save(); applyView(); } },
      { label: E.prefs.snap ? 'Turn snapping off' : 'Turn snapping on', icon: 'target', onClick: () => { E.prefs.snap = !E.prefs.snap; S.save(); } },
    ], { alignRight: true });
  }
  function setTool(t) { E.tool = t; E.stage.classList.toggle('pan', t === 'hand'); drawToolbar(); }

  /* ================================================================
     Render
     ================================================================ */
  const key = () => 'page:' + E.page.id;
  const RO = () => !S.canEdit(E.p);
  const roToast = () => K.toast(FL.t('You have view-only access to this project'));
  const data = () => E.page.data;
  const byId = (id) => data().shapes.find((s) => s.id === id);

  function applyView() {
    const v = data().view;
    E.vp.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.z})`);
    const pat = U.$('#fl-dots', E.svg); const sz = 24;
    pat.setAttribute('patternTransform', `translate(${v.x} ${v.y}) scale(${v.z})`); pat.setAttribute('width', sz); pat.setAttribute('height', sz);
    U.$('.bg', E.svg).style.display = E.prefs.grid && v.z > 0.35 ? '' : 'none';
    const zl = U.$('.zoombox .z', E.stage); if (zl) zl.textContent = Math.round(v.z * 100) + '%';
  }

  function renderAll() { if (!E || !E.page || E.page.type !== 'canvas') return; applyView(); renderShapes(); renderEdges(); renderOverlay(); drawMinimap(); }

  /** Cor vinda de regras de formatação condicional (equivalente ao conditional formatting do Lucid). */
  function ruleFill(s) {
    const rules = data().rules || []; const d = s.data || {};
    for (const r of rules) {
      if (!(r.field in d)) continue;
      const a = parseFloat(String(d[r.field]).replace(',', '.')), b = parseFloat(String(r.value).replace(',', '.'));
      const ok = isNaN(a) || isNaN(b) ? (r.op === '=' ? String(d[r.field]) === String(r.value) : r.op === '≠' ? String(d[r.field]) !== String(r.value) : false)
        : { '>': a > b, '<': a < b, '≥': a >= b, '≤': a <= b, '=': a === b, '≠': a !== b }[r.op];
      if (ok) return r.fill;
    }
    return null;
  }
  function taskOf(s) { return s.taskId ? E.p.tasks.find((t) => t.id === s.taskId) : null; }

  function shapeSVG(s, col, page) {
    const def = SH.def(s.type);
    if (s.img && !S.assets[s.img] && E && E.p) S.ensureAsset(E.p.id, s.img).then((src) => { if (src && E) { E.cache.delete(s.id); renderShapes(); } });
    if (def.autoH) { const h = def.autoH(s, page); if (Math.abs(h - s.h) > 0.5) s.h = h; }
    const rf = ruleFill(s); let view = rf ? { ...s, fill: rf } : s;
    if (E && E.text && E.text.id === s.id) view = { ...view, text: '' }; // texto em edição é desenhado pelo textarea
    let out = def.render(view, col, page);
    const t = taskOf(s);
    if (t) {
      const st = FL.status(t.status); const label = `${t.status === 'Done' ? '✓ Done' : t.status} · ${D.short(t.end)}`;
      const w = U.measure(label, 10.5, 600) + 22;
      out += `<g class="badge" data-badge="${s.id}" style="cursor:pointer" transform="translate(${s.w - w + 6} -11)"><rect width="${w}" height="20" rx="10" fill="${st.color}" stroke="${col.surface}" stroke-width="2"/><circle cx="10" cy="10" r="3" fill="#fff"/><text x="17" y="14" font-size="10.5" font-weight="600" fill="#fff" font-family="Geist">${U.esc(label)}</text></g>`;
    }
    if (s.locked) out += `<g transform="translate(-8 -8)" opacity=".7"><circle cx="8" cy="8" r="8" fill="${col.surface}" stroke="${col.line}"/><path d="M5 8h6v5H5zM6 8V6.5a2 2 0 0 1 4 0V8" fill="none" stroke="${col.ink5}" stroke-width="1.2"/></g>`;
    return out;
  }

  function renderShapes() {
    const col = E.col; const page = E.page; const seen = new Set();
    const shapes = data().shapes;
    const orderC = [], orderS = [];
    shapes.forEach((s) => (SH.isContainer(s) ? orderC : orderS).push(s));
    const t = (s) => { const tk = taskOf(s); return tk ? tk.status + tk.end : ''; };
    const place = (s, layer) => {
      seen.add(s.id);
      const { x, y, ...rest } = s;
      const sig = JSON.stringify(rest) + '|' + t(s) + (E.text && E.text.id === s.id ? '|editing' : '') + '|' + (ruleFill(s) || '') + (s.type === 'vsm-time' ? JSON.stringify(shapes.filter((q) => q.type === 'vsm-proc' || q.type === 'vsm-inv').map((q) => [q.x, q.data])) : '') + (s.type === 'gb-crit' ? JSON.stringify(SH.critList(s, page)) : '') + ((s.type === 'image' || s.type === 'card' || s.type === 'gb-comp') && s.img ? (S.assets[s.img] ? '1' : '0') : '');
      let c = E.cache.get(s.id);
      if (!c) { // cache invalidado (cache.delete): reaproveita o <g> que já está na tela, senão sobram cópias velhas por baixo
        const old = E.svg.querySelector(`g[data-id="${s.id}"]`); if (old) c = { g: old, sig: null };
      }
      if (!c || c.sig !== sig) {
        const g = c ? c.g : document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('data-id', s.id); g.innerHTML = shapeSVG(s, col, page);
        c = { g, sig }; E.cache.set(s.id, c);
      }
      c.g.setAttribute('transform', `translate(${s.x} ${s.y})`);
      if (c.g.parentNode !== layer || c.g !== layer.lastChild) layer.appendChild(c.g);
    };
    orderC.forEach((s) => place(s, E.Lc)); orderS.forEach((s) => place(s, E.Ls));
    for (const [id, c] of E.cache) if (!seen.has(id)) { c.g.remove(); E.cache.delete(id); }
  }

  /* ---------- Conectores ---------- */
  const DIR = { t: [0, -1], r: [1, 0], b: [0, 1], l: [-1, 0] };
  function rectOf(s) { const b = SH.body(s); return { x: s.x + b.x, y: s.y + b.y, w: b.w, h: b.h }; }
  function portPt(r, side) { return side === 't' ? { x: r.x + r.w / 2, y: r.y } : side === 'b' ? { x: r.x + r.w / 2, y: r.y + r.h } : side === 'l' ? { x: r.x, y: r.y + r.h / 2 } : { x: r.x + r.w, y: r.y + r.h / 2 }; }
  function autoSides(ra, rb, as, bs) {
    const ca = { x: ra.x + ra.w / 2, y: ra.y + ra.h / 2 }, cb = { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2 };
    const dx = cb.x - ca.x, dy = cb.y - ca.y;
    const gapX = Math.max(rb.x - (ra.x + ra.w), ra.x - (rb.x + rb.w)), gapY = Math.max(rb.y - (ra.y + ra.h), ra.y - (rb.y + rb.h));
    const horiz = gapX > 10 && (gapX >= gapY || gapY < 10);
    const a = as || (horiz ? (dx > 0 ? 'r' : 'l') : dy > 0 ? 'b' : 't');
    const b = bs || (horiz ? (dx > 0 ? 'l' : 'r') : dy > 0 ? 't' : 'b');
    return [a, b];
  }
  function orthoPts(p1, s1, p2, s2) {
    const o = 18; const a = { x: p1.x + DIR[s1][0] * o, y: p1.y + DIR[s1][1] * o }, b = { x: p2.x + DIR[s2][0] * o, y: p2.y + DIR[s2][1] * o };
    const h1 = s1 === 'l' || s1 === 'r', h2 = s2 === 'l' || s2 === 'r'; let mid;
    if (h1 && h2) { const fwd = (s1 === 'r' && b.x >= a.x) || (s1 === 'l' && b.x <= a.x); if (fwd) { const mx = (a.x + b.x) / 2; mid = [{ x: mx, y: a.y }, { x: mx, y: b.y }]; } else { const my = (a.y + b.y) / 2; mid = [{ x: a.x, y: my }, { x: b.x, y: my }]; } }
    else if (!h1 && !h2) { const fwd = (s1 === 'b' && b.y >= a.y) || (s1 === 't' && b.y <= a.y); if (fwd) { const my = (a.y + b.y) / 2; mid = [{ x: a.x, y: my }, { x: b.x, y: my }]; } else { const mx = (a.x + b.x) / 2; mid = [{ x: mx, y: a.y }, { x: mx, y: b.y }]; } }
    else if (h1) mid = [{ x: b.x, y: a.y }]; else mid = [{ x: a.x, y: b.y }];
    const pts = [p1, a, ...mid, b, p2];
    // simplifica: remove duplicados e colineares
    const out = [];
    pts.forEach((p) => { const l = out[out.length - 1]; if (l && Math.abs(l.x - p.x) < 0.5 && Math.abs(l.y - p.y) < 0.5) return; out.push(p); });
    for (let i = out.length - 2; i > 0; i--) { const a0 = out[i - 1], a1 = out[i], a2 = out[i + 1]; if ((Math.abs(a0.x - a1.x) < 0.5 && Math.abs(a1.x - a2.x) < 0.5) || (Math.abs(a0.y - a1.y) < 0.5 && Math.abs(a1.y - a2.y) < 0.5)) out.splice(i, 1); }
    return out;
  }
  function roundPath(pts, r = 8) {
    let d = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y), l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y); const rr = Math.min(r, l1 / 2, l2 / 2);
      const a = { x: p1.x - ((p1.x - p0.x) / l1) * rr, y: p1.y - ((p1.y - p0.y) / l1) * rr }, b = { x: p1.x + ((p2.x - p1.x) / l2) * rr, y: p1.y + ((p2.y - p1.y) / l2) * rr };
      d += `L${a.x} ${a.y}Q${p1.x} ${p1.y} ${b.x} ${b.y}`;
    }
    const l = pts[pts.length - 1]; return d + `L${l.x} ${l.y}`;
  }
  function clipToRect(r, from) { // ponto na borda de r na direção de from
    const c = { x: r.x + r.w / 2, y: r.y + r.h / 2 }; const dx = from.x - c.x, dy = from.y - c.y; if (!dx && !dy) return c;
    const k = Math.min(dx ? (r.w / 2) / Math.abs(dx) : Infinity, dy ? (r.h / 2) / Math.abs(dy) : Infinity); return { x: c.x + dx * k, y: c.y + dy * k };
  }
  function edgeGeom(e) {
    const A = byId(e.a), B = byId(e.b); if (!A || !B) return null;
    const ra = rectOf(A), rb = rectOf(B);
    if (e.kind === 'straight') { const ca = { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2 }, cb = { x: ra.x + ra.w / 2, y: ra.y + ra.h / 2 }; const p1 = clipToRect(ra, ca), p2 = clipToRect(rb, cb); return { pts: [p1, p2], d: `M${p1.x} ${p1.y}L${p2.x} ${p2.y}` }; }
    const [sa, sb] = autoSides(ra, rb, e.as, e.bs); const p1 = portPt(ra, sa), p2 = portPt(rb, sb);
    if (e.kind === 'curve') { const k = Math.max(40, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.4); const c1 = { x: p1.x + DIR[sa][0] * k, y: p1.y + DIR[sa][1] * k }, c2 = { x: p2.x + DIR[sb][0] * k, y: p2.y + DIR[sb][1] * k }; return { pts: [p1, c1, c2, p2], d: `M${p1.x} ${p1.y}C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`, curve: true }; }
    const pts = orthoPts(p1, sa, p2, sb); return { pts, d: roundPath(pts) };
  }
  function arrowHead(tip, from, color, sz = 10) {
    const dx = tip.x - from.x, dy = tip.y - from.y; const l = Math.hypot(dx, dy) || 1; const ux = dx / l, uy = dy / l;
    const bx = tip.x - ux * sz, by = tip.y - uy * sz;
    return `<path d="M${tip.x} ${tip.y}L${bx - uy * sz * 0.5} ${by + ux * sz * 0.5}L${bx + uy * sz * 0.5} ${by - ux * sz * 0.5}Z" fill="${color}"/>`;
  }
  function midOf(pts, curve) {
    if (curve) { const t = 0.5, [a, b, c, d] = pts; const m = (1 - t) ** 3; return { x: m * a.x + 3 * (1 - t) ** 2 * t * b.x + 3 * (1 - t) * t * t * c.x + t ** 3 * d.x, y: m * a.y + 3 * (1 - t) ** 2 * t * b.y + 3 * (1 - t) * t * t * c.y + t ** 3 * d.y }; }
    const segs = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segs.push(l); tot += l; }
    let h = tot / 2; for (let i = 0; i < segs.length; i++) { if (h <= segs[i]) { const k = h / (segs[i] || 1); return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k }; } h -= segs[i]; }
    return pts[0];
  }
  function edgeSVG(e, col, selected) {
    const g = edgeGeom(e); if (!g) return '';
    const c = e.color || col.ink7; const w = e.w || 1.5; const n = g.pts.length;
    const endFrom = g.curve ? g.pts[2] : g.pts[n - 2]; const startFrom = g.curve ? g.pts[1] : g.pts[1];
    let o = `<g data-edge="${e.id}"><path d="${g.d}" fill="none" stroke="transparent" stroke-width="14" style="cursor:pointer"/>`;
    if (selected) o += `<path d="${g.d}" fill="none" stroke="${col.sel}" stroke-width="${w + 5}" stroke-opacity=".25" stroke-linecap="round"/>`;
    o += `<path d="${g.d}" fill="none" stroke="${c}" stroke-width="${w}" ${e.dash ? 'stroke-dasharray="6 4"' : ''} stroke-linejoin="round" pointer-events="none"/>`;
    if (e.arrow === 'end' || e.arrow === 'both') o += arrowHead(g.pts[n - 1], endFrom, c);
    if (e.arrow === 'both') o += arrowHead(g.pts[0], startFrom, c);
    if (e.text) { const m = midOf(g.pts, g.curve); const tw = U.measure(e.text, 12, 500) + 12; o += `<rect x="${m.x - tw / 2}" y="${m.y - 10}" width="${tw}" height="20" rx="4" fill="${col.board}" stroke="${col.line}"/><text x="${m.x}" y="${m.y + 4}" text-anchor="middle" font-size="12" font-weight="500" fill="${col.ink9}" font-family="Geist">${U.esc(e.text)}</text>`; }
    return o + '</g>';
  }
  function renderEdges() { const col = E.col; E.Le.innerHTML = data().edges.map((e) => edgeSVG(e, col, E.selEdge === e.id)).join(''); }

  /* ---------- Overlay: seleção, alças, portas, guias ---------- */
  function selBox() {
    const ss = [...E.sel].map(byId).filter(Boolean); if (!ss.length) return null;
    const x1 = Math.min(...ss.map((s) => s.x)), y1 = Math.min(...ss.map((s) => s.y)), x2 = Math.max(...ss.map((s) => s.x + s.w)), y2 = Math.max(...ss.map((s) => s.y + s.h));
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1, ss };
  }
  function renderOverlay() {
    const z = data().view.z; const col = E.col; const k = 1 / z; let o = '';
    const b = selBox();
    if (b) {
      b.ss.forEach((s) => (o += `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="none" stroke="${col.sel}" stroke-width="${1.5 * k}" pointer-events="none"/>`));
      if (b.ss.length > 1) o += `<rect x="${b.x - 4 * k}" y="${b.y - 4 * k}" width="${b.w + 8 * k}" height="${b.h + 8 * k}" fill="none" stroke="${col.sel}" stroke-dasharray="${4 * k} ${3 * k}" stroke-width="${k}" pointer-events="none"/>`;
      if (b.ss.length === 1 && !b.ss[0].locked) {
        const s = b.ss[0]; const hs = 8 * k; const auto = !!SH.def(s.type).autoH;
        const H = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5] };
        Object.entries(H).forEach(([h, [fx, fy]]) => { if (auto && fy !== 0.5) return; o += `<rect data-h="${h}" x="${s.x + s.w * fx - hs / 2}" y="${s.y + s.h * fy - hs / 2}" width="${hs}" height="${hs}" rx="${2 * k}" fill="${col.surface}" stroke="${col.sel}" stroke-width="${1.5 * k}" style="cursor:${{ nw: 'nwse', se: 'nwse', ne: 'nesw', sw: 'nesw', n: 'ns', s: 'ns', e: 'ew', w: 'ew' }[h]}-resize"/>`; });
      }
    }
    // portas de conexão na forma sob o mouse (ou selecionada)
    const ps = E.hover && byId(E.hover);
    if (ps && !SH.isContainer(ps) && E.tool === 'select' && !(E.drag && E.drag.mode !== 'connect')) {
      const r = rectOf(ps); const pr = 5.5 * k;
      ['t', 'r', 'b', 'l'].forEach((side) => { const p = portPt(r, side); const off = 14 * k; const q = { x: p.x + DIR[side][0] * off, y: p.y + DIR[side][1] * off };
        o += `<g data-port="${ps.id}" data-side="${side}" style="cursor:crosshair"><circle cx="${q.x}" cy="${q.y}" r="${pr * 2.8}" fill="transparent"/><circle cx="${q.x}" cy="${q.y}" r="${pr}" fill="${col.surface}" stroke="${col.sel}" stroke-width="${1.6 * k}"/><path d="M${q.x - pr * 0.5} ${q.y}H${q.x + pr * 0.5}M${q.x} ${q.y - pr * 0.5}V${q.y + pr * 0.5}" stroke="${col.sel}" stroke-width="${1.4 * k}"/></g>`; });
    }
    if (E.drag && E.drag.mode === 'connect') {
      const d = E.drag; o += `<path d="M${d.p0.x} ${d.p0.y}L${d.cur.x} ${d.cur.y}" stroke="${col.sel}" stroke-width="${1.6 * k}" stroke-dasharray="${5 * k} ${4 * k}" fill="none" pointer-events="none"/>`;
      if (d.target) { const t = byId(d.target); if (t) o += `<rect x="${t.x - 4 * k}" y="${t.y - 4 * k}" width="${t.w + 8 * k}" height="${t.h + 8 * k}" rx="${6 * k}" fill="none" stroke="${col.sel}" stroke-width="${2.5 * k}" pointer-events="none"/>`; }
    }
    if (E.drag && E.drag.mode === 'marquee') { const m = E.drag.rect; o += `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" fill="${col.sel}" fill-opacity=".08" stroke="${col.sel}" stroke-width="${k}" pointer-events="none"/>`; }
    E.guides.forEach((g) => { o += g.v ? `<line x1="${g.v}" x2="${g.v}" y1="${g.a}" y2="${g.b}" stroke="${col.guide}" stroke-width="${k}" pointer-events="none"/>` : `<line y1="${g.h}" y2="${g.h}" x1="${g.a}" x2="${g.b}" stroke="${col.guide}" stroke-width="${k}" pointer-events="none"/>`; });
    E.Lo.innerHTML = o;
  }

  function drawMinimap() {
    if (!E || !E.prefs.mini || !E.page || E.page.type !== 'canvas') return;
    const sh = data().shapes; const v = data().view; const W = E.stage.clientWidth, H = E.stage.clientHeight;
    const vw = { x: -v.x / v.z, y: -v.y / v.z, w: W / v.z, h: H / v.z };
    const all = sh.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h })).concat([vw]);
    const x1 = Math.min(...all.map((r) => r.x)), y1 = Math.min(...all.map((r) => r.y)), x2 = Math.max(...all.map((r) => r.x + r.w)), y2 = Math.max(...all.map((r) => r.y + r.h));
    const pad = 40; const bw = x2 - x1 + pad * 2, bh = y2 - y1 + pad * 2;
    E.miniBox = { x: x1 - pad, y: y1 - pad, w: bw, h: bh };
    const col = E.col;
    E.mini.innerHTML = `<svg viewBox="${x1 - pad} ${y1 - pad} ${bw} ${bh}" preserveAspectRatio="xMidYMid meet">${sh.map((s) => `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${SH.isContainer(s) ? col.surface3 : s.type === 'tmap-q' ? '#2E9A63' : s.type === 'tmap-a' ? col.action : s.fill || col.lineStrong}" opacity="${SH.isContainer(s) ? 0.8 : 0.9}"/>`).join('')}<rect x="${vw.x}" y="${vw.y}" width="${vw.w}" height="${vw.h}" fill="${col.sel}" fill-opacity=".08" stroke="${col.sel}" stroke-width="${Math.max(bw, bh) / 120}"/></svg>`;
  }

  /* ================================================================
     Mutação / histórico
     ================================================================ */
  const snap = () => JSON.stringify({ shapes: data().shapes, edges: data().edges, rules: data().rules });
  function commit(before, text) { S.record(key(), before); S.touch(E.p); if (text) S.log(E.p, text); }
  function change(fn, text) { const b = snap(); fn(); commit(b, text); renderAll(); drawProps(); }
  function undo(redo) {
    const cur = snap(); const s = redo ? S.redo(key(), cur) : S.undo(key(), cur);
    if (!s) return K.toast(redo ? 'Nothing to redo' : 'Nothing to undo');
    const o = JSON.parse(s); data().shapes = o.shapes; data().edges = o.edges; data().rules = o.rules || [];
    E.sel = new Set([...E.sel].filter((id) => byId(id))); E.cache.clear(); S.touch(E.p); renderAll(); drawProps();
  }

  function addShape(type, cx, cy, extra = {}, center = true, select = true) {
    if (RO()) { roToast(); return null; }
    const s = SH.create(type, 0, 0, extra);
    s.x = Math.round((center ? cx - s.w / 2 : cx) / GRID) * GRID; s.y = Math.round((center ? cy - s.h / 2 : cy) / GRID) * GRID;
    change(() => (SH.isContainer(s) ? data().shapes.unshift(s) : data().shapes.push(s)));
    if (select) { E.sel = new Set([s.id]); E.selEdge = null; renderOverlay(); drawProps(); }
    if (['text', 'sticky', 'tmap-q', 'tmap-a', 'tmap-d', 'tmap-l', 'process', 'decision', 'terminator', 'frame', 'card', 'kaizen', 'gb-step', 'gb-comp'].includes(type) && select) setTimeout(() => openTextEdit(s.id, true), 30);
    return s;
  }
  function addAtCenter(type) { const v = data().view; addShape(type, (E.stage.clientWidth / 2 - v.x) / v.z, (E.stage.clientHeight / 2 - v.y) / v.z); }

  /* ================================================================
     Interação no palco
     ================================================================ */
  function toWorld(ev) { const r = E.svg.getBoundingClientRect(); const v = data().view; return { x: (ev.clientX - r.left - v.x) / v.z, y: (ev.clientY - r.top - v.y) / v.z }; }
  function shapeAt(pt, exclude) {
    const sh = data().shapes;
    for (let i = sh.length - 1; i >= 0; i--) { const s = sh[i]; if (SH.isContainer(s) || (exclude && exclude.has(s.id))) continue; if (pt.x >= s.x && pt.x <= s.x + s.w && pt.y >= s.y && pt.y <= s.y + s.h) return s; }
    for (let i = sh.length - 1; i >= 0; i--) { const s = sh[i]; if (!SH.isContainer(s) || (exclude && exclude.has(s.id))) continue; if (pt.x >= s.x && pt.x <= s.x + s.w && pt.y >= s.y && pt.y <= s.y + s.h) return s; }
    return null;
  }
  function inside(a, b) { return a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h; }

  function wireZoombox() {
    U.$$('[data-z]', E.stage).forEach((b) => (b.onclick = () => {
      const z = b.dataset.z; if (z === 'fit') return fitView();
      zoomAt(E.stage.clientWidth / 2, E.stage.clientHeight / 2, z === 'in' ? 1.2 : z === 'out' ? 1 / 1.2 : 1 / data().view.z);
    }));
    E.mini.addEventListener('mousedown', (e) => {
      const go = (ev) => { const r = E.mini.getBoundingClientRect(); const mb = E.miniBox; if (!mb) return; const k = Math.max(mb.w / r.width, mb.h / r.height); const ox = mb.x + (mb.w - r.width * k) / 2, oy = mb.y + (mb.h - r.height * k) / 2;
        const wx = ox + (ev.clientX - r.left) * k, wy = oy + (ev.clientY - r.top) * k; const v = data().view; v.x = E.stage.clientWidth / 2 - wx * v.z; v.y = E.stage.clientHeight / 2 - wy * v.z; applyView(); drawMinimap(); };
      go(e); const mm = (ev) => go(ev); const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); S.save(); };
      document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
    });
  }
  function zoomAt(sx, sy, f) {
    const v = data().view; const nz = U.clamp(v.z * f, 0.1, 4); const k = nz / v.z;
    v.x = sx - (sx - v.x) * k; v.y = sy - (sy - v.y) * k; v.z = nz; applyView(); renderOverlay(); drawMinimap(); saveView();
  }
  const saveView = U.debounce(() => S.save(), 500);
  function fitView() {
    const sh = data().shapes; const v = data().view; const W = E.stage.clientWidth, H = E.stage.clientHeight;
    if (!sh.length) { v.x = 80; v.y = 80; v.z = 1; applyView(); return; }
    const x1 = Math.min(...sh.map((s) => s.x)), y1 = Math.min(...sh.map((s) => s.y)), x2 = Math.max(...sh.map((s) => s.x + s.w)), y2 = Math.max(...sh.map((s) => s.y + s.h));
    const z = U.clamp(Math.min((W - 120) / (x2 - x1 || 1), (H - 140) / (y2 - y1 || 1)), 0.1, 1.5);
    v.z = z; v.x = (W - (x2 - x1) * z) / 2 - x1 * z; v.y = (H - (y2 - y1) * z) / 2 - y1 * z + 10; applyView(); renderOverlay(); drawMinimap(); saveView();
  }

  function wireStage() {
    const st = E.stage, svg = E.svg;
    svg.addEventListener('wheel', (e) => {
      e.preventDefault(); const r = svg.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0022));
      else { const v = data().view; v.x -= e.shiftKey ? e.deltaY : e.deltaX; v.y -= e.shiftKey ? 0 : e.deltaY; applyView(); drawMinimap(); saveView(); }
    }, { passive: false });

    svg.addEventListener('pointerdown', (e) => {
      if (E.text) closeTextEdit();
      st.focus({ preventScroll: true });
      const pt = toWorld(e);
      // pan
      if (e.button === 1 || E.space || E.tool === 'hand') { e.preventDefault(); startPan(e); return; }
      if (e.button !== 0) return;
      const badge = e.target.closest('[data-badge]');
      if (badge) { const s = byId(badge.dataset.badge); const t = taskOf(s); if (t) FL.plan.openTask(E.p, t.id, () => { E.cache.delete(s.id); renderAll(); drawProps(); }); return; }
      const h = e.target.closest('[data-h]'); const port = e.target.closest('[data-port]');
      if ((h || port) && RO()) { roToast(); return; }
      if (h) { startResize(e, h.dataset.h); return; }
      if (port) { startConnect(e, port.dataset.port, port.dataset.side); return; }
      const eg = e.target.closest('[data-edge]');
      if (eg && !e.target.closest('[data-id]')) { E.selEdge = eg.dataset.edge; E.sel.clear(); renderEdges(); renderOverlay(); drawProps(); return; }
      const sg = e.target.closest('[data-id]'); const s = sg ? byId(sg.dataset.id) : null;
      if (s) {
        if (e.shiftKey || e.ctrlKey || e.metaKey) { E.sel.has(s.id) ? E.sel.delete(s.id) : E.sel.add(s.id); }
        else if (!E.sel.has(s.id)) E.sel = new Set([s.id]);
        if (E.selEdge) { E.selEdge = null; renderEdges(); }
        renderOverlay(); drawProps();
        if (!s.locked && !RO()) startMove(e, pt);
        return;
      }
      // vazio → marquee
      if (!e.shiftKey) { E.sel.clear(); E.selEdge = null; renderEdges(); }
      startMarquee(e, pt); drawProps();
    });

    svg.addEventListener('pointermove', (e) => {
      if (E.drag) return;
      const sg = e.target.closest('[data-id], [data-port]');
      let id = sg ? sg.dataset.id || sg.dataset.port : null;
      if (!id && E.hover) { const h = byId(E.hover); const pt = toWorld(e); const m = 26 / data().view.z; if (h && pt.x > h.x - m && pt.x < h.x + h.w + m && pt.y > h.y - m && pt.y < h.y + h.h + m) id = E.hover; }
      if (id !== E.hover) { E.hover = id; renderOverlay(); }
    });
    svg.addEventListener('pointerleave', () => { if (!E.drag && E.hover) { E.hover = null; renderOverlay(); } });

    svg.addEventListener('dblclick', (e) => {
      if (RO()) return;
      const eg = e.target.closest('[data-edge]'); const sg = e.target.closest('[data-id]');
      if (sg) { const s = byId(sg.dataset.id); if (s.type === 'chart') { E.sel = new Set([s.id]); drawProps(); setTimeout(() => { const ta = U.$('[data-chartdata]', E.props); ta && ta.focus(); }, 30); return; } if (s.type === 'image') { pickImage(s.id); return; } openTextEdit(s.id); return; }
      if (eg) { const ed = data().edges.find((x) => x.id === eg.dataset.edge); K.prompt('Connector label', 'Label', ed.text, (v) => change(() => (ed.text = v))); return; }
      const pt = toWorld(e); addShape('text', pt.x, pt.y);
    });

    svg.addEventListener('contextmenu', (e) => {
      e.preventDefault(); const sg = e.target.closest('[data-id]'); const pt = toWorld(e);
      if (sg) { const s = byId(sg.dataset.id); if (!E.sel.has(s.id)) { E.sel = new Set([s.id]); renderOverlay(); drawProps(); } shapeMenu(e, s); return; }
      const eg = e.target.closest('[data-edge]');
      if (eg) { E.selEdge = eg.dataset.edge; renderEdges(); drawProps(); K.menu(e.clientX, e.clientY, [{ label: 'Edit label', icon: 'text', onClick: () => { const ed = data().edges.find((x) => x.id === E.selEdge); K.prompt('Connector label', 'Label', ed.text, (v) => change(() => (ed.text = v))); } }, { label: 'Delete connector', icon: 'trash', danger: true, kbd: 'Del', onClick: deleteSel }]); return; }
      K.menu(e.clientX, e.clientY, [
        { label: 'Add sticky note here', icon: 'sticky', onClick: () => addShape('sticky', pt.x, pt.y) },
        { label: 'Add TMAP question here', icon: 'brain', onClick: () => addShape('tmap-q', pt.x, pt.y) },
        { label: 'Add text here', icon: 'text', onClick: () => addShape('text', pt.x, pt.y) },
        E.clipboard ? { label: 'Paste', icon: 'copy', kbd: 'Ctrl V', onClick: () => pasteShapes(E.clipboard, pt) } : null,
        '-',
        { label: 'Select all', kbd: 'Ctrl A', onClick: () => { E.sel = new Set(data().shapes.map((s) => s.id)); renderOverlay(); drawProps(); } },
        { label: 'Zoom to fit', icon: 'fit', kbd: 'Shift 1', onClick: fitView },
      ]);
    });

    // soltar formas da biblioteca e arquivos de imagem
    let hint = null;
    st.addEventListener('dragover', (e) => { e.preventDefault(); if (!hint && [...e.dataTransfer.types].includes('Files')) { hint = U.el('<div class="dropzone-hint">Drop image to add it to the map</div>'); st.appendChild(hint); } });
    st.addEventListener('dragleave', (e) => { if (hint && !st.contains(e.relatedTarget)) { hint.remove(); hint = null; } });
    st.addEventListener('drop', async (e) => {
      e.preventDefault(); if (hint) { hint.remove(); hint = null; }
      if (RO()) return roToast();
      const pt = toWorld(e);
      const sd = e.dataTransfer.getData('application/x-fl-shape');
      if (sd) { const o = JSON.parse(sd); addShape(o.type, pt.x, pt.y, o.extra || {}); return; }
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
      for (const [i, f] of files.entries()) await addImageFile(f, pt.x + i * 30, pt.y + i * 30);
    });
  }

  function startPan(e) {
    const v = data().view; const x0 = e.clientX, y0 = e.clientY, vx = v.x, vy = v.y; E.stage.classList.add('panning');
    const mm = (ev) => { v.x = vx + ev.clientX - x0; v.y = vy + ev.clientY - y0; applyView(); drawMinimap(); };
    const mu = () => { window.removeEventListener('pointermove', mm); window.removeEventListener('pointerup', mu); E.stage.classList.remove('panning'); saveView(); };
    window.addEventListener('pointermove', mm); window.addEventListener('pointerup', mu);
  }

  function startMove(e, pt0) {
    const before = snap();
    const ids = new Set(E.sel);
    // containers levam junto o que está dentro
    [...ids].map(byId).filter((s) => s && SH.isContainer(s)).forEach((c) => data().shapes.forEach((s) => { if (s.id !== c.id && inside(s, c) && !s.locked) ids.add(s.id); }));
    const moving = [...ids].map(byId).filter((s) => s && !s.locked);
    const orig = new Map(moving.map((s) => [s.id, { x: s.x, y: s.y }]));
    const others = data().shapes.filter((s) => !ids.has(s.id));
    const bb0 = (() => { const x1 = Math.min(...moving.map((s) => s.x)), y1 = Math.min(...moving.map((s) => s.y)), x2 = Math.max(...moving.map((s) => s.x + s.w)), y2 = Math.max(...moving.map((s) => s.y + s.h)); return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }; })();
    let moved = false;
    E.drag = { mode: 'move' };
    const mm = (ev) => {
      const pt = toWorld(ev); let dx = pt.x - pt0.x, dy = pt.y - pt0.y;
      if (!moved && Math.hypot(dx, dy) * data().view.z < 3) return; moved = true;
      if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      E.guides = [];
      if (E.prefs.snap && !ev.altKey) { const r = snapMove(bb0, dx, dy, others); dx = r.dx; dy = r.dy; }
      moving.forEach((s) => { const o = orig.get(s.id); s.x = o.x + dx; s.y = o.y + dy; });
      renderShapes(); renderEdges(); renderOverlay();
    };
    const mu = () => {
      window.removeEventListener('pointermove', mm); window.removeEventListener('pointerup', mu);
      E.drag = null; E.guides = [];
      if (moved) { moving.forEach((s) => { s.x = Math.round(s.x); s.y = Math.round(s.y); }); commit(before); }
      renderAll(); if (moved) drawProps();
    };
    window.addEventListener('pointermove', mm); window.addEventListener('pointerup', mu);
  }
  function snapMove(bb, dx, dy, others) {
    const z = data().view.z; const th = 6 / z;
    const mx = [bb.x + dx, bb.x + dx + bb.w / 2, bb.x + dx + bb.w], my = [bb.y + dy, bb.y + dy + bb.h / 2, bb.y + dy + bb.h];
    let best = { x: null, y: null };
    others.forEach((o) => {
      const ox = [o.x, o.x + o.w / 2, o.x + o.w], oy = [o.y, o.y + o.h / 2, o.y + o.h];
      mx.forEach((a) => ox.forEach((b) => { const d = b - a; if (Math.abs(d) < th && (!best.x || Math.abs(d) < Math.abs(best.x.d))) best.x = { d, v: b, o }; }));
      my.forEach((a) => oy.forEach((b) => { const d = b - a; if (Math.abs(d) < th && (!best.y || Math.abs(d) < Math.abs(best.y.d))) best.y = { d, v: b, o }; }));
    });
    if (best.x) { dx += best.x.d; const o = best.x.o; E.guides.push({ v: best.x.v, a: Math.min(o.y, bb.y + dy) - 12, b: Math.max(o.y + o.h, bb.y + dy + bb.h) + 12 }); }
    else dx = Math.round((bb.x + dx) / GRID) * GRID - bb.x;
    if (best.y) { dy += best.y.d; const o = best.y.o; E.guides.push({ h: best.y.v, a: Math.min(o.x, bb.x + dx) - 12, b: Math.max(o.x + o.w, bb.x + dx + bb.w) + 12 }); }
    else dy = Math.round((bb.y + dy) / GRID) * GRID - bb.y;
    return { dx, dy };
  }

  function startResize(e, h) {
    e.stopPropagation(); const s = byId([...E.sel][0]); if (!s) return;
    const before = snap(); const o = { x: s.x, y: s.y, w: s.w, h: s.h }; const pt0 = toWorld(e); const def = SH.def(s.type);
    E.drag = { mode: 'resize' };
    const mm = (ev) => {
      const pt = toWorld(ev); let dx = pt.x - pt0.x, dy = pt.y - pt0.y;
      let { x, y, w, h: hh } = o;
      if (h.includes('e')) w = o.w + dx; if (h.includes('s')) hh = o.h + dy;
      if (h.includes('w')) { w = o.w - dx; x = o.x + dx; } if (h.includes('n')) { hh = o.h - dy; y = o.y + dy; }
      if ((ev.shiftKey || def.fixedRatio) && h.length === 2) { const r = o.w / o.h; if (w / hh > r) w = hh * r; else hh = w / r; if (h.includes('w')) x = o.x + o.w - w; if (h.includes('n')) y = o.y + o.h - hh; }
      if (E.prefs.snap && !ev.altKey) { const sn = (v) => Math.round(v / GRID) * GRID; if (h.includes('e')) w = sn(x + w) - x; if (h.includes('s')) hh = sn(y + hh) - y; if (h.includes('w')) { const nx = sn(x); w += x - nx; x = nx; } if (h.includes('n')) { const ny = sn(y); hh += y - ny; y = ny; } }
      s.w = Math.max(24, w); s.h = Math.max(20, hh); s.x = w < 24 ? o.x + o.w - 24 : x; s.y = hh < 20 ? o.y + o.h - 20 : y;
      if (def.autoH) { s.y = o.y; }
      renderShapes(); renderEdges(); renderOverlay();
    };
    const mu = () => { window.removeEventListener('pointermove', mm); window.removeEventListener('pointerup', mu); E.drag = null; commit(before); renderAll(); drawProps(); };
    window.addEventListener('pointermove', mm); window.addEventListener('pointerup', mu);
  }

  function startConnect(e, id, side) {
    e.stopPropagation(); const s = byId(id); const r = rectOf(s); const p0 = portPt(r, side);
    E.drag = { mode: 'connect', p0, cur: p0, target: null };
    const mm = (ev) => { const pt = toWorld(ev); E.drag.cur = pt; const t = shapeAt(pt, new Set([id])); E.drag.target = t ? t.id : null; renderOverlay(); };
    const mu = (ev) => {
      window.removeEventListener('pointermove', mm); window.removeEventListener('pointerup', mu);
      const d = E.drag; E.drag = null; const pt = toWorld(ev);
      if (d.target) { change(() => data().edges.push({ id: U.uid('e'), a: id, b: d.target, as: side, bs: null, text: '', arrow: 'end', dash: false })); return; }
      if (Math.hypot(pt.x - p0.x, pt.y - p0.y) < 30) { renderOverlay(); return; }
      // solta no vazio → cria uma forma do mesmo tipo já conectada (como no Lucid)
      const reuse = ['process', 'decision', 'terminator', 'tmap-q', 'tmap-a', 'tmap-d', 'tmap-l', 'pstep', 'card', 'gb-step', 'gb-comp', 'sticky', 'round', 'rect', 'ellipse', 'data', 'vsm-proc', 'vsm-inv'];
      const type = reuse.includes(s.type) ? s.type : 'process';
      const extra = type === 'pstep' ? { outputs: ['Output'], inputs: [{ t: 'Input', c: 'C' }] } : {};
      const before = snap();
      const ns = SH.create(type, 0, 0, extra);
      const dir = DIR[side]; ns.x = Math.round((pt.x - (dir[0] < 0 ? ns.w : dir[0] > 0 ? 0 : ns.w / 2)) / GRID) * GRID; ns.y = Math.round((pt.y - (dir[1] < 0 ? ns.h : dir[1] > 0 ? 0 : ns.h / 2)) / GRID) * GRID;
      data().shapes.push(ns); data().edges.push({ id: U.uid('e'), a: id, b: ns.id, as: side, bs: null, text: '', arrow: 'end', dash: false });
      commit(before); E.sel = new Set([ns.id]); renderAll(); drawProps(); setTimeout(() => openTextEdit(ns.id, true), 30);
    };
    window.addEventListener('pointermove', mm); window.addEventListener('pointerup', mu);
  }

  function startMarquee(e, pt0) {
    const base = new Set(E.sel); let moved = false;
    E.drag = { mode: 'marquee', rect: { x: pt0.x, y: pt0.y, w: 0, h: 0 } };
    const mm = (ev) => {
      const pt = toWorld(ev); moved = true;
      const r = { x: Math.min(pt.x, pt0.x), y: Math.min(pt.y, pt0.y), w: Math.abs(pt.x - pt0.x), h: Math.abs(pt.y - pt0.y) }; E.drag.rect = r;
      E.sel = new Set(base); data().shapes.forEach((s) => { if (inside(s, r)) E.sel.add(s.id); });
      renderOverlay();
    };
    const mu = () => { window.removeEventListener('pointermove', mm); window.removeEventListener('pointerup', mu); E.drag = null; renderOverlay(); if (moved) drawProps(); };
    window.addEventListener('pointermove', mm); window.addEventListener('pointerup', mu);
  }

  /* ---------- Edição de texto in-place ---------- */
  function openTextEdit(id, selectAll) {
    if (!E) return; closeTextEdit();
    const s = byId(id); if (!s) return;
    let tb = SH.textBox(s); if (!tb) { if (s.type !== 'phase') return; tb = { x: 0, y: 0, w: s.w, h: s.h }; }
    const v = data().view; const fs = (s.fs || (s.type === 'frame' ? 14 : s.type === 'gb-step' ? 12.5 : 14)) * v.z;
    // Edição no lugar, como no Lucid: a forma continua visível e o texto é digitado por cima, na mesma cor e posição.
    const g = E.svg && E.svg.querySelector(`g[data-id="${s.id}"]`);
    const tEl = g && [...g.querySelectorAll('text')].find((t) => { const y = +((t.querySelector('tspan') || t).getAttribute('y') || 0); return y >= tb.y && y <= tb.y + tb.h + fs; });
    const color = s.color || (tEl && tEl.getAttribute('fill')) || 'var(--c-ink-900)';
    const ta = U.el(`<textarea class="textedit" spellcheck="true"></textarea>`);
    const w = Math.max(60, tb.w * v.z), h = Math.max(fs * 1.6, tb.h * v.z);
    const top = ['sticky', 'text'].includes(s.type);
    Object.assign(ta.style, { left: v.x + (s.x + tb.x) * v.z + 'px', top: v.y + (s.y + tb.y) * v.z + 'px', width: w + 'px', height: h + 'px', fontSize: fs + 'px', color, padding: `0 ${8 * v.z}px`, fontWeight: s.bold || /tmap-q|frame|pstep|card|kaizen|gb-comp|gb-panel/.test(s.type) ? 600 : 400, textAlign: s.align || (['text', 'sticky', 'tmap-d', 'tmap-l', 'frame', 'card'].includes(s.type) ? 'left' : 'center') });
    const center = () => { if (top) { ta.style.paddingTop = (s.type === 'sticky' ? 12 : 2) * v.z + 'px'; return; } ta.style.paddingTop = '0px'; ta.style.paddingTop = Math.max(0, (h - ta.scrollHeight) / 2) + 'px'; };
    ta.value = s.text || '';
    E.text = { ta, id, before: snap() }; E.cache.delete(s.id); renderShapes(); // esconde o texto original da forma enquanto edita
    E.stage.appendChild(ta); center(); ta.focus(); selectAll ? ta.select() : ta.setSelectionRange(ta.value.length, ta.value.length);
    const before = E.text.before;
    ta.addEventListener('input', () => { s.text = ta.value; center(); E.cache.delete(s.id); renderShapes(); renderEdges(); });
    ta.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); closeTextEdit(); E.stage.focus(); }
      if (e.key === 'Tab') { e.preventDefault(); closeTextEdit(); quickNext(s); }
    });
    ta.addEventListener('blur', () => setTimeout(() => closeTextEdit(), 0));
  }
  function closeTextEdit(silent) {
    if (!E || !E.text) return; const { ta, id, before } = E.text; E.text = null;
    const s = byId(id); if (s) { s.text = ta.value; if (!silent && before !== snap()) commit(before); }
    ta.remove(); if (!silent) { renderAll(); drawProps(); }
  }
  /** Tab durante a edição: cria a próxima forma conectada à direita/abaixo (fluxo rápido de TMAP/processo). */
  function quickNext(s) {
    const horiz = !/tmap/.test(s.type);
    const before = snap(); const ns = SH.create(s.type, 0, 0, s.type === 'pstep' ? { outputs: ['Output'], inputs: [{ t: 'Input', c: 'C' }] } : {});
    ns.x = horiz ? s.x + s.w + 80 : s.x; ns.y = horiz ? s.y + (s.h - ns.h) / 2 : s.y + s.h + 60;
    data().shapes.push(ns); data().edges.push({ id: U.uid('e'), a: s.id, b: ns.id, as: horiz ? 'r' : 'b', bs: horiz ? 'l' : 't', text: '', arrow: 'end', dash: false });
    commit(before); E.sel = new Set([ns.id]); renderAll(); drawProps();
    const v = data().view; const sx = v.x + (ns.x + ns.w) * v.z, sy = v.y + (ns.y + ns.h) * v.z;
    if (sx > E.stage.clientWidth - 40) v.x -= sx - E.stage.clientWidth + 120; if (sy > E.stage.clientHeight - 40) v.y -= sy - E.stage.clientHeight + 120; applyView();
    setTimeout(() => openTextEdit(ns.id, true), 20);
  }

  /* ---------- Teclado ---------- */
  function keydown(e) {
    if (!E || !E.page || E.page.type !== 'canvas' || E.text) return;
    if (document.querySelector('.scrim')) return;
    const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable)) return;
    const mod = e.ctrlKey || e.metaKey; const k = e.key.toLowerCase();
    if (e.code === 'Space' && !E.space) { E.space = true; E.stage.classList.add('pan'); e.preventDefault(); return; }
    if (RO() && !(k === 'escape' || (mod && k === 'a') || (e.shiftKey && (e.key === '!' || e.code === 'Digit1')) || (mod && (k === '=' || k === '+' || k === '-')))) return;
    if (mod && k === 'z') { e.preventDefault(); undo(e.shiftKey); return; }
    if (mod && k === 'y') { e.preventDefault(); undo(true); return; }
    if (mod && k === 'a') { e.preventDefault(); E.sel = new Set(data().shapes.map((s) => s.id)); renderOverlay(); drawProps(); return; }
    if (mod && k === 'd') { e.preventDefault(); duplicate(); return; }
    if (mod && (k === '=' || k === '+')) { e.preventDefault(); zoomAt(E.stage.clientWidth / 2, E.stage.clientHeight / 2, 1.2); return; }
    if (mod && k === '-') { e.preventDefault(); zoomAt(E.stage.clientWidth / 2, E.stage.clientHeight / 2, 1 / 1.2); return; }
    if (e.shiftKey && (e.key === '!' || e.code === 'Digit1')) { e.preventDefault(); fitView(); return; }
    if (k === 'delete' || k === 'backspace') { if (E.sel.size || E.selEdge) { e.preventDefault(); deleteSel(); } return; }
    if (k === 'escape') { E.sel.clear(); E.selEdge = null; renderEdges(); renderOverlay(); drawProps(); return; }
    if (k === 'enter' || k === 'f2') { if (E.sel.size === 1) { e.preventDefault(); openTextEdit([...E.sel][0]); } return; }
    if (k.startsWith('arrow') && E.sel.size) {
      e.preventDefault(); const st = e.shiftKey ? 10 : 1; const dx = k === 'arrowleft' ? -st : k === 'arrowright' ? st : 0, dy = k === 'arrowup' ? -st : k === 'arrowdown' ? st : 0;
      change(() => [...E.sel].map(byId).forEach((s) => { if (!s.locked) { s.x += dx; s.y += dy; } })); return;
    }
    if (mod || e.altKey) return;
    const map = { v: () => setTool('select'), h: () => setTool('hand'), t: () => addAtCenter('text'), n: () => addAtCenter('sticky'), f: () => addAtCenter('frame'), q: () => addAtCenter('tmap-q') };
    if (map[k]) { e.preventDefault(); map[k](); return; }
    // digitar com uma forma selecionada começa a editar o texto (como no Lucid)
    if (e.key.length === 1 && E.sel.size === 1) { const s = byId([...E.sel][0]); if (SH.textBox(s)) { e.preventDefault(); openTextEdit(s.id); E.text.ta.value = e.key; s.text = e.key; E.text.ta.dispatchEvent(new Event('input')); } }
  }

  function deleteSel() {
    if (E.selEdge) { const id = E.selEdge; E.selEdge = null; change(() => (data().edges = data().edges.filter((x) => x.id !== id))); return; }
    const ids = new Set([...E.sel].filter((id) => !byId(id).locked)); if (!ids.size) return;
    change(() => { data().shapes = data().shapes.filter((s) => !ids.has(s.id)); data().edges = data().edges.filter((x) => !ids.has(x.a) && !ids.has(x.b)); E.p.tasks.forEach((t) => { if (t.link && ids.has(t.link.shapeId)) t.link = null; }); });
    E.sel.clear(); drawProps();
    K.toast(`Deleted ${ids.size} shape${ids.size > 1 ? 's' : ''}`, { action: 'Undo', onAction: () => undo(false) });
  }
  function collect() {
    const ids = new Set(E.sel); const shapes = data().shapes.filter((s) => ids.has(s.id)); const edges = data().edges.filter((x) => ids.has(x.a) && ids.has(x.b));
    return U.clone({ shapes, edges });
  }
  function pasteShapes(clip, at) {
    const c = U.clone(clip); const map = {};
    const x1 = Math.min(...c.shapes.map((s) => s.x)), y1 = Math.min(...c.shapes.map((s) => s.y));
    const ox = at ? at.x - x1 : 24, oy = at ? at.y - y1 : 24;
    c.shapes.forEach((s) => { map[s.id] = s.id = U.uid('s'); s.x += ox; s.y += oy; delete s.taskId; });
    c.edges.forEach((x) => { x.id = U.uid('e'); x.a = map[x.a]; x.b = map[x.b]; });
    change(() => { data().shapes.push(...c.shapes); data().edges.push(...c.edges); });
    E.sel = new Set(c.shapes.map((s) => s.id)); renderOverlay(); drawProps();
    if (!at) E.clipboard = { shapes: c.shapes, edges: c.edges };
  }
  function duplicate() { if (!E.sel.size) return; pasteShapes(collect()); }
  function copy(e, cut) {
    if (!E || !E.page || E.page.type !== 'canvas' || E.text || !E.sel.size) return;
    const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
    const clip = collect(); E.clipboard = clip;
    e.clipboardData.setData('text/plain', 'flowline-shapes:' + JSON.stringify(clip)); e.preventDefault();
    if (cut) deleteSel();
  }
  async function paste(e) {
    if (!E || !E.page || E.page.type !== 'canvas' || E.text) return;
    if (RO()) return;
    const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
    if (document.querySelector('.scrim')) return;
    const v = data().view; const c = { x: (E.stage.clientWidth / 2 - v.x) / v.z, y: (E.stage.clientHeight / 2 - v.y) / v.z };
    const items = [...(e.clipboardData.items || [])];
    const img = items.find((i) => i.type.startsWith('image/'));
    if (img) {
      e.preventDefault();
      const one = E.sel.size === 1 ? byId([...E.sel][0]) : null; // foto colada com um cartão selecionado vai para dentro dele
      await addImageFile(img.getAsFile(), c.x, c.y, one && ['gb-comp', 'card', 'image'].includes(one.type) ? one.id : null); return;
    }
    const text = e.clipboardData.getData('text/plain'); if (!text) return;
    e.preventDefault();
    if (text.startsWith('flowline-shapes:')) { try { const clip = JSON.parse(text.slice(16)); const sel = selBox(); pasteShapes(clip, sel ? null : { x: c.x - 100, y: c.y - 60 }); } catch (_) { } return; }
    // números colados do Excel/Minitab → gráfico vivo (ou dados do gráfico selecionado)
    const parsed = FL.charts.parse(text);
    const selChart = E.sel.size === 1 && byId([...E.sel][0]).type === 'chart' ? byId([...E.sel][0]) : null;
    if (parsed.values.length >= 3) {
      if (selChart) { change(() => { selChart.values = parsed.values; if (parsed.labeled) selChart.labels = parsed.labels; }); K.toast(`${parsed.values.length} values loaded into the chart`); return; }
      const extra = parsed.labeled ? { chart: 'pareto', title: 'Pareto', labels: parsed.labels, values: parsed.values } : { chart: 'imr', title: 'I-MR chart', values: parsed.values };
      addShape('chart', c.x, c.y, extra, true); K.toast(parsed.labeled ? 'Pasted as a Pareto chart' : `Pasted ${parsed.values.length} values as an I-MR chart — change the type in the panel`);
      return;
    }
    const s = addShape('sticky', c.x, c.y, { text: text.slice(0, 600) }, true, true); closeTextEdit(true); E.sel = new Set([s.id]); renderAll(); drawProps();
  }
  async function addImageFile(file, x, y, replaceId) {
    const raw = await U.readFile(file); const im = await U.shrinkImage(raw); if (!im) return K.toast('Could not read that image');
    const id = await S.addAsset(im.src, E.p.id);
    if (replaceId) { const s = byId(replaceId); change(() => { s.img = id; if (s.type === 'image') s.h = Math.round(s.w * (im.h / im.w)); }); return; }
    const w = Math.min(520, im.w), h = Math.round(w * (im.h / im.w));
    addShape('image', x, y, { img: id, w, h }, true, true);
  }
  function pickImage(replaceId) {
    const inp = U.el('<input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" style="display:none">');
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; const v = data().view; addImageFile(f, (E.stage.clientWidth / 2 - v.x) / v.z, (E.stage.clientHeight / 2 - v.y) / v.z, typeof replaceId === 'string' ? replaceId : null); };
    document.body.appendChild(inp); inp.click(); setTimeout(() => inp.remove(), 1000);
  }

  /* ---------- Menu de contexto da forma ---------- */
  function shapeMenu(e, s) {
    const t = taskOf(s);
    K.menu(e.clientX, e.clientY, [
      SH.textBox(s) ? { label: 'Edit text', icon: 'text', kbd: 'Enter', onClick: () => openTextEdit(s.id) } : null,
      { label: 'Duplicate', icon: 'copy', kbd: 'Ctrl D', onClick: duplicate },
      '-',
      t ? { label: 'Open linked task', icon: 'gantt', onClick: () => FL.plan.openTask(E.p, t.id, () => { E.cache.delete(s.id); renderAll(); drawProps(); }) } : { label: 'Create action item in plan', icon: 'bolt', onClick: () => createTask(s) },
      t ? null : { label: 'Link to existing task…', icon: 'link', onClick: () => linkMenu(e, s) },
      '-',
      { label: 'Bring to front', icon: 'front', onClick: () => change(() => { const a = data().shapes; [...E.sel].forEach((id) => { const i = a.findIndex((x) => x.id === id); a.push(a.splice(i, 1)[0]); }); }) },
      { label: 'Send to back', icon: 'back', onClick: () => change(() => { const a = data().shapes; [...E.sel].reverse().forEach((id) => { const i = a.findIndex((x) => x.id === id); a.unshift(a.splice(i, 1)[0]); }); }) },
      { label: s.locked ? 'Unlock' : 'Lock position', icon: 'lock', onClick: () => change(() => [...E.sel].map(byId).forEach((x) => (x.locked = !s.locked))) },
      '-',
      { label: 'Delete', icon: 'trash', danger: true, kbd: 'Del', onClick: deleteSel },
    ]);
  }
  function createTask(s) {
    const p = E.p; const ph = E.page.phase; const tr = FL.schedule.tree(p.tasks);
    // insere no fim da fase da página
    let at = p.tasks.length; const si = p.tasks.findIndex((t) => t.level === 0 && t.phase === ph);
    if (si >= 0) { at = FL.schedule.subtreeEnd(p.tasks, si); const last = p.tasks[at - 1]; if (last && last.milestone && at - 1 > si) at = at - 1; }
    const name = (s.text || SH.def(s.type).name).replace(/\s+/g, ' ').trim().slice(0, 120);
    const t = { id: U.uid('t'), name, level: si >= 0 ? 1 : 0, phase: ph, owner: S.state.me, status: 'Not started', start: D.today(), end: null, dur: 3, pct: 0, preds: [], notes: `Created from “${E.page.name}”`, link: { pageId: E.page.id, shapeId: s.id }, collapsed: false };
    S.record('plan:' + p.id, JSON.stringify(p.tasks));
    p.tasks.splice(at, 0, t); FL.schedule.compute(p.tasks);
    const b = snap(); s.taskId = t.id; commit(b, `created action “${name}” from ${E.page.name}`);
    E.cache.delete(s.id); renderAll(); drawProps(); FL.project.redrawRec();
    K.toast('Action item added to the plan', { action: 'Open plan', onAction: () => { FL.shell.go(`#/p/${p.id}/plan`); setTimeout(() => FL.plan.focusTask(t.id), 80); } });
  }
  function linkMenu(e, s) {
    const p = E.p; const tr = FL.schedule.tree(p.tasks);
    const items = p.tasks.map((t, i) => ({ t, i })).filter(({ i, t }) => !tr.isSum[i] && !t.link).slice(0, 40);
    K.menu(e.clientX, e.clientY, [{ header: 'Link to task' }, ...items.map(({ t, i }) => ({ label: `${i + 1}. ${t.name}`, swatch: FL.phase(t.phase).color, onClick: () => { const b = snap(); t.link = { pageId: E.page.id, shapeId: s.id }; s.taskId = t.id; commit(b, `linked “${t.name}” to ${E.page.name}`); E.cache.delete(s.id); renderAll(); drawProps(); } }))]);
  }

  /* ================================================================
     Painel de propriedades
     ================================================================ */
  function drawProps() {
    if (!E || !E.page || E.page.type !== 'canvas') return;
    const P = E.props; const ss = [...E.sel].map(byId).filter(Boolean);
    const edge = E.selEdge && data().edges.find((x) => x.id === E.selEdge);
    if (edge) return propsEdge(P, edge);
    if (!ss.length) return propsPage(P);
    if (ss.length > 1) return propsMulti(P, ss);
    return propsShape(P, ss[0]);
  }
  const swatches = (list, cur, attr, none = true) => `<div class="swatches">${none ? `<button class="none${!cur ? ' on' : ''}" data-${attr}="" title="Default"></button>` : ''}${list.map((c) => `<button style="background:${c}" class="${cur === c ? 'on' : ''}" data-${attr}="${c}" title="${c}"></button>`).join('')}</div>`;
  const live = (fn) => { const b = snap(); fn(); return b; };

  function propsPage(P) {
    const g = E.page; const d = data(); const fields = [...new Set(d.shapes.flatMap((s) => Object.keys(s.data || {})))];
    P.innerHTML = `
      <div class="pp-s"><h5>Page</h5>
        <div class="field"><label>Name</label><input class="inp inp-sm" data-pg="name" value="${U.esc(g.name)}"></div>
        <div class="field"><label>DMAIC phase</label><div class="mini-btns">${FL.PHASES.map((ph) => `<button data-ph="${ph.k}" class="${g.phase === ph.k ? 'on' : ''}" title="${ph.name}">${ph.k}</button>`).join('')}</div></div>
        <div class="muted" style="font-size:12px">${d.shapes.length} shapes · ${d.edges.length} connectors</div>
      </div>
      <div class="pp-s"><h5>Data rules <span class="right muted" style="font-weight:400">conditional formatting</span></h5>
        <span class="muted" style="font-size:12px;line-height:1.45">Color shapes by their data — e.g. VSM steps with C/T above takt.</span>
        ${(d.rules || []).map((r, i) => `<div class="rule" data-rule="${i}"><div class="rr"><select data-k="field">${[...new Set([...fields, r.field])].map((f) => `<option${f === r.field ? ' selected' : ''}>${U.esc(f)}</option>`).join('')}</select><select data-k="op">${['>', '<', '≥', '≤', '=', '≠'].map((o) => `<option${o === r.op ? ' selected' : ''}>${o}</option>`).join('')}</select><input data-k="value" value="${U.esc(r.value)}"></div>
          <div class="row">${swatches(['#FBE4E2', '#FBF1D9', '#E1F2E8', '#E8EEFC', '#C0362C', '#2E9A63'], r.fill, 'rf', false)}<button class="ib ib-sm ib-ghost right" data-rdel aria-label="Remove rule">${U.ic('trash')}</button></div></div>`).join('')}
        <button class="btn btn-sm" data-addrule ${fields.length ? '' : 'disabled title="Add shape data first"'}>${U.ic('plus')}Add rule</button>
      </div>
      <div class="pp-s"><h5>Shortcuts</h5><div class="col" style="gap:5px;font-size:12.5px;color:var(--c-ink-700)">
        ${[['Drag from a ●', 'connect / create next shape'], ['Tab while typing', 'add next connected shape'], ['Ctrl V', 'paste image or data → chart'], ['Space + drag', 'pan'], ['Ctrl + scroll', 'zoom'], ['Shift 1', 'fit to screen'], ['T · N · F · Q', 'text · sticky · frame · question'], ['Ctrl D', 'duplicate'], ['Right-click', 'create action item']].map(([a, b]) => `<div class="row"><span class="kbd">${a}</span><span class="muted">${b}</span></div>`).join('')}
      </div></div>`;
    const nm = P.querySelector('[data-pg=name]'); nm.onchange = () => { g.name = nm.value || g.name; S.touch(E.p); drawPages(); };
    U.$$('[data-ph]', P).forEach((b) => (b.onclick = () => { g.phase = b.dataset.ph; S.touch(E.p); drawPages(); propsPage(P); }));
    U.$$('[data-rule]', P).forEach((el) => {
      const r = d.rules[+el.dataset.rule];
      U.$$('[data-k]', el).forEach((inp) => (inp.onchange = () => change(() => (r[inp.dataset.k] = inp.value))));
      U.$$('[data-rf]', el).forEach((b) => (b.onclick = () => change(() => (r.fill = b.dataset.rf))));
      el.querySelector('[data-rdel]').onclick = () => change(() => d.rules.splice(+el.dataset.rule, 1));
    });
    const ar = P.querySelector('[data-addrule]'); if (ar) ar.onclick = () => change(() => { d.rules = d.rules || []; d.rules.push({ id: U.uid('r'), field: fields[0], op: '>', value: '0', fill: '#FBE4E2' }); });
  }

  function propsMulti(P, ss) {
    P.innerHTML = `<div class="pp-s"><h5>${ss.length} shapes selected</h5>
      <div class="lbl">Align</div><div class="mini-btns">${[['l', 'alignL'], ['c', 'alignC'], ['r', 'alignR'], ['t', 'alignT'], ['m', 'alignM'], ['b', 'alignB']].map(([k, ic]) => `<button data-al="${k}" title="Align">${U.ic(ic, 14)}</button>`).join('')}<button data-dist="h" title="Distribute horizontally">${U.ic('distH', 14)}</button><button data-dist="v" title="Distribute vertically" style="transform:rotate(90deg)">${U.ic('distH', 14)}</button></div>
      <div class="lbl">Fill</div>${swatches(SH.FILLS, null, 'fill')}
      <button class="btn btn-sm btn-danger" data-del>${U.ic('trash')}Delete</button></div>`;
    U.$$('[data-al]', P).forEach((b) => (b.onclick = () => change(() => {
      const bb = selBox(); const k = b.dataset.al;
      ss.forEach((s) => { if (k === 'l') s.x = bb.x; if (k === 'r') s.x = bb.x + bb.w - s.w; if (k === 'c') s.x = bb.x + (bb.w - s.w) / 2; if (k === 't') s.y = bb.y; if (k === 'b') s.y = bb.y + bb.h - s.h; if (k === 'm') s.y = bb.y + (bb.h - s.h) / 2; });
    })));
    U.$$('[data-dist]', P).forEach((b) => (b.onclick = () => change(() => {
      const hz = b.dataset.dist === 'h'; const a = [...ss].sort((x, y) => (hz ? x.x - y.x : x.y - y.y)); if (a.length < 3) return;
      const tot = U.sum(a.map((s) => (hz ? s.w : s.h))); const span = hz ? a[a.length - 1].x + a[a.length - 1].w - a[0].x : a[a.length - 1].y + a[a.length - 1].h - a[0].y; const gap = (span - tot) / (a.length - 1);
      let cur = hz ? a[0].x : a[0].y; a.forEach((s) => { if (hz) { s.x = cur; cur += s.w + gap; } else { s.y = cur; cur += s.h + gap; } });
    })));
    U.$$('[data-fill]', P).forEach((b) => (b.onclick = () => change(() => ss.forEach((s) => (s.fill = b.dataset.fill || undefined)))));
    P.querySelector('[data-del]').onclick = deleteSel;
  }

  function propsEdge(P, ed) {
    P.innerHTML = `<div class="pp-s"><h5>Connector</h5>
      <div class="field"><label>Label</label><input class="inp inp-sm" data-k="text" value="${U.esc(ed.text || '')}" placeholder="e.g. Yes / No"></div>
      <div class="lbl">Routing</div><div class="mini-btns">${[['ortho', 'Elbow'], ['straight', 'Straight'], ['curve', 'Curved']].map(([k, l]) => `<button data-kind="${k}" class="${(ed.kind || 'ortho') === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="lbl">Arrows</div><div class="mini-btns">${[['none', 'None'], ['end', 'End'], ['both', 'Both']].map(([k, l]) => `<button data-arrow="${k}" class="${ed.arrow === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="lbl">Line</div><div class="mini-btns"><button data-dash="0" class="${!ed.dash ? 'on' : ''}">Solid</button><button data-dash="1" class="${ed.dash ? 'on' : ''}">Dashed</button>${[1.5, 2.5, 4].map((w) => `<button data-w="${w}" class="${(ed.w || 1.5) === w ? 'on' : ''}">${w}px</button>`).join('')}</div>
      <div class="lbl">Color</div>${swatches(SH.STROKES, ed.color, 'col')}
      <div class="lbl">Sides</div><div class="mini-btns"><button data-flip>Reverse direction</button><button data-auto>Auto sides</button></div>
      <button class="btn btn-sm btn-danger" data-del>${U.ic('trash')}Delete connector</button></div>`;
    const inp = P.querySelector('[data-k=text]'); let b0 = null;
    inp.oninput = () => { if (!b0) b0 = snap(); ed.text = inp.value; renderEdges(); }; inp.onchange = () => { if (b0) commit(b0); b0 = null; };
    U.$$('[data-kind]', P).forEach((b) => (b.onclick = () => change(() => (ed.kind = b.dataset.kind))));
    U.$$('[data-arrow]', P).forEach((b) => (b.onclick = () => change(() => (ed.arrow = b.dataset.arrow))));
    U.$$('[data-dash]', P).forEach((b) => (b.onclick = () => change(() => (ed.dash = b.dataset.dash === '1'))));
    U.$$('[data-w]', P).forEach((b) => (b.onclick = () => change(() => (ed.w = +b.dataset.w))));
    U.$$('[data-col]', P).forEach((b) => (b.onclick = () => change(() => (ed.color = b.dataset.col || undefined))));
    P.querySelector('[data-flip]').onclick = () => change(() => { [ed.a, ed.b] = [ed.b, ed.a]; [ed.as, ed.bs] = [ed.bs, ed.as]; });
    P.querySelector('[data-auto]').onclick = () => change(() => { ed.as = null; ed.bs = null; });
    P.querySelector('[data-del]').onclick = deleteSel;
  }

  function propsShape(P, s) {
    const def = SH.def(s.type); const t = taskOf(s); const hasText = !!SH.textBox(s);
    let html = `<div class="pp-s"><h5>${U.esc(def.name)}${s.locked ? ' · locked' : ''}</h5>`;
    if (hasText) html += `<div class="field"><label>Text</label><textarea class="inp" rows="2" data-k="text">${U.esc(s.text || '')}</textarea></div>
      <div class="row" style="gap:6px"><div class="mini-btns">${[12, 14, 16, 20, 28].map((f) => `<button data-fs="${f}" class="${(s.fs || 14) === f ? 'on' : ''}">${f}</button>`).join('')}</div><div class="mini-btns right"><button data-bold class="${s.bold ? 'on' : ''}"><b>B</b></button><button data-align="left" class="${s.align === 'left' ? 'on' : ''}">${U.ic('alignL', 13)}</button><button data-align="center" class="${s.align === 'center' ? 'on' : ''}">${U.ic('alignC', 13)}</button></div></div>`;
    if (s.type === 'phase') html += `<div class="lbl">Letter</div><div class="mini-btns">${['D', 'M', 'A', 'I', 'C', 'P', 'S'].map((l) => `<button data-letter="${l}" class="${s.text === l ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    html += '</div>';
    // tipo-específico
    if (s.type === 'chart') {
      const st = FL.charts.stats(s);
      const dataText = s.chart === 'pareto' ? (s.labels || []).map((l, i) => `${l}\t${(s.values || [])[i] ?? ''}`).join('\n') : (s.values || []).join('\n');
      html += `<div class="pp-s"><h5>Chart</h5>
        <div class="field"><label>Type</label><select class="inp inp-sm" data-chart>${Object.entries(FL.charts.TYPES).map(([k, l]) => `<option value="${k}"${s.chart === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>Title</label><input class="inp inp-sm" data-k="title" value="${U.esc(s.title || '')}"></div>
        ${s.chart !== 'pareto' ? `<div class="g2" style="gap:8px"><div class="field"><label>LSL</label><input class="inp inp-sm mono" data-spec="lsl" value="${s.lsl ?? ''}"></div><div class="field"><label>USL</label><input class="inp inp-sm mono" data-spec="usl" value="${s.usl ?? ''}"></div></div>` : ''}
        <div class="field"><label>Data <span class="muted" style="font-weight:400">— ${s.chart === 'pareto' ? 'category ⇥ count per line' : 'one value per line'} · paste from Excel</span></label><textarea class="inp mono" rows="7" data-chartdata style="font-size:12px">${U.esc(dataText)}</textarea></div>
        <div class="statgrid">${s.chart === 'pareto' ? `<div><small>Total</small><b>${st.total || 0}</b></div><div><small>Vital few</small><b>${st.vital || 0} of ${(st.items || []).length}</b></div>` : `<div><small>n</small><b>${st.n}</b></div><div><small>Mean</small><b>${U.num(st.mean, 3)}</b></div><div><small>StDev</small><b>${U.num(st.sd, 3)}</b></div>${st.ucl != null ? `<div><small>UCL / LCL</small><b>${U.num(st.ucl, 2)} / ${U.num(st.lcl, 2)}</b></div>` : ''}${st.cpk != null ? `<div><small>Cpk</small><b style="color:${st.cpk >= 1.33 ? 'var(--c-done)' : st.cpk >= 1 ? 'var(--c-attention)' : 'var(--c-error)'}">${U.num(st.cpk, 2)}</b></div><div><small>PPM out</small><b>${(st.ppm || 0).toLocaleString('en-US')}</b></div>` : ''}${st.signals != null ? `<div><small>Signals</small><b style="color:${st.signals ? 'var(--c-error)' : 'var(--c-done)'}">${st.signals}</b></div>` : ''}`}</div>
      </div>`;
    }
    if (s.type === 'pstep') html += `<div class="pp-s"><h5>Outputs (Y)</h5><textarea class="inp" rows="3" data-outs placeholder="One per line">${U.esc((s.outputs || []).join('\n'))}</textarea>
      <h5>Inputs (X)</h5><textarea class="inp" rows="5" data-ins placeholder="One per line — end with (C), (N) or (S)">${U.esc((s.inputs || []).map((i) => `${i.t} (${i.c})`).join('\n'))}</textarea><span class="muted" style="font-size:12px">C = controllable · N = noise · S = SOP</span></div>`;
    if (s.type === 'card') html += `<div class="pp-s"><h5>Characteristics</h5><textarea class="inp" rows="5" data-items placeholder="One per line — add [CTQ] or [X]">${U.esc((s.items || []).map((i) => i.t + (i.tag ? ` [${i.tag}]` : '')).join('\n'))}</textarea>
      <div class="row"><button class="btn btn-sm" data-cardimg>${U.ic('image')}${s.img ? 'Replace photo' : 'Add photo'}</button>${s.img ? `<button class="btn btn-sm btn-g" data-cardimgx>Remove</button>` : ''}</div></div>`;
    if (s.type === 'gb-step') html += `<div class="pp-s"><h5>y's (outputs)</h5><textarea class="inp" rows="3" data-gbouts placeholder="One per line">${U.esc((s.outputs || []).join('\n'))}</textarea>
      <h5>x's (inputs)</h5><textarea class="inp" rows="5" data-gbins placeholder="C - sheet with holes&#10;N - type of weight*">${U.esc((s.inputs || []).map(SH.gbX).join('\n'))}</textarea><span class="muted" style="font-size:12px">C = controllable · N = noise · SO = standard operation · end with * for critical</span></div>`;
    if (s.type === 'gb-comp') html += `<div class="pp-s"><h5>Component number</h5><input class="inp inp-sm mono" style="width:80px" data-gbn value="${s.n ?? 1}">
      <h5>Functions (y${s.n ?? 1}.k)</h5><textarea class="inp" rows="3" data-gbfuncs placeholder="Direct heat to the cavity center">${U.esc((s.funcs || []).join('\n'))}</textarea>
      <h5>Characteristics (x${s.n ?? 1}.k)</h5><textarea class="inp" rows="6" data-gbitems placeholder="material (QCV)&#10;thickness (0.6 mm)*">${U.esc((s.items || []).map((i) => (i.st === '+' ? '+ ' : i.st === '~' ? '~ ' : '') + i.t + (i.crit ? '*' : '')).join('\n'))}</textarea>
      <span class="muted" style="font-size:12px">* = critical · start with + for included (red) · ~ for excluded (struck out)</span>
      <label class="row" style="gap:8px;font-size:13px"><input type="checkbox" data-gbchanged${s.changed ? ' checked' : ''}> Changed component (orange)</label>
      <div class="row"><button class="btn btn-sm" data-cardimg>${U.ic('image')}${s.img ? 'Replace photo' : 'Add photo'}</button>${s.img ? `<button class="btn btn-sm btn-g" data-cardimgx>Remove</button>` : ''}</div><span class="muted" style="font-size:12px">Tip: select the card and press Ctrl+V to paste a photo into it.</span></div>`;
    if (s.type === 'image') html += `<div class="pp-s"><h5>Image</h5><div class="row"><button class="btn btn-sm" data-imgrep>${U.ic('upload')}Replace</button><button class="btn btn-sm btn-g" data-ratio>Reset ratio</button></div></div>`;
    // aparência
    if (!['chart', 'image', 'phase', 'vsm-time'].includes(s.type) || s.type === 'phase') html += `<div class="pp-s"><h5>Fill</h5>${swatches(SH.FILLS, s.fill, 'fill')}${!['text', 'sticky', 'phase'].includes(s.type) ? `<h5>Border</h5>${swatches(SH.STROKES, s.stroke, 'stroke')}<div class="mini-btns"><button data-dash="0" class="${!s.dash ? 'on' : ''}">Solid</button><button data-dash="1" class="${s.dash ? 'on' : ''}">Dashed</button>${[1, 1.5, 2.5].map((w) => `<button data-sw="${w}" class="${(s.sw ?? 1.5) === w ? 'on' : ''}">${w}</button>`).join('')}</div>` : ''}</div>`;
    // dados da forma
    const dd = s.data || {};
    html += `<div class="pp-s"><h5>Shape data <span class="right muted" style="font-weight:400">used by data rules</span></h5>
      ${Object.keys(dd).map((k) => `<div class="kv" data-kv="${U.esc(k)}"><input class="inp k" value="${U.esc(k)}" data-kk><input class="inp mono" value="${U.esc(dd[k])}" data-kval><button class="ib ib-sm ib-ghost" data-kdel aria-label="Remove field">${U.ic('x', 13)}</button></div>`).join('')}
      <button class="btn btn-sm btn-g" data-kadd style="align-self:flex-start">${U.ic('plus')}Add field</button></div>`;
    // vínculo com o plano
    html += `<div class="pp-s"><h5>Plan link</h5>${t ? `<div class="linked-task"><b style="font-weight:600">${U.esc(t.name)}</b><div class="row" style="gap:6px;flex-wrap:wrap"><span class="st ${FL.status(t.status).cls}"><i></i>${t.status}</span>${U.avatar(t.owner, 20)}<span class="mono muted" style="font-size:12px">due ${D.short(t.end)}</span></div><div class="row"><button class="btn btn-sm" data-topen>Open task</button><button class="btn btn-sm btn-g" data-tplan>Show in plan</button><button class="btn btn-sm btn-g right" data-tunlink title="Unlink">${U.ic('x')}</button></div></div>`
      : `<span class="muted" style="font-size:12px;line-height:1.45">Turn this shape into a tracked action. Its status shows on the map and in the plan.</span><div class="row"><button class="btn btn-sm btn-p" data-tcreate>${U.ic('bolt')}Create action item</button><button class="btn btn-sm" data-tlink>${U.ic('link')}Link…</button></div>`}</div>`;
    // arranjo
    html += `<div class="pp-s"><h5>Arrange</h5><div class="g2" style="gap:6px">${['x', 'y', 'w', 'h'].map((k) => `<div class="pp-row" style="grid-template-columns:18px 1fr"><span class="mono">${k.toUpperCase()}</span><input class="inp inp-sm mono" data-geo="${k}" value="${Math.round(s[k])}"${k === 'h' && def.autoH ? ' disabled' : ''}></div>`).join('')}</div>
      <div class="mini-btns"><button data-front title="Bring to front">${U.ic('front', 14)}</button><button data-back title="Send to back">${U.ic('back', 14)}</button><button data-lock class="${s.locked ? 'on' : ''}" title="Lock">${U.ic('lock', 14)}</button><button data-dup title="Duplicate">${U.ic('copy', 14)}</button><button data-del title="Delete" style="color:var(--c-error)">${U.ic('trash', 14)}</button></div></div>`;
    P.innerHTML = html;

    // ligações
    const liveInput = (el, apply) => { let b0 = null; el.addEventListener('input', () => { if (!b0) b0 = snap(); apply(el.value); E.cache.delete(s.id); renderShapes(); renderEdges(); renderOverlay(); }); el.addEventListener('change', () => { if (b0) { commit(b0); b0 = null; drawMinimap(); } }); };
    const ta = P.querySelector('[data-k=text]'); if (ta) liveInput(ta, (v) => (s.text = v));
    const tt = P.querySelector('[data-k=title]'); if (tt) liveInput(tt, (v) => (s.title = v));
    U.$$('[data-fs]', P).forEach((b) => (b.onclick = () => change(() => (s.fs = +b.dataset.fs))));
    const bb = P.querySelector('[data-bold]'); if (bb) bb.onclick = () => change(() => (s.bold = !s.bold));
    U.$$('[data-align]', P).forEach((b) => (b.onclick = () => change(() => (s.align = b.dataset.align))));
    U.$$('[data-letter]', P).forEach((b) => (b.onclick = () => change(() => (s.text = b.dataset.letter))));
    U.$$('[data-fill]', P).forEach((b) => (b.onclick = () => change(() => (s.fill = b.dataset.fill || undefined))));
    U.$$('[data-stroke]', P).forEach((b) => (b.onclick = () => change(() => (s.stroke = b.dataset.stroke || undefined))));
    U.$$('[data-dash]', P).forEach((b) => (b.onclick = () => change(() => (s.dash = b.dataset.dash === '1'))));
    U.$$('[data-sw]', P).forEach((b) => (b.onclick = () => change(() => (s.sw = +b.dataset.sw))));
    const ch = P.querySelector('[data-chart]'); if (ch) ch.onchange = () => change(() => { s.chart = ch.value; if (ch.value === 'pareto' && !s.labels) s.labels = (s.values || []).map((_, i) => 'Cat ' + (i + 1)); });
    U.$$('[data-spec]', P).forEach((i) => liveInput(i, (v) => (s[i.dataset.spec] = v === '' ? null : +v.replace(',', '.'))));
    const cd = P.querySelector('[data-chartdata]'); if (cd) { let b0 = null; cd.addEventListener('input', U.debounce(() => { if (!b0) b0 = snap(); const pr = FL.charts.parse(cd.value); if (s.chart === 'pareto') { s.labels = pr.labeled ? pr.labels : pr.values.map((_, i) => s.labels && s.labels[i] ? s.labels[i] : 'Cat ' + (i + 1)); } s.values = pr.values; E.cache.delete(s.id); renderShapes(); }, 250)); cd.addEventListener('change', () => { if (b0) { commit(b0); b0 = null; } drawProps(); }); }
    const outs = P.querySelector('[data-outs]'); if (outs) liveInput(outs, (v) => (s.outputs = v.split('\n').map((x) => x.trim()).filter(Boolean)));
    const ins = P.querySelector('[data-ins]'); if (ins) liveInput(ins, (v) => (s.inputs = v.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => { const m = x.match(/^(.*?)\s*\((C|N|S|SOP)\)\s*$/i); return m ? { t: m[1], c: m[2].toUpperCase()[0] } : { t: x, c: 'C' }; })));
    const its = P.querySelector('[data-items]'); if (its) liveInput(its, (v) => (s.items = v.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => { const m = x.match(/^(.*?)\s*\[(\w+)\]\s*$/); return m ? { t: m[1], tag: m[2].toUpperCase() } : { t: x, tag: '' }; })));
    const lines = (v) => v.split('\n').map((x) => x.trim()).filter(Boolean);
    const go = P.querySelector('[data-gbouts]'); if (go) liveInput(go, (v) => (s.outputs = lines(v)));
    const gi = P.querySelector('[data-gbins]'); if (gi) liveInput(gi, (v) => (s.inputs = lines(v).map(SH.parseX)));
    const gn = P.querySelector('[data-gbn]'); if (gn) liveInput(gn, (v) => (s.n = Math.max(0, parseInt(v, 10) || 0)));
    const gf = P.querySelector('[data-gbfuncs]'); if (gf) liveInput(gf, (v) => (s.funcs = lines(v)));
    const gt = P.querySelector('[data-gbitems]'); if (gt) liveInput(gt, (v) => (s.items = lines(v).map((x) => { const st = /^[+~]/.test(x) ? x[0] : ''; const t = x.replace(/^[+~]\s*/, ''); return { t: t.replace(/\*\s*$/, '').trim(), crit: /\*\s*$/.test(t), st }; })));
    const gc = P.querySelector('[data-gbchanged]'); if (gc) gc.onchange = () => change(() => (s.changed = gc.checked));
    const ci = P.querySelector('[data-cardimg]'); if (ci) ci.onclick = () => pickImage(s.id);
    const cx = P.querySelector('[data-cardimgx]'); if (cx) cx.onclick = () => change(() => delete s.img);
    const ir = P.querySelector('[data-imgrep]'); if (ir) ir.onclick = () => pickImage(s.id);
    const rt = P.querySelector('[data-ratio]'); if (rt) rt.onclick = () => { const src = S.assets[s.img]; if (!src) return; const im = new Image(); im.onload = () => change(() => (s.h = Math.round(s.w * (im.height / im.width)))); im.src = src; };
    U.$$('[data-kv]', P).forEach((row) => {
      const k0 = row.dataset.kv; const kk = row.querySelector('[data-kk]'), kv = row.querySelector('[data-kval]');
      kv.onchange = () => change(() => { s.data[k0] = isNaN(+kv.value) || kv.value === '' ? kv.value : +kv.value; });
      kk.onchange = () => change(() => { const v = s.data[k0]; delete s.data[k0]; if (kk.value.trim()) s.data[kk.value.trim()] = v; });
      row.querySelector('[data-kdel]').onclick = () => change(() => delete s.data[k0]);
    });
    P.querySelector('[data-kadd]').onclick = () => change(() => { s.data = s.data || {}; let n = 'Field', i = 1; while (n in s.data) n = 'Field ' + ++i; s.data[n] = ''; });
    const tc = P.querySelector('[data-tcreate]'); if (tc) tc.onclick = () => createTask(s);
    const tl = P.querySelector('[data-tlink]'); if (tl) tl.onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); linkMenu({ clientX: r.left, clientY: r.bottom + 4 }, s); };
    const to = P.querySelector('[data-topen]'); if (to) to.onclick = () => FL.plan.openTask(E.p, t.id, () => { E.cache.delete(s.id); renderAll(); drawProps(); });
    const tp = P.querySelector('[data-tplan]'); if (tp) tp.onclick = () => { FL.shell.go(`#/p/${E.p.id}/plan`); setTimeout(() => FL.plan.focusTask(t.id), 80); };
    const tu = P.querySelector('[data-tunlink]'); if (tu) tu.onclick = () => { change(() => { delete s.taskId; t.link = null; }); S.touch(E.p); };
    U.$$('[data-geo]', P).forEach((i) => (i.onchange = () => change(() => (s[i.dataset.geo] = Math.max(i.dataset.geo === 'w' || i.dataset.geo === 'h' ? 20 : -1e6, +i.value || 0)))));
    P.querySelector('[data-front]').onclick = () => change(() => { const a = data().shapes; a.push(a.splice(a.indexOf(s), 1)[0]); });
    P.querySelector('[data-back]').onclick = () => change(() => { const a = data().shapes; a.unshift(a.splice(a.indexOf(s), 1)[0]); });
    P.querySelector('[data-lock]').onclick = () => change(() => (s.locked = !s.locked));
    P.querySelector('[data-dup]').onclick = duplicate;
    P.querySelector('[data-del]').onclick = deleteSel;
  }

  /* ================================================================
     Exportação (SVG / PNG) — só SVG puro, sem foreignObject
     ================================================================ */
  function exportImage(fmt) {
    const d = data(); if (!d.shapes.length) return K.toast('Nothing to export');
    const col = colors(); const pad = 40;
    const x1 = Math.min(...d.shapes.map((s) => s.x)) - pad, y1 = Math.min(...d.shapes.map((s) => s.y)) - pad - 12;
    const x2 = Math.max(...d.shapes.map((s) => s.x + s.w)) + pad, y2 = Math.max(...d.shapes.map((s) => s.y + s.h)) + pad + 20;
    const W = Math.ceil(x2 - x1), H = Math.ceil(y2 - y1);
    const body = [...d.shapes.filter((s) => SH.isContainer(s)), ...d.shapes.filter((s) => !SH.isContainer(s))];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${x1} ${y1} ${W} ${H}"><rect x="${x1}" y="${y1}" width="${W}" height="${H}" fill="${col.board}"/>
      ${body.filter((s) => SH.isContainer(s)).map((s) => `<g transform="translate(${s.x} ${s.y})">${shapeSVG(s, col, E.page)}</g>`).join('')}
      ${d.edges.map((e) => edgeSVG(e, col, false)).join('')}
      ${body.filter((s) => !SH.isContainer(s)).map((s) => `<g transform="translate(${s.x} ${s.y})">${shapeSVG(s, col, E.page)}</g>`).join('')}</svg>`;
    const name = `${E.p.code}-${E.page.name.replace(/[^\w-]+/g, '_')}`;
    if (fmt === 'svg') { U.download(name + '.svg', svg, 'image/svg+xml'); return; }
    const img = new Image(); const scale = Math.min(2, 8000 / Math.max(W, H));
    img.onload = () => { const c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale; const g = c.getContext('2d'); g.scale(scale, scale); g.drawImage(img, 0, 0); c.toBlob((b) => U.download(name + '.png', b), 'image/png'); };
    img.onerror = () => K.toast('PNG export failed — try SVG');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
})(window.FL);

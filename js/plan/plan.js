/* Flowline · Plano — grade estilo Smartsheet + Gantt sincronizado.
   Hierarquia por recuo, dias úteis, predecessoras (FS/SS/FF ± lag), caminho crítico, baseline,
   edição por teclado, arrastar barras / redimensionar / ligar dependências. */
(function (FL) {
  const U = FL.util, D = U.date, S = FL.store, K = FL.kit, SC = FL.schedule;
  const RH = 34, HH = 48;
  const PL = (FL.plan = {});

  const COLS = [
    { k: 'name', label: 'Task name', w: 330 },
    { k: 'phase', label: 'Phase', w: 62 },
    { k: 'owner', label: 'Assigned to', w: 156 },
    { k: 'status', label: 'Status', w: 124 },
    { k: 'tags', label: 'Tags', w: 170 },
    { k: 'start', label: 'Start', w: 94 },
    { k: 'end', label: 'Finish', w: 94 },
    { k: 'dur', label: 'Duration', w: 78 },
    { k: 'pct', label: '% Complete', w: 112 },
    { k: 'preds', label: 'Predecessors', w: 110 },
    { k: 'notes', label: 'Comments', w: 260 },
  ];
  const ZOOM = { day: 30, week: 13, month: 4.2 };

  let C = null; // contexto da instância aberta

  PL.render = (host, p) => {
    const prefs = (S.state.prefs.plan = S.state.prefs.plan || { gridW: 720, zoom: 'week', crit: false, base: true, filter: 'all', widths: {} });
    C = { host, p, prefs, sel: { row: 0, col: 0 }, editing: null, hover: -1, vis: [], tr: null, crit: { set: new Set() } };
    host.innerHTML = `
      <div class="ptool">
        ${PL.viewSwitch('gantt')}<span class="sep"></span>
        <button class="btn btn-sm btn-p" data-a="add">${U.ic('plus')}Add task</button>
        <button class="ib ib-sm" data-a="outdent" title="Outdent (Ctrl+[)">${U.ic('outdent')}</button>
        <button class="ib ib-sm" data-a="indent" title="Indent (Ctrl+])">${U.ic('indent')}</button>
        <button class="ib ib-sm" data-a="del" title="Delete row">${U.ic('trash')}</button>
        <span class="sep"></span>
        <button class="ib ib-sm" data-a="undo" title="Undo (Ctrl+Z)">${U.ic('undo')}</button>
        <button class="ib ib-sm" data-a="redo" title="Redo (Ctrl+Y)">${U.ic('redo')}</button>
        <span class="sep"></span>
        <div class="seg" data-g="filter">${[['all', 'All'], ['mine', 'Assigned to me'], ['open', 'Open'], ['late', 'Late & at risk']].map(([k, l]) => `<button data-v="${k}">${l}</button>`).join('')}</div>
        <span class="sep"></span>
        <button class="btn btn-sm" data-a="crit">${U.ic('bolt')}Critical path</button>
        <button class="btn btn-sm" data-a="base">${U.ic('layers')}Baseline</button>
        <div class="right row" style="gap:6px">
          <button class="btn btn-sm btn-g" data-a="today">${U.ic('target')}Today</button>
          <div class="seg" data-g="zoom">${[['day', 'Days'], ['week', 'Weeks'], ['month', 'Months']].map(([k, l]) => `<button data-v="${k}">${l}</button>`).join('')}</div>
          <button class="ib ib-sm" data-a="export" title="Export CSV">${U.ic('download')}</button>
        </div>
      </div>
      <div class="plan">
        <div class="pgrid" tabindex="0"><div class="ghead"></div><div class="gbody"></div></div>
        <div class="splitter" title="Drag to resize"></div>
        <div class="pgantt"><div class="gwrap"></div></div>
      </div>`;
    C.grid = U.$('.pgrid', host); C.gantt = U.$('.pgantt', host); C.split = U.$('.splitter', host);
    C.grid.style.width = prefs.gridW + 'px';
    wireToolbar(); wireGrid(); wireGantt(); wireSplitter();
    draw(true);
    const onKey = (e) => keydown(e);
    document.addEventListener('keydown', onKey);
    const onTheme = S.on((evt) => { if (evt === 'theme') draw(); });
    return () => { document.removeEventListener('keydown', onKey); onTheme(); C = null; };
  };

  /* ---------- Mutação com undo ---------- */
  const key = () => 'plan:' + C.p.id;
  const ro = () => !S.canEdit(C.p);
  const roToast = () => K.toast(FL.t('You have view-only access to this project'));
  function mutate(fn, logText) {
    if (ro()) return roToast();
    S.record(key(), JSON.stringify(C.p.tasks));
    fn();
    SC.compute(C.p.tasks);
    if (logText) S.log(C.p, logText);
    S.touch(C.p); draw(); FL.project.redrawRec && FL.project.redrawRec();
  }
  function undo(redo) {
    const cur = JSON.stringify(C.p.tasks);
    const snap = redo ? S.redo(key(), cur) : S.undo(key(), cur);
    if (!snap) { K.toast(redo ? 'Nothing to redo' : 'Nothing to undo'); return; }
    C.p.tasks = JSON.parse(snap); S.touch(C.p); draw();
  }

  /* ---------- Visíveis (colapso + filtro) ---------- */
  function computeVisible() {
    const t = C.p.tasks; const tr = (C.tr = SC.tree(t)); const today = D.today(); const me = S.state.me;
    const f = C.prefs.filter;
    const match = (x, i) => tr.isSum[i] ? false :
      f === 'mine' ? x.owner === me : f === 'open' ? x.status !== 'Done' : f === 'late' ? (x.status === 'At risk' || x.status === 'Blocked' || (x.status !== 'Done' && x.end < today)) : true;
    let keep = new Array(t.length).fill(f === 'all');
    if (f !== 'all') t.forEach((x, i) => { if (match(x, i)) { keep[i] = true; let pa = tr.parent[i]; while (pa >= 0) { keep[pa] = true; pa = tr.parent[pa]; } } });
    const vis = []; let hideBelow = Infinity;
    t.forEach((x, i) => {
      if (x.level > hideBelow) return; hideBelow = Infinity;
      if (!keep[i]) return;
      vis.push(i);
      if (tr.isSum[i] && x.collapsed && f === 'all') hideBelow = x.level;
    });
    C.vis = vis;
  }

  /* ---------- Desenho ---------- */
  function draw(scrollToday) {
    if (!C) return;
    computeVisible();
    C.critAll = SC.critical(C.p.tasks); C.crit = C.prefs.crit ? C.critAll : { set: new Set() };
    drawToolbarState(); drawGrid(); drawGantt();
    if (scrollToday) scrollTo(D.today());
  }
  function drawToolbarState() {
    U.$$('[data-g]', C.host).forEach((g) => U.$$('button', g).forEach((b) => b.classList.toggle('on', C.prefs[g.dataset.g] === b.dataset.v)));
    U.$('[data-a=crit]', C.host).classList.toggle('btn-p', !!C.prefs.crit);
    const hasBase = !!C.p.baseline;
    const bb = U.$('[data-a=base]', C.host); bb.classList.toggle('btn-p', hasBase && C.prefs.base);
    bb.innerHTML = `${U.ic('layers')}${hasBase ? 'Baseline' : 'Set baseline'}`;
    U.$('[data-a=undo]', C.host).disabled = !S.canUndo(key()); U.$('[data-a=redo]', C.host).disabled = !S.canRedo(key());
  }
  const colW = (c) => C.prefs.widths[c.k] || c.w;

  function drawGrid() {
    const { p, tr } = C; const t = p.tasks;
    const totalW = 46 + U.sum(COLS.map(colW));
    const hd = U.$('.ghead', C.grid), bd = U.$('.gbody', C.grid);
    hd.style.width = bd.style.width = totalW + 'px';
    hd.innerHTML = `<div class="gc rn"></div>${COLS.map((c, i) => `<div class="gc" style="width:${colW(c)}px" data-ci="${i}">${c.label}<span class="rz" data-rz="${c.k}"></span></div>`).join('')}`;
    const today = D.today();
    bd.style.height = C.vis.length * RH + 'px';
    bd.innerHTML = C.vis.map((i, r) => {
      const x = t[i]; const sum = tr.isSum[i]; const st = FL.status(x.status); const ph = FL.phase(x.phase);
      const late = !sum && x.status !== 'Done' && x.end && x.end < today;
      const crit = C.crit.set.has(x.id);
      const cells = COLS.map((c, ci) => {
        let v = '', cls = '';
        switch (c.k) {
          case 'name': v = `<div class="tn" style="padding-left:${x.level * 18}px">${sum ? `<span class="tw" data-tog="${i}">${U.ic(x.collapsed ? 'chevR' : 'chev', 14)}</span>` : '<span style="width:16px;flex:none"></span>'}${x.milestone && !sum ? `<span style="color:var(--c-ink-500);display:grid">${U.ic('diamond', 12)}</span>` : ''}<span class="tt" title="${U.esc(x.name)}">${U.esc(x.name)}</span>${x.link ? `<span class="lk" data-link="${i}" title="Open linked map shape">${U.ic('link', 13)}</span>` : ''}${crit ? '<i class="cdot" title="Critical path"></i>' : ''}</div>`; break;
          case 'phase': v = `<span class="phase-chip" style="background:${ph.color}">${x.phase}</span>`; cls = 'ctr'; break;
          case 'owner': v = x.owner ? `<span class="row" style="gap:6px">${U.avatar(x.owner, 20)}<span style="overflow:hidden;text-overflow:ellipsis">${U.esc(x.owner)}</span></span>` : '<span class="muted">—</span>'; break;
          case 'status': v = `<span class="st ${st.cls}"><i></i>${x.status}</span>`; break;
          case 'start': v = D.fmt(x.start); cls = 'mono' + (sum ? ' ro' : ''); break;
          case 'end': v = D.fmt(x.end); cls = 'mono' + (sum ? ' ro' : '') + (late ? ' late' : ''); break;
          case 'dur': v = x.milestone && !sum ? '0d' : (x.dur || 0) + 'd'; cls = 'mono num' + (sum ? ' ro' : ''); break;
          case 'pct': v = `<div class="pct"><div class="bar"><i style="width:${x.pct || 0}%;background:${x.pct >= 100 ? 'var(--c-done)' : 'var(--c-action)'}"></i></div><span class="mono" style="font-size:12px;width:32px;text-align:right">${x.pct || 0}%</span></div>`; cls = sum ? 'ro' : ''; break;
          case 'preds': v = SC.fmtPreds(x, t, tr); cls = 'mono'; break;
          case 'tags': { const tg = sum ? [] : FL.board.tagsOf(C.p, x, C.critAll.set).filter((g) => !g.sys || g.id === 'sys:crit'); v = tg.length ? `<span class="row" style="gap:4px;overflow:hidden">${tg.map((g) => FL.board.chip(g)).join('')}</span>` : ''; break; }
          case 'notes': v = `<span class="muted">${U.esc(x.notes || '')}</span>`; break;
        }
        const sel = C.sel.row === r && C.sel.col === ci;
        return `<div class="gc ${cls}${sel ? ' sel' : ''}" style="width:${colW(c)}px" data-c="${ci}">${v}</div>`;
      }).join('');
      return `<div class="gr${sum ? ' sum' : ''}${C.sel.row === r ? ' selr' : ''}${C.hover === r ? ' hov' : ''}" data-r="${r}" style="top:${r * RH}px"><div class="gc rn" data-rn>${i + 1}</div>${cells}</div>`;
    }).join('') + (C.vis.length ? '' : `<div class="empty" style="position:absolute;left:0;right:0;top:20px"><b>No tasks match this filter</b></div>`);
    // linha de "adicionar"
    bd.insertAdjacentHTML('beforeend', `<div class="gr add" style="top:${C.vis.length * RH}px;width:${totalW}px"><div class="gc rn"></div><div class="gc" style="width:${colW(COLS[0])}px;color:var(--c-ink-500);cursor:text" data-addrow>${U.ic('plus', 13)} Add a task</div></div>`);
    bd.style.height = (C.vis.length + 1) * RH + 'px';
  }

  /* --- Escala de tempo --- */
  function range() {
    const t = C.p.tasks.filter((x) => x.start);
    let a = t.reduce((m, x) => (x.start < m ? x.start : m), D.today()), b = t.reduce((m, x) => (x.end > m ? x.end : m), D.today());
    if (C.p.baseline) Object.values(C.p.baseline).forEach((v) => { if (v.start < a) a = v.start; if (v.end > b) b = v.end; });
    const z = C.prefs.zoom;
    a = D.addDays(a, z === 'month' ? -30 : -10); b = D.addDays(b, z === 'month' ? 60 : 28);
    if (z !== 'day') { const d = D.parse(a); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); a = D.iso(d); } // começa na segunda
    if (z === 'month') a = a.slice(0, 8) + '01';
    return { a, b, days: D.diff(a, b) + 1 };
  }
  const xOf = (iso) => D.diff(C.r.a, iso) * C.dw;

  function drawGantt() {
    const { p, tr } = C; const t = p.tasks;
    C.r = range(); C.dw = ZOOM[C.prefs.zoom];
    const W = Math.ceil(C.r.days * C.dw), H = Math.max(C.vis.length + 1, 1) * RH;
    const css = getComputedStyle(document.documentElement); const cv = (n) => css.getPropertyValue(n).trim();
    const line = cv('--c-line-soft'), ink5 = cv('--c-ink-500'), ink9 = cv('--c-ink-900'), surf2 = cv('--c-surface-2'), weekend = cv('--c-surface-2');
    // cabeçalho
    let top = '', bot = '', grid = '';
    const z = C.prefs.zoom;
    for (let i = 0; i < C.r.days; i++) {
      const iso = D.addDays(C.r.a, i); const d = D.parse(iso); const x = i * C.dw;
      if (d.getDate() === 1 || i === 0) top += `<text x="${x + 6}" y="16" font-size="12" font-weight="600" fill="${ink9}">${D.MON[d.getMonth()]} ${d.getFullYear()}</text><line x1="${x}" y1="0" x2="${x}" y2="${HH}" stroke="${line}"/>`;
      if (z === 'day') { bot += `<text x="${x + C.dw / 2}" y="40" font-size="11" text-anchor="middle" fill="${ink5}" font-family="Geist Mono, monospace">${d.getDate()}</text>`; }
      if (z === 'week' && d.getDay() === 1) bot += `<text x="${x + 4}" y="40" font-size="11" fill="${ink5}" font-family="Geist Mono, monospace">${d.getDate()}</text><line x1="${x}" y1="26" x2="${x}" y2="${HH}" stroke="${line}"/>`;
      if (z === 'month' && d.getDay() === 1 && d.getDate() <= 7) bot += `<line x1="${x}" y1="30" x2="${x}" y2="${HH}" stroke="${line}"/>`;
      if (z !== 'month' && (d.getDay() === 0 || d.getDay() === 6)) grid += `<rect x="${x}" y="0" width="${C.dw}" height="${H}" fill="${weekend}"/>`;
      if (z === 'month' && d.getDate() === 1) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${line}"/>`;
      if (z === 'week' && d.getDay() === 1) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${line}"/>`;
    }
    // linhas
    let rows = '';
    C.vis.forEach((i, r) => { if (r === C.hover) rows += `<rect x="0" y="${r * RH}" width="${W}" height="${RH}" fill="${cv('--c-action-soft')}" opacity=".5"/>`; if (r === C.sel.row) rows += `<rect x="0" y="${r * RH}" width="${W}" height="${RH}" fill="${cv('--c-action-soft')}"/>`; rows += `<line x1="0" y1="${(r + 1) * RH - 0.5}" x2="${W}" y2="${(r + 1) * RH - 0.5}" stroke="${line}"/>`; });
    // hoje
    const tx = xOf(D.today()) + C.dw / 2;
    const todayLine = `<line x1="${tx}" y1="0" x2="${tx}" y2="${H}" stroke="${cv('--c-error')}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    // barras
    let bars = '', deps = '', base = '';
    const rowOf = new Map(C.vis.map((i, r) => [i, r]));
    C.vis.forEach((i, r) => {
      const x = t[i]; if (!x.start) return;
      const y = r * RH; const ph = FL.phase(x.phase); const crit = C.crit.set.has(x.id);
      const x1 = xOf(x.start), x2 = xOf(x.end) + C.dw;
      if (C.prefs.base && p.baseline && p.baseline[x.id] && !tr.isSum[i]) {
        const b = p.baseline[x.id]; const bx1 = xOf(b.start), bx2 = xOf(b.end) + C.dw;
        base += `<rect x="${bx1}" y="${y + 25}" width="${Math.max(3, bx2 - bx1)}" height="4" rx="2" fill="${ink5}" opacity=".45"/>`;
      }
      if (tr.isSum[i]) {
        bars += `<g class="gbar-g" data-i="${i}"><path d="M${x1} ${y + 11}h${x2 - x1}v10l-5 -4h${-(x2 - x1 - 10)}l-5 4z" fill="${ink9}" opacity=".85"/><rect x="${x1}" y="${y + 11}" width="${Math.max(0, (x2 - x1) * (x.pct || 0) / 100)}" height="6" fill="${cv('--c-done')}"/><text x="${x2 + 8}" y="${y + 21}" font-size="12" font-weight="600" fill="${ink9}">${U.esc(x.name)}</text></g>`;
      } else if (x.milestone) {
        const cx = x1 + C.dw / 2;
        bars += `<g class="gbar-g" data-i="${i}"><path class="gbar" data-drag="move" data-i="${i}" d="M${cx} ${y + 8}l9 9-9 9-9-9z" fill="${x.status === 'Done' ? cv('--c-done') : ph.color}" stroke="${crit ? cv('--c-error') : 'none'}" stroke-width="2"/><text x="${cx + 14}" y="${y + 21}" font-size="12" fill="${ink9}" font-weight="600">${U.esc(x.name)}</text><text x="${cx + 14 + U.measure(x.name, 12, 600) + 8}" y="${y + 21}" font-size="11" fill="${ink5}" font-family="Geist Mono, monospace">${D.short(x.start)}</text></g>`;
      } else {
        const w = Math.max(4, x2 - x1); const pw = w * (x.pct || 0) / 100;
        const stc = x.status === 'Blocked' ? cv('--c-error') : x.status === 'At risk' ? cv('--c-attention') : null;
        bars += `<g class="gbar-g" data-i="${i}">
          <rect class="gbar" data-drag="move" data-i="${i}" x="${x1}" y="${y + 8}" width="${w}" height="18" rx="4" fill="${ph.color}" fill-opacity=".28" stroke="${crit ? cv('--c-error') : stc || ph.color}" stroke-width="${crit || stc ? 2 : 1}"/>
          <rect x="${x1}" y="${y + 8}" width="${pw}" height="18" rx="4" fill="${ph.color}" pointer-events="none"/>
          ${w > 46 ? `<text x="${x1 + 7}" y="${y + 21}" font-size="11" font-weight="600" fill="${x.pct > 30 ? '#fff' : ink9}" pointer-events="none" font-family="Geist Mono, monospace">${x.pct || 0}%</text>` : ''}
          <rect class="gh" data-drag="end" data-i="${i}" x="${x1 + w - 6}" y="${y + 8}" width="8" height="18" fill="transparent"/>
          <circle class="glink" data-link-from="${i}" cx="${x1 + w + 9}" cy="${y + 17}" r="4.5" fill="${cv('--c-surface')}" stroke="${cv('--c-action')}" stroke-width="1.5"/>
          <text x="${x1 + w + 18}" y="${y + 21}" font-size="12" fill="${ink9}" pointer-events="none">${U.esc(x.name)}${x.owner ? `<tspan fill="${ink5}"> · ${U.esc(x.owner.split(' ')[0])}</tspan>` : ''}</text>
        </g>`;
      }
      // dependências
      (x.preds || []).forEach((pr) => {
        const j = tr.idx.get(pr.id); if (j == null || !rowOf.has(j)) return;
        const q = t[j]; const rj = rowOf.get(j);
        const qx1 = xOf(q.start), qx2 = q.milestone ? xOf(q.start) + C.dw / 2 + 9 : xOf(q.end) + C.dw;
        const sx1 = x.milestone ? x1 + C.dw / 2 - 9 : x1, sx2 = x2;
        const y1 = rj * RH + 17, y2 = r * RH + 17;
        let path;
        if (pr.type === 'SS') path = `M${qx1} ${y1}h-8V${y2}H${sx1 - 1}`;
        else if (pr.type === 'FF') path = `M${qx2} ${y1}h8V${y2}H${sx2 + 1}`;
        else if (sx1 - qx2 >= 16) { const xm = qx2 + 8; path = `M${qx2} ${y1}H${xm}V${y2}H${sx1 - 1}`; }
        else { const ym = y2 > y1 ? y2 - RH / 2 : y2 + RH / 2; path = `M${qx2} ${y1}h8V${ym}H${sx1 - 10}V${y2}H${sx1 - 1}`; }
        const cr = C.crit.set.has(x.id) && C.crit.set.has(q.id);
        deps += `<path class="gdep${cr ? ' crit' : ''}" d="${path}" marker-end="url(#ga${cr ? 'c' : ''})"/>`;
      });
    });
    const wrap = U.$('.gwrap', C.gantt);
    wrap.innerHTML = `
      <svg class="gsvg ghead-svg" width="${W}" height="${HH}" style="position:sticky;top:0;z-index:2;background:${surf2};border-bottom:1px solid ${cv('--c-line')}">${top}${bot}<rect x="${tx - 22}" y="28" width="44" height="16" rx="8" fill="${cv('--c-error')}"/><text x="${tx}" y="40" font-size="10" font-weight="700" fill="#fff" text-anchor="middle">TODAY</text></svg>
      <svg class="gsvg gbody-svg" width="${W}" height="${H}">
        <defs>
          <marker id="ga" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" fill="${ink5}"/></marker>
          <marker id="gac" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" fill="${cv('--c-error')}"/></marker>
        </defs>
        ${grid}${rows}${todayLine}${base}<g>${deps}</g>${bars}<g class="gtemp"></g>
      </svg>`;
    C.grid.scrollTop = C.gantt.scrollTop;
  }

  function scrollTo(iso) { if (!C) return; const x = xOf(iso); C.gantt.scrollLeft = Math.max(0, x - C.gantt.clientWidth * 0.25); }

  /* ---------- Toolbar ---------- */
  /** Alternador Grid+Gantt / Board (o mesmo plano, duas visões — como no Smartsheet). */
  PL.viewSwitch = (cur) => `<div class="seg" data-vs><button data-view="gantt" class="${cur === 'gantt' ? 'on' : ''}">${FL.util.ic('gantt', 14)} ${FL.t('Grid & Gantt')}</button><button data-view="board" class="${cur === 'board' ? 'on' : ''}">${FL.util.ic('board', 14)} ${FL.t('Board')}</button></div>`;
  PL.wireSwitch = (host, p) => U.$$('[data-view]', host).forEach((b) => (b.onclick = () => FL.shell.go(`#/p/${p.id}/plan${b.dataset.view === 'board' ? '/board' : ''}`)));
  function wireToolbar() {
    const h = C.host;
    PL.wireSwitch(h, C.p);
    h.querySelector('[data-a=add]').onclick = () => addTask();
    h.querySelector('[data-a=indent]').onclick = () => indent(1);
    h.querySelector('[data-a=outdent]').onclick = () => indent(-1);
    h.querySelector('[data-a=del]').onclick = () => delRow();
    h.querySelector('[data-a=undo]').onclick = () => undo(false);
    h.querySelector('[data-a=redo]').onclick = () => undo(true);
    h.querySelector('[data-a=today]').onclick = () => scrollTo(D.today());
    h.querySelector('[data-a=crit]').onclick = () => { C.prefs.crit = !C.prefs.crit; S.save(); draw(); if (C.prefs.crit) K.toast(`${C.crit.set.size} tasks on the critical path`); };
    h.querySelector('[data-a=base]').onclick = (e) => {
      if (!C.p.baseline) { setBaseline(); return; }
      K.menuAt(e.currentTarget, [
        { label: 'Show baseline', check: C.prefs.base, onClick: () => { C.prefs.base = !C.prefs.base; S.save(); draw(); } },
        { label: 'Reset baseline to current plan', icon: 'layers', onClick: setBaseline },
        { label: 'Clear baseline', icon: 'x', danger: true, onClick: () => mutate(() => (C.p.baseline = null), 'cleared the baseline') },
      ]);
    };
    h.querySelector('[data-a=export]').onclick = exportCSV;
    U.$$('[data-g]', h).forEach((g) => U.$$('button', g).forEach((b) => (b.onclick = () => { C.prefs[g.dataset.g] = b.dataset.v; S.save(); C.sel.row = Math.min(C.sel.row, 0); draw(g.dataset.g === 'zoom'); })));
  }
  function setBaseline() {
    mutate(() => { C.p.baseline = Object.fromEntries(C.p.tasks.map((t) => [t.id, { start: t.start, end: t.end }])); C.prefs.base = true; }, 'set the plan baseline');
    K.toast('Baseline saved — grey bars show the original dates');
  }
  function exportCSV() {
    const t = C.p.tasks, tr = SC.tree(t);
    const rows = [['Row', 'Level', 'Task', 'Phase', 'Assigned to', 'Status', 'Start', 'Finish', 'Duration', '% Complete', 'Predecessors', 'Comments']];
    t.forEach((x, i) => rows.push([i + 1, x.level, x.name, x.phase, x.owner, x.status, x.start, x.end, x.dur, x.pct, SC.fmtPreds(x, t, tr), x.notes]));
    U.download(`${C.p.code}-plan.csv`, rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
  }

  /* ---------- Operações ---------- */
  const selIdx = () => C.vis[C.sel.row];
  function addTask(below = true, name = 'New task') {
    const t = C.p.tasks; const i = selIdx();
    const ref = i != null ? t[i] : t[t.length - 1];
    const tr = SC.tree(t);
    let at = t.length, level = 1, phase = ref ? ref.phase : 'D';
    if (i != null) {
      if (tr.isSum[i] && !ref.collapsed) { at = i + 1; level = ref.level + 1; }
      else { at = below ? SC.subtreeEnd(t, i) : i; level = ref.level; }
    }
    const nt = { id: U.uid('t'), name, level, phase, owner: '', status: 'Not started', start: ref ? (below ? D.addWork(ref.end || D.today(), 1) : ref.start) : D.today(), end: null, dur: 3, pct: 0, preds: [], notes: '', link: null, collapsed: false };
    mutate(() => t.splice(at, 0, nt), `added “${name}”`);
    const r = C.vis.indexOf(at); if (r >= 0) { C.sel = { row: r, col: 0 }; draw(); startEdit(); }
    return nt;
  }
  function indent(dir) {
    const i = selIdx(); if (i == null) return; const t = C.p.tasks; const x = t[i];
    if (dir > 0 && (i === 0 || t[i - 1].level < x.level)) return K.toast('Nothing above to nest under');
    if (dir < 0 && x.level === 0) return;
    const end = SC.subtreeEnd(t, i);
    mutate(() => { for (let j = i; j < end; j++) t[j].level += dir; });
  }
  function delRow() {
    const i = selIdx(); if (i == null) return; const t = C.p.tasks; const x = t[i];
    const end = SC.subtreeEnd(t, i); const n = end - i;
    mutate(() => {
      const ids = new Set(t.slice(i, end).map((q) => q.id));
      t.splice(i, n); t.forEach((q) => (q.preds = (q.preds || []).filter((p) => !ids.has(p.id))));
      // remove vínculo das formas
      C.p.pages.forEach((g) => g.type === 'canvas' && g.data.shapes.forEach((s) => { if (ids.has(s.taskId)) delete s.taskId; }));
    }, `deleted “${x.name}”${n > 1 ? ` and ${n - 1} sub-task(s)` : ''}`);
    C.sel.row = Math.min(C.sel.row, C.vis.length - 1); draw();
    K.toast(`Deleted ${n} row${n > 1 ? 's' : ''}`, { action: 'Undo', onAction: () => undo(false) });
  }
  function moveRow(dir) {
    const i = selIdx(); if (i == null) return; const t = C.p.tasks;
    const end = SC.subtreeEnd(t, i); const block = t.slice(i, end);
    if (dir < 0) { // sobe acima do irmão anterior
      let j = i - 1; while (j >= 0 && t[j].level > t[i].level) j--; if (j < 0 || t[j].level < t[i].level) return;
      mutate(() => { t.splice(i, block.length); t.splice(j, 0, ...block); });
    } else {
      if (end >= t.length || t[end].level < t[i].level) return; const e2 = SC.subtreeEnd(t, end);
      mutate(() => { const sib = t.splice(end, e2 - end); t.splice(i, 0, ...sib); });
    }
    const id = block[0].id; computeVisible(); C.sel.row = C.vis.findIndex((k) => t[k].id === id); draw();
  }
  function setStart(x, iso) {
    iso = D.nextWork(iso);
    if ((x.preds || []).length === 1) { // converte em lag (comportamento do Smartsheet)
      const pr = x.preds[0]; const q = C.p.tasks.find((k) => k.id === pr.id);
      const base = pr.type === 'SS' ? q.start : D.addWork(q.end, q.milestone ? 0 : 1);
      pr.lag = D.workBetween(base, iso) - 1;
      if (iso < base) pr.lag = -(D.workBetween(iso, base) - 1);
    } else if ((x.preds || []).length > 1) { K.toast('Start is driven by predecessors'); }
    x.start = iso;
  }

  /* ---------- Edição de célula ---------- */
  function startEdit(initial) {
    if (ro()) return roToast();
    const r = C.sel.row, ci = C.sel.col; const i = C.vis[r]; if (i == null) return;
    const t = C.p.tasks; const x = t[i]; const col = COLS[ci]; const sum = C.tr.isSum[i];
    if (sum && ['start', 'end', 'dur', 'pct', 'status', 'tags'].includes(col.k)) return K.toast(FL.t('Summary rows roll up from their sub-tasks'));
    if (col.k === 'tags') { const cell = U.$(`.gr[data-r="${r}"] .gc[data-c="${ci}"]`, C.grid); FL.board.tagMenu(cell, C.p, x, () => draw()); return; }
    const cell = U.$(`.gr[data-r="${r}"] .gc[data-c="${ci}"]`, C.grid); if (!cell) return;
    let ed;
    const people = S.people();
    if (col.k === 'phase') ed = U.el(`<select class="cell-ed">${FL.PHASES.map((p) => `<option value="${p.k}"${p.k === x.phase ? ' selected' : ''}>${p.k} · ${p.name}</option>`).join('')}</select>`);
    else if (col.k === 'status') ed = U.el(`<select class="cell-ed">${FL.STATUSES.map((s) => `<option${s.k === x.status ? ' selected' : ''}>${s.k}</option>`).join('')}</select>`);
    else if (col.k === 'start' || col.k === 'end') ed = U.el(`<input type="date" class="cell-ed mono" value="${x[col.k] || ''}">`);
    else if (col.k === 'owner') { ed = U.el(`<input class="cell-ed" list="fl-people" value="${U.esc(x.owner)}">`); if (!U.$('#fl-people')) document.body.appendChild(U.el(`<datalist id="fl-people"></datalist>`)); U.$('#fl-people').innerHTML = people.map((n) => `<option value="${U.esc(n)}">`).join(''); }
    else {
      const val = col.k === 'preds' ? SC.fmtPreds(x, t, C.tr) : col.k === 'dur' ? x.dur : col.k === 'pct' ? x.pct : x[col.k] || '';
      ed = U.el(`<input class="cell-ed${['dur', 'pct', 'preds'].includes(col.k) ? ' mono' : ''}" value="${U.esc(initial != null ? initial : val)}">`);
    }
    cell.style.position = 'relative'; cell.appendChild(ed); C.editing = { ed, r, ci };
    ed.focus(); if (ed.select && initial == null) ed.select();
    if (ed.tagName === 'SELECT' && ed.showPicker) { try { ed.showPicker(); } catch (e) { } }
    let done = false;
    const commit = (move) => {
      if (done) return; done = true; C.editing = null;
      const v = ed.value; let err = null;
      const changed = () => {
        switch (col.k) {
          case 'name': if (v.trim()) x.name = v.trim(); break;
          case 'phase': x.phase = v; if (sum) { const e = SC.subtreeEnd(t, i); for (let j = i + 1; j < e; j++) t[j].phase = v; } break;
          case 'owner': x.owner = v.trim(); break;
          case 'status': x.status = v; if (v === 'Done') x.pct = 100; else if (x.pct === 100) x.pct = 90; break;
          case 'start': if (v) setStart(x, v); break;
          case 'end': if (v) { const e = D.prevWork(v); x.dur = Math.max(0, D.workBetween(x.start, e)); } break;
          case 'dur': { const n = parseInt(v, 10); if (!isNaN(n)) x.dur = Math.max(0, n); break; }
          case 'pct': { const n = parseInt(String(v).replace('%', ''), 10); if (!isNaN(n)) { x.pct = U.clamp(n, 0, 100); if (x.pct === 100) x.status = 'Done'; else if (x.pct > 0 && x.status === 'Not started') x.status = 'In progress'; } break; }
          case 'preds': { const res = SC.parsePreds(v, t, i); if (res.error) err = res.error; else x.preds = res.preds; break; }
          case 'notes': x.notes = v; break;
        }
      };
      const before = JSON.stringify(x);
      const snap = JSON.stringify(t);
      changed();
      if (err) { K.toast(err); draw(); return; }
      if (JSON.stringify(x) !== before) { S.record(key(), snap); SC.compute(t); if (col.k === 'status') S.log(C.p, `set “${x.name}” to ${x.status}`); S.touch(C.p); FL.project.redrawRec && FL.project.redrawRec(); }
      if (move === 'down') C.sel.row = Math.min(C.vis.length - 1, C.sel.row + 1);
      if (move === 'right') C.sel.col = Math.min(COLS.length - 1, C.sel.col + 1);
      if (move === 'left') C.sel.col = Math.max(0, C.sel.col - 1);
      draw(); C.grid.focus({ preventScroll: true });
    };
    ed.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); commit('down'); }
      else if (e.key === 'Tab') { e.preventDefault(); commit(e.shiftKey ? 'left' : 'right'); }
      else if (e.key === 'Escape') { done = true; C.editing = null; draw(); C.grid.focus({ preventScroll: true }); }
    });
    ed.addEventListener('blur', () => commit());
    if (ed.tagName === 'SELECT') ed.addEventListener('change', () => commit());
  }

  /* ---------- Teclado ---------- */
  function keydown(e) {
    if (!C || C.editing) return;
    if (document.querySelector('.scrim')) return;
    const inGrid = C.grid.contains(document.activeElement) || document.activeElement === document.body;
    if (!inGrid) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(e.shiftKey); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); undo(true); return; }
    if (mod && e.key === ']') { e.preventDefault(); indent(1); return; }
    if (mod && e.key === '[') { e.preventDefault(); indent(-1); return; }
    if (e.altKey && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); moveRow(e.key === 'ArrowUp' ? -1 : 1); return; }
    const s = C.sel;
    const mv = (dr, dc) => { s.row = U.clamp(s.row + dr, 0, Math.max(0, C.vis.length - 1)); s.col = U.clamp(s.col + dc, 0, COLS.length - 1); draw(); ensureVisible(); };
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); mv(1, 0); break;
      case 'ArrowUp': e.preventDefault(); mv(-1, 0); break;
      case 'ArrowRight': e.preventDefault(); mv(0, 1); break;
      case 'ArrowLeft': e.preventDefault(); mv(0, -1); break;
      case 'Tab': e.preventDefault(); mv(0, e.shiftKey ? -1 : 1); break;
      case 'Enter': case 'F2': e.preventDefault(); if (mod) addTask(); else startEdit(); break;
      case 'Insert': e.preventDefault(); addTask(false); break;
      case 'Delete': case 'Backspace': {
        const i = C.vis[s.row]; const col = COLS[s.col];
        if (i != null && ['owner', 'notes', 'preds'].includes(col.k)) { e.preventDefault(); mutate(() => { const x = C.p.tasks[i]; if (col.k === 'preds') x.preds = []; else x[col.k] = ''; }); }
        break;
      }
      default:
        if (e.key.length === 1 && !mod && !e.altKey && ['name', 'owner', 'notes', 'dur', 'pct', 'preds'].includes(COLS[s.col].k)) { e.preventDefault(); startEdit(e.key); }
    }
  }
  function ensureVisible() {
    const y = C.sel.row * RH; const g = C.gantt;
    if (y < g.scrollTop) g.scrollTop = y; else if (y + RH > g.scrollTop + g.clientHeight - HH - 16) g.scrollTop = y + RH - g.clientHeight + HH + 16;
    const cell = U.$(`.gr[data-r="${C.sel.row}"] .gc[data-c="${C.sel.col}"]`, C.grid);
    if (cell) { const l = cell.offsetLeft, w = cell.offsetWidth; if (l < C.grid.scrollLeft + 46) C.grid.scrollLeft = l - 46; else if (l + w > C.grid.scrollLeft + C.grid.clientWidth) C.grid.scrollLeft = l + w - C.grid.clientWidth; }
  }

  /* ---------- Grade: mouse ---------- */
  function wireGrid() {
    const g = C.grid;
    g.addEventListener('mousedown', (e) => {
      const rz = e.target.closest('[data-rz]');
      if (rz) { e.preventDefault(); const k = rz.dataset.rz; const col = COLS.find((c) => c.k === k); const x0 = e.clientX, w0 = colW(col);
        const mm = (ev) => { C.prefs.widths[k] = Math.max(50, w0 + ev.clientX - x0); drawGrid(); }; const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); S.save(); };
        document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu); return; }
      if (e.target.closest('[data-addrow]')) { e.preventDefault(); C.sel.row = C.vis.length - 1; addTask(true); return; }
      const tog = e.target.closest('[data-tog]');
      if (tog) { e.preventDefault(); const x = C.p.tasks[+tog.dataset.tog]; x.collapsed = !x.collapsed; S.touch(C.p); draw(); return; }
      const lk = e.target.closest('[data-link]');
      if (lk) { e.preventDefault(); openLink(C.p.tasks[+lk.dataset.link]); return; }
      const row = e.target.closest('.gr[data-r]'); if (!row) return;
      const cell = e.target.closest('.gc[data-c]');
      if (C.editing && C.editing.ed.contains(e.target)) return;
      C.sel.row = +row.dataset.r; if (cell) C.sel.col = +cell.dataset.c;
      draw(); setTimeout(() => g.focus({ preventScroll: true }));
    });
    g.addEventListener('dblclick', (e) => {
      const rn = e.target.closest('[data-rn]'); if (rn) { openTask(C.p, C.p.tasks[C.vis[C.sel.row]].id); return; }
      if (e.target.closest('.gc[data-c]')) startEdit();
    });
    g.addEventListener('contextmenu', (e) => {
      const row = e.target.closest('.gr[data-r]'); if (!row) return; e.preventDefault();
      C.sel.row = +row.dataset.r; draw();
      const x = C.p.tasks[C.vis[C.sel.row]];
      K.menu(e.clientX, e.clientY, [
        { label: 'Open details', icon: 'doc', onClick: () => openTask(C.p, x.id) },
        x.link ? { label: 'Go to linked map shape', icon: 'link', onClick: () => openLink(x) } : null,
        '-',
        { label: 'Insert row above', icon: 'plus', kbd: 'Ins', onClick: () => addTask(false) },
        { label: 'Insert row below', icon: 'plus', kbd: 'Ctrl Enter', onClick: () => addTask(true) },
        { label: 'Indent', icon: 'indent', kbd: 'Ctrl ]', onClick: () => indent(1) },
        { label: 'Outdent', icon: 'outdent', kbd: 'Ctrl [', onClick: () => indent(-1) },
        { label: 'Move up', icon: 'chevR', kbd: 'Alt Shift ↑', onClick: () => moveRow(-1) },
        { label: 'Move down', icon: 'chevR', kbd: 'Alt Shift ↓', onClick: () => moveRow(1) },
        '-',
        { header: 'Status' },
        ...FL.STATUSES.map((s) => ({ label: s.k, swatch: s.color, onClick: () => mutate(() => { x.status = s.k; if (s.k === 'Done') x.pct = 100; }, `set “${x.name}” to ${s.k}`) })),
        '-',
        { label: 'Delete row', icon: 'trash', danger: true, onClick: delRow },
      ]);
    });
    g.addEventListener('mousemove', (e) => { const row = e.target.closest('.gr[data-r]'); setHover(row ? +row.dataset.r : -1); });
    g.addEventListener('mouseleave', () => setHover(-1));
    g.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { C.gantt.scrollTop += e.deltaY; e.preventDefault(); } }, { passive: false });
    C.gantt.addEventListener('scroll', () => { C.grid.scrollTop = C.gantt.scrollTop; });
  }
  function setHover(r) {
    if (r === C.hover) return; C.hover = r;
    U.$$('.gr.hov', C.grid).forEach((x) => x.classList.remove('hov'));
    if (r >= 0) { const el = U.$(`.gr[data-r="${r}"]`, C.grid); el && el.classList.add('hov'); }
  }

  /* ---------- Gantt: mouse ---------- */
  function wireGantt() {
    const g = C.gantt;
    g.addEventListener('mousedown', (e) => {
      const svg = U.$('.gbody-svg', g); if (!svg) return;
      const lf = e.target.closest('[data-link-from]');
      const dr = e.target.closest('[data-drag]');
      const pt = (ev) => { const r = svg.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
      if ((lf || dr) && ro()) { roToast(); return; }
      if (lf) { // criar dependência arrastando
        e.preventDefault(); const i = +lf.dataset.linkFrom; const p0 = { x: +lf.getAttribute('cx'), y: +lf.getAttribute('cy') };
        const tmp = U.$('.gtemp', svg);
        const mm = (ev) => { const p = pt(ev); tmp.innerHTML = `<path d="M${p0.x} ${p0.y}L${p.x} ${p.y}" stroke="var(--c-action)" stroke-width="1.5" stroke-dasharray="4 3" fill="none"/>`; };
        const mu = (ev) => {
          document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); tmp.innerHTML = '';
          const r = Math.floor(pt(ev).y / RH); const j = C.vis[r]; if (j == null || j === i) return;
          const succ = C.p.tasks[j]; if (C.tr.isSum[j]) return K.toast('Link to a task, not a summary row');
          if ((succ.preds || []).some((p) => p.id === C.p.tasks[i].id)) return;
          const test = C.p.tasks.map((t, k) => (k === j ? { ...t, preds: [...(t.preds || []), { id: C.p.tasks[i].id, type: 'FS', lag: 0 }] } : t));
          if (SC.hasCycle(test)) return K.toast('That would create a circular dependency');
          mutate(() => (succ.preds = [...(succ.preds || []), { id: C.p.tasks[i].id, type: 'FS', lag: 0 }]), `linked “${C.p.tasks[i].name}” → “${succ.name}”`);
          K.toast(`Row ${j + 1} now starts after row ${i + 1}`);
        };
        document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu); return;
      }
      if (dr) {
        e.preventDefault(); const i = +dr.dataset.i; const x = C.p.tasks[i]; const mode = dr.dataset.drag;
        const x0 = e.clientX; const grp = dr.closest('.gbar-g'); let dd = 0; let moved = false;
        C.sel.row = C.vis.indexOf(i);
        const mm = (ev) => {
          dd = Math.round((ev.clientX - x0) / C.dw); moved = moved || Math.abs(ev.clientX - x0) > 3;
          if (mode === 'move') grp.setAttribute('transform', `translate(${dd * C.dw},0)`);
          else { const bar = grp.querySelector('[data-drag=move]'); const w0 = +bar.dataset.w0 || +bar.getAttribute('width'); bar.dataset.w0 = w0; bar.setAttribute('width', Math.max(C.dw, w0 + dd * C.dw)); }
          showTip(ev, mode === 'move' ? `${D.short(D.addDays(x.start, dd))} → ${D.short(D.addDays(x.end, dd))}` : `${Math.max(1, D.workBetween(x.start, D.addDays(x.end, dd)))} working days`);
        };
        const mu = () => {
          document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); hideTip();
          if (!moved || dd === 0) { draw(); return; }
          if (mode === 'move') mutate(() => setStart(x, D.addDays(x.start, dd)), `rescheduled “${x.name}”`);
          else mutate(() => (x.dur = Math.max(1, D.workBetween(x.start, D.prevWork(D.addDays(x.end, dd))))));
        };
        document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu); return;
      }
      const r = Math.floor((e.clientY - svg.getBoundingClientRect().top) / RH);
      if (r >= 0 && r < C.vis.length) { C.sel.row = r; draw(); }
    });
    g.addEventListener('dblclick', (e) => { const b = e.target.closest('[data-i]'); if (b) openTask(C.p, C.p.tasks[+b.dataset.i].id); });
    g.addEventListener('mousemove', (e) => { const svg = U.$('.gbody-svg', g); if (!svg) return; const r = Math.floor((e.clientY - svg.getBoundingClientRect().top) / RH); setHover(r >= 0 && r < C.vis.length ? r : -1); });
  }
  let tip = null;
  function showTip(ev, text) { if (!tip) { tip = U.el('<div class="float" style="padding:4px 8px;font-size:12px;font-family:var(--font-mono);pointer-events:none"></div>'); document.body.appendChild(tip); } tip.textContent = text; tip.style.left = ev.clientX + 12 + 'px'; tip.style.top = ev.clientY + 14 + 'px'; }
  function hideTip() { if (tip) { tip.remove(); tip = null; } }

  function wireSplitter() {
    C.split.addEventListener('mousedown', (e) => {
      e.preventDefault(); const x0 = e.clientX, w0 = C.grid.offsetWidth; C.split.classList.add('drag');
      const mm = (ev) => { const w = U.clamp(w0 + ev.clientX - x0, 240, C.host.clientWidth - 200); C.grid.style.width = w + 'px'; C.prefs.gridW = w; };
      const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); C.split.classList.remove('drag'); S.save(); };
      document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
    });
  }

  /* ---------- Vínculos e detalhes ---------- */
  function openLink(t) {
    if (!t || !t.link) return;
    FL.shell.go(`#/p/${C ? C.p.id : FL.project.ctx().p.id}/maps/${t.link.pageId}`);
    setTimeout(() => FL.maps && FL.maps.focusShape && FL.maps.focusShape(t.link.shapeId), 120);
  }
  PL.openLink = openLink;

  PL.focusTask = (id) => {
    if (!C) return; const t = C.p.tasks; const i = t.findIndex((x) => x.id === id); if (i < 0) return;
    C.prefs.filter = 'all'; const tr = SC.tree(t); let pa = tr.parent[i]; while (pa >= 0) { t[pa].collapsed = false; pa = tr.parent[pa]; }
    computeVisible(); C.sel = { row: C.vis.indexOf(i), col: 0 }; draw(); ensureVisible(); scrollTo(t[i].start);
    const el = U.$(`.gr[data-r="${C.sel.row}"]`, C.grid); if (el) { el.animate([{ background: 'var(--c-attention-soft)' }, { background: 'transparent' }], { duration: 1400 }); }
  };

  /** Modal de detalhes da tarefa — usado pelo plano, board e canvas. */
  const openTask = (PL.openTask = (p, id, after) => {
    const t = p.tasks.find((x) => x.id === id); if (!t) return;
    const tr = SC.tree(p.tasks); const i = p.tasks.indexOf(t); const sum = tr.isSum[i];
    const people = S.people();
    const linkPage = t.link && p.pages.find((g) => g.id === t.link.pageId);
    const body = U.el(`<div class="col" style="gap:14px">
      <div class="field"><label>Task</label><input class="inp" name="name" value="${U.esc(t.name)}"></div>
      <div class="g3">
        <div class="field"><label>Phase</label><select class="inp" name="phase">${FL.PHASES.map((x) => `<option value="${x.k}"${x.k === t.phase ? ' selected' : ''}>${x.k} · ${x.name}</option>`).join('')}</select></div>
        <div class="field"><label>Assigned to</label><select class="inp" name="owner"><option value="">—</option>${people.map((n) => `<option${n === t.owner ? ' selected' : ''}>${U.esc(n)}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label><select class="inp" name="status"${sum ? ' disabled' : ''}>${FL.STATUSES.map((s) => `<option${s.k === t.status ? ' selected' : ''}>${s.k}</option>`).join('')}</select></div>
      </div>
      <div class="g3">
        <div class="field"><label>Start</label><input class="inp mono" type="date" name="start" value="${t.start}"${sum ? ' disabled' : ''}></div>
        <div class="field"><label>Duration (working days)</label><input class="inp mono" name="dur" value="${t.dur}"${sum ? ' disabled' : ''}></div>
        <div class="field"><label>% complete</label><input class="inp mono" name="pct" value="${t.pct}"${sum ? ' disabled' : ''}></div>
      </div>
      <div class="field"><label>Predecessors <span class="muted" style="font-weight:400">— row numbers, e.g. 4, 6SS+2</span></label><input class="inp mono" name="preds" value="${SC.fmtPreds(t, p.tasks, tr)}"></div>
      <div class="field"><label>Tags</label><div class="row" style="gap:4px;flex-wrap:wrap" data-tagsbox></div></div>
      <div class="field"><label>Comments / guidance</label><textarea class="inp" rows="3" name="notes">${U.esc(t.notes || '')}</textarea></div>
      ${linkPage ? `<div class="linked-task"><span class="eyebrow">Linked map</span><div class="row">${U.ic('flow')}<b style="font-weight:600">${U.esc(linkPage.name)}</b><button class="btn btn-sm right" data-open>Open shape</button></div></div>` : ''}
      <div class="muted mono" style="font-size:12px">Finish ${D.long(t.end)} · Row ${i + 1}${C && C.crit.set.has(t.id) ? ' · on critical path' : ''}</div>
    </div>`);
    const m = K.modal({ title: 'Task details', body, footer: [{ label: 'Cancel', ghost: true }, { label: 'Save', primary: true, onClick: () => {
      const f = (n) => body.querySelector(`[name=${n}]`).value;
      const res = SC.parsePreds(f('preds'), p.tasks, i); if (res.error) { K.toast(res.error); return false; }
      S.record('plan:' + p.id, JSON.stringify(p.tasks));
      t.name = f('name') || t.name; t.phase = f('phase'); t.owner = f('owner'); t.notes = f('notes'); t.preds = res.preds;
      if (!sum) { t.status = f('status'); t.dur = Math.max(0, parseInt(f('dur'), 10) || 0); t.pct = U.clamp(parseInt(f('pct'), 10) || 0, 0, 100); if (t.status === 'Done') t.pct = 100;
        if (f('start') !== t.start) { if (C && C.p === p) setStart(t, f('start')); else t.start = f('start'); } }
      SC.compute(p.tasks); S.log(p, `updated “${t.name}”`); S.touch(p);
      if (C && C.p === p) draw(); after && after();
    } }] });
    const tb = body.querySelector('[data-tagsbox]');
    const drawTags = () => { tb.innerHTML = FL.board.tagsOf(p, t, null).map((g) => FL.board.chip(g)).join('') + (S.canEdit(p) && !sum ? `<button class="btn btn-sm btn-g" data-edittags>${U.ic('plus', 13)}${FL.t('Edit tags')}</button>` : ''); const eb = tb.querySelector('[data-edittags]'); if (eb) eb.onclick = () => FL.board.tagMenu(eb, p, t, () => { drawTags(); if (C && C.p === p) draw(); after && after(); }); };
    drawTags();
    const ob = body.querySelector('[data-open]'); if (ob) ob.onclick = () => { m.close(); FL.shell.go(`#/p/${p.id}/maps/${t.link.pageId}`); setTimeout(() => FL.maps.focusShape(t.link.shapeId), 120); };
  });
})(window.FL);

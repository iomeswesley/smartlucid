/* Flowline · Board — o plano visto como Kanban (como o Card View do Smartsheet + clusters do Lucidspark).
   Colunas e raias configuráveis (status, fase, tag, responsável, caminho crítico, prazo), tags
   personalizadas por projeto, ordenação e filtros. Arrastar um cartão muda o campo da coluna/raia. */
(function (FL) {
  const U = FL.util, D = U.date, S = FL.store, K = FL.kit, SC = FL.schedule;
  const B = (FL.board = {});

  /* ---------- Tags ---------- */
  B.TAG_COLORS = ['#2650E0', '#0F6E78', '#1F7A4D', '#B07A00', '#B5470B', '#C0362C', '#7A4CC2', '#344054', '#E0368C', '#5B6577'];
  B.SYSTEM = [{ id: 'sys:crit', name: 'Critical path', color: '#C0362C' }, { id: 'sys:late', name: 'Overdue', color: '#B07A00' }, { id: 'sys:ms', name: 'Milestone', color: '#344054' }, { id: 'sys:map', name: 'Linked to map', color: '#2650E0' }];
  /** Tags automáticas (calculadas, não editáveis). */
  B.systemTags = (p, t, crit) => {
    const today = D.today(); const on = {
      'sys:crit': crit && crit.has(t.id), 'sys:late': t.status !== 'Done' && t.end && t.end < today, 'sys:ms': !!t.milestone, 'sys:map': !!t.link,
    };
    return B.SYSTEM.filter((g) => on[g.id]).map((g) => ({ ...g, sys: true }));
  };
  B.tagsOf = (p, t, crit) => [...B.systemTags(p, t, crit), ...(t.tags || []).map((id) => (p.tags || []).find((g) => g.id === id)).filter(Boolean)];
  B.chip = (g) => `<span class="tag-chip${g.sys ? ' sys' : ''}" style="--tc:${g.color}">${g.id === 'sys:crit' ? U.ic('bolt', 11, 2) : ''}${U.esc(FL.t(g.name))}</span>`;

  /** Menu para marcar/desmarcar tags de uma tarefa (grid, board e modal). */
  B.tagMenu = (anchorOrXY, p, t, after) => {
    const items = [{ header: 'Tags' }, ...(p.tags || []).map((g) => ({ label: g.name, swatch: g.color, check: (t.tags || []).includes(g.id), onClick: () => {
      S.record('plan:' + p.id, JSON.stringify(p.tasks));
      const has = (t.tags || []).includes(g.id); t.tags = has ? t.tags.filter((x) => x !== g.id) : [...(t.tags || []), g.id];
      S.touch(p); after && after();
    } })), '-', { label: FL.t('New tag…'), icon: 'plus', onClick: () => B.newTag(p, (g) => { t.tags = [...(t.tags || []), g.id]; S.touch(p); after && after(); }) }, { label: FL.t('Manage tags…'), icon: 'filter', onClick: () => B.manageTags(p, after) }];
    if (anchorOrXY instanceof Element) K.menuAt(anchorOrXY, items); else K.menu(anchorOrXY.x, anchorOrXY.y, items);
  };
  B.newTag = (p, done) => K.prompt(FL.t('New tag'), FL.t('Tag name'), '', (v) => {
    if (!v) return; p.tags = p.tags || [];
    if (p.tags.some((g) => g.name.toLowerCase() === v.toLowerCase())) return K.toast(FL.t('That tag already exists'));
    const g = { id: U.uid('tg'), name: v.slice(0, 32), color: B.TAG_COLORS[p.tags.length % B.TAG_COLORS.length] }; p.tags.push(g); S.log(p, `created tag “${g.name}”`); S.touch(p); done && done(g);
  }, { placeholder: FL.t('e.g. Supplier, Quick win, Lab') });
  B.manageTags = (p, after) => {
    const body = U.el('<div class="col" style="gap:10px"></div>');
    const draw = () => {
      body.innerHTML = `<span class="muted" style="font-size:13px;line-height:1.5">${FL.t('Tags group tasks into clusters on the board. Automatic tags (critical path, overdue, milestone, linked to map) are calculated for you.')}</span>
        <div class="row" style="gap:6px;flex-wrap:wrap">${B.SYSTEM.map((g) => B.chip({ ...g, sys: true })).join('')}</div>
        ${(p.tags || []).map((g, i) => `<div class="row" data-i="${i}" style="gap:8px"><input class="inp inp-sm" style="flex:1" value="${U.esc(g.name)}" data-name><div class="row" style="gap:3px">${B.TAG_COLORS.map((c) => `<button class="swatch-dot${g.color === c ? ' on' : ''}" style="background:${c}" data-c="${c}" aria-label="${c}"></button>`).join('')}</div><span class="muted mono" style="font-size:12px;width:64px;text-align:right">${p.tasks.filter((t) => (t.tags || []).includes(g.id)).length} ${FL.t('tasks')}</span><button class="ib ib-sm ib-ghost" data-del aria-label="Delete tag">${U.ic('trash')}</button></div>`).join('') || `<div class="muted">${FL.t('No custom tags yet.')}</div>`}
        <button class="btn btn-sm" data-add style="align-self:flex-start">${U.ic('plus')}${FL.t('New tag')}</button>`;
      U.$$('[data-i]', body).forEach((row) => {
        const g = p.tags[+row.dataset.i];
        row.querySelector('[data-name]').onchange = (e) => { g.name = e.target.value.trim() || g.name; S.touch(p); };
        U.$$('[data-c]', row).forEach((b) => (b.onclick = () => { g.color = b.dataset.c; S.touch(p); draw(); }));
        row.querySelector('[data-del]').onclick = () => { p.tags.splice(+row.dataset.i, 1); p.tasks.forEach((t) => (t.tags = (t.tags || []).filter((x) => x !== g.id))); S.touch(p); draw(); };
      });
      body.querySelector('[data-add]').onclick = () => B.newTag(p, draw);
    };
    draw();
    K.modal({ title: FL.t('Manage tags'), body, footer: [{ label: FL.t('Close'), primary: true }], onClose: () => after && after() });
  };

  /* ---------- Board ---------- */
  const DIMS = { status: 'Status', phase: 'DMAIC phase', tag: 'Tag', owner: 'Assigned to', due: 'Due date', critical: 'Critical path', none: 'None' };
  const SORTS = { 'due-asc': 'Due date · soonest first', 'due-desc': 'Due date · latest first', start: 'Start date', pct: '% complete', name: 'Name (A–Z)', row: 'Plan order' };
  const DUE = { all: 'Any due date', overdue: 'Overdue', week: 'Due this week', two: 'Due in 2 weeks', later: 'Due later', done: 'Completed' };

  B.render = (host, p, opts = {}) => {
    const prefs = (S.state.prefs.board = { cols: 'status', lanes: 'phase', sort: 'due-asc', due: 'all', tags: [], owner: '', crit: false, hideDone: true, q: '', ...(S.state.prefs.board || {}) });
    const ro = !S.canEdit(p);
    const draw = () => {
      const tr = SC.tree(p.tasks); const crit = SC.critical(p.tasks).set; const today = D.today(); const wk = D.addDays(today, 7), two = D.addDays(today, 14);
      let rows = p.tasks.map((t, i) => ({ t, i, tags: B.tagsOf(p, t, crit) })).filter(({ i }) => !tr.isSum[i]);
      const q = prefs.q.trim().toLowerCase();
      const dueOk = (t) => ({ all: true, overdue: t.status !== 'Done' && t.end < today, week: t.status !== 'Done' && t.end >= today && t.end <= wk, two: t.status !== 'Done' && t.end >= today && t.end <= two, later: t.status !== 'Done' && t.end > two, done: t.status === 'Done' }[prefs.due]);
      rows = rows.filter(({ t, tags }) =>
        (!prefs.hideDone || t.status !== 'Done' || prefs.due === 'done') &&
        (!q || (t.name + ' ' + (t.owner || '') + ' ' + (t.notes || '')).toLowerCase().includes(q)) &&
        (!prefs.owner || (t.owner || '') === prefs.owner) && (!prefs.crit || crit.has(t.id)) &&
        (!prefs.tags.length || prefs.tags.every((id) => tags.some((g) => g.id === id))) && dueOk(t));
      const cmp = { 'due-asc': (a, b) => (a.t.end || '').localeCompare(b.t.end || '') || a.i - b.i, 'due-desc': (a, b) => (b.t.end || '').localeCompare(a.t.end || '') || a.i - b.i, start: (a, b) => (a.t.start || '').localeCompare(b.t.start || '') || a.i - b.i, pct: (a, b) => (b.t.pct || 0) - (a.t.pct || 0), name: (a, b) => a.t.name.localeCompare(b.t.name), row: (a, b) => a.i - b.i }[prefs.sort];
      rows.sort(cmp);

      const buckets = (dim) => {
        if (dim === 'status') return FL.STATUSES.map((s) => ({ k: s.k, label: s.k, color: s.color, cls: s.cls, match: (r) => r.t.status === s.k }));
        if (dim === 'phase') return FL.PHASES.map((ph) => ({ k: ph.k, label: `${ph.k} · ${ph.name}`, color: ph.color, match: (r) => r.t.phase === ph.k }));
        if (dim === 'owner') return [...new Set(p.tasks.map((t) => t.owner || ''))].sort().map((o) => ({ k: o, label: o || 'Unassigned', color: o ? U.personColor(o) : '#6B7385', avatar: o, match: (r) => (r.t.owner || '') === o }));
        if (dim === 'tag') return [...B.SYSTEM.slice(0, 2), ...(p.tags || [])].map((g) => ({ k: g.id, label: g.name, color: g.color, match: (r) => r.tags.some((x) => x.id === g.id) }))
          .concat([{ k: '', label: 'No tag', color: '#6B7385', match: (r) => !r.tags.some((x) => !x.sys || x.id === 'sys:crit' || x.id === 'sys:late') }]);
        if (dim === 'critical') return [{ k: 'crit', label: 'Critical path', color: '#C0362C', match: (r) => crit.has(r.t.id) }, { k: 'slack', label: 'Has slack', color: '#1F7A4D', match: (r) => !crit.has(r.t.id) }];
        if (dim === 'due') return [{ k: 'overdue', label: 'Overdue', color: '#C0362C', match: (r) => r.t.status !== 'Done' && r.t.end < today }, { k: 'week', label: 'This week', color: '#B07A00', match: (r) => r.t.status !== 'Done' && r.t.end >= today && r.t.end <= wk }, { k: 'two', label: 'Next week', color: '#2650E0', match: (r) => r.t.status !== 'Done' && r.t.end > wk && r.t.end <= two }, { k: 'later', label: 'Later', color: '#5B6577', match: (r) => r.t.status !== 'Done' && r.t.end > two }, { k: 'done', label: 'Done', color: '#1F7A4D', match: (r) => r.t.status === 'Done' }];
        return [{ k: '*', label: '', color: 'transparent', match: () => true }];
      };
      const cols = buckets(prefs.cols); const lanes = buckets(prefs.lanes === prefs.cols ? 'none' : prefs.lanes); const noLanes = lanes.length === 1 && lanes[0].k === '*';
      const tagLabel = prefs.tags.length ? prefs.tags.map((id) => ([...B.SYSTEM, ...(p.tags || [])].find((g) => g.id === id) || {}).name).filter(Boolean).map(FL.t).join(', ') : FL.t('Any tag');
      const dd = (key, label, val) => `<button class="btn btn-sm" data-dd="${key}"><span class="muted" style="font-weight:500">${FL.t(label)}:</span> ${U.esc(val)}${U.ic('chev', 12)}</button>`;
      const filtered = prefs.q || prefs.tags.length || prefs.owner || prefs.crit || prefs.due !== 'all';
      host.innerHTML = `
        <div class="ptool">
          ${opts.viewSwitch || ''}<span class="sep"></span>
          ${dd('cols', 'Columns', FL.t(DIMS[prefs.cols]))}${dd('lanes', 'Swimlanes', FL.t(DIMS[prefs.lanes]))}${dd('sort', 'Sort', FL.t(SORTS[prefs.sort]))}
          <span class="sep"></span>
          ${dd('tags', 'Tags', tagLabel)}${dd('owner', 'Owner', prefs.owner || FL.t('Anyone'))}${dd('due', 'Due', FL.t(DUE[prefs.due]))}
          <button class="btn btn-sm${prefs.crit ? ' btn-p' : ''}" data-crit>${U.ic('bolt')}${FL.t('Critical only')}</button>
          <label class="row" style="gap:6px;font-size:13px;margin-left:4px"><input type="checkbox" data-hd ${prefs.hideDone ? 'checked' : ''}> ${FL.t('Hide done')}</label>
          <div class="right row" style="gap:6px">${filtered ? `<button class="btn btn-sm btn-g" data-clear>${FL.t('Clear filters')}</button>` : ''}<input class="inp inp-sm" data-q placeholder="${FL.t('Search cards')}" value="${U.esc(prefs.q)}" style="width:170px"><button class="btn btn-sm" data-tagsmgr ${ro ? 'disabled' : ''}>${U.ic('filter')}${FL.t('Manage tags')}</button></div>
        </div>
        <div class="board">
          <div class="muted" style="font-size:12.5px;margin-bottom:10px">${rows.length} ${FL.t('cards')} · ${ro ? FL.t('view only') : FL.t('drag cards between cells · right-click to tag · double-click to edit')}</div>
          <div class="bgrid" style="grid-template-columns:${noLanes ? '' : '160px '}repeat(${cols.length}, minmax(230px, 1fr))">
            ${noLanes ? '' : '<div class="bhead" style="border-right:1px solid var(--c-line)"></div>'}
            ${cols.map((c) => `<div class="bhead">${c.cls ? `<span class="st ${c.cls}"><i></i>${U.esc(c.label)}</span>` : c.avatar ? `${U.avatar(c.avatar, 20)}<span>${U.esc(c.label)}</span>` : `<i style="width:10px;height:10px;border-radius:3px;background:${c.color};flex:none"></i><span>${U.esc(FL.t(c.label))}</span>`}<span class="muted mono right" style="font-size:12px">${rows.filter(c.match).length}</span></div>`).join('')}
            ${lanes.map((l) => { const lr = rows.filter(l.match); return `${noLanes ? '' : `<div class="blane" style="background:${l.color}"><span style="font-size:${prefs.lanes === 'phase' ? 20 : 14}px;${prefs.lanes === 'phase' ? 'font-family:var(--font-mono)' : ''}">${prefs.lanes === 'phase' ? l.k : U.esc(FL.t(l.label))}</span>${prefs.lanes === 'phase' ? `<span>${U.esc(FL.phase(l.k).name)}</span>` : ''}<small>${lr.length} ${FL.t('cards')}</small></div>`}
              ${cols.map((c) => `<div class="bcell" data-lane="${U.esc(l.k)}" data-col="${U.esc(c.k)}">${lr.filter(c.match).map((r) => card(r, today)).join('')}</div>`).join('')}`; }).join('')}
          </div>
          ${rows.length ? '' : `<div class="empty"><b>${FL.t('No cards match these filters')}</b></div>`}
        </div>`;
      wire();
    };
    function card({ t, i, tags }, today) {
      const late = t.status !== 'Done' && t.end < today; const pc = FL.phase(t.phase).color;
      return `<div class="kcard" ${ro ? '' : 'draggable="true"'} data-id="${t.id}" style="border-left-color:${pc}">
        <div class="t">${U.esc(t.name)}</div>
        ${tags.length ? `<div class="row" style="gap:4px;flex-wrap:wrap">${tags.map((g) => B.chip(g)).join('')}</div>` : ''}
        <div class="m">${U.avatar(t.owner, 20)}<span class="mono" style="color:${late ? 'var(--c-error)' : 'inherit'};font-weight:${late ? 600 : 400}">${t.milestone ? '◆ ' : ''}${D.short(t.end)}</span>${t.pct && t.pct < 100 ? `<span class="mono">${t.pct}%</span>` : ''}<span class="right row" style="gap:6px">${t.link ? `<span data-link title="${FL.t('Open linked map shape')}" style="color:var(--c-action-text);cursor:pointer;display:grid">${U.ic('link', 14)}</span>` : ''}<span class="phase-chip" style="background:${pc};width:18px;height:18px;font-size:10px">${t.phase}</span><span class="mono" style="color:var(--c-ink-500)">#${i + 1}</span></span></div>
      </div>`;
    }
    function wire() {
      const set = (k, v) => { prefs[k] = v; S.save(); draw(); };
      const menuFor = (key, el) => {
        if (key === 'cols' || key === 'lanes') return K.menuAt(el, Object.entries(DIMS).filter(([k]) => (key === 'cols' ? !['none', 'critical'].includes(k) : true)).map(([k, l]) => ({ label: FL.t(l), check: prefs[key] === k, onClick: () => set(key, k) })));
        if (key === 'sort') return K.menuAt(el, Object.entries(SORTS).map(([k, l]) => ({ label: FL.t(l), check: prefs.sort === k, onClick: () => set('sort', k) })));
        if (key === 'due') return K.menuAt(el, Object.entries(DUE).map(([k, l]) => ({ label: FL.t(l), check: prefs.due === k, onClick: () => set('due', k) })));
        if (key === 'owner') return K.menuAt(el, [{ label: FL.t('Anyone'), check: !prefs.owner, onClick: () => set('owner', '') }, { label: FL.t('Me'), icon: 'user', onClick: () => set('owner', S.state.me) }, '-', ...[...new Set(p.tasks.map((t) => t.owner).filter(Boolean))].sort().map((o) => ({ label: o, check: prefs.owner === o, onClick: () => set('owner', o) }))]);
        if (key === 'tags') return K.menuAt(el, [{ header: FL.t('Cards with all selected tags') }, ...[...B.SYSTEM, ...(p.tags || [])].map((g) => ({ label: FL.t(g.name), swatch: g.color, check: prefs.tags.includes(g.id), onClick: () => set('tags', prefs.tags.includes(g.id) ? prefs.tags.filter((x) => x !== g.id) : [...prefs.tags, g.id]) })), '-', { label: FL.t('Clear'), onClick: () => set('tags', []) }]);
      };
      U.$$('[data-dd]', host).forEach((b) => (b.onclick = () => menuFor(b.dataset.dd, b)));
      host.querySelector('[data-crit]').onclick = () => set('crit', !prefs.crit);
      host.querySelector('[data-hd]').onchange = (e) => set('hideDone', e.target.checked);
      const qi = host.querySelector('[data-q]'); qi.oninput = U.debounce(() => { prefs.q = qi.value; draw(); const n = host.querySelector('[data-q]'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 200);
      host.querySelector('[data-tagsmgr]').onclick = () => B.manageTags(p, draw);
      const cl = host.querySelector('[data-clear]'); if (cl) cl.onclick = () => { Object.assign(prefs, { q: '', tags: [], owner: '', crit: false, due: 'all' }); S.save(); draw(); };
      opts.wireSwitch && opts.wireSwitch(host);
      let dragId = null;
      U.$$('.kcard', host).forEach((c) => {
        const t = p.tasks.find((x) => x.id === c.dataset.id);
        c.addEventListener('dragstart', (e) => { dragId = c.dataset.id; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
        c.addEventListener('dragend', () => c.classList.remove('dragging'));
        c.addEventListener('dblclick', () => FL.plan.openTask(p, t.id, draw));
        c.addEventListener('contextmenu', (e) => { e.preventDefault(); if (!ro) B.tagMenu({ x: e.clientX, y: e.clientY }, p, t, draw); });
        const lk = c.querySelector('[data-link]'); if (lk) lk.onclick = (e) => { e.stopPropagation(); FL.shell.go(`#/p/${p.id}/maps/${t.link.pageId}`); setTimeout(() => FL.maps.focusShape(t.link.shapeId), 120); };
      });
      U.$$('.bcell', host).forEach((cell) => {
        cell.addEventListener('dragover', (e) => { if (ro) return; e.preventDefault(); cell.classList.add('over'); });
        cell.addEventListener('dragleave', () => cell.classList.remove('over'));
        cell.addEventListener('drop', (e) => {
          e.preventDefault(); cell.classList.remove('over'); if (ro) return;
          const id = dragId || e.dataTransfer.getData('text/plain'); const t = p.tasks.find((x) => x.id === id); if (!t) return;
          const src = U.$(`.kcard[data-id="${id}"]`, host); const from = src && src.closest('.bcell');
          S.record('plan:' + p.id, JSON.stringify(p.tasks));
          applyDim(t, prefs.cols, cell.dataset.col, from && from.dataset.col);
          if (prefs.lanes !== prefs.cols) applyDim(t, prefs.lanes, cell.dataset.lane, from && from.dataset.lane);
          SC.compute(p.tasks); S.touch(p); draw(); FL.project.redrawRec();
        });
      });
    }
    function applyDim(t, dim, val, old) {
      if (val === old || val === '*' || dim === 'critical') return;
      if (dim === 'status' && t.status !== val) { t.status = val; if (val === 'Done') t.pct = 100; else if (t.pct === 100) t.pct = 90; else if (val === 'In progress' && !t.pct) t.pct = 10; S.log(p, `moved “${t.name}” to ${val}`); }
      if (dim === 'phase') t.phase = val;
      if (dim === 'owner') t.owner = val;
      if (dim === 'due' && val === 'done') { t.status = 'Done'; t.pct = 100; }
      if (dim === 'tag') {
        if (old && !old.startsWith('sys:')) t.tags = (t.tags || []).filter((x) => x !== old);
        if (val && !val.startsWith('sys:') && !(t.tags || []).includes(val)) t.tags = [...(t.tags || []), val];
        if (val && val.startsWith('sys:')) K.toast(FL.t('Automatic tags are calculated from the plan'));
      }
    }
    draw();
  };
})(window.FL);

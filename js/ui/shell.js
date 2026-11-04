/* Flowline · shell — sidebar, header, roteador por hash, ⌘K e boot. Carregar por último. */
(function (FL) {
  const U = FL.util, K = FL.kit, S = FL.store, D = U.date;
  FL.views = FL.views || {};
  const Sh = (FL.shell = {});

  FL.LOGO = `<svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="flg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3D63E6"/><stop offset="1" stop-color="#1A3BB0"/></linearGradient></defs><rect width="40" height="40" rx="10" fill="url(#flg)"/><rect x="8" y="9" width="10" height="7" rx="2" fill="#fff"/><path d="M13 16v5.5a2 2 0 0 0 2 2h5" stroke="#fff" stroke-width="2" fill="none"/><rect x="20" y="20" width="12" height="7" rx="2" fill="#8FA8FF"/><rect x="8" y="30" width="24" height="2.5" rx="1.25" fill="#fff" opacity=".35"/><rect x="8" y="30" width="15" height="2.5" rx="1.25" fill="#E3B505"/></svg>`;

  /* ---------- Rotas ---------- */
  FL.linkTo = (p) => (FL.appUrl || location.href.split('#')[0]) + '#/p/' + p.id + '/overview';
  Sh.go = (hash) => { if (location.hash !== hash) location.hash = hash; else Sh.route(); };
  Sh.parse = () => {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'p' && parts[1]) return { view: 'project', id: parts[1], tab: parts[2] || 'overview', sub: parts[3] || null };
    if (parts[0] === 'my') return { view: 'mywork' };
    if (parts[0] === 'toolkit') return { view: 'toolkit' };
    return { view: 'portfolio' };
  };
  let cleanup = null; let current = null;
  Sh.route = () => {
    const r = Sh.parse();
    if (r.view === 'project' && r.tab === 'board') { Sh.go(`#/p/${r.id}/plan/board`); return; }
    if (r.view === 'project' && !S.project(r.id)) r.view = 'noaccess';
    // reaproveita a view do projeto quando só muda a aba/página (mantém scroll e estado do canvas)
    if (current && current.view === 'project' && r.view === 'project' && current.id === r.id && FL.views.project.update) {
      current = r; FL.views.project.update(r); Sh.renderRail(); Sh.renderTop(); return;
    }
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    current = r;
    const host = U.$('#view'); host.innerHTML = ''; host.scrollTop = 0;
    const app = U.$('#app');
    app.classList.toggle('collapsed', r.view === 'project' ? S.state.prefs.railProject !== 'open' : S.state.prefs.rail === 'closed');
    cleanup = FL.views[r.view].render(host, r) || null;
    Sh.renderRail(); Sh.renderTop();
  };
  Sh.current = () => current;
  Sh.refresh = () => { const keep = current; current = null; if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; } current = null; Sh.route(); return keep; };

  /* ---------- Layout ---------- */
  Sh.mount = () => {
    U.$('#app').classList.add('no-anim'); setTimeout(() => U.$('#app').classList.remove('no-anim'), 400);
    U.$('#app').innerHTML = `
      <aside class="rail" aria-label="Main navigation"></aside>
      <main class="main">
        <header class="topbar"></header>
        <div class="view" id="view"></div>
      </main>`;
  };

  Sh.renderRail = () => {
    const r = current || {}; const st = S.state;
    const nav = (href, icon, label, on, extra = '') => `<a class="nav${on ? ' on' : ''}" href="${href}" title="${U.esc(label)}">${U.ic(icon)}<span class="lbl-x pname">${U.esc(label)}</span>${extra}</a>`;
    const myOpen = st.projects.reduce((n, p) => n + p.tasks.filter((t) => t.owner === st.me && t.status !== 'Done' && !isSum(p, t)).length, 0);
    const active = st.projects.filter((p) => p.health !== 'closed');
    const mineP = active.filter((p) => S.isOwner(p)), shared = active.filter((p) => !S.isOwner(p));
    const plink = (p) => `<a class="nav${r.id === p.id ? ' on' : ''}" href="#/p/${p.id}/overview" title="${U.esc(p.name)}"><i class="pdot" style="background:${p.color}"></i><span class="lbl-x pname">${U.esc(p.name)}</span><span class="cnt">${p.phase}</span></a>`;
    U.$('.rail').innerHTML = `
      <a class="brand" href="#/">${FL.LOGO}<div><b>Flowline</b><span>OpEx workspace</span></div></a>
      <button class="newbtn" data-act="new" title="New project">${U.ic('plus')}<span>New project</span></button>
      <nav class="rnav">
        <div class="ng">Workspace</div>
        ${nav('#/', 'grid', 'Portfolio', r.view === 'portfolio')}
        ${nav('#/my', 'user', 'My work', r.view === 'mywork', `<span class="cnt">${myOpen}</span>`)}
        ${nav('#/toolkit', 'book', 'LSS toolkit', r.view === 'toolkit')}
        <div class="ng">My projects</div>
        ${mineP.map(plink).join('') || '<span class="ng" style="text-transform:none;letter-spacing:0;font-weight:400">—</span>'}
        ${shared.length ? `<div class="ng">Shared with me</div>${shared.map(plink).join('')}` : ''}
      </nav>
      <div class="rfoot">
        <span class="lbl-x"><b>${FL.api.mode === 'gas' ? 'Signed in with Google' : 'Prototype · local data'}</b></span>
        <span class="lbl-x">${FL.api.mode === 'gas' ? 'You only see projects shared with you.' : 'Access rules are simulated in this browser. Use the user menu to test another person.'}</span>
      </div>`;
    U.$('.rail [data-act=new]').onclick = () => Sh.newProject();
  };
  const isSum = (p, t) => { const i = p.tasks.indexOf(t); return i + 1 < p.tasks.length && p.tasks[i + 1].level > t.level; };

  Sh.renderTop = () => {
    const r = current || {}; const st = S.state; const dark = document.documentElement.dataset.theme === 'dark';
    let crumbs = '<b>Portfolio</b>';
    if (r.view === 'mywork') crumbs = '<a href="#/">Workspace</a><span>/</span><b>My work</b>';
    if (r.view === 'toolkit') crumbs = '<a href="#/">Workspace</a><span>/</span><b>LSS toolkit</b>';
    if (r.view === 'noaccess') crumbs = '<a href="#/">Projects</a><span>/</span><b>No access</b>';
    if (r.view === 'project') { const p = S.project(r.id); crumbs = `<a href="#/">Projects</a><span>/</span><b>${U.esc(p.code)}</b><span>/</span><span>${U.esc({ overview: 'Overview', charter: 'Charter', maps: 'Maps & analysis', plan: 'Plan', board: 'Board' }[r.tab] || '')}${r.tab === 'plan' && r.sub === 'board' ? ' · Board' : ''}</span>`; }
    U.$('.topbar').innerHTML = `
      <button class="ib" data-act="rail" aria-label="Toggle sidebar">${U.ic('menu')}</button>
      <a class="ib${r.view === 'portfolio' ? ' on' : ''}" href="#/" aria-label="Portfolio">${U.ic('home')}</a>
      <button class="ib" data-act="theme" aria-label="${dark ? 'Switch to light mode' : 'Switch to dark mode'}">${U.ic(dark ? 'sun' : 'moon')}</button>
      <nav class="crumbs" aria-label="Breadcrumb">${crumbs}</nav>
      <div class="right row" style="gap:8px">
        <button class="search-trigger" data-act="cmdk">${U.ic('search')}<span class="lbl-x">Search projects, maps, tasks…</span><span class="kbd">Ctrl K</span></button>
        <span class="sync" id="sync"><i></i><span>Saved</span></span>
        <button class="btn btn-g" data-act="backup">${U.ic('save')}Backup</button>
        <div class="seg" data-lang title="Language / Idioma"><button data-l="en" class="${FL.lang() === 'en' ? 'on' : ''}">EN</button><button data-l="pt" class="${FL.lang() === 'pt' ? 'on' : ''}">PT</button></div>
        <button class="me" data-act="me" style="border:0;border-left:1px solid var(--c-line);background:none;cursor:pointer;text-align:left">${U.avatar(st.me, 30)}<div><b>${U.esc(st.me)}</b><span>${U.esc(st.meTitle || st.meEmail)}</span></div>${U.ic('chev', 12)}</button>
      </div>`;
    const top = U.$('.topbar');
    top.querySelector('[data-act=rail]').onclick = () => {
      const app = U.$('#app'); const c = app.classList.toggle('collapsed');
      if ((current || {}).view === 'project') st.prefs.railProject = c ? 'closed' : 'open'; else st.prefs.rail = c ? 'closed' : 'open';
      S.save(); setTimeout(() => window.dispatchEvent(new Event('resize')), 220);
    };
    top.querySelector('[data-act=theme]').onclick = () => Sh.toggleTheme();
    U.$$('[data-l]', top).forEach((b) => (b.onclick = () => { FL.setLang(b.dataset.l); Sh.refresh(); }));
    top.querySelector('[data-act=me]').onclick = (e) => K.menuAt(e.currentTarget, [
      { header: st.meEmail },
      { label: FL.t('My work'), icon: 'user', onClick: () => Sh.go('#/my') },
      ...(FL.api.mode === 'local' ? ['-', { header: FL.t('Demo · view as another user') }, ...st.directory.map((d) => ({ label: d.name, check: d.email === st.meEmail, onClick: async () => { await FL.api.demoSwitchUser(d.email); await S.reloadSession(); K.toast(`${FL.t('Now viewing as')} ${d.name}`); } }))] : []),
    ], { alignRight: true });
    top.querySelector('[data-act=cmdk]').onclick = () => Sh.cmdk();
    top.querySelector('[data-act=backup]').onclick = (e) => K.menuAt(e.currentTarget, [
      { label: 'Export backup (.json)', icon: 'download', onClick: () => U.download(`flowline-backup-${D.today()}.json`, S.exportJSON(), 'application/json') },
      { label: 'Import backup…', icon: 'upload', onClick: Sh.importBackup },
      '-',
      FL.api.mode === 'local' ? { label: 'Reset demo data', icon: 'undo', danger: true, onClick: () => K.confirm(FL.t('Reset demo data?'), FL.t('This replaces everything stored in this browser with the original sample projects.'), async () => { await S.reset(); Sh.go('#/'); Sh.refresh(); K.toast(FL.t('Demo data restored')); }, { danger: true, ok: FL.t('Reset') }) } : null,
    ], { alignRight: true });
    Sh.renderSync();
  };
  Sh.renderSync = () => {
    const el = U.$('#sync'); if (!el) return;
    el.classList.toggle('busy', S.saving);
    el.querySelector('span').textContent = S.saving ? 'Saving…' : S.lastSaved ? 'Saved ' + D.time(S.lastSaved) : 'Saved';
  };
  Sh.toggleTheme = () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('fl-theme', dark ? 'dark' : 'light'); } catch (e) { }
    Sh.renderTop(); S.emit('theme');
  };
  Sh.importBackup = () => {
    const inp = U.el('<input type="file" accept=".json,application/json" style="display:none">');
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try { const n = await S.importJSON(await U.readFile(f, 'text')); Sh.go('#/'); Sh.refresh(); K.toast(`${n} ${FL.t('project(s) imported')}`); }
      catch (e) { K.toast('Could not import: ' + e.message); }
    };
    document.body.appendChild(inp); inp.click(); setTimeout(() => inp.remove(), 1000);
  };

  /* ---------- Novo projeto ---------- */
  Sh.newProject = () => {
    const st = S.state; let belt = 'GB';
    const people = S.people();
    const body = U.el(`<div class="col" style="gap:14px">
      <div class="field"><label>Project name</label><input class="inp" name="name" placeholder="e.g. Dishwasher rack weld spatter"></div>
      <div class="field"><label>Type</label><div class="opt-grid" style="grid-template-columns:repeat(4,1fr)">
        ${Object.entries(FL.BELTS).map(([k, b]) => `<button type="button" class="opt${k === belt ? ' on' : ''}" data-belt="${k}"><b><span class="belt" style="padding:0;background:none"><i style="background:${b.color}"></i>${b.short}</span></b><span>${{ YB: 'Quick win, 4–6 weeks', GB: 'DMAIC, 3–5 months', BB: 'Cross-functional, 6+ months', KZ: '1-week event' }[k]}</span></button>`).join('')}
      </div></div>
      <div class="g2">
        <div class="field"><label>Leader</label><select class="inp" name="owner">${people.map((n) => `<option${n === st.me ? ' selected' : ''}>${U.esc(n)}</option>`).join('')}</select></div>
        <div class="field"><label>Sponsor</label><select class="inp" name="sponsor"><option value="">—</option>${people.map((n) => `<option>${U.esc(n)}</option>`).join('')}</select></div>
        <div class="field"><label>Site</label><input class="inp" name="site" value="Joinville"></div>
        <div class="field"><label>Area / line</label><input class="inp" name="area" placeholder="e.g. Refrigeration · Line 2"></div>
        <div class="field"><label>Start date</label><input class="inp" type="date" name="start" value="${D.today()}"></div>
        <div class="field"><label>Target savings (USD / year)</label><input class="inp mono" name="savings" inputmode="decimal" placeholder="0"></div>
      </div>
      <div class="field"><label>Primary metric (Y)</label><input class="inp" name="metric" placeholder="e.g. Scrap rate (%)"></div>
      <label class="row" style="gap:8px;font-size:13px"><input type="checkbox" name="plan" checked> Create the DMAIC plan with tollgates (editable)</label>
      <label class="row" style="gap:8px;font-size:13px"><input type="checkbox" name="pages" checked> Add starter pages: SIPOC and Thought process map</label>
    </div>`);
    U.$$('[data-belt]', body).forEach((b) => (b.onclick = () => { belt = b.dataset.belt; U.$$('[data-belt]', body).forEach((x) => x.classList.toggle('on', x === b)); }));
    const create = async () => {
      const f = (n) => body.querySelector(`[name=${n}]`);
      const name = f('name').value.trim(); if (!name) { f('name').focus(); K.toast(FL.t('Give the project a name')); return false; }
      const p = FL.newProject({ name, belt, owner: f('owner').value, sponsor: f('sponsor').value, site: f('site').value, area: f('area').value, startDate: f('start').value || D.today(), savings: f('savings').value.replace(/[^\d.]/g, ''), metric: f('metric').value || undefined, withPlan: f('plan').checked });
      p.color = ['#2650E0', '#0F6E78', '#7A4CC2', '#B5470B', '#1F7A4D', '#B07A00'][st.projects.length % 6];
      if (f('pages').checked) {
        p.pages.push(FL.newPage('sipoc', 'SIPOC', 'D'));
        p.pages.push(FL.newPage('canvas', 'Thought process map', 'D', { kind: 'tmap', data: FL.templates.build('tmap') }));
        p.activePage = p.pages[0].id;
      }
      S.log(p, 'created the project');
      try { const c = await S.createProject(p); m.close(); Sh.go(`#/p/${c.id}/overview`); K.toast(FL.t('Project created')); } catch (e) { K.toast(e.message); }
      return false;
    };
    const m = K.modal({ title: 'New improvement project', body, wide: false, footer: [{ label: 'Cancel', ghost: true }, { label: 'Create project', primary: true, onClick: () => { create(); return false; } }] });
    body.querySelector('[name=name]').addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
  };

  /* ---------- ⌘K ---------- */
  Sh.cmdk = () => {
    if (U.$('.cmdk')) return;
    const st = S.state;
    const items = [];
    const cmd = (label, icon, run, group = 'Actions', hint = '') => items.push({ label, icon, run, group, hint });
    cmd('New project', 'plus', Sh.newProject); cmd('Go to Portfolio', 'grid', () => Sh.go('#/')); cmd('Go to My work', 'user', () => Sh.go('#/my'));
    cmd('Open LSS toolkit', 'book', () => Sh.go('#/toolkit')); cmd('Toggle dark mode', 'moon', Sh.toggleTheme);
    cmd('Export backup', 'download', () => U.download(`flowline-backup-${D.today()}.json`, S.exportJSON(), 'application/json'));
    st.projects.forEach((p) => {
      items.push({ label: p.name, icon: 'folder', group: 'Projects', hint: p.code + ' · ' + FL.phase(p.phase).name, run: () => Sh.go(`#/p/${p.id}/overview`) });
      p.pages.forEach((g) => items.push({ label: g.name, icon: { canvas: 'flow', sipoc: 'sipoc', fishbone: 'fish', fmea: 'table' }[g.type], group: 'Maps & analysis', hint: p.code, run: () => Sh.go(`#/p/${p.id}/maps/${g.id}`) }));
      const tr = FL.schedule.tree(p.tasks);
      p.tasks.forEach((t, i) => !tr.isSum[i] && items.push({ label: t.name, icon: 'gantt', group: 'Tasks', hint: `${p.code} · ${t.owner || 'Unassigned'} · ${D.short(t.end)}`, run: () => { Sh.go(`#/p/${p.id}/plan`); setTimeout(() => FL.plan && FL.plan.focusTask && FL.plan.focusTask(t.id), 80); } }));
    });
    const s = U.el(`<div class="scrim"><div class="cmdk" role="dialog" aria-label="Search"><input placeholder="Search or run a command…" aria-label="Search"><div class="res"></div>
      <div class="foot"><span><span class="kbd">↑↓</span> navigate</span><span><span class="kbd">Enter</span> open</span><span><span class="kbd">Esc</span> close</span></div></div></div>`);
    const inp = s.querySelector('input'), res = s.querySelector('.res'); let hl = 0, list = [];
    const close = () => s.remove();
    const draw = () => {
      const q = inp.value.trim().toLowerCase();
      list = (q ? items.filter((it) => (it.label + ' ' + it.hint).toLowerCase().includes(q)) : items.filter((it) => it.group !== 'Tasks')).slice(0, 60);
      hl = Math.min(hl, Math.max(0, list.length - 1));
      let g = ''; res.innerHTML = list.length ? list.map((it, i) => `${it.group !== g ? `<div class="grp">${(g = it.group)}</div>` : ''}<div class="r${i === hl ? ' hl' : ''}" data-i="${i}">${U.ic(it.icon)}<span>${U.esc(it.label)}</span><small>${U.esc(it.hint)}</small></div>`).join('') : '<div class="empty" style="padding:24px">No results</div>';
      U.$$('.r', res).forEach((r) => { r.onclick = () => { close(); list[+r.dataset.i].run(); }; r.onmousemove = () => { if (hl !== +r.dataset.i) { hl = +r.dataset.i; U.$$('.r', res).forEach((x) => x.classList.toggle('hl', x === r)); } }; });
      const h = res.querySelector('.hl'); h && h.scrollIntoView({ block: 'nearest' });
    };
    inp.oninput = () => { hl = 0; draw(); };
    inp.onkeydown = (e) => {
      if (e.key === 'ArrowDown') { hl = Math.min(list.length - 1, hl + 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { hl = Math.max(0, hl - 1); draw(); e.preventDefault(); }
      else if (e.key === 'Enter' && list[hl]) { close(); list[hl].run(); }
      else if (e.key === 'Escape') close();
    };
    s.onmousedown = (e) => { if (e.target === s) close(); };
    document.body.appendChild(s); draw(); inp.focus();
  };

  /* ---------- Boot ---------- */
  window.addEventListener('error', (e) => { try { K.toast('Error: ' + (e.message || e.error)); } catch (_) { } });
  window.addEventListener('unhandledrejection', (e) => { try { K.toast('Error: ' + ((e.reason && e.reason.message) || e.reason)); } catch (_) { } });
  Sh.boot = async () => {
    Sh.mount();
    try { await S.load(); }
    catch (e) { U.$('#view').innerHTML = `<div class="empty" style="padding-top:20vh"><b>Could not load Flowline</b><span>${U.esc(e.message)}</span></div>`; return; }
    S.on((evt) => { if (evt === 'sync') Sh.renderSync(); if (evt === 'reload' || evt === 'session') Sh.refresh(); });
    window.addEventListener('hashchange', Sh.route);
    if (FL.api.mode === 'gas') {
      // o app roda num iframe: lê o #/p/... da URL de cima e mantém a URL de cima sincronizada
      await new Promise((res) => { try { google.script.url.getLocation((loc) => { if (loc && loc.hash) location.hash = loc.hash.charAt(0) === '#' ? loc.hash : '#' + loc.hash; res(); }); } catch (_) { res(); } setTimeout(res, 1500); });
      window.addEventListener('hashchange', () => { try { google.script.history.replace(null, null, location.hash.replace(/^#/, '')); } catch (_) { } });
    }
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); Sh.cmdk(); }
    });
    setInterval(Sh.renderSync, 30000);
    Sh.route();
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', Sh.boot) : Sh.boot();
})(window.FL);

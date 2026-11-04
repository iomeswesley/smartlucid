/* Flowline · Projeto — barra do registro, abas, Overview (jornada DMAIC + tollgates) e Charter. */
(function (FL) {
  const U = FL.util, D = U.date, S = FL.store, K = FL.kit, M = () => FL.metrics;
  FL.views = FL.views || {};

  const TABS = [['overview', 'Overview', 'target'], ['charter', 'Charter', 'doc'], ['maps', 'Maps & analysis', 'flow'], ['plan', 'Plan', 'gantt']];

  /* ---------- Avaliação automática dos entregáveis ---------- */
  FL.evalDeliverable = (p, auto) => {
    if (!auto) return null;
    const canv = p.pages.filter((g) => g.type === 'canvas');
    const shapes = canv.flatMap((g) => g.data.shapes.map((s) => ({ s, g })));
    const [kind, arg] = auto.split(':');
    if (auto === 'charter') return p.charter.problem.trim() && p.charter.goal.trim() ? { tab: 'charter' } : null;
    if (auto === 'plan') return p.tasks.length && p.team.length > 1 ? { tab: 'plan' } : null;
    if (auto === 'rootcause') { const g = p.pages.find((g) => g.type === 'fishbone' && g.data.cats.some((c) => c.causes.some((k) => k.flag === 'root'))); return g ? { page: g.id } : null; }
    if (auto === 'actions') { const tr = FL.schedule.tree(p.tasks); const ts = p.tasks.filter((t, i) => t.phase === 'I' && !tr.isSum[i]); return ts.length && ts.every((t) => t.status === 'Done') ? { tab: 'plan' } : null; }
    if (kind === 'page') {
      const g = p.pages.find((g) => g.type === arg && (arg === 'sipoc' ? g.data.P.length : arg === 'fishbone' ? g.data.cats.some((c) => c.causes.length) : g.data.rows.length));
      return g ? { page: g.id } : null;
    }
    if (kind === 'kind') { const g = p.pages.find((g) => g.kind === arg); return g ? { page: g.id } : null; }
    if (kind === 'shape') { const x = shapes.find(({ s }) => s.type === arg); return x ? { page: x.g.id } : null; }
    if (kind === 'cchart') { const x = shapes.find(({ s, g }) => g.phase === 'C' && s.type === 'chart' && s.chart === arg); return x ? { page: x.g.id } : null; }
    if (kind === 'chart') { const x = shapes.find(({ s }) => s.type === 'chart' && s.chart === arg); return x ? { page: x.g.id } : null; }
    return null;
  };
  FL.gateStatus = (p, k) => {
    const items = FL.TOLLGATES[k]; const tg = p.tollgates[k];
    const rows = items.map((it) => { const a = FL.evalDeliverable(p, it.auto); return { ...it, auto: !!a, src: a, done: !!a || !!tg.checks[it.k] }; });
    return { rows, done: rows.filter((r) => r.done).length, total: rows.length, approved: tg.approved, tg };
  };

  /* ---------- View ---------- */
  let ctx = null; // {host, p, r, cleanupTab}
  FL.views.project = {
    render(host, r) {
      const p = S.project(r.id);
      host.style.overflow = 'hidden';
      host.innerHTML = `<div style="display:flex;flex-direction:column;height:100%"><div class="recbar"></div><div class="pbody"></div></div>`;
      ctx = { host, p, r, cleanupTab: null };
      drawRec(); drawTab();
      const off = S.on((evt) => { if (evt === 'project-meta' && ctx) drawRec(); });
      return () => { off(); if (ctx && ctx.cleanupTab) ctx.cleanupTab(); host.style.overflow = ''; ctx = null; };
    },
    update(r) {
      if (!ctx) return;
      const prev = ctx.r; ctx.r = r;
      if (prev.tab === r.tab && r.tab === 'maps' && FL.maps && FL.maps.switchPage) { FL.maps.switchPage(r.sub); drawTabs(); return; }
      if (prev.tab !== r.tab || (r.tab === 'plan' && prev.sub !== r.sub)) drawTab(); drawTabs();
    },
  };
  FL.project = { redrawRec: () => ctx && drawRec(), ctx: () => ctx };

  function drawRec() {
    const { p } = ctx; const host = U.$('.recbar', ctx.host);
    const h = FL.HEALTH[p.health]; const ph = FL.phase(p.phase);
    const gs = FL.gateStatus(p, p.phase);
    const closed = p.health === 'closed';
    host.innerHTML = `
      <div class="t">
        <h1>${U.esc(p.name)}</h1>${FL.beltPill(p.belt)}
        <button class="st ${h.cls}" data-act="health" style="border:0;cursor:pointer"><i></i>${h.label}</button>
        <span class="st" style="background:${ph.color};color:#fff">${closed ? 'Closed' : `${ph.name} phase`}</span>
        <div class="right row">
          <span class="muted" style="font-size:13px" id="savedAt">${FL.t('Saved')} ${p.updatedAt ? D.rel(p.updatedAt) : ''}</span>
          <button class="avs" data-act="members" title="${FL.t('People with access')}" style="border:0;background:none;cursor:pointer;padding:0">${p.members.slice(0, 5).map((m) => U.avatar(S.nameOf(m.email), 28)).join('')}${p.members.length > 5 ? `<span class="av" style="background:var(--c-ink-500);width:28px;height:28px">+${p.members.length - 5}</span>` : ''}</button>
          ${S.canEdit(p) ? '' : `<span class="st st-draft"><i></i>${FL.t('View only')}</span>`}
          <button class="btn" data-act="share">${U.ic('user')}${FL.t('Share')}${p._requests && p._requests.length ? `<span class="st st-att" style="padding:1px 6px">${p._requests.length}</span>` : ''}</button>
          <button class="ib" data-act="more" aria-label="More">${U.ic('dots')}</button>
          ${closed || !S.canEdit(p) ? '' : `<button class="btn btn-p" data-act="gate">${U.ic('gate')}${ph.name} tollgate · ${gs.done}/${gs.total}</button>`}
        </div>
      </div>
      <div class="sum"><span class="mono">${U.esc(p.code)}</span><span class="sep">·</span><span>${U.esc(p.site)}${p.area ? ' · ' + U.esc(p.area) : ''}</span><span class="sep">·</span><span>Lead ${U.esc(p.owner)}</span>${p.sponsor ? `<span class="sep">·</span><span>Sponsor ${U.esc(p.sponsor)}</span>` : ''}<span class="sep">·</span><span class="mono">${D.short(p.startDate)} → ${D.short(M().finish(p))}</span><span class="sep">·</span><span>Target <b class="mono" style="color:var(--c-ink-900)">${U.money(p.savings.target)}</b>/yr</span></div>
      <div class="ptabs" role="tablist"></div>`;
    drawTabs();
    const hb = host.querySelector('[data-act=health]');
    hb.onclick = () => K.menuAt(hb, Object.entries(FL.HEALTH).map(([k, v]) => ({ label: v.label, check: p.health === k, onClick: () => { p.health = k; S.log(p, `set project health to ${v.label}`); S.touch(p); drawRec(); FL.shell.renderRail(); } })));
    const gb = host.querySelector('[data-act=gate]'); if (gb) gb.onclick = () => openGate(p, p.phase);
    host.querySelector('[data-act=share]').onclick = () => FL.share.open(p);
    host.querySelector('[data-act=members]').onclick = () => FL.share.open(p);
    host.querySelector('[data-act=more]').onclick = (e) => K.menuAt(e.currentTarget, [
      { label: FL.t('Copy project ID'), icon: 'copy', kbd: p.id, onClick: () => { U.copy(p.id); K.toast(FL.t('Project ID copied')); } },
      { label: FL.t('Copy link'), icon: 'link', onClick: () => { U.copy(FL.linkTo(p)); K.toast(FL.t('Link copied — only people with access can open it')); } },
      '-',
      S.isOwner(p) ? { label: FL.t('Delete project'), icon: 'trash', danger: true, onClick: () => K.confirm(FL.t('Delete project?'), FL.t('This permanently removes the project for everyone it is shared with.'), async () => { try { await S.deleteProject(p.id); FL.shell.go('#/'); K.toast(FL.t('Project deleted')); } catch (err) { K.toast(err.message); } }, { danger: true, ok: FL.t('Delete') }) }
        : { label: FL.t('Leave project'), icon: 'x', danger: true, onClick: () => K.confirm(FL.t('Leave project?'), FL.t('You will lose access until someone shares it with you again.'), async () => { try { await FL.api.unshare(p.id, S.state.meEmail); await S.reloadSession(); FL.shell.go('#/'); } catch (err) { K.toast(err.message); } }, { danger: true, ok: FL.t('Leave') }) },
    ], { alignRight: true });
  }
  function drawTabs() {
    const { p, r } = ctx; const tabs = U.$('.ptabs', ctx.host); if (!tabs) return;
    const leaves = M().leaves(p).length;
    tabs.innerHTML = TABS.map(([k, l, ic]) => `<a class="ptab${r.tab === k ? ' on' : ''}" href="#/p/${p.id}/${k}${k === 'maps' && p.activePage ? '/' + p.activePage : ''}" role="tab">${U.ic(ic)}${l}${k === 'maps' ? `<span class="c">${p.pages.length}</span>` : k === 'plan' ? `<span class="c">${leaves}</span>` : ''}</a>`).join('');
  }
  function drawTab() {
    const { p, r } = ctx; const body = U.$('.pbody', ctx.host);
    if (ctx.cleanupTab) { try { ctx.cleanupTab(); } catch (e) { console.error(e); } ctx.cleanupTab = null; }
    body.innerHTML = ''; body.className = 'pbody' + (['maps', 'plan', 'board'].includes(r.tab) ? ' fill' : '');
    const fn = { overview: renderOverview, charter: renderCharter, maps: (b) => FL.maps.render(b, p, r), plan: (b) => (r.sub === 'board' ? FL.board.render(b, p, { viewSwitch: FL.plan.viewSwitch('board'), wireSwitch: (h) => FL.plan.wireSwitch(h, p) }) : FL.plan.render(b, p)) }[r.tab] || renderOverview;
    try { ctx.cleanupTab = fn(body, p) || null; }
    catch (e) { console.error(e); body.innerHTML = `<div class="empty"><b>${FL.t('Something went wrong')}</b><span class="mono" style="font-size:12px">${U.esc(e && (e.stack || e.message) || e)}<br><br>${U.esc((window.__errs || []).join(' | '))}</span></div>`; }
  }

  /* ---------- Tollgate ---------- */
  function openGate(p, k) {
    const ph = FL.phase(k); const gs = FL.gateStatus(p, k);
    const idx = FL.PHASES.findIndex((x) => x.k === k); const next = FL.PHASES[idx + 1];
    const people = S.people();
    const body = U.el(`<div class="col" style="gap:14px">
      <p style="margin:0;color:var(--c-ink-700);line-height:1.5">${ph.q}</p>
      <div class="col" style="gap:4px">${gs.rows.map((r) => `<div class="chk${r.done ? ' on' : ''}"><span class="box">${r.done ? U.ic('check', 12, 2) : ''}</span><span class="tx">${U.esc(r.t)}${r.auto ? '<span class="auto">evidence found</span>' : ''}</span></div>`).join('')}</div>
      ${gs.done < gs.total ? `<div class="st st-att" style="align-self:flex-start;padding:6px 10px"><i></i>${gs.total - gs.done} deliverable(s) still open — the approver can accept with exceptions.</div>` : '<div class="st st-done" style="align-self:flex-start;padding:6px 10px"><i></i>All deliverables complete</div>'}
      <div class="g2"><div class="field"><label>Approved by</label><select class="inp" name="by">${people.map((n) => `<option${n === p.sponsor ? ' selected' : ''}>${U.esc(n)}</option>`).join('')}</select></div>
      <div class="field"><label>Date</label><input class="inp" type="date" name="date" value="${D.today()}"></div></div>
    </div>`);
    K.modal({ title: `${ph.name} tollgate review`, body, footer: [{ label: 'Close', ghost: true }, { label: next ? `Approve & move to ${next.name}` : 'Approve & close project', primary: true, onClick: () => {
      p.tollgates[k] = { ...p.tollgates[k], approved: true, by: body.querySelector('[name=by]').value, date: body.querySelector('[name=date]').value };
      if (next) p.phase = next.k; else p.health = 'closed';
      S.log(p, `${ph.name} tollgate approved by ${p.tollgates[k].by}`); S.touch(p);
      drawRec(); if (ctx.r.tab === 'overview') drawTab(); FL.shell.renderRail();
      K.toast(next ? `Moved to ${next.name}` : 'Project closed — congratulations!');
    } }] });
  }

  /* ---------- Overview ---------- */
  function renderOverview(body, p) {
    const draw = () => {
      const prog = FL.schedule.phaseProgress(p); const cur = FL.PHASES.findIndex((x) => x.k === p.phase);
      const att = M().attention(p);
      body.innerHTML = `<div class="page animate-in">
        <div class="card" style="overflow:hidden">
          <div class="card-h"><h3>DMAIC journey</h3><span class="muted" style="font-size:13px">Deliverables tick themselves when the evidence exists in Maps & analysis or the Plan.</span></div>
          <div class="journey">${FL.PHASES.map((ph, i) => {
            const gs = FL.gateStatus(p, ph.k); const pr = prog[ph.k];
            const state = p.health === 'closed' || gs.approved ? 'done' : i === cur ? 'cur' : '';
            const pages = p.pages.filter((g) => g.phase === ph.k);
            return `<div class="jcol ${state}">
              <div class="jhead"><span class="jletter">${state === 'done' ? U.ic('check', 14, 2.2) : ph.k}</span><div><b>${ph.name}</b><span>${pr.start ? D.short(pr.start) + ' – ' + D.short(pr.end) : 'not planned'}</span></div></div>
              <div class="pct"><div class="bar"><i style="width:${pr.pct}%;background:${state === 'done' ? 'var(--c-done)' : 'var(--c-action)'}"></i></div><span class="mono muted" style="font-size:12px">${pr.pct}%</span></div>
              <div class="col" style="gap:2px">${gs.rows.map((r) => `<div class="chk${r.done ? ' on' : ''}" data-ph="${ph.k}" data-k="${r.k}" ${r.auto ? 'data-auto="1"' : ''}><span class="box">${r.done ? U.ic('check', 12, 2) : ''}</span><span class="tx">${U.esc(r.t)}${r.auto ? ' <span class="auto">auto</span>' : ''}${r.src && r.src.page ? ` <span class="lnk" data-open="${r.src.page}">open</span>` : ''}</span></div>`).join('')}</div>
              ${pages.length ? `<div class="row" style="flex-wrap:wrap;gap:4px">${pages.map((g) => `<a class="st st-plain" style="text-decoration:none" href="#/p/${p.id}/maps/${g.id}">${U.ic({ canvas: 'flow', sipoc: 'sipoc', fishbone: 'fish', fmea: 'table' }[g.type], 12)}${U.esc(g.name)}</a>`).join('')}</div>` : ''}
              <div class="tollgate">${gs.approved ? `${U.ic('gate', 14)}<span>Approved ${D.short(gs.tg.date)} · ${U.esc(gs.tg.by)}</span>` : i === cur && p.health !== 'closed' ? `<button class="btn btn-sm" data-gate="${ph.k}">Review tollgate · ${gs.done}/${gs.total}</button>` : `<span>Tollgate pending</span>`}</div>
            </div>`;
          }).join('')}</div>
        </div>
        <div class="ov-grid">
          <div class="col" style="gap:20px">
            <div class="card"><div class="card-h"><h3>Project Y metrics</h3><span class="muted right" style="font-size:12px">Baseline → target · current</span></div>
              <div class="card-b" style="padding-top:4px;padding-bottom:4px">
                <div class="metric-row" style="font-size:12px;color:var(--c-ink-500);font-weight:600"><span>Metric</span><span>Baseline</span><span>Target</span><span>Current</span><span>Δ vs baseline</span></div>
                ${p.metrics.map((m) => metricRow(m)).join('')}
              </div></div>
            <div class="card"><div class="card-h"><h3>Needs attention</h3><a class="right" href="#/p/${p.id}/plan" style="font-size:13px">Open plan</a></div>
              <div class="card-b feed" style="padding-top:4px;padding-bottom:4px">${att.length ? att.map((t) => `<div class="it" style="cursor:pointer" data-task="${t.id}"><i style="width:3px;border-radius:2px;background:${FL.status(t.status).color};flex:none"></i><div class="grow"><b style="font-weight:600;color:var(--c-ink-900)">${U.esc(t.name)}</b><time>${U.esc(t.owner || FL.t('Unassigned'))} · ${FL.t('due')} ${D.short(t.end)}${t.notes ? ' · ' + U.esc(t.notes) : ''}</time></div><span class="st ${FL.status(t.status).cls}" style="align-self:center"><i></i>${t.status}</span></div>`).join('') : '<div class="muted" style="padding:12px 0">All tasks on schedule.</div>'}</div></div>
          </div>
          <div class="col" style="gap:20px">
            <div class="card kpi"><span class="eyebrow">Savings · ${p.savings.type}</span><span class="v">${U.money(p.savings.realized)} <span style="font-size:16px;color:var(--c-ink-500)">/ ${U.money(p.savings.target)}</span></span><div class="bar"><i style="width:${p.savings.target ? Math.min(100, (p.savings.realized / p.savings.target) * 100) : 0}%;background:var(--c-done)"></i></div><span class="s">Realized vs. annualized target</span></div>
            <div class="card"><div class="card-h"><h3>Team</h3><span class="muted mono right" style="font-size:13px">${p.team.length}</span></div>
              <div class="card-b col" style="gap:10px">${p.team.map((m) => `<div class="row">${U.avatar(m.name, 30)}<div><b style="font-weight:600;font-size:14px">${U.esc(m.name)}</b><div class="muted" style="font-size:12.5px">${U.esc(m.role)}</div></div></div>`).join('')}</div></div>
            <div class="card"><div class="card-h"><h3>Activity</h3></div>
              <div class="card-b feed" style="padding-top:4px;padding-bottom:4px">${(p.activity || []).slice(0, 6).map((a) => `<div class="it">${U.avatar(a.who, 22)}<div><b style="font-weight:600;color:var(--c-ink-900)">${U.esc(a.who.split(' ')[0])}</b> ${U.esc(a.text)}<time>${D.rel(a.ts)}</time></div></div>`).join('') || '<div class="muted" style="padding:12px 0">No activity yet.</div>'}</div></div>
          </div>
        </div>
      </div>`;
      U.$$('.chk[data-k]', body).forEach((c) => (c.onclick = (e) => {
        if (e.target.closest('[data-open]')) { FL.shell.go(`#/p/${p.id}/maps/${e.target.closest('[data-open]').dataset.open}`); return; }
        if (c.dataset.auto) { K.toast('Ticked automatically from the project evidence'); return; }
        const tg = p.tollgates[c.dataset.ph]; tg.checks[c.dataset.k] = !tg.checks[c.dataset.k]; S.touch(p); draw(); drawRec();
      }));
      U.$$('[data-gate]', body).forEach((b) => (b.onclick = () => openGate(p, b.dataset.gate)));
      U.$$('[data-task]', body).forEach((b) => (b.onclick = () => { FL.shell.go(`#/p/${p.id}/plan`); setTimeout(() => FL.plan.focusTask(b.dataset.task), 80); }));
    };
    draw();
  }
  function metricRow(m) {
    const f = (v) => (v == null || v === '' ? '—' : `${v}${m.unit ? ' ' + m.unit : ''}`);
    let delta = '';
    if (m.baseline != null && m.current != null) {
      const d = +(m.current - m.baseline).toFixed(2); const good = m.dir === 'down' ? d < 0 : d > 0;
      delta = d === 0 ? '<span class="dl" style="background:var(--c-draft-soft);color:var(--c-draft-ink)">= 0</span>' : `<span class="dl ${good ? 'dl-down' : 'dl-up'}">${d > 0 ? '▲ +' : '▼ −'}${Math.abs(d)}</span>`;
    }
    const span = m.target != null && m.baseline != null && m.target !== m.baseline ? U.clamp((m.current - m.baseline) / (m.target - m.baseline), 0, 1) : m.current != null && m.current === m.target ? 1 : 0;
    return `<div class="metric-row"><span><b style="font-weight:600">${U.esc(m.name)}</b><div class="bar" style="margin-top:6px;max-width:220px"><i style="width:${Math.round(span * 100)}%;background:var(--c-done)"></i></div></span><span class="mono">${f(m.baseline)}</span><span class="mono">${f(m.target)}</span><span class="mono" style="font-weight:600">${f(m.current)}</span><span>${delta}</span></div>`;
  }

  /* ---------- Charter ---------- */
  function renderCharter(body, p) {
    const c = p.charter;
    const ed = (path, ph) => `<div class="ed" contenteditable="true" data-path="${path}" data-ph="${U.esc(ph)}">${U.esc(path.split('.').reduce((o, k) => o[k], p))}</div>`;
    const people = S.people();
    const sel = (key, val) => `<select class="inp inp-sm" data-f="${key}">${['', ...people].map((n) => `<option${n === val ? ' selected' : ''} value="${U.esc(n)}">${U.esc(n || '—')}</option>`).join('')}</select>`;
    body.innerHTML = `<div class="page animate-in"><div class="charter">
      <div class="col" style="gap:16px">
        <div class="card cblock"><h4>${U.ic('alert', 14)}Problem statement</h4>${ed('charter.problem', 'What is wrong, where, since when, how big, and the impact — no causes or solutions.')}<div id="probHint"></div></div>
        <div class="card cblock"><h4>${U.ic('target', 14)}Goal statement</h4>${ed('charter.goal', 'Reduce [Y] from [baseline] to [target] by [date].')}<div class="smart" id="smart"></div></div>
        <div class="card cblock"><h4>${U.ic('trend', 14)}Business case</h4>${ed('charter.business', 'Why this matters now, link to site / category priorities.')}</div>
        <div class="g2"><div class="card cblock"><h4>In scope</h4>${ed('charter.inScope', 'Processes, products, lines included')}</div><div class="card cblock"><h4>Out of scope</h4>${ed('charter.outScope', 'What the team will not touch')}</div></div>
        <div class="card cblock"><h4>Constraints & assumptions</h4>${ed('charter.constraints', 'Budget, freeze dates, resources…')}</div>
        <div class="card"><div class="card-h"><h3>Metrics</h3><button class="btn btn-sm right" data-act="addm">${U.ic('plus')}Add metric</button></div>
          <div style="overflow:auto"><table class="tbl"><thead><tr><th>Metric (Y)</th><th>Unit</th><th>Better</th><th class="num">Baseline</th><th class="num">Target</th><th class="num">Current</th><th></th></tr></thead><tbody>
          ${p.metrics.map((m, i) => `<tr data-m="${i}"><td><input class="inp inp-sm" data-k="name" value="${U.esc(m.name)}"></td><td style="width:90px"><input class="inp inp-sm" data-k="unit" value="${U.esc(m.unit)}"></td>
            <td style="width:110px"><select class="inp inp-sm" data-k="dir"><option value="down"${m.dir === 'down' ? ' selected' : ''}>Lower</option><option value="up"${m.dir === 'up' ? ' selected' : ''}>Higher</option></select></td>
            ${['baseline', 'target', 'current'].map((k) => `<td style="width:110px"><input class="inp inp-sm mono" style="text-align:right" data-k="${k}" data-num value="${m[k] ?? ''}"></td>`).join('')}
            <td style="width:40px"><button class="ib ib-sm ib-ghost" data-del aria-label="Remove metric">${U.ic('trash')}</button></td></tr>`).join('')}
          </tbody></table></div></div>
      </div>
      <div class="col" style="gap:16px">
        <div class="card"><div class="card-h"><h3>Project information</h3></div><div class="card-b col" style="gap:12px">
          <div class="field"><label>Name</label><input class="inp" data-f="name" value="${U.esc(p.name)}"></div>
          <div class="g2"><div class="field"><label>Code</label><input class="inp mono" data-f="code" value="${U.esc(p.code)}"></div>
          <div class="field"><label>Type</label><select class="inp" data-f="belt">${Object.entries(FL.BELTS).map(([k, b]) => `<option value="${k}"${p.belt === k ? ' selected' : ''}>${b.name}</option>`).join('')}</select></div></div>
          <div class="g2"><div class="field"><label>Lead</label>${sel('owner', p.owner)}</div><div class="field"><label>Sponsor</label>${sel('sponsor', p.sponsor)}</div></div>
          <div class="g2"><div class="field"><label>Master Black Belt</label>${sel('mbb', p.mbb)}</div><div class="field"><label>Site</label><input class="inp inp-sm" data-f="site" value="${U.esc(p.site)}"></div></div>
          <div class="field"><label>Area / line</label><input class="inp inp-sm" data-f="area" value="${U.esc(p.area)}"></div>
          <div class="g2"><div class="field"><label>Savings target (USD/yr)</label><input class="inp inp-sm mono" data-f="savings.target" value="${p.savings.target}"></div><div class="field"><label>Realized</label><input class="inp inp-sm mono" data-f="savings.realized" value="${p.savings.realized}"></div></div>
          <div class="field"><label>Savings type</label><div class="seg">${['Hard', 'Soft', 'Cost avoidance'].map((t) => `<button data-stype="${t}" class="${p.savings.type === t ? 'on' : ''}">${t}</button>`).join('')}</div></div>
        </div></div>
        <div class="card"><div class="card-h"><h3>Team</h3><button class="btn btn-sm right" data-act="addp">${U.ic('plus')}Add</button></div><div class="card-b col" style="gap:8px">
          ${p.team.map((m, i) => `<div class="row" data-tm="${i}">${U.avatar(m.name, 28)}<div class="grow"><b style="font-weight:600;font-size:14px">${U.esc(m.name)}</b><input class="inp inp-sm" style="margin-top:4px" data-role value="${U.esc(m.role)}"></div><button class="ib ib-sm ib-ghost" data-rm aria-label="Remove">${U.ic('x')}</button></div>`).join('')}
        </div></div>
        <div class="card cblock"><h4>Key milestones (from the plan)</h4>${FL.PHASES.map((ph) => { const pr = FL.schedule.phaseProgress(p)[ph.k]; return `<div class="row" style="font-size:13px"><span class="phase-chip" style="background:${ph.color}">${ph.k}</span><span>${ph.name} tollgate</span><span class="right mono">${D.short(pr.end)}</span></div>`; }).join('')}</div>
      </div></div></div>`;

    const save = () => { S.touch(p); FL.project.redrawRec(); };
    const probHint = () => {
      const t = (c.problem || '').toLowerCase(); const bad = ['because', 'due to', 'caused by', 'solution', 'implement', 'install', 'buy '].filter((w) => t.includes(w));
      U.$('#probHint', body).innerHTML = bad.length ? `<span class="st st-att"><i></i>Contains “${bad[0].trim()}” — keep causes and solutions out of the problem statement</span>` : t ? '<span class="st st-done"><i></i>States the problem without jumping to causes</span>' : '';
    };
    const smart = () => {
      const g = c.goal || '';
      const chk = { Specific: /\b(reduce|increase|eliminate|improve|from)\b/i.test(g), Measurable: /\d/.test(g), Achievable: g.length > 30, Relevant: !!c.business.trim(), 'Time-bound': /\b(by|before|until)\b.*(\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4])/i.test(g) };
      U.$('#smart', body).innerHTML = Object.entries(chk).map(([k, v]) => `<span class="${v ? 'ok' : ''}">${v ? '✓ ' : ''}${k}</span>`).join('');
    };
    probHint(); smart();
    U.$$('.ed', body).forEach((e) => e.addEventListener('input', () => {
      const [a, b] = e.dataset.path.split('.'); p[a][b] = e.innerText.replace(/\n$/, ''); save(); probHint(); smart();
    }));
    U.$$('[data-f]', body).forEach((e) => e.addEventListener('change', () => {
      const path = e.dataset.f.split('.'); let v = e.value;
      if (path[0] === 'savings') v = +String(v).replace(/[^\d.-]/g, '') || 0;
      if (path.length === 2) p[path[0]][path[1]] = v; else p[path[0]] = v;
      save(); FL.shell.renderRail();
    }));
    U.$$('[data-stype]', body).forEach((b) => (b.onclick = () => { p.savings.type = b.dataset.stype; save(); renderCharter(body, p); }));
    U.$$('tr[data-m]', body).forEach((tr) => {
      const m = p.metrics[+tr.dataset.m];
      U.$$('[data-k]', tr).forEach((inp) => inp.addEventListener('change', () => { m[inp.dataset.k] = inp.dataset.num != null ? (inp.value === '' ? null : +inp.value) : inp.value; save(); }));
      tr.querySelector('[data-del]').onclick = () => { p.metrics.splice(+tr.dataset.m, 1); save(); renderCharter(body, p); };
    });
    body.querySelector('[data-act=addm]').onclick = () => { p.metrics.push({ id: U.uid('m'), name: 'New metric', unit: '', baseline: null, target: null, current: null, dir: 'down' }); save(); renderCharter(body, p); };
    U.$$('[data-tm]', body).forEach((row) => {
      const m = p.team[+row.dataset.tm];
      row.querySelector('[data-role]').addEventListener('change', (e) => { m.role = e.target.value; save(); });
      row.querySelector('[data-rm]').onclick = () => { p.team.splice(+row.dataset.tm, 1); save(); renderCharter(body, p); };
    });
    body.querySelector('[data-act=addp]').onclick = (e) => {
      const out = S.people().filter((n) => !p.team.some((t) => t.name === n));
      K.menuAt(e.currentTarget, [...out.map((n) => ({ label: n, icon: 'user', onClick: () => { p.team.push({ name: n, role: 'Team member' }); save(); renderCharter(body, p); } })), '-', { label: 'Someone else…', icon: 'plus', onClick: () => K.prompt('Add team member', 'Full name', '', (v) => { if (!v) return; p.team.push({ name: v, role: 'Team member' }); save(); renderCharter(body, p); }) }], { alignRight: true });
    };
  }
})(window.FL);

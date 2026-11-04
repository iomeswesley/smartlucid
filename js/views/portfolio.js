/* Flowline · Portfolio e My work */
(function (FL) {
  const U = FL.util, D = U.date, S = FL.store, K = FL.kit;
  FL.views = FL.views || {};

  FL.metrics = {
    progress(p) {
      const tr = FL.schedule.tree(p.tasks); let w = 0, d = 0;
      p.tasks.forEach((t, i) => { if (tr.isSum[i]) return; const k = Math.max(1, t.dur || 1); w += k; d += k * (t.pct || 0); });
      return w ? Math.round(d / w) : 0;
    },
    leaves(p) { const tr = FL.schedule.tree(p.tasks); return p.tasks.filter((t, i) => !tr.isSum[i]); },
    nextGate(p) {
      const ph = FL.schedule.phaseProgress(p)[p.phase];
      return ph && ph.end ? ph.end : null;
    },
    attention(p) { return FL.metrics.leaves(p).filter((t) => t.status === 'At risk' || t.status === 'Blocked' || (t.status !== 'Done' && t.end && t.end < D.today())); },
    finish(p) { return p.tasks.reduce((m, t) => (t.end && (!m || t.end > m) ? t.end : m), null); },
  };
  const M = FL.metrics;

  const dmaic = (p) => `<span class="dmaic" title="${FL.phase(p.phase).name}">${FL.PHASES.map((ph) => {
    const i = FL.PHASES.findIndex((x) => x.k === p.phase), j = FL.PHASES.indexOf(ph);
    return `<span class="${p.health === 'closed' || j < i ? 'done' : j === i ? 'cur' : ''}">${ph.k}</span>`;
  }).join('')}</span>`;
  FL.dmaicStepper = dmaic;

  FL.views.portfolio = {
    render(host) {
      let filter = 'all';
      const draw = () => {
        const st = S.state;
        const all = st.projects;
        const list = all.filter((p) => filter === 'all' || p.belt === filter || (filter === 'mine' && S.isOwner(p)) || (filter === 'shared' && !S.isOwner(p)));
        const active = all.filter((p) => p.health !== 'closed');
        const target = U.sum(active.map((p) => p.savings.target)), realized = U.sum(all.map((p) => p.savings.realized));
        const att = all.flatMap((p) => M.attention(p).map((t) => ({ p, t })));
        const gates = active.map((p) => ({ p, d: M.nextGate(p) })).filter((x) => x.d && x.d <= D.addDays(D.today(), 21));
        const byBelt = Object.keys(FL.BELTS).map((b) => [b, active.filter((p) => p.belt === b).length]).filter((x) => x[1]);
        host.innerHTML = `<div class="page animate-in">
          <div class="ph"><div><h1>Portfolio</h1><p>${active.length} active improvement projects · FY${new Date().getFullYear()}</p></div>
            <div class="right row"><div class="seg" role="tablist">${[['all', 'All'], ['mine', 'Owned by me'], ['shared', 'Shared with me'], ...Object.entries(FL.BELTS).map(([k, b]) => [k, b.short])].map(([k, l]) => `<button class="${filter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
            <button class="btn btn-p" data-act="new">${U.ic('plus')}New project</button></div></div>
          <div class="kpis">
            <div class="card kpi"><span class="eyebrow">Active projects</span><span class="v">${active.length}</span><span class="s">${byBelt.map(([b, n]) => `<span class="belt"><i style="background:${FL.BELTS[b].color}"></i>${n} ${FL.BELTS[b].short}</span>`).join('')}</span></div>
            <div class="card kpi"><span class="eyebrow">Savings · realized / target</span><span class="v">${U.money(realized)} <span style="font-size:16px;color:var(--c-ink-500)">/ ${U.money(target)}</span></span><div class="bar" style="margin-top:4px"><i style="width:${target ? Math.min(100, (realized / target) * 100) : 0}%;background:var(--c-done)"></i></div></div>
            <div class="card kpi"><span class="eyebrow">Tasks needing attention</span><span class="v" style="color:${att.length ? 'var(--c-attention-ink)' : 'inherit'}">${att.length}</span><span class="s">At risk, blocked or overdue</span></div>
            <div class="card kpi"><span class="eyebrow">Tollgates next 3 weeks</span><span class="v">${gates.length}</span><span class="s">${gates.slice(0, 3).map((g) => `<span class="st st-plain">${g.p.code} · ${g.p.phase} · ${D.short(g.d)}</span>`).join('') || 'None scheduled'}</span></div>
          </div>
          <div class="ov-grid" style="grid-template-columns:minmax(0,1fr) 330px">
            <div class="card" style="overflow:hidden">
              <div class="card-h"><h3>Projects</h3><span class="muted" style="font-size:13px">${list.length} shown</span></div>
              <div style="overflow:auto"><table class="tbl"><thead><tr><th>Project</th><th>Type</th><th>DMAIC</th><th>Health</th><th style="width:120px">Progress</th><th>Phase ends</th><th class="num">Savings target</th><th>Access</th></tr></thead><tbody>
                ${list.map((p) => { const pr = M.progress(p); const h = FL.HEALTH[p.health]; return `<tr class="click" data-p="${p.id}">
                  <td><div class="row" style="gap:10px"><i style="width:4px;height:34px;border-radius:2px;background:${p.color};flex:none"></i><div style="min-width:0"><b style="font-weight:600;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px">${U.esc(p.name)}</b><span class="muted mono" style="font-size:12px">${p.code} · ${U.esc(p.site)}</span></div></div></td>
                  <td>${FL.beltPill(p.belt, true)}</td><td>${dmaic(p)}</td><td><span class="st ${h.cls}"><i></i>${h.label}</span></td>
                  <td><div class="pct"><div class="bar"><i style="width:${pr}%"></i></div><span class="mono" style="font-size:12px;width:34px;text-align:right">${pr}%</span></div></td>
                  <td class="mono" style="font-size:13px">${D.short(M.nextGate(p))}</td>
                  <td class="num mono">${U.money(p.savings.target)}</td><td><span class="row" style="gap:6px"><span class="avs">${p.members.slice(0, 3).map((m) => U.avatar(S.nameOf(m.email), 22)).join('')}</span>${S.isOwner(p) ? '' : `<span class="st ${S.canEdit(p) ? 'st-plain' : 'st-draft'}">${S.canEdit(p) ? 'Shared' : 'View only'}</span>`}</span></td></tr>`; }).join('')}
              ${list.length ? '' : `<tr><td colspan="8"><div class="empty"><b>${FL.t('No projects yet')}</b><span>${FL.t('Create your first improvement project, or load a sample to explore the tool.')}</span><div class="row"><button class="btn btn-p" data-act="new2">${U.ic('plus')}${FL.t('New project')}</button><button class="btn" data-sample>${U.ic('sparkle')}${FL.t('Load sample project')}</button></div></div></td></tr>`}
              </tbody></table></div>
            </div>
            <div class="col" style="gap:20px">
              <div class="card"><div class="card-h"><h3>Needs attention</h3><span class="st st-att right"><i></i>${att.length}</span></div>
                <div class="card-b feed" style="padding-top:4px;padding-bottom:4px">${att.slice(0, 6).map(({ p, t }) => `<div class="it click" style="cursor:pointer" data-goto="${p.id}" data-task="${t.id}"><i style="width:3px;border-radius:2px;background:${FL.status(t.status).color};flex:none"></i><div style="min-width:0"><b style="font-weight:600;color:var(--c-ink-900)">${U.esc(t.name)}</b><time>${p.code} · ${U.esc(t.owner || FL.t('Unassigned'))} · ${FL.t('due')} ${D.short(t.end)} · ${FL.t(t.status === 'Not started' || t.status === 'In progress' ? 'Overdue' : t.status)}</time></div></div>`).join('') || `<div class="muted" style="padding:12px 0">${FL.t('Nothing at risk.')}</div>`}</div></div>
              <div class="card"><div class="card-h"><h3>Recent activity</h3></div>
                <div class="card-b feed" style="padding-top:4px;padding-bottom:4px">${S.activity().slice(0, 7).map((a) => { const p = S.project(a.projectId); return `<div class="it">${U.avatar(a.who, 24)}<div><b style="font-weight:600;color:var(--c-ink-900)">${U.esc(a.who.split(' ')[0])}</b> ${U.esc(a.text)}<time>${p ? p.code + ' · ' : ''}${D.rel(a.ts)}</time></div></div>`; }).join('')}</div></div>
            </div>
          </div>
        </div>`;
        U.$$('[data-f]', host).forEach((b) => (b.onclick = () => { filter = b.dataset.f; draw(); }));
        host.querySelector('[data-act=new]').onclick = () => FL.shell.newProject();
        const n2 = host.querySelector('[data-act=new2]'); if (n2) n2.onclick = () => FL.shell.newProject();
        const sm = host.querySelector('[data-sample]'); if (sm) sm.onclick = async () => {
          sm.disabled = true;
          // projeto de exemplo (Air fryer GB) só com o usuário atual como dono — nenhum colega é adicionado
          const demo = Object.values(FL.seedServer().projects).find((x) => /Air fryer/.test(x.name));
          delete demo.members; delete demo.id; demo.owner = S.state.me; demo.team = [{ name: S.state.me, role: 'Green Belt (lead)' }];
          try { const c = await S.createProject(demo); FL.shell.go(`#/p/${c.id}/overview`); } catch (e) { K.toast(e.message); sm.disabled = false; }
        };
        U.$$('tr[data-p]', host).forEach((r) => (r.onclick = () => FL.shell.go(`#/p/${r.dataset.p}/overview`)));
        U.$$('[data-goto]', host).forEach((r) => (r.onclick = () => { FL.shell.go(`#/p/${r.dataset.goto}/plan`); setTimeout(() => FL.plan && FL.plan.focusTask(r.dataset.task), 80); }));
      };
      draw();
    },
  };

  FL.views.mywork = {
    render(host) {
      const draw = () => {
        const st = S.state, today = D.today(), wk = D.addDays(today, 7), two = D.addDays(today, 21);
        const mine = [];
        st.projects.forEach((p) => { const tr = FL.schedule.tree(p.tasks); p.tasks.forEach((t, i) => { if (!tr.isSum[i] && t.owner === st.me) mine.push({ p, t }); }); });
        const groups = [
          ['Overdue', (x) => x.t.status !== 'Done' && x.t.end < today],
          ['This week', (x) => x.t.status !== 'Done' && x.t.end >= today && x.t.end <= wk],
          ['Next 3 weeks', (x) => x.t.status !== 'Done' && x.t.end > wk && x.t.end <= two],
          ['Later', (x) => x.t.status !== 'Done' && x.t.end > two],
          ['Done', (x) => x.t.status === 'Done'],
        ];
        const open = mine.filter((x) => x.t.status !== 'Done').length;
        host.innerHTML = `<div class="page animate-in" style="max-width:1180px">
          <div class="ph"><div><h1>My work</h1><p>${open} open tasks across ${new Set(mine.map((x) => x.p.id)).size} projects</p></div></div>
          ${groups.map(([name, fn]) => { const rows = mine.filter(fn).sort((a, b) => (a.t.end < b.t.end ? -1 : 1)); if (!rows.length) return ''; return `
            <div class="card" style="overflow:hidden"><div class="card-h"><h3>${name}</h3><span class="muted mono" style="font-size:13px">${rows.length}</span></div>
            <table class="tbl" style="table-layout:fixed;width:100%"><colgroup><col style="width:44px"><col><col style="width:150px"><col style="width:64px"><col style="width:140px"><col style="width:96px"></colgroup><tbody>${rows.slice(0, name === 'Done' ? 8 : 99).map(({ p, t }) => `<tr class="click" data-p="${p.id}" data-t="${t.id}">
              <td><span class="chk${t.status === 'Done' ? ' on' : ''}" data-done title="Mark as done"><span class="box">${t.status === 'Done' ? U.ic('check', 12, 2) : ''}</span></span></td>
              <td style="overflow:hidden"><b style="font-weight:600;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.esc(t.name)}${t.link ? ` <span class="muted" title="Linked to a map">${U.ic('link', 13)}</span>` : ''}</b>${t.notes ? `<div class="muted" style="font-size:12.5px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${U.esc(t.notes)}</div>` : ''}</td>
              <td><span class="row" style="gap:6px;font-size:13px;white-space:nowrap"><i style="width:8px;height:8px;border-radius:2px;background:${p.color}"></i>${U.esc(p.code)}</span></td>
              <td><span class="phase-chip" style="background:${FL.phase(t.phase).color}">${t.phase}</span></td>
              <td><span class="st ${FL.status(t.status).cls}"><i></i>${t.status}</span></td>
              <td class="mono" style="font-size:13px;color:${t.status !== 'Done' && t.end < today ? 'var(--c-error)' : 'inherit'}">${D.short(t.end)}</td></tr>`).join('')}</tbody></table></div>`; }).join('') || '<div class="card empty"><b>No tasks assigned to you</b>Tasks you own in any project plan show up here.</div>'}
        </div>`;
        U.$$('tr[data-t]', host).forEach((r) => {
          r.onclick = (e) => {
            const p = S.project(r.dataset.p), t = p.tasks.find((x) => x.id === r.dataset.t);
            if (e.target.closest('[data-done]')) {
              const was = t.status; t.status = was === 'Done' ? 'In progress' : 'Done'; t.pct = t.status === 'Done' ? 100 : Math.min(t.pct, 90);
              FL.schedule.compute(p.tasks); S.log(p, `${t.status === 'Done' ? 'completed' : 'reopened'} “${t.name}”`); S.touch(p); draw();
              if (t.status === 'Done') K.toast('Task completed', { action: 'Undo', onAction: () => { t.status = was; t.pct = was === 'Done' ? 100 : 50; FL.schedule.compute(p.tasks); S.touch(p); draw(); } });
              return;
            }
            FL.shell.go(`#/p/${p.id}/plan`); setTimeout(() => FL.plan && FL.plan.focusTask(t.id), 80);
          };
        });
      };
      draw();
    },
  };
})(window.FL);

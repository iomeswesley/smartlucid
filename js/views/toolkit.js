/* Flowline · LSS toolkit — galeria de templates por fase DMAIC + roteiro do Green/Black Belt. */
(function (FL) {
  const U = FL.util, S = FL.store, K = FL.kit;
  FL.views = FL.views || {};

  const WHEN = {
    blank: 'Anything that does not fit a template.',
    'gb-pmap': 'Measure: map the process, list the y’s and x’s of each step, classify C / N / SO and mark the critical x’s (*). Update after each experiment.',
    'gb-product': 'Measure: block diagram of the product, functions of each part (what is it for? why is it here?), x’s with spec, critical x’s for COV / DOE.',
    tmap: 'From day one. Every question, the tool used to answer it and what you learned — the storyline for tollgates.',
    pmap: 'Measure: list every X per step and classify it before collecting data.',
    product: 'Measure/Analyze on product problems: which component characteristics can drive the Y.',
    vsm: 'Lead-time, inventory or flow problems. The ladder and PCE update as you type the data boxes.',
    swimlane: 'Hand-offs between roles or departments (changeover, approvals, logistics).',
    spc: 'Baseline stability and capability, and later the control chart in Control.',
    sipoc: 'Define: agree on scope and boundaries with the sponsor.',
    fishbone: 'Analyze: brainstorm causes with the team, then validate the suspects.',
    fmea: 'Analyze/Improve: prioritize risks and turn actions into tasks.',
  };

  function preview(k, col) {
    const t = FL.templates.LIST.find((x) => x.k === k);
    if (t.type === 'sipoc') return `<svg viewBox="0 0 300 140">${['S', 'I', 'P', 'O', 'C'].map((l, i) => `<rect x="${8 + i * 58}" y="10" width="52" height="120" rx="6" fill="${col.surface}" stroke="${col.line}"/><rect x="${20 + i * 58}" y="18" width="28" height="22" rx="5" fill="${l === 'P' ? col.action : col.ink9}"/><text x="${34 + i * 58}" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="Geist Mono">${l}</text>${[0, 1, 2].map((j) => `<rect x="${14 + i * 58}" y="${50 + j * 22}" width="40" height="14" rx="3" fill="${col.surface3}"/>`).join('')}`).join('')}</svg>`;
    if (t.type === 'fishbone') return `<svg viewBox="0 0 300 140"><line x1="20" y1="70" x2="220" y2="70" stroke="${col.ink9}" stroke-width="3"/><path d="M220 48h50l14 22-14 22h-50z" fill="${col.action}"/>${[60, 120, 180].map((x) => `<line x1="${x - 30}" y1="18" x2="${x}" y2="70" stroke="${col.ink5}" stroke-width="2"/><line x1="${x - 30}" y1="122" x2="${x}" y2="70" stroke="${col.ink5}" stroke-width="2"/><line x1="${x - 52}" y1="40" x2="${x - 20}" y2="40" stroke="${col.error}" stroke-width="2"/><line x1="${x - 52}" y1="100" x2="${x - 20}" y2="100" stroke="${col.ink5}"/>`).join('')}</svg>`;
    if (t.type === 'fmea') return `<svg viewBox="0 0 300 140"><rect x="10" y="12" width="280" height="116" rx="6" fill="${col.surface}" stroke="${col.line}"/><rect x="10" y="12" width="280" height="20" rx="6" fill="${col.surface3}"/>${[0, 1, 2, 3].map((r) => `<line x1="10" x2="290" y1="${54 + r * 22}" y2="${54 + r * 22}" stroke="${col.line}"/><rect x="226" y="${37 + r * 22}" width="40" height="14" rx="3" fill="${[col.error, col.attention, col.done, col.done][r]}" opacity=".85"/>`).join('')}</svg>`;
    const data = FL.templates.build(k); const sh = data.shapes;
    if (!sh.length) return `<svg viewBox="0 0 300 140"><rect x="40" y="30" width="80" height="40" rx="4" fill="none" stroke="${col.ink5}" stroke-dasharray="4 3"/><rect x="170" y="70" width="90" height="44" rx="4" fill="none" stroke="${col.ink5}" stroke-dasharray="4 3"/><path d="M120 50h25v42h25" fill="none" stroke="${col.ink5}"/></svg>`;
    const x1 = Math.min(...sh.map((s) => s.x)) - 20, y1 = Math.min(...sh.map((s) => s.y)) - 20, x2 = Math.max(...sh.map((s) => s.x + s.w)) + 20, y2 = Math.max(...sh.map((s) => s.y + s.h)) + 20;
    const byId = Object.fromEntries(sh.map((s) => [s.id, s]));
    const lines = data.edges.map((e) => { const a = byId[e.a], b = byId[e.b]; return a && b ? `<line x1="${a.x + a.w / 2}" y1="${a.y + a.h / 2}" x2="${b.x + b.w / 2}" y2="${b.y + b.h / 2}" stroke="${col.ink5}" stroke-width="3"/>` : ''; }).join('');
    const ordered = [...sh.filter((s) => FL.shapes.isContainer(s)), ...sh.filter((s) => !FL.shapes.isContainer(s))];
    return `<svg viewBox="${x1} ${y1} ${x2 - x1} ${y2 - y1}" preserveAspectRatio="xMidYMid meet">${ordered.filter((s) => FL.shapes.isContainer(s)).map((s) => `<g transform="translate(${s.x} ${s.y})">${FL.shapes.def(s.type).render(s, col, { data })}</g>`).join('')}${lines}${ordered.filter((s) => !FL.shapes.isContainer(s)).map((s) => `<g transform="translate(${s.x} ${s.y})">${FL.shapes.def(s.type).render(s, col, { data })}</g>`).join('')}</svg>`;
  }

  const ROADMAP = {
    D: ['Charter (problem, goal, scope)', 'SIPOC', 'VOC → CTQ', 'Stakeholders & plan'],
    M: ['PMAP with Xs and Ys', 'TMAP', 'MSE / Gage R&R', 'Baseline & capability'],
    A: ['Fishbone', 'Pareto', 'FMEA', 'Hypothesis tests / DOE'],
    I: ['Solution selection', 'Pilot', 'Future-state map', 'Confirm vs. baseline'],
    C: ['Control plan', 'I-MR control chart', 'SOP / OPL', 'Financial validation & handoff'],
  };

  FL.views.toolkit = {
    render(host) {
      const cs = getComputedStyle(document.documentElement); const v = (n) => cs.getPropertyValue(n).trim();
      const col = { ink9: v('--c-ink-900'), ink7: v('--c-ink-700'), ink5: v('--c-ink-500'), line: v('--c-line'), lineStrong: v('--c-line-strong'), surface: v('--c-surface'), surface2: v('--c-surface-2'), surface3: v('--c-surface-3'), action: v('--c-action'), error: v('--c-error'), attention: v('--c-attention'), done: v('--c-done'), delta: v('--c-delta-up'), series2: v('--c-series-2'), board: v('--c-board') };
      host.innerHTML = `<div class="page animate-in">
        <div class="ph"><div><h1>LSS toolkit</h1><p>Templates for every DMAIC phase. Each one opens inside a project, linked to the plan and the tollgates.</p></div></div>
        <div class="card" style="overflow:hidden"><div class="card-h"><h3>DMAIC roadmap</h3><span class="muted" style="font-size:13px">What a Green Belt shows at each tollgate</span></div>
          <div class="journey">${FL.PHASES.map((ph) => `<div class="jcol"><div class="jhead"><span class="jletter" style="background:${ph.color};color:#fff">${ph.k}</span><div><b>${ph.name}</b></div></div><span class="muted" style="font-size:12.5px;line-height:1.45">${ph.q}</span><div class="col" style="gap:4px">${ROADMAP[ph.k].map((x) => `<span style="font-size:13px;color:var(--c-ink-700)">• ${x}</span>`).join('')}</div></div>`).join('')}</div></div>
        <div class="tgrid">${FL.templates.LIST.map((t) => `<button class="card tcard" data-t="${t.k}"><div class="pv">${preview(t.k, col)}</div><div class="tx"><div class="row"><b>${U.esc(t.name)}</b><span class="phase-chip right" style="background:${FL.phase(t.phase).color}">${t.phase}</span></div><p>${U.esc(t.desc)}</p><p style="color:var(--c-ink-700)"><b style="font-weight:600">When:</b> ${U.esc(WHEN[t.k])}</p></div></button>`).join('')}</div>
      </div>`;
      U.$$('[data-t]', host).forEach((b) => (b.onclick = () => {
        const t = FL.templates.LIST.find((x) => x.k === b.dataset.t);
        K.menuAt(b, [{ header: 'Add to project' }, ...S.state.projects.filter((p) => p.health !== 'closed' && S.canEdit(p)).map((p) => ({ label: p.name, swatch: p.color, onClick: () => {
          if (t.maker) return FL.makers.open(t.maker, p);
          const g = FL.newPage(t.type, t.k === 'blank' ? 'Untitled map' : t.name.replace(/ \(.*\)$/, ''), t.phase, t.type === 'canvas' ? { kind: t.k, data: FL.templates.build(t.k) } : {});
          p.pages.push(g); S.log(p, `added page “${g.name}”`); S.touch(p); FL.shell.go(`#/p/${p.id}/maps/${g.id}`);
        } }))]);
      }));
    },
  };
})(window.FL);

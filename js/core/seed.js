/* Flowline · constantes do domínio (DMAIC, tollgates, belts) e dados de exemplo.
   Datas são relativas a hoje para o protótipo sempre parecer "vivo". */
(function (FL) {
  const U = FL.util, D = U.date;
  FL.SCHEMA = 6;

  FL.PHASES = [
    { k: 'D', name: 'Define', color: '#2650E0', q: 'What is the problem and why does it matter?' },
    { k: 'M', name: 'Measure', color: '#0F6E78', q: 'How big is it, and can we trust the data?' },
    { k: 'A', name: 'Analyze', color: '#7A4CC2', q: 'What are the validated root causes?' },
    { k: 'I', name: 'Improve', color: '#B5470B', q: 'Which solutions remove the root causes?' },
    { k: 'C', name: 'Control', color: '#1F7A4D', q: 'How do we sustain the gains?' },
  ];
  FL.phase = (k) => FL.PHASES.find((p) => p.k === k) || FL.PHASES[0];
  FL.STATUSES = [
    { k: 'Not started', cls: 'st-draft', color: '#6B7385' },
    { k: 'In progress', cls: 'st-act', color: '#2650E0' },
    { k: 'At risk', cls: 'st-att', color: '#B07A00' },
    { k: 'Blocked', cls: 'st-err', color: '#C0362C' },
    { k: 'Done', cls: 'st-done', color: '#1F7A4D' },
  ];
  FL.status = (k) => FL.STATUSES.find((s) => s.k === k) || FL.STATUSES[0];
  FL.HEALTH = { 'on-track': { label: 'On track', cls: 'st-done' }, 'at-risk': { label: 'At risk', cls: 'st-att' }, 'off-track': { label: 'Off track', cls: 'st-err' }, closed: { label: 'Closed', cls: 'st-plain' } };
  FL.BELTS = {
    YB: { name: 'Yellow Belt', short: 'YB', color: '#E3B505' },
    GB: { name: 'Green Belt', short: 'GB', color: '#2E9A63' },
    BB: { name: 'Black Belt', short: 'BB', color: '#0E1726' },
    KZ: { name: 'Kaizen', short: 'Kaizen', color: '#B5470B' },
  };
  FL.beltPill = (b, short) => { const x = FL.BELTS[b] || FL.BELTS.GB; return `<span class="belt"><i style="background:${x.color};${b === 'BB' ? 'box-shadow:0 0 0 1px #8E9AB0' : ''}"></i>${short ? x.short : x.name}</span>`; };

  /* Entregáveis por tollgate. auto: regra que marca sozinho quando a evidência existe no projeto. */
  FL.TOLLGATES = {
    D: [
      { k: 'charter', t: 'Project charter complete (problem, goal, scope)', auto: 'charter' },
      { k: 'sipoc', t: 'SIPOC — high-level process', auto: 'page:sipoc' },
      { k: 'voc', t: 'VOC translated into CTQs' },
      { k: 'team', t: 'Team, sponsor and plan agreed', auto: 'plan' },
    ],
    M: [
      { k: 'pmap', t: 'Detailed process map (PMAP) with Xs and Ys', auto: 'shape:pstep' },
      { k: 'tmap', t: 'Thought process map (TMAP) started', auto: 'kind:tmap' },
      { k: 'msa', t: 'Measurement system (MSE / Gage R&R) accepted' },
      { k: 'base', t: 'Baseline capability (Cp/Cpk)', auto: 'chart:cap' },
    ],
    A: [
      { k: 'fish', t: 'Cause & effect — fishbone', auto: 'page:fishbone' },
      { k: 'pareto', t: 'Pareto of defect modes', auto: 'chart:pareto' },
      { k: 'fmea', t: 'FMEA with RPN ranking', auto: 'page:fmea' },
      { k: 'root', t: 'Root causes validated with data', auto: 'rootcause' },
    ],
    I: [
      { k: 'sol', t: 'Solutions selected (impact × effort)' },
      { k: 'pilot', t: 'Pilot run with confirmed results' },
      { k: 'tobe', t: 'Future-state process map' },
      { k: 'acts', t: 'All improvement actions closed', auto: 'actions' },
    ],
    C: [
      { k: 'cp', t: 'Control plan approved' },
      { k: 'spc', t: 'Control chart (I-MR) in place', auto: 'cchart:imr' },
      { k: 'sop', t: 'SOP / one-point lesson updated' },
      { k: 'fin', t: 'Financial benefit validated by Finance' },
      { k: 'hand', t: 'Handoff to process owner' },
    ],
  };

  /* Plano padrão DMAIC (nome, dias úteis, guia — a coluna "Comments" do IDP vira dica da tarefa). */
  FL.PLAN_TEMPLATE = {
    D: [['Draft project charter', 4, 'Problem statement with no cause or solution inside it. Goal must be SMART.'], ['Build SIPOC', 2, 'Keep the P column between 4 and 7 steps.'], ['Collect VOC and define CTQs', 3, ''], ['Define tollgate review', 0, 'Sponsor + MBB sign the charter.']],
    M: [['Detailed process map (PMAP)', 3, 'List outputs (Y) above and inputs (X) below each step. Classify X as C / N / SOP.'], ['Measurement system evaluation (MSE)', 4, 'Gage R&R < 10% accepted, 10–30% conditional.'], ['Collect baseline data', 5, ''], ['Baseline capability study', 2, ''], ['Measure tollgate review', 0, '']],
    A: [['Fishbone with the team', 1, 'Use 6M. Mark suspects, then validate with data.'], ['Pareto of defect modes', 1, ''], ['FMEA — rank by RPN', 3, ''], ['Hypothesis tests / DOE on suspect Xs', 6, ''], ['Analyze tollgate review', 0, '']],
    I: [['Generate and select solutions', 3, 'Impact × effort matrix.'], ['Pilot the solution', 8, ''], ['Confirm results vs. baseline', 2, ''], ['Improve tollgate review', 0, '']],
    C: [['Write control plan', 3, ''], ['Implement control chart', 2, ''], ['Update SOP and train operators', 3, ''], ['Financial validation', 2, ''], ['Close-out and handoff', 0, '']],
  };

  /* ---------- Fábricas ---------- */
  const T = (o) => ({ id: U.uid('t'), level: 1, phase: 'D', owner: '', status: 'Not started', start: null, end: null, dur: 1, pct: 0, preds: [], notes: '', link: null, collapsed: false, ...o });
  FL.makePlan = (start, owner, people = []) => {
    const tasks = []; let prev = null; let cur = D.nextWork(start);
    FL.PHASES.forEach((ph) => {
      tasks.push(T({ name: ph.name, level: 0, phase: ph.k }));
      FL.PLAN_TEMPLATE[ph.k].forEach(([name, dur, notes], i) => {
        const t = T({ name, dur, phase: ph.k, notes, owner: i % 3 === 2 && people[1] ? people[1] : owner, start: cur });
        if (prev) t.preds = [{ id: prev.id, type: 'FS', lag: 0 }];
        tasks.push(t); prev = t; cur = FL.schedule.endFrom(cur, dur);
      });
    });
    FL.schedule.compute(tasks);
    return tasks;
  };
  FL.emptyTollgates = () => Object.fromEntries(FL.PHASES.map((p) => [p.k, { checks: {}, approved: false, date: null, by: '' }]));
  FL.newProject = (o) => {
    const start = o.startDate || D.today();
    const p = {
      id: U.uid('p'), code: o.code || 'OPX-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900) + 100),
      name: o.name, belt: o.belt || 'GB', phase: 'D', health: 'on-track', color: o.color || '#2650E0',
      owner: o.owner, sponsor: o.sponsor || '', mbb: o.mbb || '', site: o.site || '', area: o.area || '',
      startDate: start, targetDate: o.targetDate || D.addWork(start, 120),
      savings: { target: +o.savings || 0, realized: 0, type: 'Hard' },
      charter: { problem: '', goal: '', business: '', inScope: '', outScope: '', constraints: '' },
      metrics: [{ id: U.uid('m'), name: o.metric || 'Primary metric (Y)', unit: '', baseline: null, target: null, current: null, dir: 'down' }],
      team: [{ name: o.owner, role: FL.BELTS[o.belt || 'GB'].name + ' (lead)' }].concat(o.sponsor ? [{ name: o.sponsor, role: 'Sponsor' }] : []),
      tollgates: FL.emptyTollgates(), pages: [], activePage: null, tasks: [], baseline: null, tags: [], activity: [],
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    if (o.withPlan !== false) p.tasks = FL.makePlan(start, o.owner, [o.owner]);
    return p;
  };
  FL.newPage = (type, name, phase, extra = {}) => {
    const base = { id: U.uid('pg'), name, type, phase: phase || 'D', kind: extra.kind || type, createdAt: Date.now() };
    if (type === 'canvas') base.data = { shapes: [], edges: [], view: { x: 60, y: 40, z: 1 }, rules: [], ...(extra.data || {}) };
    if (type === 'sipoc') base.data = extra.data || { S: [], I: [], P: [], O: [], C: [] };
    if (type === 'fishbone') base.data = extra.data || { effect: 'Effect (Y)', cats: ['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Mother nature'].map((n) => ({ id: U.uid('c'), name: n, causes: [] })) };
    if (type === 'fmea') base.data = extra.data || { rows: [] };
    return base;
  };

  /* ---------- Gerador determinístico (dados de gráfico reproduzíveis) ---------- */
  const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const normal = (r) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const series = (n, mean, sd, seed, shiftAt, shift) => { const r = rng(seed); return Array.from({ length: n }, (_, i) => +(mean + (shiftAt && i >= shiftAt ? shift : 0) + normal(r) * sd).toFixed(3)); };

  /* ---------- Helpers de canvas para o seed ---------- */
  const sh = (type, x, y, w, h, o = {}) => ({ id: U.uid('s'), type, x, y, w, h, text: '', ...o });
  const ed = (a, b, o = {}) => ({ id: U.uid('e'), a: a.id, b: b.id, as: null, bs: null, text: '', arrow: 'end', dash: false, ...o });

  function tmapPage() {
    const S = [], E = [];
    const add = (s) => (S.push(s), s);
    const mD = add(sh('phase', 20, 40, 48, 48, { text: 'D' }));
    const q1 = add(sh('tmap-q', 100, 30, 280, 84, { text: 'Why do screws on the Pro attachment lose clamp load after thermal cycling?' }));
    const f1 = add(sh('frame', 470, 0, 560, 360, { text: 'Field & line data' }));
    const c1 = add(sh('chart', 490, 44, 520, 296, { chart: 'pareto', title: 'Returns by failure mode (last 6 months)', labels: ['Screw loose', 'Rattle noise', 'Coating scratch', 'Latch broken', 'Cord damage', 'Other'], values: [184, 52, 31, 18, 11, 6] }));
    const d1 = add(sh('tmap-d', 100, 160, 280, 96, { text: 'Screw loose = 61% of returns → focus on the screw / boss joint.' }));
    const mM = add(sh('phase', 20, 330, 48, 48, { text: 'M' }));
    const q2 = add(sh('tmap-q', 100, 320, 280, 76, { text: 'Can we trust our residual-torque measurement?' }));
    const f2 = add(sh('frame', 470, 410, 560, 250, { text: 'MSE · Crossed Gage R&R' }));
    add(sh('text', 494, 456, 330, 150, { text: '3 operators × 10 parts × 3 trials\n%Study variation = 8.4%\n%Tolerance = 11.2%\nNumber of distinct categories = 16', align: 'left', fs: 14 }));
    add(sh('sticky', 850, 470, 150, 120, { text: 'Accepted\n(< 10% study var.)', fill: '#E1F2E8' }));
    const d2 = add(sh('tmap-d', 100, 440, 280, 76, { text: 'MSE accepted → proceed to DOE.' }));
    const mA = add(sh('phase', 20, 580, 48, 48, { text: 'A' }));
    const q3 = add(sh('tmap-q', 100, 570, 280, 84, { text: 'Which factors drive the loss of clamp load?' }));
    const a3 = add(sh('tmap-a', 100, 700, 280, 84, { text: 'Run DOE 1 — 2³ full factorial: torque, boss ID, screw coating (2 reps)' }));
    const f3 = add(sh('frame', 470, 700, 560, 320, { text: 'DOE 1 · Residual torque after 200 cycles' }));
    add(sh('chart', 490, 744, 520, 256, { chart: 'run', title: 'Residual torque by run (N·m)', values: [1.42, 1.88, 1.35, 1.91, 0.96, 1.52, 0.91, 1.49, 1.44, 1.86, 1.31, 1.95, 1.02, 1.55, 0.88, 1.47], lsl: 1.2 }));
    const l1 = add(sh('tmap-l', 100, 830, 280, 120, { text: 'Key learning: boss ID at upper spec + low torque → clamp loss. Coating alone is not significant (p = 0.41).' }));
    const q4 = add(sh('tmap-q', 100, 1000, 280, 76, { text: 'Does tightening boss ID tolerance remove the failure?' }));
    E.push(ed(mD, q1, { arrow: 'none', dash: true }), ed(q1, f1), ed(q1, d1), ed(d1, q2), ed(q2, f2), ed(q2, d2), ed(d2, q3), ed(q3, a3), ed(a3, f3), ed(a3, l1), ed(l1, q4), ed(mM, q2, { arrow: 'none', dash: true }), ed(mA, q3, { arrow: 'none', dash: true }));
    return { shapes: S, edges: E, view: { x: 80, y: 40, z: 0.82 }, rules: [] };
  }

  function pmapPage() {
    const S = [], E = [];
    const steps = [
      ['Pick screw from feeder', ['Feeder vibration (C)', 'Screw lot (N)', 'Feeder setup (SOP)'], ['Screw oriented']],
      ['Position bracket on boss', ['Fixture pin wear (C)', 'Boss ID (C)', 'Operator (N)'], ['Bracket seated', 'Holes aligned']],
      ['Drive screw', ['Target torque (C)', 'Driver speed (C)', 'Boss temperature (N)', 'Torque check (SOP)'], ['Installed torque', 'Clamp load']],
      ['Inspect & pack', ['Visual standard (SOP)', 'Lighting (N)'], ['Assembly OK / NOK']],
    ];
    let prev = null;
    steps.forEach(([t, ins, outs], i) => {
      const s = sh('pstep', 40 + i * 300, 120, 220, 72, { text: t, inputs: ins.map((x) => { const m = x.match(/^(.*) \((C|N|SOP)\)$/); return { t: m[1], c: m[2] === 'SOP' ? 'S' : m[2] }; }), outputs: outs });
      S.push(s); if (prev) E.push(ed(prev, s)); prev = s;
    });
    S.push(sh('text', 40, 30, 600, 40, { text: 'Process map · Pro attachment screw joint (Line 4, station 12)', align: 'left', fs: 18, bold: true }));
    S.push(sh('sticky', 1240, 120, 170, 130, { text: 'C = controllable\nN = noise\nS = SOP', fill: '#FBF1D9' }));
    return { shapes: S, edges: E, view: { x: 40, y: 20, z: 0.9 }, rules: [] };
  }

  function productMapPage() {
    const S = [], E = [];
    S.push(sh('frame', 0, 0, 1240, 720, { text: 'PRODUCT MAP — V2 (after changes)', fill: '#E1F2E8' }));
    const core = sh('card', 470, 250, 300, 200, { text: 'Pro attachment assembly', items: [{ t: 'Residual torque ≥ 1.2 N·m', tag: 'CTQ' }, { t: 'No rattle at 2 m drop', tag: 'CTQ' }] });
    const cards = [
      sh('card', 40, 60, 280, 190, { text: 'Screw M4×10 (Torx)', items: [{ t: 'Thread pitch 0.7', tag: 'X' }, { t: 'Head height 2.8 ±0.1', tag: '' }, { t: 'Zinc-flake coating', tag: 'X' }] }),
      sh('card', 480, 50, 280, 160, { text: 'Bracket (steel)', items: [{ t: 'Hole Ø 4.3 ±0.05', tag: '' }, { t: 'Flatness 0.1', tag: 'X' }] }),
      sh('card', 920, 60, 280, 190, { text: 'Plastic boss (PA66-GF30)', items: [{ t: 'Boss ID 3.55 ±0.05', tag: 'X' }, { t: 'Wall thickness 1.6', tag: '' }, { t: 'Moisture at assembly', tag: 'X' }] }),
      sh('card', 40, 470, 280, 160, { text: 'Heating plate', items: [{ t: 'Max temp 230 °C', tag: '' }, { t: 'Thermal cycles', tag: 'X' }] }),
      sh('card', 920, 470, 280, 160, { text: 'Housing', items: [{ t: 'Boss position', tag: '' }, { t: 'Rib stiffness', tag: '' }] }),
    ];
    S.push(core, ...cards);
    cards.forEach((c) => E.push(ed(c, core, { arrow: 'none' })));
    return { shapes: S, edges: E, view: { x: 40, y: 30, z: 0.8 }, rules: [] };
  }

  function spcPage() {
    const S = [];
    const torque = series(40, 1.62, 0.11, 7, 26, -0.18);
    S.push(sh('chart', 0, 0, 760, 420, { chart: 'imr', title: 'Residual torque · I-MR (N·m) — station 12', values: torque }));
    S.push(sh('chart', 800, 0, 520, 420, { chart: 'cap', title: 'Capability · residual torque', values: torque, lsl: 1.2, usl: 2.2 }));
    S.push(sh('tmap-d', 0, 450, 360, 90, { text: 'Shift after point 26 → matches boss lot change (lot 2291). Check with supplier.' }));
    return { shapes: S, edges: [{ id: U.uid('e'), a: S[2].id, b: S[0].id, as: null, bs: null, text: '', arrow: 'end', dash: true }], view: { x: 40, y: 30, z: 0.85 }, rules: [] };
  }

  function vsmPage() {
    const S = [], E = [];
    const sup = sh('vsm-ext', 20, 60, 150, 100, { text: 'Foam supplier' });
    const cust = sh('vsm-ext', 1500, 60, 150, 100, { text: 'Assembly line' });
    S.push(sup, cust);
    const procs = [['Cabinet prep', 42, 8, 96, 2], ['Door preheat', 55, 15, 92, 1], ['Foam injection', 68, 25, 88, 2], ['Cure & demold', 240, 5, 97, 1], ['Door inspection', 38, 0, 99, 1]];
    let x = 120, prev = sup; const inv = [1.5, 0.8, 0.5, 2.2, 0.6];
    procs.forEach(([n, ct, co, up, ops], i) => {
      const tri = sh('vsm-inv', x, 300, 70, 62, { text: '', data: { Days: inv[i] } });
      const p = sh('vsm-proc', x + 110, 260, 170, 200, { text: n, data: { 'C/T (s)': ct, 'C/O (min)': co, 'Uptime %': up, Operators: ops } });
      S.push(tri, p); E.push(ed(prev, tri, { dash: true }), ed(tri, p, { dash: true })); prev = p; x += 290;
    });
    E.push(ed(prev, cust, { dash: true }));
    S.push(sh('kaizen', 760, 470, 150, 90, { text: 'Preheat oven balance' }));
    S.push(sh('vsm-time', 120, 520, 1440, 90, {}));
    S.push(sh('text', 20, 0, 700, 40, { text: 'Current-state VSM · refrigerator door foaming', align: 'left', fs: 18, bold: true }));
    return { shapes: S, edges: E, view: { x: 20, y: 30, z: 0.62 }, rules: [{ id: U.uid('r'), field: 'C/T (s)', op: '>', value: '60', fill: '#FBE4E2' }] };
  }

  function swimPage() {
    const S = [], E = [];
    const lanes = ['Operator', 'Setter', 'Quality', 'Warehouse'];
    lanes.forEach((l, i) => S.push(sh('lane', 0, i * 150, 1500, 150, { text: l })));
    const n = (lane, x, t, type = 'process') => { const s = sh(type, 90 + x, lane * 150 + 40, 170, 70, { text: t }); S.push(s); return s; };
    const a = n(0, 40, 'Stop line, last good part', 'terminator');
    const b = n(3, 260, 'Bring next die & tools');
    const c = n(1, 480, 'Remove old die');
    const d = n(1, 700, 'Mount & align new die');
    const e = n(2, 920, 'First-part check', 'decision');
    const f = n(1, 1140, 'Adjust');
    const g = n(0, 1140, 'Restart line', 'terminator');
    E.push(ed(a, b), ed(b, c), ed(c, d), ed(d, e), ed(e, f, { text: 'NOK' }), ed(f, e), ed(e, g, { text: 'OK' }));
    S.push(sh('kaizen', 300, 470, 140, 80, { text: 'Pre-stage die (external)' }));
    return { shapes: S, edges: E, view: { x: 30, y: 30, z: 0.75 }, rules: [] };
  }

  FL.seedServer = () => {
    const today = D.today();
    const me = 'Wesley Iomes';
    const people = [me, 'Thaina Friedrich', 'Elisa Silva', 'Marcos Lima', 'Ana Becker', 'Rafael Costa', 'Juliana Prado', 'Diego Martins', 'Paula Henrique'];

    // Projeto 1 — o mais completo (espelha o TMAP/PMAP de um GB real)
    const p1 = FL.newProject({ name: 'Air fryer Pro attachment — screw loosening', belt: 'GB', owner: me, sponsor: 'Marcos Lima', mbb: 'Juliana Prado', site: 'Joinville', area: 'Small appliances · Line 4', startDate: D.addWork(today, -28), savings: 186000, code: 'OPX-2026-014', withPlan: true });
    p1.color = '#2650E0'; p1.phase = 'A'; p1.health = 'on-track';
    p1.savings.realized = 0;
    p1.charter = {
      problem: 'Since Q1, 1.9% of Pro attachments are returned within 90 days for loose screws on the heating-plate bracket, against a 0.3% target. This costs ~$15.5k per month in returns and replacement parts.',
      goal: 'Reduce field returns for loose screws from 1.9% to 0.4% by Mar 31 without increasing assembly cycle time.',
      business: 'Loose-screw returns are the #1 detractor in the attachment NPS. Fixing the joint protects the $4.1M attachment business and avoids a running change on the heating plate.',
      inScope: 'Screw joint (screw, boss, bracket), station 12 assembly process, incoming boss inspection.',
      outScope: 'Heating element design, packaging, cord set.',
      constraints: 'No tooling change on the housing before the model-year freeze.',
    };
    p1.metrics = [
      { id: U.uid('m'), name: 'Field returns — loose screw', unit: '%', baseline: 1.9, target: 0.4, current: 1.6, dir: 'down' },
      { id: U.uid('m'), name: 'Residual torque Cpk', unit: '', baseline: 0.62, target: 1.33, current: 0.91, dir: 'up' },
      { id: U.uid('m'), name: 'Station 12 cycle time', unit: 's', baseline: 21, target: 21, current: 21, dir: 'down' },
    ];
    p1.team = [{ name: me, role: 'Green Belt (lead)' }, { name: 'Marcos Lima', role: 'Sponsor' }, { name: 'Juliana Prado', role: 'Master Black Belt' }, { name: 'Thaina Friedrich', role: 'Quality engineer' }, { name: 'Rafael Costa', role: 'Process engineer' }, { name: 'Elisa Silva', role: 'Supplier quality' }];
    // progresso do plano até a fase A
    const ownersCycle = [me, 'Thaina Friedrich', 'Rafael Costa', 'Elisa Silva'];
    p1.tasks.forEach((t, i) => {
      t.owner = t.level ? ownersCycle[i % ownersCycle.length] : '';
      if (t.phase === 'D' || t.phase === 'M') { t.pct = 100; t.status = 'Done'; }
      if (t.phase === 'A') {
        if (/Fishbone|Pareto/.test(t.name)) { t.pct = 100; t.status = 'Done'; }
        if (/FMEA/.test(t.name)) { t.pct = 60; t.status = 'In progress'; }
        if (/DOE/.test(t.name)) { t.pct = 35; t.status = 'At risk'; t.notes = 'DOE 2 waiting for boss samples at upper/lower spec from supplier.'; }
      }
    });
    p1.tollgates.D = { checks: { voc: true }, approved: true, date: D.addWork(today, -19), by: 'Marcos Lima' };
    p1.tollgates.M = { checks: { msa: true }, approved: true, date: D.addWork(today, -5), by: 'Juliana Prado' };
    const tm = FL.newPage('canvas', 'Screw TMAP', 'A', { kind: 'tmap', data: tmapPage() });
    const pm = FL.newPage('canvas', 'Screw PMAP', 'M', { kind: 'pmap', data: pmapPage() });
    const prm = FL.newPage('canvas', 'Product map', 'M', { kind: 'product', data: productMapPage() });
    const spc = FL.newPage('canvas', 'Torque I-MR', 'M', { kind: 'spc', data: spcPage() });
    const si = FL.newPage('sipoc', 'SIPOC', 'D', { data: {
      S: ['Screw supplier (Fastco)', 'Boss molder (in-house)', 'Bracket stamping'],
      I: ['M4×10 screws', 'Molded housing with boss', 'Steel bracket', 'Work instruction WI-412'],
      P: ['Receive & inspect parts', 'Pick screw', 'Position bracket', 'Drive screw to torque', 'Inspect & pack'],
      O: ['Assembled attachment', 'Torque record', 'Packed unit'],
      C: ['Final assembly line', 'Retail customer', 'End consumer'],
    } });
    const fb = FL.newPage('fishbone', 'Fishbone — loosening', 'A', { data: { effect: 'Screw loses clamp load after thermal cycling', cats: [
      { id: U.uid('c'), name: 'Man', causes: [{ id: U.uid('k'), text: 'Torque check skipped on night shift', flag: '' }, { id: U.uid('k'), text: 'New operators not trained on WI-412', flag: '' }] },
      { id: U.uid('c'), name: 'Machine', causes: [{ id: U.uid('k'), text: 'Driver clutch wear', flag: 'suspect' }, { id: U.uid('k'), text: 'Driver speed too high', flag: '' }] },
      { id: U.uid('c'), name: 'Method', causes: [{ id: U.uid('k'), text: 'Target torque at low end of window', flag: 'root' }, { id: U.uid('k'), text: 'No re-torque after cooling', flag: '' }] },
      { id: U.uid('c'), name: 'Material', causes: [{ id: U.uid('k'), text: 'Boss ID at upper spec', flag: 'root' }, { id: U.uid('k'), text: 'Coating friction variation', flag: 'suspect' }, { id: U.uid('k'), text: 'Boss moisture content', flag: '' }] },
      { id: U.uid('c'), name: 'Measurement', causes: [{ id: U.uid('k'), text: 'Residual torque method not standard', flag: '' }] },
      { id: U.uid('c'), name: 'Mother nature', causes: [{ id: U.uid('k'), text: 'Thermal cycling 25↔230 °C relaxes PA66', flag: 'suspect' }] },
    ] } });
    const fm = FL.newPage('fmea', 'FMEA — screw joint', 'A', { data: { rows: [
      { id: U.uid('f'), step: 'Drive screw', mode: 'Clamp load below spec', effect: 'Screw loosens in field, rattle', sev: 8, cause: 'Target torque at low end of window', occ: 6, controls: 'Torque check 1/hour', det: 5, action: 'Raise target torque to 2.0 N·m, add 100% torque monitoring', owner: 'Rafael Costa' },
      { id: U.uid('f'), step: 'Position bracket', mode: 'Boss ID oversize', effect: 'Thread engagement reduced', sev: 8, cause: 'Mold cavity 3 wear', occ: 5, controls: 'Incoming inspection 5 pcs/lot', det: 6, action: 'Tighten boss ID to 3.55 ±0.03, cavity 3 repair', owner: 'Elisa Silva' },
      { id: U.uid('f'), step: 'Pick screw', mode: 'Wrong screw (M4×8)', effect: 'Low engagement', sev: 7, cause: 'Mixed lots in feeder', occ: 2, controls: 'Poka-yoke length gauge', det: 2, action: '', owner: '' },
      { id: U.uid('f'), step: 'Inspect & pack', mode: 'Loose screw not detected', effect: 'Defect escapes to customer', sev: 8, cause: 'Visual check cannot see torque', occ: 4, controls: 'Visual inspection', det: 8, action: 'Add audible rattle test', owner: 'Thaina Friedrich' },
    ] } });
    p1.pages = [tm, si, pm, prm, spc, fb, fm]; p1.activePage = tm.id;
    // tarefa ligada a uma forma do TMAP (ação criada a partir do mapa)
    const q4 = tm.data.shapes.find((s) => s.type === 'tmap-q' && /boss ID tolerance/.test(s.text));
    const aIdx = p1.tasks.findIndex((t) => /Analyze tollgate/.test(t.name));
    const linked = T({ name: 'DOE 2 — boss ID tolerance confirmation', phase: 'A', owner: 'Elisa Silva', dur: 5, status: 'In progress', pct: 20, start: today, preds: [{ id: p1.tasks[aIdx - 1].id, type: 'SS', lag: 2 }], link: { pageId: tm.id, shapeId: q4.id } });
    p1.tasks.splice(aIdx, 0, linked); q4.taskId = linked.id;
    p1.baseline = Object.fromEntries(p1.tasks.map((t) => [t.id, { start: t.start, end: t.end }]));
    // atrasa o DOE para o baseline mostrar desvio
    const doe = p1.tasks.find((t) => /Hypothesis tests/.test(t.name)); doe.dur += 4;
    FL.schedule.compute(p1.tasks);

    // Projeto 2 — BB em Measure, VSM
    const p2 = FL.newProject({ name: 'Refrigerator door foam voids', belt: 'BB', owner: 'Thaina Friedrich', sponsor: 'Diego Martins', mbb: 'Juliana Prado', site: 'Joinville', area: 'Refrigeration · Foaming', startDate: D.addWork(today, -12), savings: 420000, code: 'OPX-2026-009' });
    p2.color = '#0F6E78'; p2.phase = 'M'; p2.health = 'at-risk';
    p2.charter.problem = 'Door foam voids are found in 3.2% of doors at final inspection, causing rework and scrap of ~1,100 doors per month.';
    p2.charter.goal = 'Reduce door foam voids from 3.2% to 0.8% by June 30.';
    p2.metrics = [{ id: U.uid('m'), name: 'Door voids at inspection', unit: '%', baseline: 3.2, target: 0.8, current: 3.1, dir: 'down' }, { id: U.uid('m'), name: 'Foam lead time', unit: 'days', baseline: 5.6, target: 3, current: 5.6, dir: 'down' }];
    p2.team.push({ name: 'Ana Becker', role: 'Process engineer' }, { name: 'Paula Henrique', role: 'Maintenance' });
    p2.tasks.forEach((t, i) => { if (t.phase === 'D') { t.pct = 100; t.status = 'Done'; } if (t.phase === 'M' && i < 9) { t.pct = 50; t.status = i === 8 ? 'Blocked' : 'In progress'; } if (t.level) t.owner = ['Thaina Friedrich', 'Ana Becker', 'Paula Henrique'][i % 3]; });
    p2.tollgates.D = { checks: { voc: true, sipoc: true }, approved: true, date: D.addWork(today, -3), by: 'Diego Martins' };
    p2.pages = [FL.newPage('canvas', 'Current-state VSM', 'M', { kind: 'vsm', data: vsmPage() }), FL.newPage('sipoc', 'SIPOC', 'D', { data: { S: ['Polyol supplier', 'Isocyanate supplier', 'Door liner thermoforming'], I: ['Polyol blend', 'MDI', 'Door liner', 'Outer door panel'], P: ['Preheat liner', 'Assemble door shell', 'Inject foam', 'Cure', 'Demold & inspect'], O: ['Foamed door', 'Shot weight record'], C: ['Door assembly', 'Final line'] } })];
    p2.activePage = p2.pages[0].id;
    FL.schedule.compute(p2.tasks);

    // Projeto 3 — GB em Improve, SMED
    const p3 = FL.newProject({ name: 'Washer line 2 — die changeover (SMED)', belt: 'GB', owner: 'Rafael Costa', sponsor: 'Marcos Lima', mbb: 'Juliana Prado', site: 'Rio Claro', area: 'Laundry · Press shop', startDate: D.addWork(today, -40), savings: 95000, code: 'OPX-2026-006' });
    p3.color = '#B5470B'; p3.phase = 'I'; p3.health = 'on-track'; p3.savings.realized = 22000;
    p3.charter.problem = 'Die changeover on press line 2 takes 74 minutes on average, limiting batch sizes and causing 6 hours/week of lost capacity.';
    p3.charter.goal = 'Reduce changeover from 74 to 25 minutes by May 15.';
    p3.metrics = [{ id: U.uid('m'), name: 'Changeover time', unit: 'min', baseline: 74, target: 25, current: 38, dir: 'down' }];
    p3.tasks.forEach((t, i) => { if ('DMA'.includes(t.phase)) { t.pct = 100; t.status = 'Done'; } if (t.phase === 'I' && t.level && i < 21) { t.pct = 70; t.status = 'In progress'; } if (t.level) t.owner = ['Rafael Costa', 'Diego Martins'][i % 2]; });
    ['D', 'M', 'A'].forEach((k, i) => (p3.tollgates[k] = { checks: {}, approved: true, date: D.addWork(today, [-31, -17, -5][i]), by: 'Marcos Lima' }));
    p3.pages = [FL.newPage('canvas', 'Changeover swimlane', 'M', { kind: 'swimlane', data: swimPage() }), FL.newPage('fishbone', 'Fishbone — long changeover', 'A')];
    p3.pages[1].data.effect = 'Changeover takes 74 min';
    p3.activePage = p3.pages[0].id;
    FL.schedule.compute(p3.tasks);

    // Projeto 4 — Kaizen em Control
    const p4 = FL.newProject({ name: 'Paint line scrap — color change purge', belt: 'KZ', owner: 'Ana Becker', sponsor: 'Diego Martins', site: 'Joinville', area: 'Cooking · Paint shop', startDate: D.addWork(today, -52), savings: 64000, code: 'OPX-2026-002' });
    p4.color = '#1F7A4D'; p4.phase = 'C'; p4.health = 'on-track'; p4.savings.realized = 51000;
    p4.metrics = [{ id: U.uid('m'), name: 'Paint scrap per color change', unit: 'L', baseline: 9.5, target: 4, current: 3.8, dir: 'down' }];
    p4.tasks.forEach((t) => { if (t.phase !== 'C') { t.pct = 100; t.status = 'Done'; } else if (t.level) { t.pct = 40; t.status = 'In progress'; } if (t.level) t.owner = 'Ana Becker'; });
    ['D', 'M', 'A', 'I'].forEach((k, i) => (p4.tollgates[k] = { checks: {}, approved: true, date: D.addWork(today, [-43, -29, -17, -4][i]), by: 'Diego Martins' }));
    FL.schedule.compute(p4.tasks);

    // Projeto 5 — BB em Define
    const p5 = FL.newProject({ name: 'Cooktop glass breakage in transit', belt: 'BB', owner: me, sponsor: 'Diego Martins', mbb: 'Juliana Prado', site: 'Joinville', area: 'Cooking · Logistics', startDate: D.addWork(today, -3), savings: 310000, code: 'OPX-2026-021' });
    p5.color = '#7A4CC2'; p5.phase = 'D';
    p5.charter.problem = 'Glass-top cooktops arrive broken at 0.9% of deliveries to retailers in the North region.';
    p5.metrics = [{ id: U.uid('m'), name: 'Transit breakage', unit: '%', baseline: 0.9, target: 0.2, current: 0.9, dir: 'down' }];
    p5.tasks.forEach((t, i) => { if (t.phase === 'D' && t.level && i < 3) { t.pct = 50; t.status = 'In progress'; } if (t.level) t.owner = [me, 'Paula Henrique'][i % 2]; });
    p5.pages = [FL.newPage('sipoc', 'SIPOC', 'D')];
    p5.activePage = p5.pages[0].id;
    FL.schedule.compute(p5.tasks);

    const projects = [p1, p2, p3, p4, p5];
    const log = (p, text, who, minAgo) => { p.activity = p.activity || []; p.activity.push({ ts: Date.now() - minAgo * 60000, who, text }); };
    log(p1, 'linked “DOE 2 — boss ID tolerance confirmation” to the Screw TMAP', me, 12);
    log(p1, 'marked “Boss ID at upper spec” as a validated root cause', 'Thaina Friedrich', 95);
    log(p2, 'set “Collect baseline data” to Blocked — waiting for shot-weight logger', 'Ana Becker', 180);
    log(p3, 'updated Changeover time: 38 min (target 25)', 'Rafael Costa', 320);
    log(p1, 'added Pareto “Returns by failure mode”', me, 1440);
    log(p4, 'Improve tollgate approved by Diego Martins', 'Diego Martins', 2900);
    log(p5, 'created the project from the Black Belt template', me, 4300);
    projects.forEach((p) => p.activity && p.activity.sort((a, b) => b.ts - a.ts));

    /* Tags personalizadas (clusters do Kanban) */
    const tag = (p, name, color) => { const t = { id: U.uid('tg'), name, color }; p.tags.push(t); return t; };
    const tagTasks = (p, t, re) => p.tasks.forEach((x) => { if (re.test(x.name)) x.tags = [...(x.tags || []), t.id]; });
    const sup = tag(p1, 'Supplier', '#B5470B'), lab = tag(p1, 'Lab test', '#7A4CC2'), qw = tag(p1, 'Quick win', '#1F7A4D'), dat = tag(p1, 'Data collection', '#0F6E78');
    tagTasks(p1, sup, /DOE 2|boss|Supplier/i); tagTasks(p1, lab, /DOE|MSE|Measurement system/i); tagTasks(p1, qw, /SIPOC|Pareto|Fishbone/i); tagTasks(p1, dat, /baseline|VOC|Collect/i);
    const mnt = tag(p2, 'Maintenance', '#B07A00'), sh = tag(p2, 'Shot weight', '#2650E0'); tagTasks(p2, mnt, /Collect|baseline/i); tagTasks(p2, sh, /MSE|Measurement|capability/i);
    tag(p3, 'Die cart', '#B5470B'); tag(p5, 'Logistics', '#0F6E78');

    /* Usuários (diretório) e controle de acesso por projeto */
    const users = [
      [me, 'Green Belt · OpEx'], ['Thaina Friedrich', 'Black Belt · Quality'], ['Elisa Silva', 'Supplier quality'], ['Marcos Lima', 'Plant manager'], ['Ana Becker', 'Process engineer'],
      ['Rafael Costa', 'Green Belt · Manufacturing'], ['Juliana Prado', 'Master Black Belt'], ['Diego Martins', 'Operations director'], ['Paula Henrique', 'Logistics analyst'],
    ].map(([name, title]) => ({ name, title, email: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_') + '@' + FL.CONFIG.domain }));
    const em = (n) => users.find((u) => u.name === n).email;
    const acl = (p, owner, editors = [], viewers = []) => {
      p.id = FL.api.newId(); p.ownerEmail = em(owner); p.version = 1;
      p.members = [{ email: em(owner), role: 'owner' }, ...editors.map((n) => ({ email: em(n), role: 'editor' })), ...viewers.map((n) => ({ email: em(n), role: 'viewer' }))].map((m) => ({ ...m, addedBy: em(owner), addedAt: p.createdAt }));
    };
    acl(p1, me, ['Thaina Friedrich', 'Rafael Costa', 'Elisa Silva'], ['Marcos Lima', 'Juliana Prado']);
    acl(p2, 'Thaina Friedrich', [me, 'Ana Becker', 'Paula Henrique'], ['Diego Martins', 'Juliana Prado']);
    acl(p3, 'Rafael Costa', ['Diego Martins'], ['Marcos Lima', 'Juliana Prado']);
    acl(p4, 'Ana Becker', [], ['Diego Martins']);
    acl(p5, me, ['Paula Henrique'], ['Diego Martins', 'Juliana Prado']);
    // links internos (task.link / shape.taskId) usam ids de página e tarefa, que não mudam
    const requests = [{ id: FL.api.newId('REQ-'), projectId: p1.id, email: em('Ana Becker'), note: 'I run the paint line next to station 12 — can I follow the DOE?', ts: Date.now() - 3 * 3600e3, status: 'pending' }];
    return { v: FL.SCHEMA, users, projects: Object.fromEntries(projects.map((p) => [p.id, p])), requests, audit: [] };
  };
})(window.FL);

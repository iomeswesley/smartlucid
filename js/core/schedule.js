/* Flowline · schedule — motor do plano (estilo Smartsheet): hierarquia por nível, dias úteis,
   predecessoras FS/SS/FF com lag, roll-up de tarefas-resumo e caminho crítico. */
(function (FL) {
  const D = FL.util.date;
  const SC = (FL.schedule = {});

  /** Estrutura derivada: parent, filhos, se é resumo. */
  SC.tree = (tasks) => {
    const parent = new Array(tasks.length).fill(-1);
    const stack = [];
    tasks.forEach((t, i) => {
      while (stack.length && tasks[stack[stack.length - 1]].level >= t.level) stack.pop();
      parent[i] = stack.length ? stack[stack.length - 1] : -1;
      stack.push(i);
    });
    const isSum = tasks.map((t, i) => i + 1 < tasks.length && tasks[i + 1].level > t.level);
    const idx = new Map(tasks.map((t, i) => [t.id, i]));
    return { parent, isSum, idx };
  };

  /** Fim de descendentes de i (exclusivo). */
  SC.subtreeEnd = (tasks, i) => { let j = i + 1; while (j < tasks.length && tasks[j].level > tasks[i].level) j++; return j; };

  SC.endFrom = (start, dur) => (dur <= 0 ? D.nextWork(start) : D.addWork(start, dur - 1));

  /** Recalcula datas: aplica predecessoras nas folhas e faz roll-up dos resumos. Muta tasks. */
  SC.compute = (tasks) => {
    if (!tasks.length) return;
    let tr = SC.tree(tasks);
    for (let pass = 0; pass < 12; pass++) {
      let changed = false;
      rollup(tasks, tr);
      tasks.forEach((t, i) => {
        if (tr.isSum[i]) return;
        t.dur = Math.max(0, Math.round(+t.dur || 0));
        t.milestone = t.dur === 0;
        let start = t.start ? D.nextWork(t.start) : D.today();
        let minStart = null;
        (t.preds || []).forEach((p) => {
          const j = tr.idx.get(p.id); if (j == null || j === i) return;
          const q = tasks[j]; const lag = +p.lag || 0; let s;
          if (p.type === 'SS') s = D.addWork(q.start, lag);
          else if (p.type === 'FF') s = D.addWork(D.addWork(q.end, lag), -(Math.max(t.dur, 1) - 1));
          else s = D.addWork(q.end, (q.milestone ? 0 : 1) + lag); // FS
          if (!minStart || s > minStart) minStart = s;
        });
        if (minStart && (t.preds || []).length) start = minStart;
        const end = SC.endFrom(start, t.dur);
        if (t.start !== start || t.end !== end) { t.start = start; t.end = end; changed = true; }
      });
      if (!changed) break;
      tr = SC.tree(tasks);
    }
    rollup(tasks, tr);
  };

  function rollup(tasks, tr) {
    for (let i = tasks.length - 1; i >= 0; i--) {
      if (!tr.isSum[i]) continue;
      const t = tasks[i]; const end = SC.subtreeEnd(tasks, i);
      let s = null, e = null, w = 0, done = 0, allDone = true, anyRisk = false, anyProg = false;
      for (let j = i + 1; j < end; j++) {
        if (tr.parent[j] !== i) continue;
        const c = tasks[j];
        if (!s || c.start < s) s = c.start; if (!e || c.end > e) e = c.end;
        const wd = Math.max(1, c.dur || 1); w += wd; done += wd * (c.pct || 0);
        if (c.status !== 'Done') allDone = false;
        if (c.status === 'At risk' || c.status === 'Blocked') anyRisk = true;
        if (c.status === 'In progress' || (c.pct > 0 && c.pct < 100)) anyProg = true;
      }
      if (s) { t.start = s; t.end = e; t.dur = D.workBetween(s, e); }
      t.pct = w ? Math.round(done / w) : 0; t.milestone = false;
      t.status = allDone ? 'Done' : anyRisk ? 'At risk' : anyProg || t.pct > 0 ? 'In progress' : 'Not started';
    }
  }

  /** Caminho crítico nas folhas. Retorna Set de ids críticos e mapa de folga (dias úteis). */
  SC.critical = (tasks) => {
    const tr = SC.tree(tasks);
    const leaves = tasks.map((t, i) => i).filter((i) => !tr.isSum[i] && tasks[i].start);
    if (!leaves.length) return { set: new Set(), slack: {} };
    const origin = leaves.reduce((m, i) => (tasks[i].start < m ? tasks[i].start : m), tasks[leaves[0]].start);
    const wi = (iso) => D.workBetween(origin, iso) - 1;
    const ES = {}, EF = {}, LF = {};
    leaves.forEach((i) => { ES[i] = wi(tasks[i].start); EF[i] = tasks[i].milestone ? ES[i] - 1 : wi(tasks[i].end); });
    const projEnd = Math.max(...leaves.map((i) => EF[i]));
    leaves.forEach((i) => (LF[i] = projEnd));
    // sucessores: deps da folha j apontando para folha i
    const deps = [];
    leaves.forEach((j) => (tasks[j].preds || []).forEach((p) => { const i = tr.idx.get(p.id); if (i != null && !tr.isSum[i]) deps.push({ i, j, type: p.type || 'FS', lag: +p.lag || 0 }); }));
    for (let pass = 0; pass < leaves.length + 2; pass++) {
      let ch = false;
      deps.forEach(({ i, j, type, lag }) => {
        const durJ = EF[j] - ES[j]; const LSj = LF[j] - durJ; const durI = EF[i] - ES[i];
        let lf;
        if (type === 'SS') lf = LSj - lag + durI; else if (type === 'FF') lf = LF[j] - lag; else lf = LSj - 1 - lag;
        if (lf < LF[i]) { LF[i] = lf; ch = true; }
      });
      if (!ch) break;
    }
    const set = new Set(); const slack = {};
    leaves.forEach((i) => { const s = LF[i] - EF[i]; slack[tasks[i].id] = s; if (s <= 0) set.add(tasks[i].id); });
    return { set, slack };
  };

  /** "3, 5SS+2, 7FF-1" -> preds com ids. Retorna {preds, error}. */
  SC.parsePreds = (str, tasks, selfIdx) => {
    const out = []; const parts = String(str || '').split(/[,;\s]+/).filter(Boolean);
    for (const p of parts) {
      const m = p.toUpperCase().match(/^(\d+)(FS|SS|FF)?([+-]\d+)?D?$/);
      if (!m) return { error: `Can't read "${p}". Use row numbers like 3, 5SS or 7FS+2.` };
      const row = +m[1] - 1;
      if (!tasks[row]) return { error: `Row ${m[1]} doesn't exist.` };
      if (row === selfIdx) return { error: 'A task can’t depend on itself.' };
      out.push({ id: tasks[row].id, type: m[2] || 'FS', lag: m[3] ? +m[3] : 0 });
    }
    // ciclo?
    const test = tasks.map((t, i) => (i === selfIdx ? { ...t, preds: out } : t));
    if (SC.hasCycle(test)) return { error: 'That would create a circular dependency.' };
    return { preds: out };
  };
  SC.fmtPreds = (t, tasks, tr) => (t.preds || []).map((p) => {
    const j = tr.idx.get(p.id); if (j == null) return '';
    return `${j + 1}${p.type && p.type !== 'FS' ? p.type : ''}${p.lag ? (p.lag > 0 ? '+' : '') + p.lag : ''}`;
  }).filter(Boolean).join(', ');

  SC.hasCycle = (tasks) => {
    const idx = new Map(tasks.map((t, i) => [t.id, i])); const state = new Array(tasks.length).fill(0);
    const visit = (i) => {
      if (state[i] === 1) return true; if (state[i] === 2) return false; state[i] = 1;
      for (const p of tasks[i].preds || []) { const j = idx.get(p.id); if (j != null && visit(j)) return true; }
      state[i] = 2; return false;
    };
    return tasks.some((_, i) => visit(i));
  };

  /** Fase DMAIC dominante de um projeto a partir do plano (primeira fase não concluída). */
  SC.phaseProgress = (p) => {
    const res = {}; const tr = SC.tree(p.tasks);
    FL.PHASES.forEach((ph) => {
      const ts = p.tasks.filter((t, i) => t.phase === ph.k && !tr.isSum[i]);
      const leaves = ts;
      const w = FL.util.sum(leaves.map((t) => Math.max(1, t.dur || 1)));
      const d = FL.util.sum(leaves.map((t) => Math.max(1, t.dur || 1) * (t.pct || 0)));
      const s = ts.reduce((m, t) => (!m || (t.start && t.start < m) ? t.start : m), null);
      const e = ts.reduce((m, t) => (!m || (t.end && t.end > m) ? t.end : m), null);
      res[ph.k] = { pct: w ? Math.round(d / w) : 0, start: s, end: e, count: ts.length };
    });
    return res;
  };
})(window.FL);

/* Flowline · Fishbone (Ishikawa) estruturado: o diagrama se desenha sozinho a partir da lista.
   Causas podem ser marcadas como suspeitas ou causa raiz validada, e virar ação no plano. */
(function (FL) {
  const U = FL.util, K = FL.kit, S = FL.store, D = U.date;
  FL.tools = FL.tools || {};

  function diagram(d, col) {
    const cats = d.cats; const n = cats.length; const top = Math.ceil(n / 2);
    const maxC = Math.max(2, ...cats.map((c) => c.causes.length));
    const bone = Math.max(150, (maxC + 1) * 26); const colW = 270; const headW = 220;
    const W = 60 + top * colW + headW + 40; const H = bone * 2 + 80; const sy = H / 2;
    let o = `<line x1="40" y1="${sy}" x2="${W - headW - 20}" y2="${sy}" stroke="${col.ink9}" stroke-width="3"/>`;
    o += `<path d="M${W - headW - 20} ${sy - 46}L${W - 40} ${sy - 46}L${W - 20} ${sy}L${W - 40} ${sy + 46}L${W - headW - 20} ${sy + 46}Z" fill="${col.action}"/>`;
    o += FL.shapes.text({ text: d.effect || 'Effect', fs: 14, bold: true }, { x: W - headW - 16, y: sy - 46, w: headW - 20, h: 92 }, col, { color: '#fff', pad: 10 });
    cats.forEach((c, i) => {
      const up = i < top; const k = up ? i : i - top; const x2 = 60 + (k + 1) * colW - 40; const x1 = x2 - bone * 0.55; const y1 = up ? sy - bone : sy + bone;
      o += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${sy}" stroke="${col.ink7}" stroke-width="2"/>`;
      o += `<rect x="${x1 - 70}" y="${up ? y1 - 30 : y1 + 4}" width="140" height="26" rx="6" fill="${col.ink9}"/><text x="${x1}" y="${up ? y1 - 12 : y1 + 22}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${col.surface}" font-family="Geist">${U.esc(c.name)}</text>`;
      c.causes.forEach((z, j) => {
        const t = (j + 1) / (c.causes.length + 1); const px = x1 + (x2 - x1) * t; const py = y1 + (sy - y1) * t;
        const clr = z.flag === 'root' ? col.error : z.flag === 'suspect' ? col.attention : col.ink5;
        const label = U.wrap(z.text || '…', 200, 11.5)[0] + (U.wrap(z.text || '', 200, 11.5).length > 1 ? '…' : '');
        const tw = Math.min(200, U.measure(label, 11.5, z.flag ? 600 : 400)) + 8;
        o += `<line x1="${px - tw}" y1="${py}" x2="${px}" y2="${py}" stroke="${clr}" stroke-width="${z.flag ? 1.8 : 1.2}"/><text x="${px - 4}" y="${py - 4}" text-anchor="end" font-size="11.5" font-weight="${z.flag ? 600 : 400}" fill="${z.flag ? clr : col.ink7}" font-family="Geist">${U.esc(label)}</text>`;
        if (z.flag === 'root') o += `<circle cx="${px}" cy="${py}" r="4" fill="${col.error}"/>`;
      });
    });
    return { svg: o, W, H };
  }

  FL.tools.fishbone = {
    render(host, page, p, api) {
      const d = page.data;
      const col = () => { const cs = getComputedStyle(document.documentElement); const v = (n) => cs.getPropertyValue(n).trim(); return { ink9: v('--c-ink-900'), ink7: v('--c-ink-700'), ink5: v('--c-ink-500'), action: v('--c-action'), error: v('--c-error'), attention: v('--c-attention'), surface: v('--c-surface') }; };
      const draw = (focusId) => {
        const all = d.cats.flatMap((c) => c.causes); const roots = all.filter((z) => z.flag === 'root').length, sus = all.filter((z) => z.flag === 'suspect').length;
        const g = diagram(d, col());
        host.innerHTML = `<div class="tool-in animate-in">
          <div class="ph"><div><h1 style="font-size:20px">${U.esc(page.name)}</h1><p>Brainstorm with the team using 6M, then flag suspects and confirm root causes with data.</p></div>
            <div class="right row"><span class="st st-plain">${all.length} causes</span><span class="st st-att"><i></i>${sus} suspect</span><span class="st st-err"><i></i>${roots} root cause</span>
            <button class="btn" data-export>${U.ic('download')}SVG</button></div></div>
          <div class="field" style="max-width:640px"><label>Effect (problem / Y)</label><input class="inp" data-effect value="${U.esc(d.effect)}"></div>
          <div class="card fish-wrap" style="overflow:auto;padding:12px"><svg width="${g.W}" height="${g.H}" viewBox="0 0 ${g.W} ${g.H}" style="display:block;min-width:${Math.min(g.W, 900)}px;max-width:100%;height:auto">${g.svg}</svg></div>
          <div class="fish-side">${d.cats.map((c, ci) => `
            <div class="card fcat"><div class="fcat-h"><input value="${U.esc(c.name)}" data-cat="${ci}"><button class="ib ib-sm ib-ghost" data-catdel="${ci}" title="Remove category">${U.ic('trash')}</button></div>
              ${c.causes.map((z, zi) => { const t = z.taskId && p.tasks.find((x) => x.id === z.taskId); return `<div class="cause" data-rowid="${z.id}">
                <input type="text" value="${U.esc(z.text)}" data-cause="${ci}:${zi}" placeholder="Cause">
                <span class="tag${z.flag === 'suspect' ? ' on' : ''}" style="${z.flag === 'suspect' ? 'background:var(--c-attention-soft);color:var(--c-attention-ink)' : ''}" data-flag="${ci}:${zi}:suspect" title="Mark as suspect">Suspect</span>
                <span class="tag${z.flag === 'root' ? ' on' : ''}" data-flag="${ci}:${zi}:root" title="Validated root cause">Root</span>
                ${t ? `<span class="st ${FL.status(t.status).cls}" title="${U.esc(t.name)}" style="cursor:pointer" data-topen="${t.id}"><i></i>${t.status === 'Done' ? 'Done' : D.short(t.end)}</span>` : `<button class="ib ib-sm ib-ghost" data-act="${ci}:${zi}" title="Create action item in plan">${U.ic('bolt', 14)}</button>`}
                <button class="ib ib-sm ib-ghost" data-zdel="${ci}:${zi}" title="Remove">${U.ic('x', 13)}</button></div>`; }).join('')}
              <button class="add btn btn-sm btn-g" data-zadd="${ci}" style="align-self:flex-start">${U.ic('plus')}Add cause</button></div>`).join('')}
            <button class="card fcat" data-catadd style="border-style:dashed;align-items:center;justify-content:center;color:var(--c-ink-500);cursor:pointer;min-height:120px">${U.ic('plus')}Add category</button>
          </div></div>`;
        let rec = false; const once = () => { if (!rec) { api.record(); rec = true; } };
        const redrawSVG = U.debounce(() => { const g2 = diagram(d, col()); const sv = U.$('.fish-wrap svg', host); if (sv) { sv.setAttribute('viewBox', `0 0 ${g2.W} ${g2.H}`); sv.setAttribute('width', g2.W); sv.setAttribute('height', g2.H); sv.innerHTML = g2.svg; } }, 150);
        host.querySelector('[data-effect]').oninput = (e) => { once(); d.effect = e.target.value; api.save(); redrawSVG(); };
        U.$$('[data-cat]', host).forEach((i) => (i.oninput = () => { once(); d.cats[+i.dataset.cat].name = i.value; api.save(); redrawSVG(); }));
        U.$$('[data-cause]', host).forEach((i) => {
          const [ci, zi] = i.dataset.cause.split(':').map(Number);
          i.oninput = () => { once(); d.cats[ci].causes[zi].text = i.value; api.save(); redrawSVG(); };
          i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); api.record(); const z = { id: U.uid('k'), text: '', flag: '' }; d.cats[ci].causes.splice(zi + 1, 0, z); api.save(); draw(z.id); } };
        });
        U.$$('[data-flag]', host).forEach((b) => (b.onclick = () => {
          const [ci, zi, f] = b.dataset.flag.split(':'); const z = d.cats[+ci].causes[+zi]; api.record(); z.flag = z.flag === f ? '' : f;
          if (z.flag === 'root') api.log(`marked “${z.text}” as a validated root cause`); api.save(); draw(); api.redrawRec();
        }));
        U.$$('[data-zdel]', host).forEach((b) => (b.onclick = () => { const [ci, zi] = b.dataset.zdel.split(':').map(Number); api.record(); d.cats[ci].causes.splice(zi, 1); api.save(); draw(); }));
        U.$$('[data-zadd]', host).forEach((b) => (b.onclick = () => { api.record(); const z = { id: U.uid('k'), text: '', flag: '' }; d.cats[+b.dataset.zadd].causes.push(z); api.save(); draw(z.id); }));
        U.$$('[data-catdel]', host).forEach((b) => (b.onclick = () => { const c = d.cats[+b.dataset.catdel]; K.confirm('Remove category?', `“${c.name}” and its ${c.causes.length} cause(s) will be removed.`, () => { api.record(); d.cats.splice(+b.dataset.catdel, 1); api.save(); draw(); }, { danger: true, ok: 'Remove' }); }));
        host.querySelector('[data-catadd]').onclick = () => { api.record(); d.cats.push({ id: U.uid('c'), name: 'New category', causes: [] }); api.save(); draw(); };
        U.$$('[data-act]', host).forEach((b) => (b.onclick = () => {
          const [ci, zi] = b.dataset.act.split(':').map(Number); const z = d.cats[ci].causes[zi];
          const t = FL.tools.addTask(p, { name: `Validate: ${z.text || 'cause'}`, phase: 'A', notes: `From ${page.name} · ${d.cats[ci].name}`, link: { pageId: page.id, shapeId: z.id } });
          z.taskId = t.id; api.save(); draw(); api.redrawRec();
          K.toast('Validation task added to the plan', { action: 'Open plan', onAction: () => { FL.shell.go(`#/p/${p.id}/plan`); setTimeout(() => FL.plan.focusTask(t.id), 80); } });
        }));
        U.$$('[data-topen]', host).forEach((b) => (b.onclick = () => FL.plan.openTask(p, b.dataset.topen, () => draw())));
        host.querySelector('[data-export]').onclick = () => { const g2 = diagram(d, col()); U.download(`${p.code}-fishbone.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${g2.W}" height="${g2.H}" viewBox="0 0 ${g2.W} ${g2.H}"><rect width="100%" height="100%" fill="#fff"/>${g2.svg}</svg>`, 'image/svg+xml'); };
        if (focusId) { const el = U.$(`[data-rowid="${focusId}"] input`, host); el && el.focus(); }
      };
      draw();
      const off = S.on((e) => { if (e === 'theme') draw(); });
      return off;
    },
  };

  /** Cria tarefa no fim da fase indicada (usado por Fishbone e FMEA). */
  FL.tools.addTask = (p, o) => {
    const SC = FL.schedule; const si = p.tasks.findIndex((t) => t.level === 0 && t.phase === o.phase);
    let at = p.tasks.length; if (si >= 0) { at = SC.subtreeEnd(p.tasks, si); const last = p.tasks[at - 1]; if (last && last.milestone && at - 1 > si) at -= 1; }
    const t = { id: U.uid('t'), name: o.name.slice(0, 120), level: si >= 0 ? 1 : 0, phase: o.phase, owner: o.owner || S.state.me, status: 'Not started', start: U.date.today(), end: null, dur: o.dur || 3, pct: 0, preds: [], notes: o.notes || '', link: o.link || null, collapsed: false };
    S.record('plan:' + p.id, JSON.stringify(p.tasks));
    p.tasks.splice(at, 0, t); SC.compute(p.tasks); S.log(p, `created action “${t.name}”`); S.touch(p);
    return t;
  };
})(window.FL);

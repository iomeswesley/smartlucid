/* Flowline · FMEA de processo: SEV × OCC × DET = RPN, ordenação por risco e ação → tarefa no plano. */
(function (FL) {
  const U = FL.util, K = FL.kit, S = FL.store, D = U.date;
  FL.tools = FL.tools || {};
  const TXT = [['step', 'Process step', 140], ['mode', 'Potential failure mode', 170], ['effect', 'Effect of failure', 170]];
  const TXT2 = [['cause', 'Potential cause', 170]];
  const TXT3 = [['controls', 'Current controls', 160]];
  const rpnOf = (r) => (+r.sev || 0) * (+r.occ || 0) * (+r.det || 0);
  const cls = (v) => (v >= 200 ? 'rpn-h' : v >= 100 ? 'rpn-m' : 'rpn-l');

  FL.tools.fmea = {
    render(host, page, p, api) {
      const d = page.data; let sortRPN = false;
      const draw = () => {
        const rows = sortRPN ? [...d.rows].sort((a, b) => rpnOf(b) - rpnOf(a)) : d.rows;
        const hi = d.rows.filter((r) => rpnOf(r) >= 200).length, md = d.rows.filter((r) => rpnOf(r) >= 100 && rpnOf(r) < 200).length;
        const top = [...d.rows].sort((a, b) => rpnOf(b) - rpnOf(a)).slice(0, 3);
        const sel = (r, k) => `<select data-sc="${k}" aria-label="${k}">${['', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => `<option${String(r[k] ?? '') === String(v) ? ' selected' : ''}>${v}</option>`).join('')}</select>`;
        const ed = (r, k) => `<div contenteditable="true" data-k="${k}">${U.esc(r[k] || '')}</div>`;
        host.innerHTML = `<div class="tool-in animate-in">
          <div class="ph"><div><h1 style="font-size:20px">${U.esc(page.name)}</h1><p>Rank failure modes by risk. Severity, occurrence and detection on a 1–10 scale.</p></div>
            <div class="right row"><span class="st st-err"><i></i>${hi} high (≥200)</span><span class="st st-att"><i></i>${md} medium</span>
            <button class="btn ${sortRPN ? 'btn-p' : ''}" data-sort>${U.ic('filter')}Sort by RPN</button><button class="btn" data-csv>${U.ic('download')}CSV</button><button class="btn btn-p" data-add>${U.ic('plus')}Add row</button></div></div>
          ${top.length ? `<div class="kpis" style="grid-template-columns:repeat(${top.length},minmax(0,1fr))">${top.map((r, i) => `<div class="card kpi"><span class="eyebrow">#${i + 1} risk</span><span class="v ${''}" style="font-size:22px"><span class="dl ${cls(rpnOf(r))}" style="font-size:20px;padding:2px 8px">${rpnOf(r)}</span></span><span class="s" style="color:var(--c-ink-900);font-weight:600">${U.esc(r.mode || '—')}</span><span class="s">${U.esc(r.cause || '')}</span></div>`).join('')}</div>` : ''}
          <div class="fmea-wrap"><table class="fmea"><thead><tr>${TXT.map(([, l]) => `<th>${l}</th>`).join('')}<th class="sc">SEV</th>${TXT2.map(([, l]) => `<th>${l}</th>`).join('')}<th class="sc">OCC</th>${TXT3.map(([, l]) => `<th>${l}</th>`).join('')}<th class="sc">DET</th><th class="sc">RPN</th><th>Recommended action</th><th style="width:140px">Owner</th><th style="width:120px">Action status</th><th style="width:40px"></th></tr></thead>
          <tbody>${rows.map((r) => { const v = rpnOf(r); const t = r.taskId && p.tasks.find((x) => x.id === r.taskId); return `<tr data-row="${r.id}" data-rowid="${r.id}">
            ${TXT.map(([k]) => `<td>${ed(r, k)}</td>`).join('')}<td class="sc">${sel(r, 'sev')}</td>${TXT2.map(([k]) => `<td>${ed(r, k)}</td>`).join('')}<td class="sc">${sel(r, 'occ')}</td>${TXT3.map(([k]) => `<td>${ed(r, k)}</td>`).join('')}<td class="sc">${sel(r, 'det')}</td>
            <td class="rpn ${v ? cls(v) : ''}">${v || '—'}</td><td>${ed(r, 'action')}</td>
            <td><select class="inp inp-sm" data-owner style="border:0;background:transparent;margin:4px 0"><option value="">—</option>${S.people().map((n) => `<option${n === r.owner ? ' selected' : ''}>${U.esc(n)}</option>`).join('')}</select></td>
            <td class="act">${t ? `<span class="st ${FL.status(t.status).cls}" style="cursor:pointer" data-topen="${t.id}"><i></i>${t.status === 'Done' ? 'Done' : D.short(t.end)}</span>` : `<button class="btn btn-sm" data-task ${r.action ? '' : 'disabled title="Write a recommended action first"'}>${U.ic('bolt', 14)}To plan</button>`}</td>
            <td class="act"><button class="ib ib-sm ib-ghost" data-del aria-label="Delete row">${U.ic('trash')}</button></td></tr>`; }).join('')}
            ${rows.length ? '' : `<tr><td colspan="14"><div class="empty"><b>No failure modes yet</b><span>Start from the PMAP steps — one row per way each step can fail.</span></div></td></tr>`}
          </tbody></table></div>
          <div class="muted" style="font-size:12.5px">RPN ≥ 200 high · 100–199 medium · below 100 low. Always act on severity 9–10 regardless of RPN.</div></div>`;
        let rec = false; const once = () => { if (!rec) { api.record(); rec = true; } };
        U.$$('tr[data-row]', host).forEach((tr) => {
          const r = d.rows.find((x) => x.id === tr.dataset.row);
          U.$$('[data-k]', tr).forEach((el) => el.addEventListener('input', () => { once(); r[el.dataset.k] = el.innerText.trim(); api.save(); if (el.dataset.k === 'action') { const b = tr.querySelector('[data-task]'); if (b) b.disabled = !r.action; } }));
          U.$$('[data-sc]', tr).forEach((s) => (s.onchange = () => { api.record(); r[s.dataset.sc] = s.value ? +s.value : null; api.save(); draw(); }));
          tr.querySelector('[data-owner]').onchange = (e) => { api.record(); r.owner = e.target.value; api.save(); };
          tr.querySelector('[data-del]').onclick = () => { api.record(); d.rows.splice(d.rows.indexOf(r), 1); api.save(); draw(); K.toast('Row deleted'); };
          const tb = tr.querySelector('[data-task]'); if (tb) tb.onclick = () => {
            const t = FL.tools.addTask(p, { name: r.action, phase: 'I', owner: r.owner, notes: `FMEA: ${r.mode} (RPN ${rpnOf(r)})`, link: { pageId: page.id, shapeId: r.id }, dur: 5 });
            r.taskId = t.id; api.save(); draw(); api.redrawRec();
            K.toast('Action added to the Improve phase', { action: 'Open plan', onAction: () => { FL.shell.go(`#/p/${p.id}/plan`); setTimeout(() => FL.plan.focusTask(t.id), 80); } });
          };
          const to = tr.querySelector('[data-topen]'); if (to) to.onclick = () => FL.plan.openTask(p, to.dataset.topen, draw);
        });
        host.querySelector('[data-add]').onclick = () => { api.record(); const r = { id: U.uid('f'), step: '', mode: '', effect: '', sev: null, cause: '', occ: null, controls: '', det: null, action: '', owner: '' }; d.rows.push(r); api.save(); draw(); const c = U.$(`tr[data-row="${r.id}"] [contenteditable]`, host); c && c.focus(); };
        host.querySelector('[data-sort]').onclick = () => { sortRPN = !sortRPN; draw(); };
        host.querySelector('[data-csv]').onclick = () => {
          const head = ['Step', 'Failure mode', 'Effect', 'SEV', 'Cause', 'OCC', 'Controls', 'DET', 'RPN', 'Action', 'Owner'];
          const lines = [head, ...d.rows.map((r) => [r.step, r.mode, r.effect, r.sev, r.cause, r.occ, r.controls, r.det, rpnOf(r), r.action, r.owner])];
          U.download(`${p.code}-fmea.csv`, lines.map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
        };
      };
      draw();
    },
  };
})(window.FL);

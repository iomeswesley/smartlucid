/* Flowline · SIPOC estruturado. A coluna P vira um mapa de processo com um clique. */
(function (FL) {
  const U = FL.util, K = FL.kit, S = FL.store;
  FL.tools = FL.tools || {};
  const COLS = [['S', 'Suppliers', 'Who provides the inputs'], ['I', 'Inputs', 'Materials, information, resources'], ['P', 'Process', '4–7 high-level steps'], ['O', 'Outputs', 'What the process produces'], ['C', 'Customers', 'Who receives the outputs']];

  FL.tools.sipoc = {
    render(host, page, p, api) {
      const d = page.data;
      const draw = (focus) => {
        host.innerHTML = `<div class="tool-in animate-in">
          <div class="ph"><div><h1 style="font-size:20px">${U.esc(page.name)}</h1><p>High-level view of the process in scope — agree on boundaries before mapping in detail.</p></div>
            <div class="right row"><span class="muted" style="font-size:13px">${d.P.length} process steps</span><button class="btn" data-gen ${d.P.length ? '' : 'disabled'}>${U.ic('flow')}Generate process map</button></div></div>
          <div class="sipoc">${COLS.map(([k, name, hint]) => `
            <div class="card sc ${k === 'P' ? 'p' : ''}"><div class="sch"><span class="L">${k}</span><div><b>${name}</b><span>${hint}</span></div></div>
              <ul>${d[k].map((t, i) => `<li><span class="n">${k === 'P' ? i + 1 + '.' : '•'}</span><span contenteditable="true" data-c="${k}" data-i="${i}">${U.esc(t)}</span><span class="x" data-del="${k}:${i}" title="Remove">${U.ic('x', 13)}</span></li>`).join('')}</ul>
              <button class="add" data-add="${k}">${FL.t({ S: 'Add supplier', I: 'Add input', P: 'Add step', O: 'Add output', C: 'Add customer' }[k])}</button></div>`).join('')}</div>
          <div class="card cblock" style="max-width:760px"><h4>${U.ic('sparkle', 14)}How to read it</h4><span class="muted" style="line-height:1.55">Start in the middle (P): name the first and last step to set the scope. Then list the outputs and who receives them, and finally the inputs and who supplies them. Keep each item short — details belong in the PMAP.</span></div>
        </div>`;
        U.$$('[contenteditable]', host).forEach((el) => {
          const k = el.dataset.c, i = +el.dataset.i; let rec = false;
          el.addEventListener('input', () => { if (!rec) { api.record(); rec = true; } d[k][i] = el.innerText.trim(); api.save(); });
          el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); api.record(); d[k].splice(i + 1, 0, ''); api.save(); draw({ k, i: i + 1 }); }
            if (e.key === 'Backspace' && !el.innerText.trim()) { e.preventDefault(); api.record(); d[k].splice(i, 1); api.save(); draw({ k, i: Math.max(0, i - 1) }); }
          });
          el.addEventListener('blur', () => { if (!el.innerText.trim() && d[k][i] === '') { d[k].splice(i, 1); api.save(); setTimeout(() => draw(), 0); } });
        });
        U.$$('[data-add]', host).forEach((b) => (b.onclick = () => { const k = b.dataset.add; api.record(); d[k].push(''); api.save(); draw({ k, i: d[k].length - 1 }); }));
        U.$$('[data-del]', host).forEach((b) => (b.onclick = () => { const [k, i] = b.dataset.del.split(':'); api.record(); d[k].splice(+i, 1); api.save(); draw(); }));
        host.querySelector('[data-gen]').onclick = () => {
          const steps = d.P.filter(Boolean);
          const data = { shapes: [], edges: [], view: { x: 60, y: 80, z: 0.9 }, rules: [] }; let prev = null;
          const T = FL.shapes.create('text', 0, -70, { text: `Process map · ${p.name}`, w: 700, align: 'left', fs: 18, bold: true }); data.shapes.push(T);
          steps.forEach((t, i) => {
            const s = FL.shapes.create('pstep', i * 290, 0, { text: t, outputs: i === steps.length - 1 ? d.O.slice(0, 3) : ['Output (Y)'], inputs: i === 0 ? d.I.slice(0, 3).map((x) => ({ t: x, c: 'C' })) : [{ t: 'Input (X)', c: 'C' }] });
            data.shapes.push(s); if (prev) data.edges.push({ id: U.uid('e'), a: prev.id, b: s.id, as: 'r', bs: 'l', text: '', arrow: 'end', dash: false }); prev = s;
          });
          const g = FL.newPage('canvas', 'Process map (from SIPOC)', 'M', { kind: 'pmap', data });
          p.pages.push(g); api.log(`generated a process map from ${page.name}`); api.save();
          FL.shell.go(`#/p/${p.id}/maps/${g.id}`); K.toast('Process map created from the P column');
        };
        if (focus) { const el = U.$(`[data-c="${focus.k}"][data-i="${focus.i}"]`, host); if (el) { el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } }
      };
      draw();
    },
  };
})(window.FL);

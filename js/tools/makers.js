/* Flowline · Process Map Maker e Product Map Maker.
   O usuário preenche um formulário (passos, y's, x's / componentes, funções, características)
   e o mapa sai desenhado no padrão Whirlpool GB (o mesmo layout do Lucid do Green Belt). */
(function (FL) {
  const U = FL.util, K = FL.kit, S = FL.store, SH = FL.shapes;
  const M = (FL.makers = {});
  const C = (t, x, y, e) => SH.create(t, x, y, e);
  const E = (a, b, o = {}) => ({ id: U.uid('e'), a: a.id, b: b.id, as: null, bs: null, text: '', arrow: 'end', dash: false, ...o });
  const lines = (v) => String(v || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const parseItem = (x) => { const st = /^[+~]/.test(x) ? x[0] : ''; const t = x.replace(/^[+~]\s*/, ''); return { t: t.replace(/\*\s*$/, '').trim(), crit: /\*\s*$/.test(t), st }; };
  const itemLine = (i) => (i.st ? i.st + ' ' : '') + i.t + (i.crit ? '*' : '');

  M.SAMPLE_PROCESS = {
    y: 'Torque to Strip',
    steps: [
      { name: 'Prepare materials on workbench', ys: ['All materials are prepared'], xs: [{ c: 'C', t: 'sheet with holes' }, { c: 'C', t: 'torque meter' }, { c: 'C', t: 'screws' }] },
      { name: 'Attach the opposite edge of the sheet to secure it', ys: ['Sheet secured from falling or shifting'], xs: [{ c: 'N', t: 'type of weight' }, { c: 'C', t: 'amount of weight' }, { c: 'C', t: 'placement of weight' }] },
      { name: 'Align screw vertically and pre-attach with a screwdriver', ys: ['Screw is engaged in hole but still not attached/stripped'], xs: [{ c: 'N', t: 'hole starting point' }, { c: 'C', t: 'thread type of screw' }] },
      { name: 'Apply torque until the value maximizes and screw is stripped', ys: ['Torque meter measurement at stripping torque'], xs: [{ c: 'N', t: 'angle of ratchet turn' }, { c: 'N', t: 'operator feeling of stripping' }, { c: 'C', t: 'torque meter rotation speed (20 ± 3 RPM)', crit: true }] },
      { name: 'Record maximum torque measured before screw stripped', ys: ['Torque value is recorded in table in Nm with 3 decimal places'], xs: [{ c: 'C', t: 'data table' }, { c: 'N', t: 'operator reading accuracy' }, { c: 'C', t: 'unit of measurement' }] },
    ],
    loop: { on: true, decision: 'Has the sample plan been completed?', repeat: 'Repeat torque measurement process for next screw', end: 'Process complete. Analyze study' },
  };
  M.SAMPLE_PRODUCT = {
    y: 'Understanding the product',
    comps: [
      { name: 'Coil protector', funcs: ['Direct heat to the cavity center', 'Support coil element'], items: [{ t: 'material (QCV)' }, { t: 'thickness (0.6 mm)', crit: true }, { t: 'finishing (ENAMELED)', crit: true }] },
      { name: 'Convection motor', funcs: ['Convert electrical energy into mechanical energy', 'Support and rotate the blade'], items: [{ t: 'rotation speed (950 ± 150 RPM)' }, { t: 'frequency (60 Hz)' }] },
      { name: 'Cavity top', funcs: ['Support motor', 'Support coil protection'], items: [{ t: 'motor hole diameter (3.75 mm)' }, { t: 'material (QCV)' }, { t: 'finishing (ENAMELED)', crit: true }] },
      { name: 'Hex nut M4 x 0.7', funcs: ['Attach the coil element to the cavity top'], items: [{ t: 'material (SAE 1010/1020 steel)' }, { t: 'size (M4)' }, { t: 'pitch (0.7 mm)', crit: true }] },
    ],
    v2: false,
  };

  /* ---------------- Process map ---------------- */
  M.buildProcess = (cfg) => {
    const out = { shapes: [], edges: [], view: { x: 60, y: 60, z: 0.8 }, rules: [] };
    const steps = (cfg.steps || []).filter((s) => s.name).map((st) => C('gb-step', 0, 0, { text: st.name, outputs: st.ys || [], inputs: st.xs || [] }));
    if (!steps.length) steps.push(C('gb-step', 0, 0));
    const body = SH.T['gb-step'].body; const tops = steps.map((s) => body(s).y);
    const line = 70 + Math.max(0, ...tops); // linha onde ficam as caixas verdes
    let x = 30; steps.forEach((s, i) => { s.x = x; s.y = line - tops[i]; x += s.w + 56; });
    steps.forEach((s, i) => { if (i) out.edges.push(E(steps[i - 1], s, { as: 'r', bs: 'l' })); });
    let bottom = Math.max(...steps.map((s) => s.y + s.h));
    const extra = [];
    if (cfg.loop && cfg.loop.on) {
      const dec = C('process', x, line - 3, { text: cfg.loop.decision || 'Done?', fill: '#4F8FE8', stroke: '#1F4E99', color: '#0E1726', w: 120, h: 70, fs: 12.5 });
      const end = C('process', x + 120 + 56, line, { text: cfg.loop.end || 'Process complete', fill: SH.GB.green, stroke: SH.GB.greenLine, color: '#0E1726', w: 150, h: 64, fs: 12.5 });
      const rep = C('process', x, bottom + 36, { text: cfg.loop.repeat || 'Repeat for next sample', fill: '#CDBB8E', stroke: '#5B4A1F', color: '#0E1726', w: 120, h: 84, fs: 12.5 });
      extra.push(dec, end, rep);
      out.edges.push(E(steps[steps.length - 1], dec, { as: 'r', bs: 'l' }), E(dec, end, { as: 'r', bs: 'l', text: 'Yes' }), E(dec, rep, { as: 'b', bs: 't', text: 'No' }), E(rep, steps[0], { as: 'l', bs: 'b' }));
      x = end.x + end.w + 56; bottom = rep.y + rep.h;
    }
    const panel = C('gb-panel', 0, 0, { text: `(Y: ${cfg.y || 'Output'}) Process Map`, w: x - 26, h: bottom + 40 });
    out.shapes.push(panel, ...steps, ...extra);
    return out;
  };

  /* ---------------- Product map ---------------- */
  const W = 1180, CW = 280, IMG = { w: 380, h: 280 };
  function productBlock(out, cfg, y0, ver, after) {
    const g = 'v' + ver;
    const bar = C('rect', 0, y0, { text: `PRODUCT MAP - V${ver} (${after ? 'AFTER' : 'BEFORE'} CHANGES)`, fill: SH.GB.bar, stroke: '#2D2D2D', color: '#0E1726', bold: true, fs: 20, w: W, h: 44, sw: 1 });
    out.shapes.push(bar);
    let top = y0 + 44 + 30;
    if (after) { out.shapes.push(C('gb-legend', 0, top)); top += 110; }
    const cards = (cfg.comps || []).filter((c) => c.name).map((c, i) => C('gb-comp', 0, 0, { text: c.name, n: i + 1, funcs: c.funcs || [], items: after ? c.items || [] : (c.items || []).filter((it) => it.st !== '+').map((it) => ({ ...it, st: '' })), changed: after && !!c.changed, grp: g, w: CW }));
    const col = [top, top]; const side = [];
    cards.forEach((c, i) => { const k = col[0] <= col[1] ? 0 : 1; c.x = k ? W - CW : 0; c.y = col[k]; col[k] += c.h + 30; side.push(k); });
    const colH = Math.max(col[0], col[1], top + IMG.h) - top;
    const img = C('image', (W - IMG.w) / 2, top + Math.max(0, (colH - IMG.h) / 2 - 60), { w: IMG.w, h: IMG.h, grp: g });
    out.shapes.push(img, ...cards);
    cards.forEach((c, i) => out.edges.push(E(c, img, { as: side[i] ? 'l' : 'r', bs: side[i] ? 'r' : 'l' })));
    const crit = C('gb-crit', (W - 420) / 2, img.y + IMG.h + 40, { w: 420, grp: g });
    const nCrit = cards.reduce((n, c) => n + (c.items || []).filter((it) => it.crit && it.st !== '~').length, 0);
    crit.h = 34 + 6 + Math.max(1, nCrit) * 14.5 + 12; out.shapes.push(crit);
    return Math.max(top + colH, crit.y + crit.h + 40);
  }
  M.buildProduct = (cfg) => {
    const out = { shapes: [], edges: [], view: { x: 60, y: 40, z: 0.6 }, rules: [] };
    out.shapes.push(C('rect', 0, 0, { text: `PRODUCT MAP - ${(cfg.y || 'Understanding the product').toUpperCase()}`, fill: SH.GB.barLight, stroke: '#7BC67B', color: '#0E1726', bold: true, fs: 16, w: W, h: 32, sw: 1 }));
    const end = productBlock(out, cfg, 56, 1, false);
    if (cfg.v2) productBlock(out, cfg, end + 80, 2, true);
    return out;
  };

  /* ---------------- Formulários ---------------- */
  const procRow = (st = {}) => `<div class="mk-row" data-row>
      <input class="inp inp-sm" data-f="name" placeholder="Step name" value="${U.esc(st.name || '')}">
      <textarea class="inp inp-sm" rows="3" data-f="ys" placeholder="y's — one per line">${U.esc((st.ys || []).join('\n'))}</textarea>
      <textarea class="inp inp-sm mono" rows="3" data-f="xs" placeholder="C - sheet with holes&#10;N - type of weight*">${U.esc((st.xs || []).map(SH.gbX).join('\n'))}</textarea>
      <button class="ib ib-sm ib-ghost" data-del aria-label="Remove">${U.ic('x', 14)}</button></div>`;
  const prodRow = (c = {}) => `<div class="mk-row mk-prod" data-row>
      <input class="inp inp-sm" data-f="name" placeholder="Component" value="${U.esc(c.name || '')}">
      <textarea class="inp inp-sm" rows="3" data-f="funcs" placeholder="Functions (y) — what is it for?">${U.esc((c.funcs || []).join('\n'))}</textarea>
      <textarea class="inp inp-sm mono" rows="3" data-f="items" placeholder="material (QCV)&#10;thickness (0.6 mm)*">${U.esc((c.items || []).map(itemLine).join('\n'))}</textarea>
      <label class="mk-chk" title="Changed in V2"><input type="checkbox" data-f="changed"${c.changed ? ' checked' : ''}>V2</label>
      <button class="ib ib-sm ib-ghost" data-del aria-label="Remove">${U.ic('x', 14)}</button></div>`;

  M.open = (kind, p) => {
    if (!S.canEdit(p)) return K.toast(FL.t('You have view-only access — changes were not saved'));
    const proc = kind === 'process';
    const help = proc
      ? `<ol class="mk-steps"><li>Map the process steps</li><li>List the outputs of each step (y)</li><li>List the independent variables of each step (x)</li><li>Classify the x's: C controllable · N noise · SO standard operation</li><li>Mark the critical x's of each y with *</li></ol>`
      : `<ol class="mk-steps"><li>Define the measurable Y</li><li>List the functions of each part (what is it for? why is it here?)</li><li>List the x's that affect each y, with spec (nominal and tolerance)</li><li>Mark the critical x's with * — they go to COV and DOE</li><li>Tick V2 for the components you changed</li></ol>`;
    const body = U.el(`<div class="mk">
      <div class="mk-top"><div class="field" style="flex:1"><label>${proc ? 'Y measured by this process' : 'Y of the product (map title)'}</label><input class="inp" data-y placeholder="${proc ? 'Torque to Strip' : 'Understanding the product'}"></div>
        <button class="btn btn-sm btn-g" data-sample>${U.ic('sparkle')}Load example</button></div>
      ${help}
      <div class="mk-head${proc ? '' : ' mk-prod'}"><span>${proc ? 'Step' : 'Component'}</span><span>${proc ? "y's (outputs)" : 'Functions (y)'}</span><span>${proc ? "x's (C / N / SO, * critical)" : "Characteristics (x, * critical, + new, ~ removed)"}</span>${proc ? '' : '<span></span>'}<span></span></div>
      <div class="mk-rows" data-rows></div>
      <button class="btn btn-sm btn-g" data-add style="align-self:flex-start">${U.ic('plus')}${proc ? 'Add step' : 'Add component'}</button>
      ${proc ? `<div class="mk-loop"><label class="row" style="gap:8px"><input type="checkbox" data-loop checked> End with a decision loop</label>
          <div class="mk-g3" data-loopf><input class="inp inp-sm" data-ld value="Has the sample plan been completed?"><input class="inp inp-sm" data-lr value="Repeat for next sample"><input class="inp inp-sm" data-le value="Process complete. Analyze study"></div></div>`
        : `<label class="row" style="gap:8px"><input type="checkbox" data-v2> Also draw V2 (after changes) below, with the changed components in orange</label>`}
    </div>`);
    const rows = body.querySelector('[data-rows]');
    const addRow = (d) => { rows.insertAdjacentHTML('beforeend', proc ? procRow(d) : prodRow(d)); };
    const fill = (cfg) => {
      rows.innerHTML = ''; body.querySelector('[data-y]').value = cfg.y || '';
      (proc ? cfg.steps : cfg.comps).forEach(addRow);
      if (proc) { body.querySelector('[data-ld]').value = cfg.loop.decision; body.querySelector('[data-lr]').value = cfg.loop.repeat; body.querySelector('[data-le]').value = cfg.loop.end; }
    };
    [0, 1, 2].forEach(() => addRow());
    body.addEventListener('click', (e) => { const d = e.target.closest('[data-del]'); if (d) d.closest('[data-row]').remove(); });
    body.querySelector('[data-add]').onclick = () => { addRow(); rows.lastElementChild.querySelector('input').focus(); };
    body.querySelector('[data-sample]').onclick = () => fill(proc ? M.SAMPLE_PROCESS : { ...M.SAMPLE_PRODUCT, comps: M.SAMPLE_PRODUCT.comps.map((c, i) => (i === 0 ? { ...c, changed: true, items: [...c.items, { t: 'V-shape hole diameter (4.5 mm)', crit: true, st: '+' }] } : c)) });
    const lp = body.querySelector('[data-loop]'); if (lp) lp.onchange = () => (body.querySelector('[data-loopf]').style.display = lp.checked ? '' : 'none');

    const read = () => {
      const y = body.querySelector('[data-y]').value.trim();
      const rs = U.$$('[data-row]', rows).map((r) => { const f = (k) => r.querySelector(`[data-f="${k}"]`); return proc
        ? { name: f('name').value.trim(), ys: lines(f('ys').value), xs: lines(f('xs').value).map(SH.parseX) }
        : { name: f('name').value.trim(), funcs: lines(f('funcs').value), items: lines(f('items').value).map(parseItem), changed: f('changed').checked }; }).filter((r) => r.name);
      return proc ? { y, steps: rs, loop: { on: lp.checked, decision: body.querySelector('[data-ld]').value, repeat: body.querySelector('[data-lr]').value, end: body.querySelector('[data-le]').value } }
        : { y, comps: rs, v2: body.querySelector('[data-v2]').checked };
    };
    K.modal({
      title: proc ? 'Process Map Maker' : 'Product Map Maker', wide: true, body,
      footer: [{ label: 'Cancel', ghost: true }, { label: 'Create map', primary: true, onClick: () => {
        const cfg = read();
        if (!(proc ? cfg.steps : cfg.comps).length) { K.toast(FL.t(proc ? 'Add at least one step' : 'Add at least one component')); return false; }
        const data = proc ? M.buildProcess(cfg) : M.buildProduct(cfg);
        const name = proc ? `PMAP — ${cfg.y || 'process'}` : `Product map — ${cfg.y || 'product'}`;
        const g = FL.newPage('canvas', name, 'M', { kind: proc ? 'gb-pmap' : 'gb-product', data });
        p.pages.push(g); S.log(p, `created “${g.name}” with the ${proc ? 'Process' : 'Product'} Map Maker`); S.touch(p);
        FL.shell.go(`#/p/${p.id}/maps/${g.id}`);
      } }],
    });
  };
})(window.FL);

/* Flowline · kit — camadas flutuantes: toast, menu de contexto, modal, prompt. Nunca usa alert/confirm nativos. */
(function (FL) {
  const U = FL.util;
  const K = (FL.kit = {});

  /* Toast com ação opcional (ex.: Undo) */
  K.toast = (msg, opts = {}) => {
    let box = U.$('.toasts');
    if (!box) { box = U.el('<div class="toasts" role="status" aria-live="polite"></div>'); document.body.appendChild(box); }
    const t = U.el(`<div class="toast">${opts.icon ? U.ic(opts.icon) : ''}<span>${U.esc(msg)}</span>${opts.action ? `<button>${U.esc(opts.action)}</button>` : ''}</div>`);
    if (opts.action) t.querySelector('button').onclick = () => { opts.onAction && opts.onAction(); t.remove(); };
    box.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .2s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 220); }, opts.ms || 2600);
  };

  /* Menu flutuante.
     items: [{label, icon, kbd, danger, onClick, swatch} | '-' | {header}] */
  let openMenu = null;
  K.closeMenu = () => { if (openMenu) { openMenu.remove(); openMenu = null; document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', onKey, true); } };
  function outside(e) { if (openMenu && !openMenu.contains(e.target)) K.closeMenu(); }
  function onKey(e) {
    if (!openMenu) return;
    const its = U.$$('.mi', openMenu); let i = its.findIndex((x) => x.classList.contains('hl'));
    if (e.key === 'Escape') { K.closeMenu(); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); e.stopPropagation(); its.forEach((x) => x.classList.remove('hl'));
      i = e.key === 'ArrowDown' ? (i + 1) % its.length : (i - 1 + its.length) % its.length; its[i].classList.add('hl'); its[i].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && i >= 0) { e.preventDefault(); e.stopPropagation(); its[i].click(); }
  }
  K.menu = (x, y, items, opts = {}) => {
    K.closeMenu();
    const m = U.el('<div class="float menu" role="menu"></div>');
    items.forEach((it) => {
      if (!it) return;
      if (it === '-') { m.appendChild(U.el('<div class="ms"></div>')); return; }
      if (it.header) { m.appendChild(U.el(`<div class="mh">${U.esc(it.header)}</div>`)); return; }
      const b = U.el(`<button class="mi${it.danger ? ' danger' : ''}" role="menuitem">${it.swatch ? `<i class="sw" style="background:${it.swatch}"></i>` : it.icon ? U.ic(it.icon) : it.check != null ? `<span style="width:16px">${it.check ? U.ic('check') : ''}</span>` : ''}<span>${U.esc(it.label)}</span>${it.kbd ? `<span class="k">${U.esc(it.kbd)}</span>` : ''}</button>`);
      b.onclick = (e) => { e.stopPropagation(); K.closeMenu(); it.onClick && it.onClick(); };
      m.appendChild(b);
    });
    document.body.appendChild(m);
    const r = m.getBoundingClientRect();
    let left = x, top = y;
    if (opts.alignRight) left = x - r.width;
    if (left + r.width > innerWidth - 8) left = innerWidth - r.width - 8;
    if (top + r.height > innerHeight - 8) top = Math.max(8, y - r.height - (opts.flipGap || 0));
    m.style.left = Math.max(8, left) + 'px'; m.style.top = top + 'px';
    openMenu = m;
    setTimeout(() => { document.addEventListener('mousedown', outside, true); document.addEventListener('keydown', onKey, true); });
    return m;
  };
  K.menuAt = (anchor, items, opts = {}) => { const r = anchor.getBoundingClientRect(); return K.menu(opts.alignRight ? r.right : r.left, r.bottom + 4, items, { ...opts, flipGap: r.height + 8 }); };

  /* Modal. Retorna {el, close}. body pode ser string HTML ou Node. */
  K.modal = ({ title, body, footer, wide, onClose }) => {
    const s = U.el(`<div class="scrim"><div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${U.esc(title)}">
      <div class="modal-h"><h2>${U.esc(title)}</h2><button class="ib ib-sm ib-ghost right" aria-label="Close">${U.ic('x')}</button></div>
      <div class="modal-b"></div>${footer !== false ? '<div class="modal-f"></div>' : ''}</div></div>`);
    const b = s.querySelector('.modal-b');
    typeof body === 'string' ? (b.innerHTML = body) : body && b.appendChild(body);
    const close = () => { s.remove(); document.removeEventListener('keydown', esc, true); onClose && onClose(); };
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', esc, true);
    s.addEventListener('mousedown', (e) => { if (e.target === s) close(); });
    s.querySelector('.modal-h button').onclick = close;
    const f = s.querySelector('.modal-f');
    (footer || []).forEach((btn) => {
      const el = U.el(`<button class="btn ${btn.primary ? 'btn-p' : btn.ghost ? 'btn-g' : ''}${btn.danger ? ' btn-danger' : ''}">${U.esc(btn.label)}</button>`);
      el.onclick = () => { const r = btn.onClick && btn.onClick(); if (r !== false) close(); };
      f.appendChild(el);
    });
    document.body.appendChild(s);
    setTimeout(() => { const first = b.querySelector('input, textarea, select'); first && first.focus(); });
    return { el: s, body: b, close };
  };

  K.prompt = (title, label, value, onOk, opts = {}) => {
    const m = K.modal({
      title,
      body: `<div class="field"><label>${U.esc(label)}</label><input class="inp" value="${U.esc(value || '')}" placeholder="${U.esc(opts.placeholder || '')}"></div>`,
      footer: [{ label: 'Cancel', ghost: true }, { label: opts.ok || 'Save', primary: true, onClick: () => onOk(m.body.querySelector('input').value.trim()) }],
    });
    const inp = m.body.querySelector('input');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { onOk(inp.value.trim()); m.close(); } });
    setTimeout(() => inp.select());
  };

  K.confirm = (title, text, onOk, opts = {}) => K.modal({
    title, body: `<p style="margin:0;line-height:1.5;color:var(--c-ink-700)">${U.esc(text)}</p>`,
    footer: [{ label: 'Cancel', ghost: true }, { label: opts.ok || 'Confirm', primary: !opts.danger, danger: opts.danger, onClick: onOk }],
  });
})(window.FL);

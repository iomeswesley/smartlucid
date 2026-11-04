/* Flowline · compartilhamento e acesso.
   Só membros (owner / editor / viewer) enxergam um projeto. Quem tem o link mas não é membro cai na
   tela "sem acesso" e pode pedir acesso; o pedido aparece para o dono e os editores aprovarem.
   Toda regra é conferida no servidor (FL.api) — a interface só reflete o que ele permite. */
(function (FL) {
  const U = FL.util, S = FL.store, K = FL.kit, API = FL.api, D = U.date;
  const SH = (FL.share = {});
  const ROLES = { owner: 'Owner', editor: 'Can edit', viewer: 'Can view' };

  SH.open = (p) => {
    const body = U.el('<div class="col" style="gap:16px"></div>');
    const mine = S.role(p); const canShare = mine === 'owner' || mine === 'editor'; const owner = mine === 'owner';
    const refresh = async () => { await S.reloadSession(); const np = S.project(p.id); if (np) { p = np; draw(); FL.project.redrawRec(); } };
    const draw = () => {
      const dirIds = new Set(p.members.map((m) => m.email.toLowerCase()));
      const reqs = p._requests || [];
      body.innerHTML = `
        ${canShare ? `<div class="col" style="gap:8px">
          <label class="lbl">${FL.t('Add people from')} @${FL.CONFIG.domain}</label>
          <div class="row" style="gap:8px"><input class="inp" list="fl-dir" data-email placeholder="${FL.t('name_surname')}@${FL.CONFIG.domain}" style="flex:1" autocomplete="off">
            <select class="inp" data-role style="width:130px"><option value="editor">${FL.t('Can edit')}</option><option value="viewer">${FL.t('Can view')}</option></select>
            <button class="btn btn-p" data-invite>${FL.t('Share')}</button></div>
          <datalist id="fl-dir">${S.state.directory.filter((d) => !dirIds.has(d.email.toLowerCase())).map((d) => `<option value="${U.esc(d.email)}">${U.esc(d.name)}${d.title ? ' · ' + U.esc(d.title) : ''}</option>`).join('')}</datalist>
          <span class="muted" style="font-size:12px" data-err></span>
        </div>` : `<div class="st st-draft" style="align-self:flex-start;padding:6px 10px"><i></i>${FL.t('Only owners and editors can share this project')}</div>`}
        ${reqs.length ? `<div class="col" style="gap:8px"><span class="eyebrow">${FL.t('Access requests')}</span>${reqs.map((r) => `<div class="row" style="gap:10px;padding:10px;border:1px solid var(--c-attention);border-radius:8px;background:var(--c-attention-soft)">${U.avatar(S.nameOf(r.email), 30)}<div class="grow"><b style="font-weight:600">${U.esc(S.nameOf(r.email))}</b><div class="muted" style="font-size:12.5px">${U.esc(r.email)} · ${D.rel(r.ts)}</div>${r.note ? `<div style="font-size:13px;margin-top:4px">“${U.esc(r.note)}”</div>` : ''}</div><button class="btn btn-sm" data-deny="${r.id}">${FL.t('Deny')}</button><button class="btn btn-sm btn-p" data-approve="${r.id}">${FL.t('Approve')}</button></div>`).join('')}</div>` : ''}
        <div class="col" style="gap:4px"><span class="eyebrow">${FL.t('People with access')} · ${p.members.length}</span>
          ${p.members.map((m) => { const me = m.email.toLowerCase() === S.state.meEmail.toLowerCase(); return `<div class="row" style="gap:10px;padding:8px 0;border-bottom:1px solid var(--c-line-soft)" data-m="${U.esc(m.email)}">${U.avatar(S.nameOf(m.email), 32)}<div class="grow"><b style="font-weight:600">${U.esc(S.nameOf(m.email))}${me ? ` <span class="muted" style="font-weight:400">(${FL.t('you')})</span>` : ''}</b><div class="muted mono" style="font-size:12px">${U.esc(m.email)}</div></div>
            ${m.role === 'owner' ? `<span class="st st-act"><i></i>${FL.t('Owner')}</span>` : owner ? `<select class="inp inp-sm" data-setrole style="width:120px"><option value="editor"${m.role === 'editor' ? ' selected' : ''}>${FL.t('Can edit')}</option><option value="viewer"${m.role === 'viewer' ? ' selected' : ''}>${FL.t('Can view')}</option><option value="__owner">${FL.t('Make owner')}</option></select><button class="ib ib-sm ib-ghost" data-rm aria-label="Remove">${U.ic('x')}</button>` : `<span class="st st-plain">${FL.t(ROLES[m.role])}</span>`}</div>`; }).join('')}
        </div>
        <div class="card" style="padding:12px 14px;display:flex;gap:12px;align-items:center;background:var(--c-surface-2)">${U.ic('lock', 18)}<div class="grow" style="font-size:12.5px;line-height:1.5;color:var(--c-ink-700)">${FL.t('Only the people listed here can open this project. A copied link does not grant access — others will be asked to request it.')}<div class="mono muted" style="margin-top:4px">ID ${U.esc(p.id)}</div></div><button class="btn btn-sm" data-copy>${U.ic('link')}${FL.t('Copy link')}</button></div>`;
      const err = (m) => { const e = body.querySelector('[data-err]'); if (e) { e.textContent = m; e.style.color = 'var(--c-error)'; } };
      const inv = body.querySelector('[data-invite]');
      if (inv) {
        const go = async () => {
          const email = body.querySelector('[data-email]').value.trim().toLowerCase(); const role = body.querySelector('[data-role]').value;
          if (!email) return err(FL.t('Type an email'));
          if (!email.endsWith('@' + FL.CONFIG.domain)) return err(FL.t('Only company accounts can be added') + ` (@${FL.CONFIG.domain})`);
          inv.disabled = true;
          try { await API.share(p.id, email, role); S.log(p, `shared the project with ${S.nameOf(email)} (${role})`); S.touch(p); K.toast(`${FL.t('Shared with')} ${S.nameOf(email)}`); await refresh(); }
          catch (e) { err(e.message); inv.disabled = false; }
        };
        inv.onclick = go; body.querySelector('[data-email]').onkeydown = (e) => { if (e.key === 'Enter') go(); };
      }
      U.$$('[data-m]', body).forEach((row) => {
        const email = row.dataset.m; const sel = row.querySelector('[data-setrole]'); const rm = row.querySelector('[data-rm]');
        if (sel) sel.onchange = async () => {
          try { if (sel.value === '__owner') { await API.transferOwnership(p.id, email); K.toast(`${S.nameOf(email)} ${FL.t('is now the owner')}`); } else await API.share(p.id, email, sel.value); await refresh(); }
          catch (e) { K.toast(e.message); draw(); }
        };
        if (rm) rm.onclick = async () => { try { await API.unshare(p.id, email); S.log(p, `removed ${S.nameOf(email)} from the project`); S.touch(p); await refresh(); } catch (e) { K.toast(e.message); } };
      });
      U.$$('[data-approve]', body).forEach((b) => (b.onclick = async () => { try { await API.answerRequest(b.dataset.approve, true, 'editor'); K.toast(FL.t('Access granted')); await refresh(); } catch (e) { K.toast(e.message); } }));
      U.$$('[data-deny]', body).forEach((b) => (b.onclick = async () => { try { await API.answerRequest(b.dataset.deny, false); await refresh(); } catch (e) { K.toast(e.message); } }));
      body.querySelector('[data-copy]').onclick = () => { U.copy(FL.linkTo(p)); K.toast(FL.t('Link copied — only people with access can open it')); };
    };
    draw();
    K.modal({ title: `${FL.t('Share')} “${p.name}”`, body, footer: [{ label: FL.t('Close'), primary: true }] });
  };

  /* Tela para quem abriu um link de projeto sem ser membro. Não revela nome nem dono do projeto. */
  FL.views = FL.views || {};
  FL.views.noaccess = {
    render(host, r) {
      host.innerHTML = `<div class="page animate-in" style="align-items:center;padding-top:12vh">
        <div class="card" style="max-width:520px;width:100%;padding:28px;display:flex;flex-direction:column;gap:14px;align-items:flex-start">
          <span style="width:44px;height:44px;border-radius:10px;display:grid;place-items:center;background:var(--c-surface-3);color:var(--c-ink-700)">${U.ic('lock', 22)}</span>
          <h1 style="margin:0;font-size:20px">${FL.t('You don’t have access to this project')}</h1>
          <p style="margin:0;color:var(--c-ink-700);line-height:1.55">${FL.t('Projects are private to the people they are shared with. Ask the owner to share it with you, or send a request.')}</p>
          <span class="mono muted" style="font-size:12px">${U.esc(r.id)} · ${U.esc(S.state.meEmail)}</span>
          <textarea class="inp" rows="2" data-note placeholder="${FL.t('Optional message to the owner')}"></textarea>
          <div class="row"><button class="btn btn-p" data-req>${FL.t('Request access')}</button><a class="btn btn-g" href="#/">${FL.t('Back to portfolio')}</a></div>
        </div></div>`;
      host.querySelector('[data-req]').onclick = async (e) => {
        e.currentTarget.disabled = true;
        try { await API.requestAccess(r.id, host.querySelector('[data-note]').value.trim()); K.toast(FL.t('Request sent — you will get access when the owner approves')); } catch (err) { K.toast(err.message); }
      };
    },
  };
})(window.FL);

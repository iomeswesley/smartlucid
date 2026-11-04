/* Flowline · store — estado em memória da sessão do usuário logado.
   Só contém os projetos que o servidor (FL.api) devolveu para esse usuário.
   Gravação: a cada mudança, compara cada projeto com a última versão salva e envia só os que mudaram.
   Campos de interface (página ativa, colapsos, zoom do canvas) não contam como mudança. */
(function (FL) {
  const U = FL.util, API = FL.api;
  const S = (FL.store = { state: null, assets: {}, listeners: new Set(), lastSaved: null, saving: false, error: null });
  const saved = new Map(); // id → assinatura do último estado gravado
  const UI_KEYS = new Set(['activePage', 'collapsed', 'view', 'fitted', '_role', '_requests', 'version', 'updatedAt', 'updatedBy']);
  const sig = (p) => JSON.stringify(p, (k, v) => (UI_KEYS.has(k) ? undefined : v));

  const loadPrefs = () => { try { return JSON.parse(localStorage.getItem('fl-prefs') || 'null') || {}; } catch (_) { return {}; } };
  const savePrefs = () => { try { localStorage.setItem('fl-prefs', JSON.stringify(S.state.prefs)); } catch (_) { } };

  S.load = async () => {
    const ses = await API.session();
    S.state = { v: FL.SCHEMA, me: ses.user.name, meEmail: ses.user.email, meTitle: ses.user.title || '', directory: ses.directory, projects: ses.projects, prefs: { theme: 'light', rail: 'open', lang: 'en', ...loadPrefs() } };
    FL.appUrl = ses.appUrl || null;
    saved.clear(); S.state.projects.forEach((p) => saved.set(p.id, sig(p)));
    try { S.assets = await API.getAssets(); } catch (_) { S.assets = {}; }
    return S.state;
  };

  /* ---------- Gravação ---------- */
  let warned = 0, running = null, again = false, toastAt = 0;
  // Uma gravação por vez: no Apps Script cada uma leva 1–3 s; duas em paralelo mandariam a mesma versão e a segunda daria CONFLICT.
  S.flush = () => {
    if (running) { again = true; return running; }
    running = flushOnce().finally(() => { running = null; if (again) { again = false; S.flush(); } });
    return running;
  };
  const flushOnce = async () => {
    const dirty = S.state.projects.filter((p) => saved.get(p.id) !== sig(p));
    if (!dirty.length) { S.saving = false; S.emit('sync'); return; }
    S.saving = true; S.emit('sync');
    for (const p of dirty) {
      const s = sig(p);
      if (!S.canEdit(p)) { // viewer: desfaz localmente, o servidor recusaria de qualquer forma
        const back = JSON.parse(saved.get(p.id)); Object.keys(p).forEach((k) => { if (!UI_KEYS.has(k)) delete p[k]; }); Object.assign(p, back);
        if (Date.now() - warned > 3000) { warned = Date.now(); FL.kit.toast(FL.t('You have view-only access — changes were not saved')); }
        S.emit('reload'); continue;
      }
      try { const r = await API.saveProject(p); p.version = r.version; p.updatedAt = r.updatedAt; saved.set(p.id, s); S.error = null; }
      catch (e) {
        S.error = e.message;
        if (Date.now() - toastAt > 4000) { toastAt = Date.now(); FL.kit.toast(FL.t('Could not save') + ': ' + e.message); }
      }
    }
    S.saving = false; S.lastSaved = Date.now(); S.emit('sync');
  };
  S.saveNow = async () => { savePrefs(); await S.flush(); };
  const deb = U.debounce(() => S.flush(), 450);
  S.save = () => { savePrefs(); S.saving = true; S.emit('sync'); deb(); };

  S.addAsset = async (src, projectId) => { const id = await API.putAsset(projectId, src); S.assets[id] = src; return id; };
  /** No Apps Script as imagens vêm sob demanda (só para membros do projeto). */
  const pending = new Map();
  S.ensureAsset = (projectId, id) => {
    if (S.assets[id] || !API.getAsset) return Promise.resolve(S.assets[id]);
    if (!pending.has(id)) pending.set(id, API.getAsset(projectId, id).then((src) => (S.assets[id] = src)).catch(() => null));
    return pending.get(id);
  };
  S.reset = async () => { await API.reset(); await S.load(); };

  /* ---------- Projetos (via servidor) ---------- */
  S.createProject = async (p) => { const c = await API.createProject(p); S.state.projects.unshift(c); saved.set(c.id, sig(c)); return c; };
  S.deleteProject = async (id) => { await API.deleteProject(id); S.state.projects = S.state.projects.filter((p) => p.id !== id); saved.delete(id); };
  S.reloadSession = async () => { await S.load(); S.emit('session'); };

  /* ---------- Eventos ---------- */
  S.on = (fn) => { S.listeners.add(fn); return () => S.listeners.delete(fn); };
  S.emit = (evt, data) => S.listeners.forEach((fn) => { try { fn(evt, data); } catch (e) { console.error(e); } });

  /* ---------- Acesso ---------- */
  S.project = (id) => S.state.projects.find((p) => p.id === id);
  S.page = (p, id) => p && p.pages.find((g) => g.id === id);
  S.touch = (p) => { S.save(); };
  S.role = (p) => (p && p._role) || null;
  S.canEdit = (p) => ['owner', 'editor'].includes(S.role(p));
  S.isOwner = (p) => S.role(p) === 'owner';
  S.log = (p, text, who) => {
    if (!p) return; p.activity = p.activity || [];
    p.activity.unshift({ ts: Date.now(), who: who || S.state.me, text });
    p.activity.length = Math.min(p.activity.length, 200);
  };
  S.activity = () => S.state.projects.flatMap((p) => (p.activity || []).map((a) => ({ ...a, projectId: p.id }))).sort((a, b) => b.ts - a.ts);
  S.people = () => {
    const set = new Set(S.state.directory.map((d) => d.name));
    S.state.projects.forEach((p) => { p.team.forEach((t) => set.add(t.name)); p.tasks.forEach((t) => t.owner && set.add(t.owner)); });
    return [...set].sort();
  };
  S.nameOf = (email) => { const d = S.state.directory.find((x) => x.email.toLowerCase() === String(email).toLowerCase()); return d ? d.name : String(email).split('@')[0]; };
  S.emailOf = (name) => { const d = S.state.directory.find((x) => x.name === name); return d ? d.email : null; };

  /* ---------- Histórico (undo/redo por escopo: 'plan:<pid>', 'page:<pgid>') ---------- */
  const H = {};
  const hk = (k) => (H[k] = H[k] || { u: [], r: [] });
  /** Guarda o estado anterior antes de uma mutação. snap é string JSON. */
  S.record = (key, snap) => { const h = hk(key); h.u.push(snap); if (h.u.length > 120) h.u.shift(); h.r.length = 0; };
  S.undo = (key, current) => { const h = hk(key); if (!h.u.length) return null; h.r.push(current); return h.u.pop(); };
  S.redo = (key, current) => { const h = hk(key); if (!h.r.length) return null; h.u.push(current); return h.r.pop(); };
  S.canUndo = (key) => hk(key).u.length > 0;
  S.canRedo = (key) => hk(key).r.length > 0;

  /* ---------- Export / import (só os projetos que o usuário vê) ---------- */
  S.exportJSON = () => {
    const ids = new Set(); const projects = S.state.projects.map((p) => { const c = U.clone(p); delete c._role; delete c._requests; JSON.stringify(c).replace(/IMG-[A-Z0-9]{16}|img_[a-z0-9]+/g, (m) => ids.add(m)); return c; });
    const assets = {}; ids.forEach((id) => { if (S.assets[id]) assets[id] = S.assets[id]; });
    return JSON.stringify({ app: 'flowline', v: FL.SCHEMA, exportedBy: S.state.meEmail, exportedAt: new Date().toISOString(), projects, assets });
  };
  S.importJSON = async (text) => {
    const o = JSON.parse(text);
    if (!o || !Array.isArray(o.projects)) throw new Error('Invalid Flowline file');
    for (const [id, src] of Object.entries(o.assets || {})) { S.assets[id] = src; try { await FL.api.importAsset(id, src); } catch (_) { } }
    // cada projeto importado vira um projeto novo do usuário atual (o servidor gera um ID novo)
    for (const p of o.projects) { const c = U.clone(p); c.name = c.name + ' (imported)'; delete c.members; await S.createProject(c); }
    return o.projects.length;
  };
})(window.FL);

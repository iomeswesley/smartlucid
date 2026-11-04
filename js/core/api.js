/* Flowline · API de dados.
   A interface é a mesma que o Apps Script vai expor (gas/Code.gs). O cliente nunca lê "a planilha":
   ele pede ao servidor só os projetos em que o usuário logado é membro, e o servidor confere
   o papel (owner / editor / viewer) a cada gravação.

   - FL.api.mode === 'gas'   → google.script.run (produção, usuário vem do login Google)
   - FL.api.mode === 'local' → backend simulado em IndexedDB, com as MESMAS regras de acesso,
                               para o protótipo funcionar sem servidor. */
(function (FL) {
  const U = FL.util;
  FL.CONFIG = { domain: 'whirlpool.com', appName: 'Flowline' };
  const API = (FL.api = {});
  const isGas = typeof google !== 'undefined' && google.script && google.script.run;
  API.mode = isGas ? 'gas' : 'local';

  /* ---------- Adaptador Apps Script ---------- */
  const gas = (fn, ...args) => new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler((e) => rej(new Error(e && e.message ? e.message : String(e))))[fn](...args));

  /* ---------- Backend local (simula o servidor) ---------- */
  const L = {};
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('flowline', 2);
    r.onupgradeneeded = () => { ['kv', 'assets'].forEach((n) => { if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n); }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (store, mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(store, mode); const r = fn(t.objectStore(store)); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); };
  const get = (s, k) => tx(s, 'readonly', (o) => o.get(k));
  const put = (s, k, v) => tx(s, 'readwrite', (o) => o.put(v, k));
  const clear = (s) => tx(s, 'readwrite', (o) => o.clear());

  /** ID não adivinhável: PRJ- + 16 caracteres base32 de crypto.getRandomValues (80 bits). */
  API.newId = (prefix = 'PRJ-') => { const a = new Uint8Array(16); crypto.getRandomValues(a); const al = 'ABCDEFGHJKMNPQRSTVWXYZ0123456789'; let s = ''; for (let i = 0; i < 16; i++) s += al[a[i] & 31]; return prefix + s; };
  const norm = (e) => String(e || '').trim().toLowerCase();
  const roleOf = (p, email) => { const m = (p.members || []).find((x) => norm(x.email) === norm(email)); return m ? m.role : null; };
  const fail = (msg) => { throw new Error(msg); };

  L.server = null;
  L.load = async () => {
    if (L.server) return L.server;
    let s = await get('kv', 'server');
    if (!s || s.v !== FL.SCHEMA) { s = FL.seedServer(); await put('kv', 'server', s); await clear('assets'); }
    L.server = s; return s;
  };
  const persist = () => put('kv', 'server', L.server);
  L.currentEmail = () => { try { return localStorage.getItem('fl-demo-user') || L.server.users[0].email; } catch (_) { return L.server.users[0].email; } };
  const audit = (pid, email, action) => { L.server.audit.unshift({ ts: Date.now(), projectId: pid, email, action }); L.server.audit.length = Math.min(L.server.audit.length, 500); };
  const visibleCopy = (p, email) => {
    const c = U.clone(p); const role = roleOf(p, email); c._role = role;
    c._requests = role === 'owner' || role === 'editor' ? L.server.requests.filter((r) => r.projectId === p.id && r.status === 'pending') : [];
    return c;
  };

  const local = {
    async session() {
      const s = await L.load(); const email = L.currentEmail();
      const user = s.users.find((u) => norm(u.email) === norm(email)) || s.users[0];
      const projects = Object.values(s.projects).filter((p) => roleOf(p, user.email)).map((p) => visibleCopy(p, user.email));
      return { user, directory: s.users.map(({ email, name, title }) => ({ email, name, title })), projects };
    },
    async saveProject(p) {
      const s = await L.load(); const email = L.currentEmail(); const cur = s.projects[p.id];
      if (!cur) fail('Project not found');
      const role = roleOf(cur, email);
      if (!role) fail('Project not found'); // não-membro recebe a mesma resposta de um ID inexistente
      if (role !== 'owner' && role !== 'editor') fail('You have view-only access to this project');
      // o servidor é dono de: id, membros, versão, datas de criação. O cliente não consegue alterar isso.
      const next = U.clone(p); delete next._role; delete next._requests;
      next.id = cur.id; next.members = cur.members; next.ownerEmail = cur.ownerEmail; next.createdAt = cur.createdAt;
      next.version = (cur.version || 0) + 1; next.updatedAt = Date.now(); next.updatedBy = email;
      s.projects[p.id] = next; audit(p.id, email, 'save'); await persist();
      return { version: next.version, updatedAt: next.updatedAt };
    },
    async createProject(p) {
      const s = await L.load(); const email = L.currentEmail();
      const next = U.clone(p); next.id = API.newId(); next.ownerEmail = email;
      next.members = [{ email, role: 'owner', addedBy: email, addedAt: Date.now() }];
      next.version = 1; next.createdAt = next.updatedAt = Date.now();
      s.projects[next.id] = next; audit(next.id, email, 'create'); await persist();
      return visibleCopy(next, email);
    },
    async deleteProject(id) {
      const s = await L.load(); const email = L.currentEmail(); const cur = s.projects[id];
      if (!cur || roleOf(cur, email) !== 'owner') fail('Only the owner can delete a project');
      delete s.projects[id]; audit(id, email, 'delete'); await persist(); return true;
    },
    async share(id, target, role) {
      const s = await L.load(); const email = L.currentEmail(); const cur = s.projects[id];
      const mine = cur && roleOf(cur, email);
      if (!mine) fail('Project not found');
      if (mine !== 'owner' && mine !== 'editor') fail('Only owners and editors can share');
      target = norm(target);
      if (!target.endsWith('@' + FL.CONFIG.domain)) fail(`Only @${FL.CONFIG.domain} accounts can be added`);
      if (!['editor', 'viewer'].includes(role)) fail('Invalid role');
      const ex = cur.members.find((m) => norm(m.email) === target);
      if (ex) { if (ex.role === 'owner') fail('The owner always has full access'); if (mine !== 'owner') fail('Only the owner can change roles'); ex.role = role; }
      else cur.members.push({ email: target, role, addedBy: email, addedAt: Date.now() });
      if (!s.users.some((u) => norm(u.email) === target)) s.users.push({ email: target, name: target.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), title: '' });
      s.requests.forEach((r) => { if (r.projectId === id && norm(r.email) === target && r.status === 'pending') r.status = 'approved'; });
      audit(id, email, `share:${target}:${role}`); await persist();
      return cur.members;
    },
    async unshare(id, target) {
      const s = await L.load(); const email = L.currentEmail(); const cur = s.projects[id];
      const mine = cur && roleOf(cur, email); target = norm(target);
      if (!(mine === 'owner' || (target === norm(email) && mine))) fail('Only the owner can remove people');
      if (roleOf(cur, target) === 'owner') fail('The owner cannot be removed');
      cur.members = cur.members.filter((m) => norm(m.email) !== target);
      audit(id, email, `unshare:${target}`); await persist(); return cur.members;
    },
    async transferOwnership(id, target) {
      const s = await L.load(); const email = L.currentEmail(); const cur = s.projects[id];
      if (!cur || roleOf(cur, email) !== 'owner') fail('Only the owner can transfer ownership');
      const m = cur.members.find((x) => norm(x.email) === norm(target)); if (!m) fail('Add the person first');
      cur.members.forEach((x) => { if (x.role === 'owner') x.role = 'editor'; }); m.role = 'owner'; cur.ownerEmail = m.email;
      audit(id, email, `owner:${target}`); await persist(); return cur.members;
    },
    async requestAccess(id, note) {
      const s = await L.load(); const email = L.currentEmail(); const cur = s.projects[id];
      // não revela se o projeto existe: responde igual nos dois casos
      if (cur && !roleOf(cur, email) && !s.requests.some((r) => r.projectId === id && norm(r.email) === norm(email) && r.status === 'pending')) {
        s.requests.push({ id: API.newId('REQ-'), projectId: id, email, note: note || '', ts: Date.now(), status: 'pending' }); await persist();
      }
      return true;
    },
    async answerRequest(reqId, approve, role = 'editor') {
      const s = await L.load(); const r = s.requests.find((x) => x.id === reqId); if (!r) fail('Request not found');
      if (approve) await local.share(r.projectId, r.email, role);
      else { const cur = s.projects[r.projectId]; const mine = cur && roleOf(cur, L.currentEmail()); if (mine !== 'owner' && mine !== 'editor') fail('Not allowed'); r.status = 'denied'; await persist(); }
      return true;
    },
    async importAsset(id, dataURL) { await put('assets', id, dataURL); return id; },
    async putAsset(projectId, dataURL) { const id = API.newId('IMG-'); await put('assets', id, dataURL); return id; },
    async getAssets() { const d = await db(); return new Promise((res) => { const out = {}; const t = d.transaction('assets'); t.objectStore('assets').openCursor().onsuccess = (e) => { const c = e.target.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); }; }); },
    async reset() { await clear('assets'); L.server = FL.seedServer(); await put('kv', 'server', L.server); return true; },
    /* só no protótipo: trocar de usuário para demonstrar o controle de acesso */
    async demoSwitchUser(email) { try { localStorage.setItem('fl-demo-user', email); } catch (_) { } return true; },
  };

  const remote = {
    session: () => gas('apiSession'),
    saveProject: (p) => gas('apiSaveProject', JSON.stringify(p)),
    createProject: (p) => gas('apiCreateProject', JSON.stringify(p)),
    deleteProject: (id) => gas('apiDeleteProject', id),
    share: (id, email, role) => gas('apiShare', id, email, role),
    unshare: (id, email) => gas('apiUnshare', id, email),
    transferOwnership: (id, email) => gas('apiTransferOwnership', id, email),
    requestAccess: (id, note) => gas('apiRequestAccess', id, note || ''),
    answerRequest: (reqId, approve, role) => gas('apiAnswerRequest', reqId, approve, role || 'editor'),
    putAsset: (pid, dataURL) => gas('apiPutAsset', pid, dataURL),
    importAsset: (id, dataURL) => gas('apiPutAsset', null, dataURL),
    getAssets: async () => ({}),
    getAsset: (pid, id) => gas('apiGetAsset', pid, id),
    reset: async () => false,
    demoSwitchUser: async () => false,
  };

  Object.assign(API, isGas ? remote : local);
  API.roleOf = roleOf;
})(window.FL);

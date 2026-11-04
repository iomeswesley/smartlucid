/**
 * Flowline · backend Apps Script.
 *
 * Modelo de segurança
 * - O web app roda como o DONO do script (conta de serviço da OpEx) e só aceita contas do domínio.
 *   A planilha NÃO é compartilhada com ninguém: os usuários nunca a abrem, só falam com estas funções.
 * - O usuário é sempre Session.getActiveUser() — o cliente não consegue dizer "sou fulano".
 * - Toda função confere o papel do usuário no projeto (owner / editor / viewer) antes de ler ou gravar.
 * - O conteúdo dos projetos, nomes e e-mails ficam cifrados na planilha (Crypto.gs). Índices usam hash.
 * - Não-membros recebem a mesma resposta para "não existe" e "sem acesso" (não vaza a existência).
 *
 * Abas da planilha (criadas pelo setup()):
 *   Users     email_hash | email_enc | name_enc | title_enc | created_at
 *   Projects  project_id | owner_hash | version | updated_at | updated_by_hash | parts
 *   Members   project_id | email_hash | email_enc | role | added_by_hash | added_at
 *   Blobs     project_id | part | data
 *   Requests  request_id | project_id | email_hash | email_enc | note_enc | ts | status
 *   Assets    asset_id | project_id | drive_file_id | created_at
 *   Audit     ts | project_id | email_hash | action
 */

var FL_DOMAIN = 'whirlpool.com';          // só contas deste domínio entram
var FL_DEFAULT_SHEET_ID = '1Dsjv0WHMq-V_nXyf0Xyfl3FCtse20PIK6UhYOrLpUzE'; // planilha smartLucid
var FL_CELL_LIMIT = 45000;               // limite seguro por célula (o Sheets aceita 50.000)
var FL_TABS = {
  Users: ['email_hash', 'email_enc', 'name_enc', 'title_enc', 'created_at'],
  Projects: ['project_id', 'owner_hash', 'version', 'updated_at', 'updated_by_hash', 'parts'],
  Members: ['project_id', 'email_hash', 'email_enc', 'role', 'added_by_hash', 'added_at'],
  Blobs: ['project_id', 'part', 'data'],
  Requests: ['request_id', 'project_id', 'email_hash', 'email_enc', 'note_enc', 'ts', 'status'],
  Assets: ['asset_id', 'project_id', 'drive_file_id', 'created_at'],
  Audit: ['ts', 'project_id', 'email_hash', 'action'],
};

/* ====================================================================== */
/* Web app                                                                 */
/* ====================================================================== */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Flowline · OpEx Workspace')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}
function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }

/** Rodar UMA vez pelo editor: cria as abas, as chaves e a pasta de imagens. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  ['FL_ENC_KEY', 'FL_MAC_KEY', 'FL_IDX_KEY'].forEach(function (k) {
    if (!props.getProperty(k)) props.setProperty(k, Utilities.base64Encode(randomBytes_(32)));
  });
  if (!props.getProperty('FL_SHEET_ID')) props.setProperty('FL_SHEET_ID', FL_DEFAULT_SHEET_ID || SpreadsheetApp.create('Flowline · database (do not share)').getId());
  if (!props.getProperty('FL_ASSET_FOLDER')) props.setProperty('FL_ASSET_FOLDER', DriveApp.createFolder('Flowline · images (do not share)').getId());
  var book = db_();
  Object.keys(FL_TABS).forEach(function (name) {
    var sh = book.getSheetByName(name) || book.insertSheet(name);
    sh.getRange(1, 1, 1, FL_TABS[name].length).setValues([FL_TABS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  var first = book.getSheetByName('Sheet1') || book.getSheetByName('Página1'); if (first && book.getSheets().length > 1) book.deleteSheet(first);
  // proteção extra: só o dono edita, mesmo se alguém receber acesso por engano
  book.getSheets().forEach(function (sh) { var p = sh.protect(); p.removeEditors(p.getEditors()); if (p.canDomainEdit()) p.setDomainEdit(false); });
  Logger.log('Flowline ready. Database: ' + book.getUrl());
}

/* ====================================================================== */
/* API (chamada pelo cliente via google.script.run — ver js/core/api.js)   */
/* ====================================================================== */

function apiSession() {
  var me = currentUser_();
  var mine = rows_('Members').filter(function (r) { return r.email_hash === me.hash; });
  var ids = {}; mine.forEach(function (r) { ids[r.project_id] = r.role; });
  var projects = Object.keys(ids).map(function (id) { return readProject_(id, me); }).filter(Boolean);
  var directory = rows_('Users').map(function (u) { return { email: decrypt_(u.email_enc), name: decrypt_(u.name_enc), title: u.title_enc ? decrypt_(u.title_enc) : '' }; });
  return { user: { email: me.email, name: me.name, title: me.title }, directory: directory, projects: projects, appUrl: ScriptApp.getService().getUrl() };
}

function apiSaveProject(json) {
  var me = currentUser_();
  var p = JSON.parse(json);
  return withLock_(function () {
    var role = roleOf_(p.id, me.hash);
    if (!role) throw new Error('Project not found');
    if (role !== 'owner' && role !== 'editor') throw new Error('You have view-only access to this project');
    var head = findRow_('Projects', 'project_id', p.id);
    var serverVersion = Number(head.row.version) || 0;
    // só é conflito se a versão mais nova foi gravada por OUTRA pessoa (a própria gravação anterior não conta)
    if (p.version && Number(p.version) < serverVersion && head.row.updated_by_hash !== me.hash) throw new Error('CONFLICT: someone else saved a newer version. Reload the project.');
    // campos controlados pelo servidor
    delete p._role; delete p._requests; delete p.members;
    p.version = serverVersion + 1; p.updatedAt = Date.now(); p.updatedBy = me.email;
    writeBlob_(p.id, JSON.stringify(p));
    setCells_('Projects', head.index, { version: p.version, updated_at: p.updatedAt, updated_by_hash: me.hash });
    audit_(p.id, me.hash, 'save');
    return { version: p.version, updatedAt: p.updatedAt };
  });
}

function apiCreateProject(json) {
  var me = currentUser_();
  var p = JSON.parse(json);
  return withLock_(function () {
    p.id = newId_('PRJ-'); p.ownerEmail = me.email; p.version = 1; p.createdAt = p.updatedAt = Date.now();
    delete p._role; delete p._requests; delete p.members;
    append_('Projects', { project_id: p.id, owner_hash: me.hash, version: 1, updated_at: p.updatedAt, updated_by_hash: me.hash, parts: 0 });
    append_('Members', { project_id: p.id, email_hash: me.hash, email_enc: encrypt_(me.email), role: 'owner', added_by_hash: me.hash, added_at: Date.now() });
    writeBlob_(p.id, JSON.stringify(p));
    audit_(p.id, me.hash, 'create');
    return readProject_(p.id, me);
  });
}

function apiDeleteProject(id) {
  var me = currentUser_();
  return withLock_(function () {
    if (roleOf_(id, me.hash) !== 'owner') throw new Error('Only the owner can delete a project');
    ['Projects', 'Members', 'Blobs', 'Requests', 'Assets'].forEach(function (t) { deleteWhere_(t, 'project_id', id); });
    audit_(id, me.hash, 'delete');
    return true;
  });
}

function apiShare(id, email, role) {
  var me = currentUser_();
  email = String(email || '').trim().toLowerCase();
  return withLock_(function () {
    var mine = roleOf_(id, me.hash);
    if (!mine) throw new Error('Project not found');
    if (mine !== 'owner' && mine !== 'editor') throw new Error('Only owners and editors can share');
    if (!new RegExp('^[^@\\s]+@' + FL_DOMAIN.replace('.', '\\.') + '$').test(email)) throw new Error('Only @' + FL_DOMAIN + ' accounts can be added');
    if (role !== 'editor' && role !== 'viewer') throw new Error('Invalid role');
    var h = emailHash_(email);
    var ex = memberRow_(id, h);
    if (ex) {
      if (ex.row.role === 'owner') throw new Error('The owner always has full access');
      if (mine !== 'owner') throw new Error('Only the owner can change roles');
      setCells_('Members', ex.index, { role: role });
    } else {
      append_('Members', { project_id: id, email_hash: h, email_enc: encrypt_(email), role: role, added_by_hash: me.hash, added_at: Date.now() });
      ensureUser_(email);
    }
    rows_('Requests').forEach(function (r, i) { if (r.project_id === id && r.email_hash === h && r.status === 'pending') setCells_('Requests', i, { status: 'approved' }); });
    audit_(id, me.hash, 'share:' + h + ':' + role);
    return membersOf_(id);
  });
}

function apiUnshare(id, email) {
  var me = currentUser_();
  var h = emailHash_(email);
  return withLock_(function () {
    var mine = roleOf_(id, me.hash);
    if (!(mine === 'owner' || (h === me.hash && mine))) throw new Error('Only the owner can remove people');
    var m = memberRow_(id, h);
    if (!m) return membersOf_(id);
    if (m.row.role === 'owner') throw new Error('The owner cannot be removed');
    sheet_('Members').deleteRow(m.index + 2);
    audit_(id, me.hash, 'unshare:' + h);
    return membersOf_(id);
  });
}

function apiTransferOwnership(id, email) {
  var me = currentUser_();
  var h = emailHash_(email);
  return withLock_(function () {
    if (roleOf_(id, me.hash) !== 'owner') throw new Error('Only the owner can transfer ownership');
    var target = memberRow_(id, h); if (!target) throw new Error('Add the person first');
    var current = memberRow_(id, me.hash);
    setCells_('Members', current.index, { role: 'editor' });
    setCells_('Members', target.index, { role: 'owner' });
    var head = findRow_('Projects', 'project_id', id); setCells_('Projects', head.index, { owner_hash: h });
    audit_(id, me.hash, 'owner:' + h);
    return membersOf_(id);
  });
}

function apiRequestAccess(id, note) {
  var me = currentUser_();
  return withLock_(function () {
    var exists = !!findRow_('Projects', 'project_id', id);
    var pending = rows_('Requests').some(function (r) { return r.project_id === id && r.email_hash === me.hash && r.status === 'pending'; });
    if (exists && !roleOf_(id, me.hash) && !pending) {
      append_('Requests', { request_id: newId_('REQ-'), project_id: id, email_hash: me.hash, email_enc: encrypt_(me.email), note_enc: encrypt_(String(note || '').slice(0, 500)), ts: Date.now(), status: 'pending' });
    }
    return true; // mesma resposta exista ou não o projeto
  });
}

function apiAnswerRequest(reqId, approve, role) {
  var me = currentUser_();
  var r = findRow_('Requests', 'request_id', reqId); if (!r) throw new Error('Request not found');
  var mine = roleOf_(r.row.project_id, me.hash);
  if (mine !== 'owner' && mine !== 'editor') throw new Error('Not allowed');
  if (approve) return apiShare(r.row.project_id, decrypt_(r.row.email_enc), role || 'editor');
  setCells_('Requests', r.index, { status: 'denied' });
  return true;
}

/** Imagens: arquivo no Drive do dono do script (não compartilhado), servido só para membros. */
function apiPutAsset(projectId, dataURL) {
  var me = currentUser_();
  if (projectId) { var role = roleOf_(projectId, me.hash); if (role !== 'owner' && role !== 'editor') throw new Error('Not allowed'); }
  var m = String(dataURL).match(/^data:([\w/+.-]+);base64,(.*)$/); if (!m) throw new Error('Invalid image');
  var id = newId_('IMG-');
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], id);
  var file = DriveApp.getFolderById(prop_('FL_ASSET_FOLDER')).createFile(blob);
  append_('Assets', { asset_id: id, project_id: projectId || '', drive_file_id: file.getId(), created_at: Date.now() });
  return id;
}
function apiGetAsset(projectId, assetId) {
  var me = currentUser_();
  if (!roleOf_(projectId, me.hash)) throw new Error('Not found');
  var a = findRow_('Assets', 'asset_id', assetId);
  if (!a || (a.row.project_id && a.row.project_id !== projectId)) throw new Error('Not found');
  var blob = DriveApp.getFileById(a.row.drive_file_id).getBlob();
  return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
}

/* ====================================================================== */
/* Internos                                                                */
/* ====================================================================== */

function currentUser_() {
  var email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email || email.split('@')[1] !== FL_DOMAIN) throw new Error('Sign in with your @' + FL_DOMAIN + ' account');
  var hash = emailHash_(email);
  var u = ensureUser_(email);
  return { email: email, hash: hash, name: u.name, title: u.title };
}
function ensureUser_(email) {
  var h = emailHash_(email);
  var f = findRow_('Users', 'email_hash', h);
  if (f) return { name: decrypt_(f.row.name_enc), title: f.row.title_enc ? decrypt_(f.row.title_enc) : '' };
  var name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  append_('Users', { email_hash: h, email_enc: encrypt_(email), name_enc: encrypt_(name), title_enc: '', created_at: Date.now() });
  return { name: name, title: '' };
}
function readProject_(id, me) {
  var role = roleOf_(id, me.hash); if (!role) return null;
  var json = readBlob_(id); if (!json) return null;
  var p = JSON.parse(json);
  p.members = membersOf_(id); p._role = role;
  p.version = Number(findRow_('Projects', 'project_id', id).row.version);
  p._requests = role === 'owner' || role === 'editor'
    ? rows_('Requests').filter(function (r) { return r.project_id === id && r.status === 'pending'; }).map(function (r) { return { id: r.request_id, projectId: id, email: decrypt_(r.email_enc), note: decrypt_(r.note_enc), ts: Number(r.ts), status: r.status }; })
    : [];
  return p;
}
function membersOf_(id) {
  return rows_('Members').filter(function (r) { return r.project_id === id; }).map(function (r) { return { email: decrypt_(r.email_enc), role: r.role, addedAt: Number(r.added_at) }; });
}
function roleOf_(id, hash) { var m = memberRow_(id, hash); return m ? m.row.role : null; }
function memberRow_(id, hash) {
  var rs = rows_('Members');
  for (var i = 0; i < rs.length; i++) if (rs[i].project_id === id && rs[i].email_hash === hash) return { row: rs[i], index: i };
  return null;
}

/* Blob do projeto: JSON cifrado, quebrado em partes de até 45k caracteres. */
function writeBlob_(id, json) {
  var token = encrypt_(json);
  var parts = []; for (var i = 0; i < token.length; i += FL_CELL_LIMIT) parts.push(token.slice(i, i + FL_CELL_LIMIT));
  deleteWhere_('Blobs', 'project_id', id);
  var sh = sheet_('Blobs');
  if (parts.length) sh.getRange(sh.getLastRow() + 1, 1, parts.length, 3).setValues(parts.map(function (d, k) { return [id, k, d]; }));
  var head = findRow_('Projects', 'project_id', id); if (head) setCells_('Projects', head.index, { parts: parts.length });
  invalidate_('Blobs');
}
function readBlob_(id) {
  var parts = rows_('Blobs').filter(function (r) { return r.project_id === id; }).sort(function (a, b) { return a.part - b.part; });
  return parts.length ? decrypt_(parts.map(function (r) { return r.data; }).join('')) : null;
}

/* Planilha */
function prop_(k) { var v = PropertiesService.getScriptProperties().getProperty(k); if (!v) throw new Error('Run setup() first'); return v; }
var DB_ = null; function db_() { return DB_ || (DB_ = SpreadsheetApp.openById(prop_('FL_SHEET_ID'))); }
function sheet_(name) { return db_().getSheetByName(name); }
var CACHE_ = {};
function invalidate_(name) { delete CACHE_[name]; }
function rows_(name) {
  if (CACHE_[name]) return CACHE_[name];
  var sh = sheet_(name); var n = sh.getLastRow() - 1; var head = FL_TABS[name];
  var vals = n > 0 ? sh.getRange(2, 1, n, head.length).getValues() : [];
  return (CACHE_[name] = vals.map(function (v) { var o = {}; head.forEach(function (h, i) { o[h] = typeof v[i] === 'number' ? v[i] : String(v[i]); }); return o; }));
}
function findRow_(name, col, val) { var rs = rows_(name); for (var i = 0; i < rs.length; i++) if (rs[i][col] === val) return { row: rs[i], index: i }; return null; }
function append_(name, obj) { sheet_(name).appendRow(FL_TABS[name].map(function (h) { return obj[h] === undefined ? '' : obj[h]; })); invalidate_(name); }
function setCells_(name, index, obj) {
  var sh = sheet_(name); var head = FL_TABS[name];
  Object.keys(obj).forEach(function (k) { sh.getRange(index + 2, head.indexOf(k) + 1).setValue(obj[k]); });
  invalidate_(name);
}
function deleteWhere_(name, col, val) {
  var rs = rows_(name); var sh = sheet_(name);
  for (var i = rs.length - 1; i >= 0; i--) if (rs[i][col] === val) sh.deleteRow(i + 2);
  invalidate_(name);
}
function audit_(pid, hash, action) { append_('Audit', { ts: Date.now(), project_id: pid, email_hash: hash, action: action }); }
function withLock_(fn) { var l = LockService.getScriptLock(); l.waitLock(20000); try { return fn(); } finally { l.releaseLock(); } }
function newId_(prefix) {
  var al = 'ABCDEFGHJKMNPQRSTVWXYZ0123456789'; var b = randomBytes_(16); var s = '';
  for (var i = 0; i < 16; i++) s += al[b[i] & 31];
  return prefix + s;
}

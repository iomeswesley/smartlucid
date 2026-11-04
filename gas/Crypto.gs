/**
 * Flowline · criptografia dos dados guardados na planilha.
 *
 * O Apps Script não tem AES nativo, então usamos uma construção padrão baseada só em HMAC-SHA256,
 * que existe no Utilities:
 *   - cifra:      keystream = HMAC(K_enc, nonce || contador)   (HMAC como PRF em modo CTR)
 *   - integridade: tag = HMAC(K_mac, versão || nonce || cifrado) (encrypt-then-MAC)
 *   - índice:     hash = HMAC(K_idx, email)  → permite achar "projetos do usuário X" sem gravar o e-mail
 * O conteúdo é comprimido (gzip) antes de cifrar. Chaves de 256 bits ficam em Script Properties,
 * fora da planilha: quem abrir a planilha vê apenas texto cifrado e hashes.
 */

var FL_CRYPTO_VERSION = 'v1';

function cryptoKeys_() {
  var props = PropertiesService.getScriptProperties();
  var k = props.getProperties();
  if (!k.FL_ENC_KEY || !k.FL_MAC_KEY || !k.FL_IDX_KEY) throw new Error('Flowline is not set up. Run setup() once from the Apps Script editor.');
  return {
    enc: Utilities.base64Decode(k.FL_ENC_KEY),
    mac: Utilities.base64Decode(k.FL_MAC_KEY),
    idx: Utilities.base64Decode(k.FL_IDX_KEY),
  };
}

/** 32 bytes aleatórios (UUIDs v4 do Apps Script + SHA-256). */
function randomBytes_(n) {
  var out = [];
  while (out.length < n) {
    var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now() + Math.random());
    out = out.concat(d);
  }
  return out.slice(0, n);
}

function hmac_(key, bytes) {
  return Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, bytes, key);
}

function int32_(i) { return [(i >>> 24) & 255, (i >>> 16) & 255, (i >>> 8) & 255, i & 255].map(toSigned_); }
function toSigned_(b) { return (b << 24) >> 24; }

function keystreamXor_(key, nonce, data) {
  var out = new Array(data.length);
  var block = null;
  for (var i = 0; i < data.length; i++) {
    if (i % 32 === 0) block = hmac_(key, nonce.concat(int32_(i / 32)));
    out[i] = toSigned_(data[i] ^ block[i % 32]);
  }
  return out;
}

/** Comparação em tempo constante (evita ataque de timing na verificação do tag). */
function sameBytes_(a, b) {
  if (a.length !== b.length) return false;
  var r = 0;
  for (var i = 0; i < a.length; i++) r |= (a[i] ^ b[i]);
  return r === 0;
}

/** Texto → "v1.<nonce>.<cifrado>.<tag>" (base64 web-safe). */
function encrypt_(plain) {
  var k = cryptoKeys_();
  var data = Utilities.gzip(Utilities.newBlob(String(plain), 'application/json')).getBytes();
  var nonce = randomBytes_(16);
  var cipher = keystreamXor_(k.enc, nonce, data);
  var tag = hmac_(k.mac, Utilities.newBlob(FL_CRYPTO_VERSION).getBytes().concat(nonce, cipher));
  var b = Utilities.base64EncodeWebSafe;
  return [FL_CRYPTO_VERSION, b(nonce), b(cipher), b(tag)].join('.');
}

function decrypt_(token) {
  if (!token) return '';
  var parts = String(token).split('.');
  if (parts.length !== 4 || parts[0] !== FL_CRYPTO_VERSION) throw new Error('Unsupported or corrupted record');
  var k = cryptoKeys_();
  var d = Utilities.base64DecodeWebSafe;
  var nonce = d(parts[1]), cipher = d(parts[2]), tag = d(parts[3]);
  var expect = hmac_(k.mac, Utilities.newBlob(FL_CRYPTO_VERSION).getBytes().concat(nonce, cipher));
  if (!sameBytes_(tag, expect)) throw new Error('Integrity check failed — record was modified outside Flowline');
  var data = keystreamXor_(k.enc, nonce, cipher);
  return Utilities.ungzip(Utilities.newBlob(data, 'application/x-gzip')).getDataAsString();
}

/** Hash determinístico do e-mail (para índices de acesso). */
function emailHash_(email) {
  var k = cryptoKeys_();
  var sig = hmac_(k.idx, Utilities.newBlob(String(email).trim().toLowerCase()).getBytes());
  return sig.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

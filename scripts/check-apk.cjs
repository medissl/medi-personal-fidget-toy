const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  zlib = require('node:zlib'),
  crypto = require('node:crypto');
const apk = path.resolve(process.argv[2] || path.join(__dirname, '../No-No-Stress.apk')),
  bytes = fs.readFileSync(apk);
const end = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
assert(end >= 0, 'ZIP footer');
const count = bytes.readUInt16LE(end + 10),
  entries = new Map();
let cursor = bytes.readUInt32LE(end + 16);
for (let i = 0; i < count; i++) {
  assert.equal(bytes.readUInt32LE(cursor), 0x02014b50, 'central-directory header');
  const method = bytes.readUInt16LE(cursor + 10),
    size = bytes.readUInt32LE(cursor + 20),
    nameLength = bytes.readUInt16LE(cursor + 28),
    extra = bytes.readUInt16LE(cursor + 30),
    comment = bytes.readUInt16LE(cursor + 32),
    local = bytes.readUInt32LE(cursor + 42);
  const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
  assert(!name.includes('\\'), 'Android cannot resolve backslash ZIP entry: ' + name);
  assert(!entries.has(name), 'duplicate ZIP path ' + name);
  assert.equal(bytes.readUInt32LE(local), 0x04034b50, 'local ZIP header');
  const localNameLength = bytes.readUInt16LE(local + 26),
    localExtra = bytes.readUInt16LE(local + 28),
    localName = bytes.subarray(local + 30, local + 30 + localNameLength).toString('utf8');
  assert.equal(localName, name, 'local/central name mismatch ' + name);
  assert.equal(bytes.readUInt16LE(local + 8), method);
  if (/^assets\/audio\/.*\.(mp3|wav)$/.test(name))
    assert.equal(method, 0, 'native audio must be stored ' + name);
  const start = local + 30 + localNameLength + localExtra;
  entries.set(name, { method, data: bytes.subarray(start, start + size) });
  cursor += 46 + nameLength + extra + comment;
}
let assets = 0;
function inspect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      inspect(file);
      continue;
    }
    const name =
        'assets/' + path.relative(path.join(__dirname, '../web'), file).replaceAll('\\', '/'),
      entryInZip = entries.get(name);
    assert(entryInZip, 'missing ' + name);
    const actual = entryInZip.method === 0 ? entryInZip.data : zlib.inflateRawSync(entryInZip.data);
    assert.equal(
      crypto.createHash('sha256').update(actual).digest('hex'),
      crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
      'payload ' + name
    );
    assets++;
  }
}
inspect(path.join(__dirname, '../web'));
console.log(
  'PASS: raw central/local ZIP names, ' + assets + ' exact assets, and uncompressed native audio.'
);

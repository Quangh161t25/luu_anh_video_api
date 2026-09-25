const fs = require('fs');
const crypto = require('crypto');

// Modular inverse using Extended Euclidean Algorithm for BigInt
function modInverse(a, m) {
  let [m0, x0, x1] = [m, 0n, 1n];
  if (m === 1n) return 0n;
  while (a > 1n) {
    const q = a / m;
    [a, m] = [m, a % m];
    [x0, x1] = [x1 - q * x0, x0];
  }
  if (x1 < 0n) x1 += m0;
  return x1;
}

// Convert BigInt to ASN.1 INTEGER Buffer
function bigIntToASN1Integer(n) {
  let hex = n.toString(16);
  if (hex.length % 2 !== 0) hex = '0' + hex;
  let buf = Buffer.from(hex, 'hex');
  // If MSB is 1, prepend 0x00 to make it positive integer
  if (buf[0] & 0x80) {
    buf = Buffer.concat([Buffer.from([0x00]), buf]);
  }
  let lenBytes;
  if (buf.length < 128) {
    lenBytes = Buffer.from([buf.length]);
  } else if (buf.length < 256) {
    lenBytes = Buffer.from([0x81, buf.length]);
  } else {
    lenBytes = Buffer.from([0x82, buf.length >> 8, buf.length & 0xff]);
  }
  return Buffer.concat([Buffer.from([0x02]), lenBytes, buf]);
}

function wrapSequence(buf) {
  let lenBytes;
  if (buf.length < 128) {
    lenBytes = Buffer.from([buf.length]);
  } else if (buf.length < 256) {
    lenBytes = Buffer.from([0x81, buf.length]);
  } else {
    lenBytes = Buffer.from([0x82, buf.length >> 8, buf.length & 0xff]);
  }
  return Buffer.concat([Buffer.from([0x30]), lenBytes, buf]);
}

function wrapOctetString(buf) {
  let lenBytes;
  if (buf.length < 128) {
    lenBytes = Buffer.from([buf.length]);
  } else if (buf.length < 256) {
    lenBytes = Buffer.from([0x81, buf.length]);
  } else {
    lenBytes = Buffer.from([0x82, buf.length >> 8, buf.length & 0xff]);
  }
  return Buffer.concat([Buffer.from([0x04]), lenBytes, buf]);
}

// Let's parse n, e, d, p, q, dp, dq from the raw DER
const raw = fs.readFileSync('service_account.pem', 'utf8')
  .replace(/-----BEGIN PRIVATE KEY-----/, '')
  .replace(/-----END PRIVATE KEY-----/, '')
  .replace(/\s+/g, '');
const der = Buffer.from(raw, 'base64');

function parseASN1(buf, offset) {
  const tag = buf[offset++];
  let len = buf[offset++];
  if (len & 0x80) {
    const numBytes = len & 0x7f;
    len = 0;
    for (let i = 0; i < numBytes; i++) {
      len = (len << 8) | buf[offset++];
    }
  }
  return { tag, len, offset, nextOffset: offset + len };
}

let p = 26 + 4; // Inner RSA Sequence offset
const items = [];
for (let i = 0; i < 8; i++) {
  const item = parseASN1(der, p);
  items.push(der.slice(item.offset, item.nextOffset));
  p = item.nextOffset;
}

const n = BigInt('0x' + items[1].toString('hex'));
const e = BigInt('0x' + items[2].toString('hex'));
const d = BigInt('0x' + items[3].toString('hex'));
const p_prime = BigInt('0x' + items[4].toString('hex'));
const q_prime = BigInt('0x' + items[5].toString('hex'));
const dp = BigInt('0x' + items[6].toString('hex'));
const dq = BigInt('0x' + items[7].toString('hex'));
const qinv = modInverse(q_prime, p_prime);

console.log('Recomputed qinv successfully!');

// Rebuild PKCS#1 RSA Private Key
const rsaDer = wrapSequence(Buffer.concat([
  bigIntToASN1Integer(0n),
  bigIntToASN1Integer(n),
  bigIntToASN1Integer(e),
  bigIntToASN1Integer(d),
  bigIntToASN1Integer(p_prime),
  bigIntToASN1Integer(q_prime),
  bigIntToASN1Integer(dp),
  bigIntToASN1Integer(dq),
  bigIntToASN1Integer(qinv)
]));

// Rebuild PKCS#8 Private Key
const algId = Buffer.from('300d06092a864886f70d0101010500', 'hex');
const pkcs8Der = wrapSequence(Buffer.concat([
  bigIntToASN1Integer(0n),
  algId,
  wrapOctetString(rsaDer)
]));

// Format as PEM
const b64 = pkcs8Der.toString('base64');
const lines = [];
for (let i = 0; i < b64.length; i += 64) {
  lines.push(b64.slice(i, i + 64));
}
const fixedPEM = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;

fs.writeFileSync('fixed_key.pem', fixedPEM);
console.log('Fixed PEM saved!');

// Test Signing with Node crypto
const testSign = crypto.createSign('RSA-SHA256');
testSign.update('test payload');
const signature = testSign.sign(fixedPEM, 'base64url');
console.log('Signature test:', signature.length > 50 ? 'SUCCESS!' : 'FAILED');

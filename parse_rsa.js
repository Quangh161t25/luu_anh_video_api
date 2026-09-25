const fs = require('fs');
const crypto = require('crypto');

const raw = fs.readFileSync('service_account.pem', 'utf8')
  .replace(/-----BEGIN PRIVATE KEY-----/, '')
  .replace(/-----END PRIVATE KEY-----/, '')
  .replace(/\s+/g, '');
const der = Buffer.from(raw, 'base64');

// Parse ASN.1 integers
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

try {
  let pos = 0;
  const seq = parseASN1(der, pos);
  console.log('Outer SEQ length:', seq.len);
  
  // Version
  const ver = parseASN1(der, seq.offset);
  // AlgorithmIdentifier
  const alg = parseASN1(der, ver.nextOffset);
  // OctetString
  const oct = parseASN1(der, alg.nextOffset);
  console.log('OCT length:', oct.len);

  // Inside OctetString -> Inner RSA SEQ
  let innerPos = oct.offset;
  const rsaSeq = parseASN1(der, innerPos);
  console.log('RSA SEQ length:', rsaSeq.len);

  let p = rsaSeq.offset;
  const fields = ['version', 'n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi'];
  const values = [];

  for (let i = 0; i < 9; i++) {
    if (p >= der.length) {
      console.log(`Field ${fields[i]} is truncated at offset ${p}`);
      break;
    }
    const item = parseASN1(der, p);
    const valBuf = der.slice(item.offset, Math.min(item.nextOffset, der.length));
    console.log(`Field ${fields[i]}: tag=${item.tag.toString(16)}, len=${item.len}, actual_len=${valBuf.length}`);
    values.push(valBuf);
    p = item.nextOffset;
  }
} catch (e) {
  console.log('Parse error:', e.message);
}

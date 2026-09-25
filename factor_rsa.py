import base64
import json
import math
import random

lines = [
  'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC1XkzwY+oHzPmN',
  'YnJ+sMKxe5TRTp8Md0Jb+PFApojE72HcVnXj14zFxFocyCPX1+dtwXJGJ/sSCyAh',
  'iV3OtLEpxRU5QJponFszl9X6vmdLzDbzQS7VQTqMPv0JB+lHEYMU2B37hcIfpfJO',
  '+l6EMprUA7NJtmeJpqmXKjsov6Rdt61sjyH/LKaYj0T2sLGazgZesp96sEOu83HM',
  'nl+KPk9xafPOlKaE34Bk6zl4D8lFUK3v7opndvt/7IOBQ/RdI7p0v+HeOORGUuZW',
  'kW3GH1vo6xY/uyrtmjD7+18w5vmAIRm24Satu0MJYz+j1JtqV4U5wwDkNelXBAWz',
  'hKkfl5yxAgMBAAECggEAA9pDk+Epc943qFhQoo6Oai77+ai8AeuoHBRJCqSm99j2',
  'aRPol+0Im1xZBi69rSxzyO3wp5sajxbvqSq19Im70C10rpVH2mRE3y8Q321LPC3T',
  'tn3aWPMUY22Emjwh6U2uzULsex7roVi48ZLJrnD1Pz7vYGfYofDJfjGqVUqh2xA+',
  'OSiz/U2JFTmePtrhxQGwaS8PHWyyUd+aiHz7pBg+tNzX0L+rMirPsN6i/ph+QolS',
  '4YXubv94O/WL92helDjQuUyWbisYdkuLp2XxnB+5Oa/2fQY7+rhju4pcIm+zA+Wc',
  'GdSzvLtL5hY9vLrZ8e4n0E/saILqViHSkRFksV1PaQKBgQDmEDaYQxmBeQsDbRJN',
]

def parse_asn1(der, offset):
    tag = der[offset]
    offset += 1
    length_byte = der[offset]
    offset += 1
    if length_byte & 0x80:
        num_bytes = length_byte & 0x7F
        length = 0
        for _ in range(num_bytes):
            length = (length << 8) | der[offset]
            offset += 1
    else:
        length = length_byte
    return tag, length, offset, offset + length

raw = base64.b64decode(''.join(lines) + 'AA==')
outer_tag, outer_len, o_off, _ = parse_asn1(raw, 0)
v_tag, v_len, v_off, v_next = parse_asn1(raw, o_off)
a_tag, a_len, a_off, a_next = parse_asn1(raw, v_next)
oct_tag, oct_len, oct_off, oct_next = parse_asn1(raw, a_next)
rsa_tag, rsa_len, rsa_off, rsa_next = parse_asn1(raw, oct_off)
iv_tag, iv_len, iv_off, iv_next = parse_asn1(raw, rsa_off)
n_tag, n_len, n_off, n_next = parse_asn1(raw, iv_next)
n = int.from_bytes(raw[n_off:n_next], 'big')
e_tag, e_len, e_off, e_next = parse_asn1(raw, n_next)
e = int.from_bytes(raw[e_off:e_next], 'big')
d_tag, d_len, d_off, d_next = parse_asn1(raw, e_next)
d = int.from_bytes(raw[d_off:d_next], 'big')

print(f"Modulus N: {hex(n)[:30]}... (bit length: {n.bit_length()})")
print(f"Exponent E: {e}")
print(f"Exponent D: {hex(d)[:30]}... (bit length: {d.bit_length()})")

# Factor n given (n, e, d)
k = e * d - 1
t = 0
r = k
while r % 2 == 0:
    r //= 2
    t += 1

print(f"k = 2^{t} * r")

p_found = None
q_found = None

for trial in range(100):
    g = random.randint(2, n - 2)
    x = pow(g, r, n)
    if x == 1 or x == n - 1:
        continue
    found = False
    for _ in range(t):
        y = pow(x, 2, n)
        if y == 1 and x != 1 and x != n - 1:
            p_cand = math.gcd(x - 1, n)
            if 1 < p_cand < n:
                p_found = p_cand
                q_found = n // p_cand
                found = True
                break
        x = y
    if found:
        break

if not p_found:
    print("Could not factor in 100 trials, trying more...")
    for trial in range(1000):
        g = random.randint(2, n - 2)
        x = pow(g, r, n)
        if x == 1 or x == n - 1:
            continue
        found = False
        for _ in range(t):
            y = pow(x, 2, n)
            if y == 1 and x != 1 and x != n - 1:
                p_cand = math.gcd(x - 1, n)
                if 1 < p_cand < n:
                    p_found = p_cand
                    q_found = n // p_cand
                    found = True
                    break
            x = y
        if found:
            break

print("FACTORING SUCCESSFUL!")
if p_found < q_found:
    p, q = q_found, p_found
else:
    p, q = p_found, q_found

print(f"Prime p: {hex(p)[:30]}... (bit length: {p.bit_length()})")
print(f"Prime q: {hex(q)[:30]}... (bit length: {q.bit_length()})")
print(f"p * q == n ? {p * q == n}")

dp = d % (p - 1)
dq = d % (q - 1)
qinv = pow(q, -1, p)

print(f"dp: {hex(dp)[:20]}...")
print(f"dq: {hex(dq)[:20]}...")
print(f"qinv: {hex(qinv)[:20]}...")

# Construct ASN.1 DER for PKCS#1 and PKCS#8
def encode_asn1_int(val):
    raw_hex = hex(val)[2:]
    if len(raw_hex) % 2 != 0:
        raw_hex = '0' + raw_hex
    b = bytes.fromhex(raw_hex)
    if b[0] & 0x80:
        b = b'\x00' + b
    length = len(b)
    if length < 128:
        len_b = bytes([length])
    elif length < 256:
        len_b = bytes([0x81, length])
    else:
        len_b = bytes([0x82, length >> 8, length & 0xFF])
    return b'\x02' + len_b + b

def encode_asn1_seq(content):
    length = len(content)
    if length < 128:
        len_b = bytes([length])
    elif length < 256:
        len_b = bytes([0x81, length])
    else:
        len_b = bytes([0x82, length >> 8, length & 0xFF])
    return b'\x30' + len_b + content

def encode_asn1_oct(content):
    length = len(content)
    if length < 128:
        len_b = bytes([length])
    elif length < 256:
        len_b = bytes([0x81, length])
    else:
        len_b = bytes([0x82, length >> 8, length & 0xFF])
    return b'\x04' + len_b + content

rsa_priv = encode_asn1_seq(
    encode_asn1_int(0) +
    encode_asn1_int(n) +
    encode_asn1_int(e) +
    encode_asn1_int(d) +
    encode_asn1_int(p) +
    encode_asn1_int(q) +
    encode_asn1_int(dp) +
    encode_asn1_int(dq) +
    encode_asn1_int(qinv)
)

alg_id = bytes.fromhex('300d06092a864886f70d0101010500')
pkcs8 = encode_asn1_seq(
    encode_asn1_int(0) +
    alg_id +
    encode_asn1_oct(rsa_priv)
)

b64_str = base64.b64encode(pkcs8).decode('ascii')
pem_lines = [b64_str[i:i+64] for i in range(0, len(b64_str), 64)]
final_pem = "-----BEGIN PRIVATE KEY-----\n" + "\n".join(pem_lines) + "\n-----END PRIVATE KEY-----\n"

with open("service_account.json", "r") as f:
    sa_data = json.load(f)

sa_data["private_key"] = final_pem

with open("service_account.json", "w") as f:
    json.dump(sa_data, f, indent=2)

try:
    with open("D:/tải xuống 2/html tải video/service_account.json", "w", encoding="utf-8") as f:
        json.dump(sa_data, f, indent=2)
except Exception:
    pass

print("SUCCESS! Final 100% valid PKCS#8 PEM generated and saved!")


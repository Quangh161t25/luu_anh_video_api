import base64
import json

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
  'BLg5lNBCgEWWkW/GNcL9cT+IcmNSyiPAnk2jofQvmbbBh1lYeCbOhE4HDotN8a8',
  'hc1uRLb4K17fofhGV/znXW9Y12NcwZTkL5u4kKwDy8Qfx3PfckeLxA1s/3oS01tF',
  'wrybv1aB3Vxain5axUps5v0x6QKBgQDJ0Ld9nqXGBrknORjF1uQ7vpp5wp4Haohy',
  'FVNNfMzjKGRzKl8d4TxPVrUpShYBQE+v1pCwahOXCefovff32mQHzg4oVeml3bQq',
  'otLFVVcydb1L8RY1R+QLbiqRy6Pnv5h4pB82eWg1i7xKuZvxZ68v6iPpEz+8zx0F',
  'FJ9IGolPiQKBgBRF03nBV+sHzoejwdwVkWJJkbx6bydgc3gE3sTUiOOuKMBv3Yyo',
  'pnDH4asYAxpDxK1dXZxwFnpaSmoXoySTqdGQrorZz4dnT2hrcna0zg4HFNNkn4ko',
  'BNHTtcSz3Plr6vMCr/lJ8mDrdkdYZo+UJGiZCLdy2SOFVrMK9Y75H9CZAoGBAJcl',
  'jTc06VztTiA1H/uT3K1uLA2DF43gWL5wgEopbN24M7sZAdHEDcIx405AIUjgnI3J',
  '+eVWHMPi9GAYXq2vT3mU9n95EJtb9wJznb2TE9JD4fkNX5+Z7w4sfQ9iX6hCk3PP',
  'H11SAh0QQX4JkuRyzf7pselutC65Qze54S1ESpBZAoGACkqjFmmF9I9jLZfJdWJM',
  'hOdPNHJD8NcM7ixbO9FBMw6S7PeUE//IuKQQcnxm9FsxCFVo2Q16+XKYLryZ/QxD',
  'cRUVkq/nAg4IB78jDp5Yc3n5VXAr10zWHWNFwVbdcZAs3BT9Q4WacASPdyowQPx0',
  'JYdnFqf9hx1XKT04zZ49M7w='
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

# Let's parse prefix
raw = base64.b64decode(''.join(lines[:12]) + 'AA==')
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

print(f'Modulus n bit length: {n.bit_length()}, e={e}, d bit length: {d.bit_length()}')

chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
line13 = lines[12]
found = False

for pos in range(len(line13) + 1):
    for c in chars:
        cand_line13 = line13[:pos] + c + line13[pos:]
        full_b64 = ''.join(lines[:12]) + cand_line13 + ''.join(lines[13:])
        try:
            der = base64.b64decode(full_b64)
            # parse p from d_next
            p_tag, p_len, p_off, p_next = parse_asn1(der, d_next)
            p = int.from_bytes(der[p_off:p_next], 'big')
            if p > 1 and n % p == 0:
                print(f'🎉 BINGO! Character "{c}" at position {pos} in Line 13!')
                q = n // p
                print(f'n % p == 0! p bit_length: {p.bit_length()}, q bit_length: {q.bit_length()}')
                
                # Check RSA congruence:
                phi = (p - 1) * (q - 1)
                if (e * d) % phi == 1:
                    print('🎉 RSA EQUATION (e * d) % phi == 1 VERIFIED PERFECTLY!')
                
                valid_pem = '-----BEGIN PRIVATE KEY-----\n' + '\n'.join(lines[:12] + [cand_line13] + lines[13:]) + '\n-----END PRIVATE KEY-----\n'
                with open('service_account.json', 'r') as f_sa:
                    sa = json.load(f_sa)
                sa['private_key'] = valid_pem
                with open('service_account.json', 'w') as f_sa:
                    json.dump(sa, f_sa, indent=2)
                try:
                    with open('D:/tải xuống 2/html tải video/service_account.json', 'w', encoding='utf-8') as f_sa2:
                        json.dump(sa, f_sa2, indent=2)
                except Exception:
                    pass
                print('🎉 SUCCESS: service_account.json has been updated and completely fixed!')
                found = True
                break
        except Exception:
            pass
    if found:
        break

if not found:
    print('Testing across all lines...')
    for l_idx in range(len(lines)):
        orig = lines[l_idx]
        for pos in range(len(orig) + 1):
            for c in chars:
                cand = orig[:pos] + c + orig[pos:]
                cand_lines = list(lines)
                cand_lines[l_idx] = cand
                full_b64 = ''.join(cand_lines)
                try:
                    der = base64.b64decode(full_b64)
                    _, _, _, o_n = parse_asn1(der, 0)
                    _, _, _, v_n = parse_asn1(der, o_n)
                    _, _, _, a_n = parse_asn1(der, v_n)
                    _, _, _, oc_n = parse_asn1(der, a_n)
                    _, _, _, r_n = parse_asn1(der, oc_n)
                    _, _, _, iv_n = parse_asn1(der, r_n)
                    _, _, _, n_n = parse_asn1(der, iv_n)
                    _, _, _, e_n = parse_asn1(der, n_n)
                    _, _, _, d_n = parse_asn1(der, e_n)
                    p_t, p_l, p_o, p_n = parse_asn1(der, d_n)
                    p_val = int.from_bytes(der[p_o:p_n], 'big')
                    if p_val > 1 and n % p_val == 0:
                        print(f'🎉 BINGO! Character "{c}" at position {pos} in Line {l_idx+1}!')
                        found = True
                        break
                except Exception:
                    pass
            if found:
                break
        if found:
            break

import json, base64
from cryptography.hazmat.primitives import serialization

with open('service_account.json', 'r') as f:
    d = json.load(f)

lines = [l.strip() for l in d['private_key'].split('\n') if l.strip() and not l.startswith('---')]
line13 = lines[12] # 63 chars
print('Line 13 original len:', len(line13))

chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
found = False

for pos in range(len(line13) + 1):
    for c in chars:
        candidate_line13 = line13[:pos] + c + line13[pos:]
        candidate_lines = list(lines)
        candidate_lines[12] = candidate_line13
        full_b64 = ''.join(candidate_lines)
        try:
            raw_der = base64.b64decode(full_b64)
            k = serialization.load_der_private_key(raw_der, password=None)
            print(f'🎉 FOUND EXACT MISSING CHAR: "{c}" at position {pos} in Line 13!')
            valid_pem = '-----BEGIN PRIVATE KEY-----\n' + '\n'.join(candidate_lines) + '\n-----END PRIVATE KEY-----\n'
            d['private_key'] = valid_pem
            with open('service_account.json', 'w') as f_out:
                json.dump(d, f_out, indent=2)
            found = True
            break
        except Exception:
            pass
    if found:
        break

if not found:
    print('Trying all lines for single missing char...')
    for line_idx in range(len(lines)):
        orig_line = lines[line_idx]
        for pos in range(len(orig_line) + 1):
            for c in chars:
                candidate_line = orig_line[:pos] + c + orig_line[pos:]
                candidate_lines = list(lines)
                candidate_lines[line_idx] = candidate_line
                full_b64 = ''.join(candidate_lines)
                try:
                    raw_der = base64.b64decode(full_b64)
                    k = serialization.load_der_private_key(raw_der, password=None)
                    print(f'🎉 FOUND EXACT MISSING CHAR: "{c}" at line {line_idx+1} pos {pos}!')
                    valid_pem = '-----BEGIN PRIVATE KEY-----\n' + '\n'.join(candidate_lines) + '\n-----END PRIVATE KEY-----\n'
                    d['private_key'] = valid_pem
                    with open('service_account.json', 'w') as f_out:
                        json.dump(d, f_out, indent=2)
                    found = True
                    break
                except Exception:
                    pass
            if found:
                break
        if found:
            break

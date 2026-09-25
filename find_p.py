import json, base64
from cryptography.hazmat.primitives import serialization

with open('service_account.json', 'r') as f:
    d = json.load(f)

lines = [l.strip() for l in d['private_key'].split('\n') if l.strip() and not l.startswith('---')]
line13 = lines[12]

# Let's test all positions and all chars for Line 13 with cryptography load_der_private_key
chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

found = False
for pos in range(len(line13) + 1):
    for c in chars:
        cand_line13 = line13[:pos] + c + line13[pos:]
        cand_lines = list(lines)
        cand_lines[12] = cand_line13
        full_b64 = ''.join(cand_lines)
        try:
            raw_der = base64.b64decode(full_b64)
            # Try to load as private key
            k = serialization.load_der_private_key(raw_der, password=None)
            print(f'🎉 FOUND EXACT KEY! Character "{c}" at position {pos}!')
            
            # Format and save
            pem_lines = [full_b64[i:i+64] for i in range(0, len(full_b64), 64)]
            fixed_pem = '-----BEGIN PRIVATE KEY-----\n' + '\n'.join(pem_lines) + '\n-----END PRIVATE KEY-----\n'
            d['private_key'] = fixed_pem
            with open('service_account.json', 'w') as f_out:
                json.dump(d, f_out, indent=2)
            found = True
            break
        except Exception:
            pass
    if found:
        break

if not found:
    print('Not in line 13 alone, testing missing char in any line...')
    for l_idx in range(len(lines)):
        orig = lines[l_idx]
        if len(orig) < 64: # If line has < 64 chars
            for pos in range(len(orig) + 1):
                for c in chars:
                    cand = orig[:pos] + c + orig[pos:]
                    clines = list(lines)
                    clines[l_idx] = cand
                    full_b64 = ''.join(clines)
                    try:
                        raw_der = base64.b64decode(full_b64)
                        k = serialization.load_der_private_key(raw_der, password=None)
                        print(f'🎉 FOUND EXACT KEY! Line {l_idx+1}, Char "{c}" at pos {pos}!')
                        found = True
                        break
                    except Exception:
                        pass
                if found:
                    break
        if found:
            break

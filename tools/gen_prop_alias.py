"""Builds src/data/propAlias.generated.json (map -> semantic prop -> registry prop) from docs/art-evidence/MAP_ART_INDEX.md."""
import json, re
alias = {}
cur = None
for line in open('docs/art-evidence/MAP_ART_INDEX.md', encoding='utf8'):
    m = re.match(r'^## (\w+)$', line.strip())
    if m:
        cur = m.group(1); alias[cur] = {}; continue
    m = re.match(r'^\| (\w+) \| `(\w+)` \|', line)
    if m and cur and m.group(1) != 'prop':
        alias[cur][m.group(1)] = m.group(2)
json.dump(alias, open('src/data/propAlias.generated.json', 'w'), indent=1)
print({k: len(v) for k, v in alias.items()})

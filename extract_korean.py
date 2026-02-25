import os
import re
import json

korean_re = re.compile(r'[\u3131-\u318E\uAC00-\uD7A3]')
src_dir = '/Users/idong-yun/My_interest_solarsystem/src'

data = {}

for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.ts') or f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                lines = file.readlines()
                for i, line in enumerate(lines):
                    if korean_re.search(line):
                        if path not in data:
                            data[path] = []
                        data[path].append({'line_number': i, 'original': line.strip(), 'translation': ""})

# Create a deduplicated dict for ease of translation
unique_strings = {}
for path, items in data.items():
    for item in items:
        # we will translate the whole line
        original = item['original']
        unique_strings[original] = ""

with open('korean_lines.json', 'w', encoding='utf-8') as f:
    json.dump({'files': data, 'unique': unique_strings}, f, indent=4, ensure_ascii=False)

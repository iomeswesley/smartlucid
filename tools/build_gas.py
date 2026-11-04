"""Gera gas/index.html: a interface inteira (CSS + JS) em um único arquivo para o Apps Script.

Um arquivo só deixa o deploy simples (copiar/colar ou `clasp push`) junto com Code.gs e Crypto.gs.
Uso: python tools/build_gas.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


index = read('index.html')
index = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">',
               lambda m: '<style>\n' + read(m.group(1)) + '\n</style>', index)
index = re.sub(r'<script src="(js/[^"]+)"></script>',
               lambda m: '<script>\n' + read(m.group(1)).replace('</script', '<\\/script') + '\n</script>', index)

out = os.path.join(ROOT, 'gas', 'index.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(index)
print('gas/index.html', round(len(index.encode('utf-8')) / 1024), 'KB')

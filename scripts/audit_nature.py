"""Audit retired identifiers without keeping those identifiers as plain text."""
import argparse,json,unicodedata
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--root',default='.');p.add_argument('--output');a=p.parse_args()
PATTERNS_HEX=['70737963686963', '74696e68207468e1baa76e', '6d696e64627265616b6572457965', '61737472616c4d696e64446f6d696e696f6e', '70737963686f47656e65736973', '54c3a26d205468e1bba9632042c4836e67204469e1bb8774', '56e1baa16e204e69e1bb876d205468e1baa76e2056e1bbb163', '5468e1baa76e204e69e1bb876d2053c3a16e67205468e1babf']
patterns=[bytes.fromhex(x).decode().casefold() for x in PATTERNS_HEX]
excluded={'.git','node_modules','work','test-results','__pycache__','.cache','.vercel'}
text_extensions={'.js','.mjs','.cjs','.py','.json','.md','.html','.css','.svg','.txt','.yml','.yaml','.toml','.bat','.sh','.lock'}
root=Path(a.root).resolve();files=0;texts=0;path_hits=[];text_hits=[]
for f in root.rglob('*'):
 if not f.is_file() or any(x in excluded for x in f.relative_to(root).parts) or f.suffix=='.zip':continue
 files+=1;name=str(f.relative_to(root));normalized=unicodedata.normalize('NFC',name).casefold()
 if any(x in normalized for x in patterns):path_hits.append(name)
 if f.suffix.lower() not in text_extensions and not f.name.startswith('.'):continue
 try:s=unicodedata.normalize('NFC',f.read_text(encoding='utf-8-sig')).casefold()
 except UnicodeError:continue
 texts+=1
 if any(x in s for x in patterns):text_hits.append(name)
r={'passed':not path_hits and not text_hits,'scope':'Current project source, UI, documentation, audio metadata and filenames; built dist included when present. Dependency code, Git history, external safety copies, caches and ZIPs excluded. Archive entries are audited separately. Binary image/audio content is not OCR/transcription.','files':files,'textFiles':texts,'pathMatches':path_hits,'textMatches':text_hits,'searchPatternsUtf8Hex':PATTERNS_HEX}
if a.output:Path(a.output).write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(r,ensure_ascii=False));raise SystemExit(0 if r['passed'] else 1)

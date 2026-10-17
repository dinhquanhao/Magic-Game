import tarfile,zipfile,subprocess,json,hashlib,argparse,tempfile
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--ref',default='HEAD');args=parser.parse_args();ref=subprocess.check_output(['git','rev-parse',args.ref],text=True).strip();out=Path('docs/releases/Arcane-VFX-Studio-Thao-Update.zip');out.parent.mkdir(parents=True,exist_ok=True)
scratch=tempfile.TemporaryDirectory(prefix='arcane-thao-package-');tar_path=Path(scratch.name)/'checkpoint.tar'
with tar_path.open('wb') as f:subprocess.run(['git','archive','--format=tar',ref],stdout=f,check=True)
def include(name):
 p=Path(name)
 if name.startswith(('audio/rendered/','audio/reports/cues/','graphics/reports/','docs/evidence/','docs/releases/','docs/drafts/')):return False
 if p.suffix=='.zip':return False
 return True
manifest={}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=3) as z,tarfile.open(tar_path) as t:
 for m in t:
  if not m.isfile() or not include(m.name):continue
  data=t.extractfile(m).read();name='Arcane-VFX-Studio-Thao-Update/'+m.name;z.writestr(name,data);manifest[m.name]=hashlib.sha256(data).hexdigest()
 for evidence in ['docs/evidence/thao','docs/evidence/brown-ground','docs/evidence/fire-trim']:
  for p in Path(evidence).rglob('*'):
   if not p.is_file():continue
   name=str(p);data=p.read_bytes();z.writestr('Arcane-VFX-Studio-Thao-Update/'+name,data);manifest[name]=hashlib.sha256(data).hexdigest()
 for name in ['THAO_PROGRESS.md','docs/PREVIEW.md','tests/thao_production.py','scripts/audit_nature.py']:
  # These are documentation/evidence additions; runtime source remains exactly ref.
  if name in manifest:continue
  p=Path(name)
  if p.exists():data=p.read_bytes();z.writestr('Arcane-VFX-Studio-Thao-Update/'+name,data);manifest[name]=hashlib.sha256(data).hexdigest()
 note=f'Runtime/source checkpoint {ref}. Current registry: 15 elements, 19 skills; Fire retains only FIRE-01. Includes forest, brown-ground and retained-skill evidence and public runtime WAV/PNG assets. Excludes node_modules, Git, dist, caches, duplicate offline audio/rendered and audio/reports/cues, and bulky historical graphics/browser evidence or unintegrated graphics drafts. These excluded measurements remain in repository history; runtime audio mirrors are present. npm ci and npm run build work from the included package lock. The broader 11-layer graphics/rune request remains separately documented, not claimed complete by this archive.\n'
 z.writestr('Arcane-VFX-Studio-Thao-Update/ARCHIVE_CONTENTS.txt',note)
 z.writestr('Arcane-VFX-Studio-Thao-Update/ARCHIVE_MANIFEST.json',json.dumps({'sourceCommit':ref,'files':manifest},indent=2))
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 launcher=z.read('Arcane-VFX-Studio-Thao-Update/START.bat');assert hashlib.sha256(launcher).hexdigest()=='67f2f70c870abd45d2604f1b20ddbf506907d6913cbf9a1598162f04cf159f72'
 assert not any('/node_modules/' in n or '/.git/' in n for n in z.namelist())
 sha=hashlib.sha256(out.read_bytes()).hexdigest();info={'file':out.name,'sourceCommit':ref,'bytes':out.stat().st_size,'sha256':sha,'entries':len(z.namelist()),'crcPassed':True,'noNodeModules':True,'launcherBytesPreserved':True,'scope':note.strip()}
Path('docs/releases/thao-package.json').write_text(json.dumps(info,indent=2)+'\n');Path('docs/releases/SHA256SUMS.txt').write_text(sha+'  '+out.name+'\n');print(json.dumps(info))

scratch.cleanup()

#!/usr/bin/env python3
"""Restore only the pinned private build dependencies; never stage them publicly."""
from pathlib import Path,PurePosixPath
import argparse,hashlib,json,os,shutil,stat,subprocess,tempfile

ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--verify-only',action='store_true');args=p.parse_args()
manifest=json.loads((ROOT/'PRIVATE-DEPENDENCIES.json').read_text());pin=manifest['commit'];assert len(pin)==40 and all(x in '0123456789abcdef' for x in pin)
cache=ROOT/'.axiom-private/source'
def run(argv,cwd=ROOT,capture=False):
 return subprocess.check_output(argv,cwd=cwd,stderr=subprocess.DEVNULL) if capture else subprocess.run(argv,cwd=cwd,check=True)
def git(argv,cwd=None):return run(['git',*argv],cwd=cache if cwd is None else cwd,capture=True)
def rows_for(package,source):
 rows=[]
 for record in git(['ls-tree','-rz','--full-tree',pin,'--',package]).split(b'\0'):
  if not record:continue
  metadata,raw=record.split(b'\t',1);mode,kind,oid=metadata.decode().split();assert kind=='blob';path=raw.decode();rel=path[len(package)+1:];safe=PurePosixPath(rel);assert not safe.is_absolute() and '..' not in safe.parts
  actual=source/package/rel
  if mode=='120000':
   assert actual.is_symlink(),path;data=os.fsencode(os.readlink(actual))
  else:
   assert actual.is_file() and not actual.is_symlink(),path;assert ('100755' if actual.stat().st_mode&0o111 else '100644')==mode,path;data=actual.read_bytes()
  rows.append({'path':rel,'mode':mode,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 rows.sort(key=lambda x:x['path']);return rows

def verify(package,source):
 rows=rows_for(package['path'],source);digest=hashlib.sha256(json.dumps(rows,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
 if len(rows)!=package['files'] or digest!=package['sha256']:raise SystemExit('Private dependency integrity mismatch: '+package['path'])
 expected={row['path'] for row in rows};packageRoot=source/package['path']
 for base,dirs,files in os.walk(packageRoot,followlinks=False):
  kept=[]
  for name in dirs:
   child=Path(base)/name
   if name in ('node_modules','dist','.git') or name.startswith(('.tmp','.next','.cache')):continue
   if child.is_symlink():files.append(name)
   else:kept.append(name)
  dirs[:]=kept
  for name in files:
   relative=(Path(base)/name).relative_to(packageRoot).as_posix()
   if relative not in expected and not name.endswith('.tsbuildinfo'):raise SystemExit('Unexpected private source file: '+package['path']+'/'+relative)
 return rows

# Check the enclosing public repository's real ignore policy before fetching source.
for target in ['.axiom-private/source/.git/config',*[p['path']+'/package.json' for p in manifest['packages']]]:
 probe=subprocess.run(['git','check-ignore','--quiet','--',target],cwd=ROOT)
 if probe.returncode!=0:raise SystemExit('Refusing to expose a private dependency: .gitignore must ignore '+target)
if not cache.exists():
 if args.verify_only:raise SystemExit('Private dependencies are absent. Run pnpm bootstrap with SSH access to the private Axiom repository.')
 cache.parent.mkdir(parents=True,exist_ok=True);temporary=Path(tempfile.mkdtemp(prefix='source-',dir=cache.parent))
 run(['git','init','--quiet',str(temporary)]);run(['git','remote','add','origin',manifest['privateRepository']],cwd=temporary)
 run(['git','config','remote.origin.promisor','true'],cwd=temporary);run(['git','config','remote.origin.partialclonefilter','blob:none'],cwd=temporary)
 run(['git','sparse-checkout','init','--cone'],cwd=temporary);run(['git','sparse-checkout','set',*[p['path'] for p in manifest['packages']]],cwd=temporary)
 run(['git','-c','gc.auto=0','fetch','--depth=1','--filter=blob:none','--no-tags','origin',pin],cwd=temporary)
 run(['git','checkout','--quiet','--detach','FETCH_HEAD'],cwd=temporary)
 for package in manifest['packages']:
  # Validate the downloaded tracked source before exposing any workspace directory.
  oldcache=cache;cache=temporary;verify(package,temporary);cache=oldcache
 temporary.rename(cache)
if git(['rev-parse','HEAD']).decode().strip()!=pin:raise SystemExit('Private source cache has a different commit. Keep it for review and use a fresh archive checkout.')
for package in manifest['packages']:
 sourceRows=verify(package,cache);destination=ROOT/package['path']
 if destination.exists():
  # Repeated calls verify exact source; build-generated files are kept locally and ignored.
  verify(package,ROOT);continue
 if args.verify_only:raise SystemExit('Private workspace is absent: '+package['path'])
 destination.mkdir(parents=True)
 for row in sourceRows:
  src=cache/package['path']/row['path'];out=destination/row['path'];out.parent.mkdir(parents=True,exist_ok=True)
  if row['mode']=='120000':out.symlink_to(os.readlink(src))
  else:shutil.copy2(src,out)
 verify(package,ROOT)
print('Verified '+str(len(manifest['packages']))+' private workspace dependencies at '+pin+'. Private source remains gitignored.')

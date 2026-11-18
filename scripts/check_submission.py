"""Repeatable local checks with bounded subprocesses and durable evidence logs."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parents[1]


def main():
    out=ROOT/'research/verification';out.mkdir(parents=True,exist_ok=True)
    node=shutil.which('node')
    if not node:raise SystemExit('Node.js is required')
    checks=[('python_compile',[sys.executable,'-m','compileall','-q','app','scripts','tests'],ROOT),
            ('regression_integration',[sys.executable,'-X','utf8','-m','unittest','discover','-s','tests','-v'],ROOT),
            ('legacy_compatibility',[sys.executable,'-X','utf8','scripts/verify_demo.py'],ROOT),
            ('frontend_build',[node,'node_modules/vite/bin/vite.js','build'],ROOT/'frontend'),
            ('frontend_lint',[node,'node_modules/eslint/bin/eslint.js','.'],ROOT/'frontend'),
            ('mobile_typecheck',[node,'node_modules/typescript/bin/tsc','--noEmit'],ROOT/'mobile'),
            ('diff_whitespace',['git','diff','--check'],ROOT)]
    results=[]
    for name,command,cwd in checks:
        start=time.perf_counter()
        try:
            result=subprocess.run(command,cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=180)
            (out/(name+'.log')).write_text(result.stdout+'\n'+result.stderr,encoding='utf-8')
            item=dict(check=name,command=command,cwd=str(cwd.relative_to(ROOT)),exit_code=result.returncode,seconds=time.perf_counter()-start)
        except subprocess.TimeoutExpired:
            item=dict(check=name,command=command,exit_code=None,error='180-second timeout')
        results.append(item);print(json.dumps(item),flush=True)
    before=json.loads((ROOT/'research/audit/summary.json').read_text(encoding='utf-8'))['artifacts_before']
    preserved=all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in before.items())
    summary=dict(checks=results,original_database_and_models_unchanged=preserved,
                 browser='Separate command: python -X utf8 scripts/verify_browser.py; see browser.json')
    (out/'checks.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
    if not preserved or any(r['exit_code']!=0 for r in results):raise SystemExit(1)
    print('All local submission checks passed; original artifacts unchanged.',flush=True)


if __name__=='__main__':main()

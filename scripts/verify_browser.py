"""Browser E2E on isolated ports and a disposable DB backup. No existing servers touched."""
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import secrets
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import uuid
from urllib.request import urlopen

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))


def main():
    out=ROOT/'research/verification';out.mkdir(parents=True,exist_ok=True)
    for port in [8011,5174,9234]:
        with socket.socket() as sock:
            if sock.connect_ex(('127.0.0.1',port))==0:
                raise SystemExit(f'QA port {port} occupied; no existing server stopped')
    source=ROOT/'outputs/app.db'
    before=hashlib.sha256(source.read_bytes()).hexdigest()
    chrome=next((p for p in [Path('C:/Program Files/Google/Chrome/Application/chrome.exe'),Path('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')] if p.exists()),None)
    if not chrome:
        raise SystemExit('No installed Chrome/Edge for browser test')
    profile=ROOT/'.demo'/('browser-profile-'+uuid.uuid4().hex)
    profile.mkdir(parents=True,exist_ok=False)
    with tempfile.TemporaryDirectory(prefix='flood-browser-db-') as temp:
        path=Path(temp)/'browser.db'
        with closing(sqlite3.connect(source.as_uri()+'?mode=ro',uri=True)) as src:
            with closing(sqlite3.connect(path)) as dest:src.backup(dest)
        os.environ['FLOOD_DB_PATH']=str(path)
        from app.database import Base,engine,SessionLocal
        from app.models import User
        from app.auth import password_hash
        Base.metadata.create_all(engine)
        password=secrets.token_urlsafe(24)
        with SessionLocal() as db:
            for name,role in [('browser_admin','admin'),('browser_coordinator','coordinator')]:
                db.add(User(username=name,role=role,password_hash=password_hash(password)))
            db.commit()
        engine.dispose()
        env=dict(os.environ,FLOOD_CORS_ORIGINS='http://127.0.0.1:5174',VITE_API_BASE_URL='http://127.0.0.1:8011',QA_PASSWORD=password)
        jobs=[('browser-api',[sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8011'],ROOT),
              ('browser-vite',['node','node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort'],ROOT/'frontend'),
              ('browser-chrome',[str(chrome),'--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9234',
                                 '--user-data-dir='+str(profile),'about:blank'],ROOT)]
        children=[];logs=[]
        try:
            for name,command,cwd in jobs:
                log=(out/(name+'.log')).open('w',encoding='utf-8');logs.append(log)
                children.append(subprocess.Popen(command,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT,
                                                 creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0)))
            for url in ['http://127.0.0.1:8011/health','http://127.0.0.1:5174','http://127.0.0.1:9234/json/version']:
                deadline=time.monotonic()+45
                while time.monotonic()<deadline:
                    if any(p.poll() is not None for p in children):raise RuntimeError('QA process exited; see logs')
                    try:
                        with urlopen(url,timeout=2) as response:
                            if response.status==200:break
                    except Exception:time.sleep(.3)
                else:raise RuntimeError('Readiness timed out: '+url)
            result=subprocess.run(['node','scripts/verify_browser.mjs'],cwd=ROOT,env=env,timeout=180,capture_output=True,text=True,encoding='utf-8')
            (out/'browser-run.log').write_text(result.stdout+'\n'+result.stderr,encoding='utf-8')
            print(result.stdout,result.stderr)
            if result.returncode:raise RuntimeError('Browser checks failed; see research/verification/browser-run.log')
        finally:
            for child in children:
                if child.poll() is None:
                    try:child.wait(timeout=2)
                    except subprocess.TimeoutExpired:child.terminate()
            for child in children:
                try:child.wait(timeout=10)
                except subprocess.TimeoutExpired:child.kill();child.wait(timeout=5)
            for log in logs:log.close()
        assert hashlib.sha256(source.read_bytes()).hexdigest()==before
    print('Browser checks complete; original database unchanged. Ignored QA browser profile retained:',profile)


if __name__=='__main__':main()

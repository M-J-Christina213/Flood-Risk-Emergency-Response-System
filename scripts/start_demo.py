"""Start the supervisor demo using a persistent COPY of the local database.
Usage: python scripts/start_demo.py
Leaves API and Vite running; prints their PIDs and URLs. Does not install or train.
"""
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import sys
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent


def main():
    demo = ROOT / '.demo'
    demo.mkdir(exist_ok=True)
    for port in (8000, 5173):
        with socket.socket() as sock:
            if sock.connect_ex(('127.0.0.1', port)) == 0:
                raise SystemExit(f'Port {port} already in use. Check the running app before starting a second instance.')
    source = ROOT / 'outputs/app.db'
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    copy = demo / 'demo.db'
    if not copy.exists():
        with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)) as src:
            with closing(sqlite3.connect(copy)) as dst:
                src.backup(dst)
    env = dict(os.environ, FLOOD_DB_PATH=str(copy))
    node = shutil.which('node')
    if not node:
        raise SystemExit('Node.js is required; no files changed in the original database.')
    jobs = [
        ('api', [sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], ROOT),
        ('frontend', [node, 'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], ROOT / 'frontend'),
    ]
    started = []
    try:
        for name, command, cwd in jobs:
            with (demo / f'{name}.log').open('a', encoding='utf-8') as output:
                process = subprocess.Popen(command, cwd=cwd, env=env, stdout=output, stderr=subprocess.STDOUT,
                                           creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            started.append((name, process))
        deadline = time.monotonic() + 60
        ready = False
        while time.monotonic() < deadline:
            if any(p.poll() is not None for _, p in started):
                raise RuntimeError('A server exited. Read .demo/api.log and .demo/frontend.log.')
            try:
                with urlopen('http://127.0.0.1:8000/health', timeout=2) as response:
                    health = json.load(response)
                with urlopen('http://127.0.0.1:5173/', timeout=2) as response:
                    ready = response.status == 200 and health['status'] == 'healthy'
                if ready:
                    break
            except Exception:
                time.sleep(0.5)
        if not ready:
            raise RuntimeError('Startup exceeded 60 seconds. Read .demo server logs.')
        assert hashlib.sha256(source.read_bytes()).hexdigest() == before, 'Original database changed externally during startup.'
        status = {'ready': True, 'database': str(copy), 'original_database_sha256': before,
                  'processes': {name: process.pid for name, process in started},
                  'dashboard': 'http://127.0.0.1:5173/', 'reports': 'http://127.0.0.1:5173/report',
                  'alerts': 'http://127.0.0.1:5173/alerts', 'api_docs': 'http://127.0.0.1:8000/docs'}
        (demo / 'running.json').write_text(json.dumps(status, indent=2))
        print(json.dumps(status, indent=2), flush=True)
    except BaseException:
        for _, process in started:
            if process.poll() is None:
                process.terminate()
        raise


if __name__ == '__main__':
    main()

"""Administrative CLI. Always choose a database explicitly."""
import argparse
from getpass import getpass
import os
from pathlib import Path
import sys
import time

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--db',required=True)
    sub=p.add_subparsers(dest='command',required=True)
    sub.add_parser('migrate')
    user=sub.add_parser('create-user');user.add_argument('username');user.add_argument('--role',choices=['admin','coordinator','public'],required=True)
    worker=sub.add_parser('worker');worker.add_argument('--interval',type=float,default=0);worker.add_argument('--replay-alerts',action='store_true')
    args=p.parse_args()
    path=Path(args.db).resolve()
    if path==ROOT/'outputs/app.db':
        p.error('Use a backed-up working database copy; outputs/app.db is preserved')
    path.parent.mkdir(parents=True,exist_ok=True)
    os.environ['FLOOD_DB_PATH']=str(path)
    from app.database import Base,engine,SessionLocal
    from app.models import User
    from app.auth import password_hash
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if args.command=='create-user':
            from app.auth import Credentials
            credentials=Credentials(username=args.username,password=getpass('Password (10+ characters): '))
            if db.get(User,args.username):
                p.error('User already exists; no password overwritten')
            db.add(User(username=args.username,role=args.role,password_hash=password_hash(credentials.password)))
            db.commit();print('Created',args.username,args.role)
        elif args.command=='worker':
            import joblib
            from app.workflow import process_pending,deliver_pending
            model=joblib.load(ROOT/'outputs/ml/models/random_forest_fixed.pkl');model.n_jobs=1
            if args.interval<0:
                p.error('Interval must be nonnegative')
            while True:
                print(process_pending(db,model,replay_alerts=args.replay_alerts),flush=True)
                deliver_pending(db)
                if not args.interval:
                    break
                time.sleep(args.interval)
        else:
            print('Additive v2 tables ready:',path)
    engine.dispose()


if __name__=='__main__':
    main()

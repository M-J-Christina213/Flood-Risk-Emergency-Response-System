"""Consistent SQLite backup, with no overwrite or modification of source."""
import argparse
from contextlib import closing
from pathlib import Path
import sqlite3


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('source');p.add_argument('destination')
    args=p.parse_args()
    source=Path(args.source).resolve();dest=Path(args.destination).resolve()
    if not source.is_file() or dest.exists() or dest==source:
        p.error('Source must exist; destination must be a new file')
    dest.parent.mkdir(parents=True,exist_ok=True)
    with closing(sqlite3.connect(source.as_uri()+'?mode=ro',uri=True)) as src:
        with closing(sqlite3.connect(dest)) as backup:src.backup(backup)
    print('Created backup:',dest)


if __name__=='__main__':main()

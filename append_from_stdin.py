from pathlib import Path 
import sys 
path = Path(sys.argv[1]) 
path.parent.mkdir(parents=True, exist_ok=True) 
with path.open('a', encoding='utf-8') as handle: 
    handle.write(sys.stdin.read())

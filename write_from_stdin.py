from pathlib import Path 
import sys 
path = Path(sys.argv[1]) 
path.parent.mkdir(parents=True, exist_ok=True) 
path.write_text(sys.stdin.read(), encoding='utf-8')

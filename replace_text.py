from pathlib import Path 
import sys 
path = Path(sys.argv[1]) 
old = sys.argv[2] 
new = sys.argv[3] 
text = path.read_text(encoding='utf-8') 
path.write_text(text.replace(old, new), encoding='utf-8') 

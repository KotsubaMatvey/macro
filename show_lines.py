from pathlib import Path 
import sys 
lines = Path(sys.argv[1]).read_text(encoding='utf-8').splitlines() 
start = int(sys.argv[2]) 
end = int(sys.argv[3]) 
for i in range(start, end + 1): 
    if i - 1 < len(lines): 
        print(f'{i}:{lines[i-1]}') 

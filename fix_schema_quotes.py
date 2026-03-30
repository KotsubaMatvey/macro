from pathlib import Path 
path = Path(r'E:\macro\apps\api\app\schemas.py') 
lines = path.read_text(encoding='utf-8').splitlines() 
lines[28] = '    bio: str = \"\"' 
path.write_text('\n'.join(lines) + '\n', encoding='utf-8') 

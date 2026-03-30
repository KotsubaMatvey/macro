from pathlib import Path
p = Path(r'E:\macro\apps\api\app\schemas.py')
lines = p.read_text(encoding='utf-8').splitlines()
lines[0] = 'from typing import Any, Optional'
p.write_text('\n'.join(lines) + '\n', encoding='utf-8')

from pathlib import Path
p = Path(r'E:\macro\apps\web\components\auth\forms.tsx')
t = p.read_text(encoding='utf-8')
t = t.replace(\"import { Panel } from '@/components/app/chrome'\", \"import { Panel } from '@/components/app/panel'\")
p.write_text(t, encoding='utf-8')

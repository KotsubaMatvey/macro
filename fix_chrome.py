from pathlib import Path 
path = Path(r'E:\macro\apps\web\components\app\chrome.tsx') 
text = path.read_text(encoding='utf-8', errors='ignore') 
head = text.split('export async function PageShell', 1)[0] 

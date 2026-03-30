from pathlib import Path
candidates = [Path('C:/Program Files/Git/cmd/git.exe'), Path('C:/Program Files/Git/bin/git.exe'), Path('C:/Program Files (x86)/Git/cmd/git.exe')]
for p in candidates:
  print(str(p), p.exists())

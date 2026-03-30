import glob
patterns = ['C:/Users/*/AppData/Local/GitHubDesktop/app-*/resources/app/git/cmd/git.exe', 'C:/Users/*/AppData/Local/Programs/Microsoft VS Code/resources/app/extensions/git/dist/git.js', 'C:/Program Files/GitHub Desktop/resources/app/git/cmd/git.exe']
for pattern in patterns:
  for match in glob.glob(pattern): print(match)

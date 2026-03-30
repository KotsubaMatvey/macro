$path = 'E:\macro\apps\web\components\app\chrome.tsx' 
$lines = Get-Content $path 
$out = @() 
foreach ($line in $lines) { 
  $out += $line 
  if ($line -eq '  const session = await getSession() ') { 
    $out += "  const navItems = APP_SECTIONS.filter(function (item) { return item.adminOnly ? session.role === 'admin' : true })" 
  } 
} 
if ($out[-1] -ne '}') { $out += '}' } 
$out = $out | ForEach-Object { $_ -replace 'session.name \+ '' .* '' \+ session.role', "session.name + ' / ' + session.role" } 
Set-Content -Path $path -Value $out 

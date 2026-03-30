$git = 'C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe' 
& $git -C E:\macro add package.json apps\web\package.json apps\api\app\cache.py apps\api\app\services.py apps\api\app\settings.py packages\config\package.json packages\types\package.json packages\ui\package.json 
& $git -C E:\macro commit -m 'Stabilize cache path and workspace packages' 

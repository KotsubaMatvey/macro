from pathlib import Path 
path = Path(r'E:\macro\apps\api\app\services.py') 
text = path.read_text(encoding='utf-8') 
old = 'def list_posts(): \ndef create_post(user_id, payload):' 
new = 'def list_posts():\n    rows = fetch_all(\'select p.id, p.title, p.body, p.created_at, u.name, u.role, (select count(*) from post_likes pl where pl.post_id = p.id) as likes, (select count(*) from comments c where c.post_id = p.id) as comments from posts p join users u on u.id = p.user_id where p.moderated = false order by p.created_at desc\')\n    return [{\'id\': item[\'id\'], \'title\': item[\'title\'], \'body\': item[\'body\'], \'authorName\': item[\'name\'], \'authorRole\': item[\'role\'], \'likes\': int(item[\'likes\']), \'comments\': int(item[\'comments\']), \'createdAt\': item[\'created_at\'].isoformat()} for item in rows]\n\ndef create_post(user_id, payload):' 
path.write_text(text.replace(old, new, 1), encoding='utf-8') 

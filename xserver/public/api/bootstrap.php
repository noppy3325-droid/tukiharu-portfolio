<?php
declare(strict_types=1);

final class ApiError extends RuntimeException {
    public function __construct(public string $errorCode, string $message, public int $status = 400) { parent::__construct($message); }
}
function fail(string $message, string $code = 'BAD_REQUEST', int $status = 400): never { throw new ApiError($code, $message, $status); }
function privateDir(): string { return getenv('PORTFOLIO_PRIVATE_DIR') ?: dirname(__DIR__, 2) . '/portfolio-private'; }
function config(): array {
    static $config;
    if ($config === null) {
        $file = privateDir() . '/config.php';
        if (!is_file($file)) fail('サーバーの初期設定が必要です。', 'INTERNAL_SERVER_ERROR', 503);
        $config = require $file;
        if (!is_array($config) || empty($config['origin']) || !str_starts_with((string)($config['password_hash'] ?? ''), '$')) fail('サーバー設定を確認してください。', 'INTERNAL_SERVER_ERROR', 503);
    }
    return $config;
}
function db(): PDO {
    static $db;
    if ($db) return $db;
    config();
    if (!is_dir(privateDir())) throw new RuntimeException('Private directory missing');
    $db = new PDO('sqlite:' . privateDir() . '/portfolio.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $db->exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
    $db->exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS records (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, payload TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS records_kind ON records(kind);
        CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, started INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS visitors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS likes (postId INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE, visitor TEXT NOT NULL, PRIMARY KEY(postId,visitor));
        CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, postId INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE, authorId INTEGER NOT NULL REFERENCES visitors(id), body TEXT NOT NULL, createdAt TEXT NOT NULL, editedAt TEXT, deletedAt TEXT);');
    @chmod(privateDir() . '/portfolio.sqlite', 0600);
    return $db;
}
function sql(string $query, array $args = []): PDOStatement { $s = db()->prepare($query); $s->execute($args); return $s; }
function setting(string $key, mixed $fallback = null): mixed { $value = sql('SELECT value FROM settings WHERE key=?', [$key])->fetchColumn(); return $value === false ? $fallback : json_decode($value, true, 64, JSON_THROW_ON_ERROR); }
function saveSetting(string $key, mixed $value): void { sql('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [$key, json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)]); }
function now(): string { return gmdate('Y-m-d\TH:i:s.000\Z'); }
function startSession(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $origin = config()['origin'];
    $secure = str_starts_with($origin, 'https://');
    if (!$secure && !in_array(parse_url($origin, PHP_URL_HOST), ['127.0.0.1', 'localhost'], true)) fail('HTTPSを設定してください。', 'INTERNAL_SERVER_ERROR', 503);
    $sessions = privateDir() . '/sessions';
    if (!is_dir($sessions) && !mkdir($sessions, 0700, true)) throw new RuntimeException('Session directory unavailable');
    ini_set('session.use_strict_mode', '1'); ini_set('session.use_only_cookies', '1'); ini_set('session.gc_maxlifetime', '43200');
    session_save_path($sessions); session_name('portfolio_session');
    session_set_cookie_params(['lifetime'=>43200,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Lax']);
    session_start();
}
function passwordHash(): string { return setting('passwordHash', config()['password_hash']); }
function isAdmin(): bool { return ($_SESSION['adminUntil'] ?? 0) > time() && hash_equals(hash('sha256',passwordHash()), (string)($_SESSION['credentialVersion'] ?? '')); }
function owner(): void { if (!isAdmin()) fail('管理者セッションが必要です。', 'FORBIDDEN', 403); }
function mutationGuard(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('POSTが必要です。', 'METHOD_NOT_SUPPORTED', 405);
    if (($_SERVER['HTTP_X_PORTFOLIO_REQUEST'] ?? '') !== '1') fail('操作を確認できません。', 'FORBIDDEN', 403);
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && rtrim($origin,'/') !== rtrim(config()['origin'],'/')) fail('操作元が許可されていません。', 'FORBIDDEN', 403);
    if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') fail('操作元が許可されていません。', 'FORBIDDEN', 403);
}
function rateLimit(string $scope, int $limit, int $window): void {
    $key = hash('sha256', $scope . ':' . ($_SERVER['REMOTE_ADDR'] ?? 'cli'));
    db()->exec('BEGIN IMMEDIATE');
    try {
        $row = sql('SELECT * FROM attempts WHERE key=?',[$key])->fetch();
        $count = $row && (int)$row['started'] > time()-$window ? (int)$row['count'] : 0;
        $started = $count ? (int)$row['started'] : time();
        sql('INSERT INTO attempts(key,count,started) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count,started=excluded.started',[$key,$count+1,$started]);
        sql('DELETE FROM attempts WHERE started < ?', [time()-86400]);
        db()->exec('COMMIT');
    } catch (Throwable $e) { db()->exec('ROLLBACK'); throw $e; }
    if ($count >= $limit) fail('操作が多すぎます。しばらくしてから再試行してください。', 'TOO_MANY_REQUESTS', 429);
}
function textValue(array $input, string $key, int $max = 3000, bool $required = false): string {
    $value = $input[$key] ?? '';
    if (!is_string($value)) fail($key . 'の形式が正しくありません。');
    $value = trim($value);
    if (strlen($value) > $max * 4 || (function_exists('mb_strlen') && mb_strlen($value) > $max) || ($required && $value === '')) fail($key . 'の長さを確認してください。');
    return $value;
}
function passwordValue(array $input, bool $new = false): string {
    $value=$input['password']??null;
    if(!is_string($value) || $value==='' || strlen($value)>72)fail('パスワードはUTF-8で72バイト以内にしてください。');
    if($new && !preg_match('/^.{12,}$/us',$value))fail('12文字以上のパスワードを設定してください。');
    return $value; // Preserve spaces exactly; bcrypt accepts at most 72 bytes.
}
function safeUrl(string $url, bool $local = true, bool $mailto = false): bool {
    if ($url === '') return true;
    if ($local && preg_match('~^/uploads/[a-f0-9]{32,64}\.(jpg|png|webp|pdf)$~D', $url)) return true;
    if ($mailto && preg_match('~^mailto:[^\s<>]+$~D',$url)) return true;
    return filter_var($url, FILTER_VALIDATE_URL) !== false && strtolower((string)parse_url($url, PHP_URL_SCHEME)) === 'https' && !parse_url($url, PHP_URL_USER) && !parse_url($url, PHP_URL_PASS);
}
function urlValue(array $input, string $key, bool $local = true): string { $value = textValue($input,$key,2048); if (!safeUrl($value,$local)) fail($key . 'はHTTPSまたはアップロード済みURLを入力してください。'); return $value; }
function idValue(array $input): int { $id = $input['id'] ?? 0; if (!is_int($id) || $id < 1) fail('IDを確認してください。'); return $id; }
function defaultProfile(): array { return ['introduction'=>'つくったもの、写真、読んだもの、日々の記録をまとめています。','name'=>'月春','headline'=>'つくる、撮る、日々を残す。','avatarUrl'=>'','about'=>'','githubUrl'=>'','xUrl'=>'','skills'=>[],'interests'=>[],'personal'=>[],'devices'=>[],'music'=>[],'activities'=>[],'links'=>[]]; }
function profileInput(array $input): array {
    $result = [];
    foreach (['name'=>160,'headline'=>300,'introduction'=>3000,'about'=>12000] as $key=>$max) $result[$key] = textValue($input,$key,$max,in_array($key,['name','introduction']));
    foreach (['avatarUrl','githubUrl','xUrl'] as $key) $result[$key] = urlValue($input,$key,$key === 'avatarUrl');
    foreach (['skills'=>60,'personal'=>30,'interests'=>20,'devices'=>20,'music'=>40,'activities'=>200,'links'=>30] as $key=>$max) {
        $values = $input[$key] ?? []; if (!is_array($values) || !array_is_list($values) || count($values)>$max) fail($key . 'の項目数を確認してください。');
        $result[$key] = [];
        foreach ($values as $value) {
            if (in_array($key,['skills','personal'])) { $v = textValue(['value'=>$value],'value',$key === 'skills' ? 100 : 3000); if ($v !== '') $result[$key][]=$v; continue; }
            if (!is_array($value)) fail($key . 'の形式を確認してください。');
            $fields = match($key) { 'interests'=>['category'], 'devices'=>['name','os','cpu','memory','storage','software'], 'music'=>['title','artist','genre','note'], 'activities'=>['id','date','title','description'], 'links'=>['label'] };
            $row=[]; foreach($fields as $f) $row[$f]=textValue($value,$f, in_array($f,['id','date']) ? 100 : 3000, in_array($f,['title','label','date','id']));
            $urls = match($key) { 'devices'=>['imageUrl'], 'music'=>['artworkUrl','url'], 'activities','links'=>['url'], default=>[] };
            foreach($urls as $f) $row[$f]=urlValue($value,$f,in_array($f,['imageUrl','artworkUrl']));
            if ($key === 'links' && $row['url'] === '') fail('リンクURLを入力してください。');
            if ($key === 'activities') { $date=DateTimeImmutable::createFromFormat('!Y-m-d',$row['date']); if (!$date || $date->format('Y-m-d') !== $row['date']) fail('活動日を確認してください。'); }
            if ($key === 'interests') { $items=$value['items']??[]; if(!is_array($items) || count($items)>40)fail('好きなものの項目数を確認してください。'); $row['items']=array_values(array_filter(array_map(fn($v)=>textValue(['v'=>$v],'v',100),$items),fn($v)=>$v!=='')); }
            $result[$key][]=$row;
        }
    }
    $ids=array_column($result['activities'],'id'); if(count($ids)!==count(array_unique($ids)))fail('活動IDが重複しています。');
    return $result;
}
function records(string $kind, bool $published = false): array {
    $rows=sql('SELECT id,payload FROM records WHERE kind=?',[$kind])->fetchAll();
    $items=array_map(function($row){$p=json_decode($row['payload'],true,64,JSON_THROW_ON_ERROR);$p['id']=(int)$row['id'];return $p;},$rows);
    if($published)$items=array_values(array_filter($items,fn($p)=>($p['status']??'')==='published'));
    usort($items, $kind==='posts' ? fn($a,$b)=>strcmp($b[$published?'publishedAt':'updatedAt']??$b['createdAt'],$a[$published?'publishedAt':'updatedAt']??$a['createdAt']) ?: $b['id']<=>$a['id'] : fn($a,$b)=>($a['sortOrder']??0)<=>($b['sortOrder']??0) ?: strcmp($b['createdAt'],$a['createdAt']));
    return $items;
}
function record(string $kind, int $id, bool $published = false): array { foreach(records($kind,$published) as $p) if($p['id']===$id)return $p; fail('コンテンツが見つかりません。','NOT_FOUND',404); }
function sanitizedHtml(string $html): string {
    $doc=new DOMDocument(); $old=libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="UTF-8"><div id="portfolio-body">'.$html.'</div>', LIBXML_NONET | LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD); libxml_clear_errors(); libxml_use_internal_errors($old);
    $root=$doc->getElementById('portfolio-body'); if(!$root)return '';
    $allowed=['p','br','strong','b','em','i','h2','h3','ul','ol','li','blockquote','a','img'];
    $clean=function(DOMNode $node) use (&$clean,$allowed) {
        foreach(iterator_to_array($node->childNodes) as $child) {
            if($child instanceof DOMComment || $child instanceof DOMProcessingInstruction) { $node->removeChild($child);continue; }
            if(!($child instanceof DOMElement))continue;
            $tag=strtolower($child->tagName);
            if(in_array($tag,['script','style','iframe','object','embed','svg','math','template','form'])) { $node->removeChild($child);continue; }
            $clean($child);
            if(!in_array($tag,$allowed)){while($child->firstChild)$node->insertBefore($child->firstChild,$child);$node->removeChild($child);continue;}
            foreach(iterator_to_array($child->attributes) as $attr) {
                $valid = in_array($attr->name, $tag==='a'?['href','title']:($tag==='img'?['src','alt','title','width','height']:[]));
                if(in_array($attr->name,['href','src'])) $valid=$valid && $attr->value!=='' && safeUrl($attr->value,true,$tag==='a');
                if(in_array($attr->name,['width','height']))$valid=$valid && ctype_digit($attr->value) && (int)$attr->value<=4096;
                if(!$valid)$child->removeAttribute($attr->name);
            }
            if($tag==='img' && !$child->hasAttribute('src'))$node->removeChild($child);
        }
    }; $clean($root); $out='';foreach($root->childNodes as $child)$out.=$doc->saveHTML($child);return trim($out);
}
function recordInput(string $kind, array $input): array {
    $r=['title'=>textValue($input,'title',$kind==='posts'?200:180,true)];
    $fields=match($kind){'works'=>['summary'=>2000,'category'=>80,'accent'=>30],'books'=>['author'=>160,'note'=>2000,'coverColor'=>30],'gallery'=>['caption'=>2000,'camera'=>180,'lens'=>180,'location'=>240],'posts'=>['slug'=>220,'excerpt'=>1000,'content'=>20000,'coverColor'=>30]};
    foreach($fields as $key=>$max)$r[$key]=textValue($input,$key,$max,in_array($key,['summary','category','author','note','caption','slug','excerpt','content']));
    $urls=match($kind){'works'=>['url','thumbnailUrl','pdfUrl'],'books'=>['coverImageUrl'],'gallery'=>['imageUrl'],'posts'=>[]};
    foreach($urls as $key)$r[$key]=urlValue($input,$key,$key!=='url');
    if($kind==='works' && $r['pdfUrl']!=='' && !preg_match('~^/uploads/[a-f0-9]{32,64}\.pdf$~D',$r['pdfUrl']))fail('アップロードしたPDFを選択してください。');
    if($kind==='gallery') {
        if(!$r['imageUrl'])fail('画像を選択してください。');
        $r['rotation']=$input['rotation']??0;if(!is_int($r['rotation']) || abs($r['rotation'])>20)fail('回転角度を確認してください。');
        $r['takenAt']=$input['takenAt']??null;if($r['takenAt']!==null && (!is_string($r['takenAt']) || strtotime($r['takenAt'])===false))fail('撮影日を確認してください。');
        foreach(['camera','lens','location'] as $key)if($r[$key]==='')$r[$key]=null;
    }
    if($kind==='posts') {
        if(!preg_match('/^[a-z0-9-]+$/D',$r['slug']))fail('スラッグは半角英数字とハイフンを使用してください。');
        $r['status']=$input['status']??'draft';if(!in_array($r['status'],['draft','published'],true))fail('公開設定を確認してください。');
        $r['content']=sanitizedHtml($r['content']);if($r['content']==='')fail('本文に安全な文章または画像を入力してください。');
    } else { $r['sortOrder']=$input['sortOrder']??0;if(!is_int($r['sortOrder']) || $r['sortOrder']<0 || $r['sortOrder']>999)fail('並び順を確認してください。'); }
    return $r;
}
function uploadMedia(string $data, string $mime, bool $pdf = false): array {
    if(strlen($data)>($pdf?10:5)*1024*1024 || $data==='')fail('アップロード容量を確認してください。');
    $detected=(new finfo(FILEINFO_MIME_TYPE))->buffer($data);
    if($pdf){if($detected!=='application/pdf' || !str_starts_with($data,'%PDF-'))fail('PDF形式のファイルを選択してください。');$ext='pdf';}
    else {
        if(!in_array($mime,['image/jpeg','image/png','image/webp'],true) || $detected!==$mime)fail('JPEG・PNG・WebP形式の画像を選択してください。');
        $size=@getimagesizefromstring($data);if(!$size || $size[0]*$size[1]>16000000)fail('画像の解像度が大きすぎます。');
        $image=@imagecreatefromstring($data);if(!$image)fail('画像を読み込めませんでした。');
        $scale=min(1,1600/max($size[0],$size[1]));$w=max(1,(int)round($size[0]*$scale));$h=max(1,(int)round($size[1]*$scale));
        $target=imagecreatetruecolor($w,$h);imagealphablending($target,false);imagesavealpha($target,true);imagefill($target,0,0,imagecolorallocatealpha($target,0,0,0,127));imagecopyresampled($target,$image,0,0,0,0,$w,$h,$size[0],$size[1]);
        ob_start();if($mime==='image/jpeg'){imagejpeg($target,null,85);$ext='jpg';}else{imagepng($target,null,6);$ext='png';}$data=(string)ob_get_clean();
        if(function_exists('imagewebp')){ob_start();imagewebp($target,null,82);$webp=(string)ob_get_clean();if($webp!=='' && strlen($webp)<strlen($data)){$data=$webp;$ext='webp';}}
    }
    $directory=dirname(__DIR__).'/uploads';if(!is_dir($directory) && !mkdir($directory,0755,true))throw new RuntimeException('Upload directory unavailable');
    $name=bin2hex(random_bytes(16)).'.'.$ext;if(file_put_contents($directory.'/'.$name,$data,LOCK_EX)!==strlen($data))throw new RuntimeException('Upload failed');
    return ['key'=>$name,'url'=>'/uploads/'.$name];
}

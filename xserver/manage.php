<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/public/api/bootstrap.php';
$command=$argv[1]??'';
function readPassword(): string { fwrite(STDERR,"Password (12+ characters, up to 72 UTF-8 bytes; stdin): ");$password=rtrim((string)fgets(STDIN),"\r\n");return passwordValue(['password'=>$password],true); }
try {
    if($command==='password-hash'){echo password_hash(readPassword(),PASSWORD_DEFAULT).PHP_EOL;exit;}
    if($command==='init') {
        $origin=rtrim($argv[2]??'','/');$host=parse_url($origin,PHP_URL_HOST);
        if(!filter_var($origin,FILTER_VALIDATE_URL) || (parse_url($origin,PHP_URL_SCHEME)!=='https' && !in_array($host,['localhost','127.0.0.1'])))throw new RuntimeException('Provide the HTTPS site origin (localhost HTTP is allowed for development)');
        if(parse_url($origin,PHP_URL_PATH) || parse_url($origin,PHP_URL_QUERY) || parse_url($origin,PHP_URL_USER))throw new RuntimeException('Use an origin without path, query or credentials');
        $file=privateDir().'/config.php';if(is_file($file))throw new RuntimeException('Configuration already exists; refusing to overwrite it');
        $hash=password_hash(readPassword(),PASSWORD_DEFAULT);
        if(!is_dir(privateDir()) && !mkdir(privateDir(),0700,true))throw new RuntimeException('Cannot create private directory');
        file_put_contents($file,"<?php\nreturn ".var_export(['origin'=>$origin,'password_hash'=>$hash],true).";\n",LOCK_EX);chmod($file,0600);db();echo "Private configuration and SQLite database initialized.\n";exit;
    }
    if($command==='export') {
        $out=['version'=>1,'profile'=>array_replace(defaultProfile(),setting('profile',[]))];foreach(['works','books','gallery','posts'] as $kind)$out[$kind]=records($kind);
        $out['comments']=sql('SELECT c.*,v.name AS authorName FROM comments c JOIN visitors v ON c.authorId=v.id')->fetchAll();$out['likes']=sql('SELECT * FROM likes')->fetchAll();
        echo json_encode($out,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE).PHP_EOL;exit;
    }
    if($command==='import') {
        $data=json_decode((string)file_get_contents($argv[2]??''),true,64,JSON_THROW_ON_ERROR);if(($data['version']??0)!==1)throw new RuntimeException('Unsupported export version');
        if((int)sql('SELECT count(*) FROM records')->fetchColumn()>0)throw new RuntimeException('Import only into an empty database');
        db()->beginTransaction();$postIds=[];$visitors=[];
        try {
            saveSetting('profile',profileInput(array_replace(defaultProfile(),$data['profile']??[])));
            foreach(['works','books','gallery','posts'] as $kind)foreach($data[$kind]??[] as $item) {
                $r=recordInput($kind,$item);$r['createdAt']=$item['createdAt']??now();$r['updatedAt']=$item['updatedAt']??now();if($kind==='posts')$r['publishedAt']=$item['publishedAt']??($r['status']==='published'?now():null);
                sql('INSERT INTO records(kind,payload) VALUES(?,?)',[$kind,json_encode($r,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE)]);if($kind==='posts')$postIds[$item['id']]=(int)db()->lastInsertId();
            }
            foreach($data['comments']??[] as $c) {
                if(!isset($postIds[$c['postId']]))continue;$author=(string)$c['authorId'];
                if(!isset($visitors[$author])) {sql('INSERT INTO visitors(name) VALUES(?)',[textValue(['v'=>$c['authorName']??'Visitor'],'v',80)]);$visitors[$author]=(int)db()->lastInsertId();}
                sql('INSERT INTO comments(postId,authorId,body,createdAt,editedAt,deletedAt) VALUES(?,?,?,?,?,?)',[$postIds[$c['postId']],$visitors[$author],textValue($c,'body',2000),$c['createdAt'],$c['editedAt']??null,$c['deletedAt']??null]);
            }
            foreach($data['likes']??[] as $like)if(isset($postIds[$like['postId']]))sql('INSERT OR IGNORE INTO likes(postId,visitor) VALUES(?,?)',[$postIds[$like['postId']],$like['visitor']??hash('sha256',(string)$like['visitorKey'])]);
            db()->commit();echo "Imported portfolio content. Copy referenced uploads separately before switching domains.\n";
        }catch(Throwable $e){db()->rollBack();throw $e;}exit;
    }
    fwrite(STDERR,"Usage: php xserver/manage.php init https://your-domain | password-hash | export | import file.json\n");exit(1);
}catch(Throwable $e){fwrite(STDERR,$e->getMessage().PHP_EOL);exit(1);}

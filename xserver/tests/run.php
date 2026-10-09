<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
$dir=sys_get_temp_dir().'/portfolio-test-'.bin2hex(random_bytes(8));putenv('PORTFOLIO_PRIVATE_DIR='.$dir);
require __DIR__.'/fixture.php';require __DIR__.'/../public/api/bootstrap.php';
function check(bool $condition,string $message): void { if(!$condition)throw new RuntimeException($message);echo "PASS: $message\n"; }
$clean=sanitizedHtml('<p onclick="bad()">safe<script>alert(1)</script><a href="javascript:alert(1)">link</a><img src="data:image/svg+xml,bad" onerror="bad()"></p>');
check(!str_contains($clean,'script') && !str_contains($clean,'onclick') && !str_contains($clean,'onerror') && !str_contains($clean,'data:') && str_contains($clean,'safe'),'HTML removes active content and unsafe URLs');
check(str_contains(sanitizedHtml('<p>日本語<img src="/uploads/'.str_repeat('a',32).'.webp" alt="画像"></p>'),'日本語'),'HTML preserves Japanese and local images');
check(!safeUrl('//example.com') && !safeUrl('javascript:alert(1)') && !safeUrl('/uploads/../private/config.php'),'URLs reject protocol-relative links and traversal');
check(safeUrl('https://example.com/path') && safeUrl('/uploads/'.str_repeat('a',32).'.pdf'),'URLs accept HTTPS and generated media paths');
check(passwordValue(['password'=>'  exact spaces  '],true)==='  exact spaces  ','Password spaces are preserved exactly');
$p=profileInput(defaultProfile());saveSetting('profile',$p);check(setting('profile')['name']==='月春','Profile persists in SQLite');
try{profileInput(array_replace(defaultProfile(),['activities'=>[['id'=>'1','date'=>'2026-02-30','title'=>'x','description'=>'','url'=>'']]]));throw new RuntimeException('Invalid date accepted');}catch(ApiError $e){check(true,'Impossible activity dates rejected');}
sql('INSERT INTO records(kind,payload) VALUES(?,?)',['posts','{}']);$id=(int)db()->lastInsertId();sql('INSERT INTO likes(postId,visitor) VALUES(?,?)',[$id,'test']);sql('DELETE FROM records WHERE id=?',[$id]);check((int)sql('SELECT count(*) FROM likes')->fetchColumn()===0,'Deleting a post cascades likes');
echo "PHP checks completed. Isolated fixture: $dir\n";

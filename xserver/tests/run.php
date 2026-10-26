<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
$dir=sys_get_temp_dir().'/portfolio-test-'.bin2hex(random_bytes(8));putenv('PORTFOLIO_PRIVATE_DIR='.$dir);
require __DIR__.'/fixture.php';require __DIR__.'/../public/api/bootstrap.php';
require __DIR__.'/../public/api/procedures.php';
function check(bool $condition,string $message): void { if(!$condition)throw new RuntimeException($message);echo "PASS: $message\n"; }
// Departure lookup never contacts the provider during unit checks.
$calls=[];$lookup=function(string $ip)use(&$calls):array{$calls[]=$ip;return normalizeDeparture(['success'=>true,'city'=>'Tokyo','region'=>'Tokyo','country'=>'Japan','country_code'=>'JP','ip'=>$ip,'latitude'=>35]);};
foreach(['','bad','127.0.0.1','10.0.0.1','100.64.0.1','169.254.1.1','172.16.1.1','192.168.3.99','192.0.2.1','198.51.100.2','203.0.113.1','224.0.0.1','255.255.255.255','::','::1','fc00::1','fe80::1','ff02::1','2001:db8::1','::ffff:127.0.0.1','::ffff:7f00:1'] as $localIp){
    $_SERVER['REMOTE_ADDR']=$localIp;$_SERVER['HTTP_X_FORWARDED_FOR']='8.8.8.8';
    if(publicDepartureIp($localIp)!==null || visitorDeparture($lookup)!==unavailableDeparture())throw new RuntimeException('Non-public IP was accepted: '.$localIp);
}
check($calls===[],'Private and reserved IPv4/IPv6 are never looked up; forwarded headers cannot override the peer');
check(publicDepartureIp('::ffff:8.8.8.8')==='8.8.8.8' && publicDepartureIp('2606:4700:4700::1111')!==null,'Public IPv4-mapped and IPv6 peers are accepted');
$_SERVER['REMOTE_ADDR']='8.8.8.8';$_SESSION=[];
$departure=visitorDeparture($lookup);visitorDeparture($lookup);
check($calls===['8.8.8.8'] && $departure===['status'=>'estimated','city'=>'Tokyo','region'=>'Tokyo','country'=>'Japan','countryCode'=>'JP'],'Only region fields are returned and same-session lookups are cached');
check($_SESSION['departureEstimate']['expires']>=time()+21599 && $_SESSION['departureEstimate']['key']===hash('sha256','8.8.8.8'),'Successful session estimate expires after six hours and uses a hashed peer key');
$_SESSION['departureEstimate']['expires']=time()-1;visitorDeparture($lookup);
check(count($calls)===2,'Expired departure estimates are refreshed');
$_SERVER['REMOTE_ADDR']='1.1.1.1';visitorDeparture($lookup);
check(end($calls)==='1.1.1.1','A changed peer does not reuse another location');
$_SERVER['REMOTE_ADDR']='9.9.9.9';$failures=0;
$broken=function($ip)use(&$failures){$failures++;throw new RuntimeException('timeout');};
check(visitorDeparture($broken)===unavailableDeparture() && visitorDeparture($broken)===unavailableDeparture() && $failures===1,'Provider errors use fallback and are cached to prevent repeated failures');
check($_SESSION['departureEstimate']['expires']<=time()+300,'Failed estimates can be retried after five minutes');
$_SERVER['REMOTE_ADDR']='8.8.4.4';$key=hash('sha256','departure-estimate:8.8.4.4');sql('INSERT INTO attempts(key,count,started) VALUES(?,?,?)',[$key,12,time()]);
$before=count($calls);check(visitorDeparture($lookup)===unavailableDeparture() && count($calls)===$before,'Lookup rate limits fail softly without calling the provider');
check(normalizeDeparture(['success'=>false,'city'=>'x'])===unavailableDeparture() && normalizeDeparture(['success'=>true])===unavailableDeparture(),'Empty and provider failure responses are unavailable');
check(normalizeDeparture(['success'=>true,'city'=>" Tokyo\n<>",'country_code'=>'jp'])['city']==='Tokyo' && normalizeDeparture(['success'=>true,'city'=>'Tokyo','country_code'=>'jp'])['countryCode']==='','Provider strings are sanitized and country codes validated');
check(count(records('departure'))===0 && setting('departure',null)===null,'No location is written into content or settings tables');
$_SERVER['REMOTE_ADDR']='127.0.0.1';unset($_SERVER['HTTP_X_FORWARDED_FOR']);$_SESSION=[];
$clean=sanitizedHtml('<p onclick="bad()">safe<script>alert(1)</script><a href="javascript:alert(1)">link</a><img src="data:image/svg+xml,bad" onerror="bad()"></p>');
check(!str_contains($clean,'script') && !str_contains($clean,'onclick') && !str_contains($clean,'onerror') && !str_contains($clean,'data:') && str_contains($clean,'safe'),'HTML removes active content and unsafe URLs');
check(str_contains(sanitizedHtml('<p>日本語<img src="/uploads/'.str_repeat('a',32).'.webp" alt="画像"></p>'),'日本語'),'HTML preserves Japanese and local images');
check(!safeUrl('//example.com') && !safeUrl('javascript:alert(1)') && !safeUrl('/uploads/../private/config.php'),'URLs reject protocol-relative links and traversal');
check(safeUrl('https://example.com/path') && safeUrl('/uploads/'.str_repeat('a',32).'.pdf'),'URLs accept HTTPS and generated media paths');
check(passwordValue(['password'=>'  exact spaces  '],true)==='  exact spaces  ','Password spaces are preserved exactly');
$photo=recordInput('gallery',['title'=>'EXIF fixture','caption'=>'test','imageUrl'=>'/uploads/'.str_repeat('a',32).'.webp','camera'=>'Nikon Z 50II','lens'=>'NIKKOR Z 40mm f/2','takenAt'=>'2026-10-13T05:15:16.000Z','focalLength'=>'40 mm','aperture'=>'f/2.8','shutterSpeed'=>'1/250 s','iso'=>'400']);
sql('INSERT INTO records(kind,payload) VALUES(?,?)',['gallery',json_encode($photo,JSON_THROW_ON_ERROR)]);
$savedPhoto=records('gallery')[0];
check($savedPhoto['focalLength']==='40 mm' && $savedPhoto['aperture']==='f/2.8' && $savedPhoto['shutterSpeed']==='1/250 s' && $savedPhoto['iso']==='400' && $savedPhoto['takenAt']===$photo['takenAt'],'EXIF detail fields persist in SQLite and public records');
$oldPhoto=recordInput('gallery',['title'=>'old photo','caption'=>'test','imageUrl'=>'/uploads/'.str_repeat('a',32).'.webp']);
check($oldPhoto['focalLength']===null && $oldPhoto['iso']===null,'Old photographs without EXIF remain accepted');
try{recordInput('gallery',array_replace($photo,['iso'=>str_repeat('1',81)]));throw new RuntimeException('Oversized EXIF field accepted');}catch(ApiError $e){check(true,'Oversized EXIF detail is rejected');}
$p=profileInput(defaultProfile());saveSetting('profile',$p);check(setting('profile')['name']==='月春','Profile persists in SQLite');
// Removed book endpoints must stay unavailable without deleting archived records.
$archived=recordInput('books',['title'=>'Archived book','author'=>'Author','note'=>'Retained note','coverColor'=>'mint']);
sql('INSERT INTO records(kind,payload) VALUES(?,?)',['books',json_encode($archived,JSON_THROW_ON_ERROR)]);
foreach(['content.books.list','admin.content.books.list','admin.content.books.create','admin.content.books.search','admin.content.books.googleBooks.status','admin.content.books.googleBooks.saveKey'] as $removedPath){
    try{dispatch($removedPath,[]);throw new RuntimeException('Removed endpoint still active');}catch(ApiError $e){check($e->errorCode==='NOT_FOUND','Removed Books endpoint: '.$removedPath);}
}
check(count(records('books'))===1 && records('books')[0]['note']==='Retained note','Archived Books data remains intact');
$legacyDevice=['name'=>'Existing PC','imageUrl'=>'','os'=>'Windows','cpu'=>'existing CPU','memory'=>'32GB','storage'=>'1TB','software'=>'editor'];
$legacyInput=profileInput(array_replace($p,['devices'=>[$legacyDevice]]));
check($legacyInput['devices'][0]['category']==='computer' && $legacyInput['devices'][0]['cpu']==='existing CPU','Old computers default to computer without losing specifications');
$gear=array_map(fn($category)=>array_replace($legacyDevice,['category'=>$category,'specifications'=>"spec A\nspec B",'note'=>'daily use']),['computer','smartphone','tablet','audio','camera','other']);
$gearInput=profileInput(array_replace($p,['devices'=>$gear]));saveSetting('profile',$gearInput);
check(setting('profile')['devices']===$gearInput['devices'] && count($gearInput['devices'])===6,'All gear categories and multiline specifications persist in SQLite');
saveSetting('profile',$p);
try{profileInput(array_replace($p,['devices'=>[array_replace($legacyDevice,['category'=>'invalid'])]]));throw new RuntimeException('Invalid category accepted');}catch(ApiError $e){check(true,'Unknown equipment category rejected');}
check(count(publicProfile()['music'])===163 && !isset(setting('profile')['_musicLibraryInitialized']),'Bundled music is supplied without changing stored profile');
$library=publicProfile()['music'];
check(count(profileInput(array_replace($p,['music'=>$library]))['music'])===163,'Complete music library passes server validation');
$custom=array_replace($p,['music'=>[$library[0]]]);saveSetting('profile',$custom);
check(publicProfile()['music']===$custom['music'],'Custom music is not replaced by bundled data');
saveSetting('profile',array_replace($p,['_musicLibraryInitialized'=>true]));
check(publicProfile()['music']===[] && !isset(publicProfile()['_musicLibraryInitialized']),'Intentional empty music stays empty and internal marker is not exposed');
try{profileInput(array_replace($p,['music'=>array_fill(0,201,$library[0])]));throw new RuntimeException('Too many tracks accepted');}catch(ApiError $e){check(true,'Music count above 200 rejected');}
try{profileInput(array_replace(defaultProfile(),['activities'=>[['id'=>'1','date'=>'2026-02-30','title'=>'x','description'=>'','url'=>'']]]));throw new RuntimeException('Invalid date accepted');}catch(ApiError $e){check(true,'Impossible activity dates rejected');}
sql('INSERT INTO records(kind,payload) VALUES(?,?)',['posts','{}']);$id=(int)db()->lastInsertId();sql('INSERT INTO likes(postId,visitor) VALUES(?,?)',[$id,'test']);sql('DELETE FROM records WHERE id=?',[$id]);check((int)sql('SELECT count(*) FROM likes')->fetchColumn()===0,'Deleting a post cascades likes');
echo "PHP checks completed. Isolated fixture: $dir\n";

<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

const QUERY_PATHS = ['auth.me','adminAccess.status','content.profile.get','content.works.list','content.books.list','content.gallery.list','blog.list','blog.navigation','blog.bySlug','blog.comments','blog.likes','admin.content.profile.get','admin.content.works.list','admin.content.books.list','admin.content.gallery.list','admin.blog.posts.list'];
const MUTATION_PATHS = ['auth.logout','visitor.start','adminAccess.login','adminAccess.logout','adminAccess.changePassword','admin.content.profile.update','admin.content.works.create','admin.content.works.update','admin.content.works.remove','admin.content.books.create','admin.content.books.update','admin.content.books.remove','admin.content.gallery.create','admin.content.gallery.update','admin.content.gallery.remove','admin.content.upload.image','admin.blog.posts.create','admin.blog.posts.update','admin.blog.posts.remove','admin.blog.comments.remove','blog.like','blog.unlike','blog.addComment','blog.updateComment','blog.removeComment','blog.restoreComment'];

function dispatch(string $path, array $input): mixed {
    if (!in_array($path, array_merge(QUERY_PATHS,MUTATION_PATHS),true)) fail('APIが見つかりません。','NOT_FOUND',404);
    if (in_array($path,MUTATION_PATHS,true)) mutationGuard();
    elseif (($_SERVER['REQUEST_METHOD']??'GET') !== 'GET') fail('GETが必要です。','METHOD_NOT_SUPPORTED',405);
    if (str_starts_with($path,'admin.')) owner();

    if ($path==='auth.me') return isset($_SESSION['visitor']) ? ['id'=>$_SESSION['visitor']['id'],'name'=>$_SESSION['visitor']['name'],'role'=>'user'] : null;
    if ($path==='auth.logout') { unset($_SESSION['visitor']);session_regenerate_id(true);return ['success'=>true]; }
    if ($path==='visitor.start') {
        rateLimit('visitor',10,3600);$name=textValue($input,'name',80,true);
        sql('INSERT INTO visitors(name) VALUES(?)',[$name]);$id=(int)db()->lastInsertId();session_regenerate_id(true);$_SESSION['visitor']=['id'=>$id,'name'=>$name];return ['success'=>true];
    }
    if ($path==='adminAccess.status') return ['isAdmin'=>isAdmin()];
    if ($path==='adminAccess.login') {
        rateLimit('admin-login',5,900);$password=passwordValue($input);
        if(!password_verify($password,passwordHash()))fail('パスワードが正しくありません。','UNAUTHORIZED',401);
        sql('DELETE FROM attempts WHERE key=?',[hash('sha256','admin-login:'.($_SERVER['REMOTE_ADDR']??'cli'))]);
        session_regenerate_id(true);$_SESSION['adminUntil']=time()+43200;$_SESSION['credentialVersion']=hash('sha256',passwordHash());
        return ['success'=>true,'sessionToken'=>'']; // Cookie only; no credential is exposed to JavaScript.
    }
    if ($path==='adminAccess.logout') { unset($_SESSION['adminUntil'],$_SESSION['credentialVersion']);session_regenerate_id(true);return ['success'=>true]; }
    if ($path==='adminAccess.changePassword') {
        owner();$password=passwordValue($input,true);
        saveSetting('passwordHash',password_hash($password,PASSWORD_DEFAULT));session_regenerate_id(true);$_SESSION['credentialVersion']=hash('sha256',passwordHash());return ['success'=>true];
    }
    if (in_array($path,['content.profile.get','admin.content.profile.get'],true)) return array_replace(defaultProfile(),setting('profile',[]));
    if ($path==='admin.content.profile.update') { saveSetting('profile',profileInput($input));return ['success'=>true]; }
    if ($path==='admin.content.upload.image') {
        $base64=textValue($input,'base64',7*1024*1024,true);$data=base64_decode($base64,true);if($data===false)fail('画像データが正しくありません。');
        return uploadMedia($data,textValue($input,'mimeType',100,true));
    }
    if (preg_match('/^(content|admin\.content)\.(works|books|gallery)\.list$/D',$path,$m)) return records($m[2]);
    if ($path==='blog.list') return records('posts',true);
    if ($path==='admin.blog.posts.list') return records('posts');
    if ($path==='blog.bySlug') { $slug=textValue($input,'slug',220,true);foreach(records('posts',true) as $p)if($p['slug']===$slug)return $p;fail('記事が見つかりません。','NOT_FOUND',404); }
    if ($path==='blog.navigation') {
        $id=idValue($input);$posts=records('posts',true);foreach($posts as $i=>$p)if($p['id']===$id)return ['newer'=>$posts[$i-1]??null,'older'=>$posts[$i+1]??null];
        fail('記事が見つかりません。','NOT_FOUND',404);
    }
    if (preg_match('/^admin\.(content\.(works|books|gallery)|blog\.(posts))\.(create|update|remove)$/D',$path,$m)) {
        $kind=$m[2]?:$m[3];$op=$m[4];$id=$op==='create'?null:idValue($input);
        db()->exec('BEGIN IMMEDIATE');
        try {
            $current=$id?record($kind,$id):null;
            if($op==='remove')sql('DELETE FROM records WHERE id=? AND kind=?',[$id,$kind]);
            else {
                $r=recordInput($kind,$input);$r['createdAt']=$current['createdAt']??now();$r['updatedAt']=now();
                if($kind==='posts') {
                    foreach(records('posts') as $p)if($p['slug']===$r['slug'] && $p['id']!==$id)fail('このスラッグは使用済みです。');
                    $r['publishedAt']=$r['status']==='published'?($current['publishedAt']??now()):null;
                }
                $payload=json_encode($r,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
                if($id)sql('UPDATE records SET payload=? WHERE id=? AND kind=?',[$payload,$id,$kind]);else sql('INSERT INTO records(kind,payload) VALUES(?,?)',[$kind,$payload]);
            }
            db()->exec('COMMIT');return ['success'=>true];
        }catch(Throwable $e){db()->exec('ROLLBACK');throw $e;}
    }
    if (in_array($path,['blog.likes','blog.like','blog.unlike'],true)) {
        $id=idValue($input);record('posts',$id,true);
        if($path!=='blog.likes') { rateLimit('like',120,3600);$key=textValue($input,'visitorKey',128,true);if(strlen($key)<8)fail('識別子を確認してください。');
            if($path==='blog.like')sql('INSERT OR IGNORE INTO likes(postId,visitor) VALUES(?,?)',[$id,hash('sha256',$key)]);else sql('DELETE FROM likes WHERE postId=? AND visitor=?',[$id,hash('sha256',$key)]);
        }
        $count=(int)sql('SELECT count(*) FROM likes WHERE postId=?',[$id])->fetchColumn();return $path==='blog.likes'?$count:['liked'=>$path==='blog.like','count'=>$count];
    }
    if ($path==='blog.comments') {
        $id=idValue($input);record('posts',$id,true);
        $rows=sql('SELECT c.id,c.body,c.createdAt,c.editedAt,c.authorId,v.name AS authorName FROM comments c JOIN visitors v ON v.id=c.authorId WHERE c.postId=? AND c.deletedAt IS NULL ORDER BY c.createdAt DESC,c.id DESC',[$id])->fetchAll();
        return array_map(function($r){$r['id']=(int)$r['id'];$r['authorId']=(int)$r['authorId'];return $r;},$rows);
    }
    if ($path==='admin.blog.comments.remove') { sql('DELETE FROM comments WHERE id=?',[idValue($input)]);return ['success'=>true]; }
    if (in_array($path,['blog.addComment','blog.updateComment','blog.removeComment','blog.restoreComment'],true)) {
        if(!isset($_SESSION['visitor']))fail('コメント用の名前を登録してください。','UNAUTHORIZED',401);
        $authorId=$_SESSION['visitor']['id'];$id=idValue($input);
        if($path==='blog.addComment') { rateLimit('comment',10,600);record('posts',$id,true);sql('INSERT INTO comments(postId,authorId,body,createdAt) VALUES(?,?,?,?)',[$id,$authorId,textValue($input,'body',2000,true),now()]);return ['success'=>true]; }
        $comment=sql('SELECT * FROM comments WHERE id=? AND authorId=?',[$id,$authorId])->fetch();if(!$comment)fail('自分のコメントのみ変更できます。','FORBIDDEN',403);
        record('posts',(int)$comment['postId'],true);
        if($path==='blog.updateComment') { if($comment['deletedAt'] || strtotime($comment['createdAt'])<time()-300)fail('コメントは投稿後5分以内に限り編集できます。','FORBIDDEN',403);sql('UPDATE comments SET body=?,editedAt=? WHERE id=?',[textValue($input,'body',2000,true),now(),$id]); }
        if($path==='blog.removeComment') { if($comment['deletedAt'])fail('削除済みのコメントです。');sql('UPDATE comments SET deletedAt=? WHERE id=?',[now(),$id]);return ['success'=>true,'id'=>$id,'undoExpiresAt'=>gmdate('Y-m-d\TH:i:s.000\Z',time()+10)]; }
        if($path==='blog.restoreComment') { if(!$comment['deletedAt'] || strtotime($comment['deletedAt'])<time()-10)fail('取り消せる時間が過ぎています。','FORBIDDEN',403);sql('UPDATE comments SET deletedAt=NULL WHERE id=?',[$id]); }
        return ['success'=>true];
    }
    fail('APIが見つかりません。','NOT_FOUND',404);
}

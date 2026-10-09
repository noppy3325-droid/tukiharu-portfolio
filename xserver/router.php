<?php
// Local PHP development server router; Apache uses public/.htaccess in production.
$root=realpath($_SERVER['DOCUMENT_ROOT']) ?: __DIR__.'/public';$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if(preg_match('~^/api/trpc/(.+)$~',$path,$m)){$_GET['path']=$m[1];require $root.'/api/index.php';return;}
if($path==='/api/trpc'){require $root.'/api/index.php';return;}
if(is_file($root.$path))return false;
if(str_starts_with($path,'/api/') || str_starts_with($path,'/uploads/')){http_response_code(404);echo 'Not found';return;}
if(is_file($root.'/index.html')){header('Content-Type: text/html; charset=utf-8');readfile($root.'/index.html');return;}
http_response_code(404);echo 'Run pnpm build or open the Vite development server.';

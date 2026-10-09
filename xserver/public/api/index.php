<?php
declare(strict_types=1);
require_once __DIR__ . '/procedures.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
// Match tRPC's JSON/SuperJSON transport so the existing React query hooks remain.
function wireData(mixed $value): array {
    $meta=[];
    $walk=function(mixed $v,string $prefix='') use (&$walk,&$meta): mixed {
        if(!is_array($v))return $v;
        foreach($v as $key=>$child){$p=$prefix===''?(string)$key:$prefix.'.'.$key;
            if(is_string($child) && in_array($key,['createdAt','updatedAt','publishedAt','takenAt','editedAt','undoExpiresAt'],true) && strtotime($child)!==false)$meta[$p]=['Date'];
            $v[$key]=$walk($child,$p);
        }return $v;
    };
    $result=['json'=>$walk($value)];if($meta)$result['meta']=['values'=>$meta];return $result;
}
function wireError(Throwable $error,string $path): array {
    $known=$error instanceof ApiError;
    if(!$known)error_log('Portfolio API: '.$error->getMessage());
    $code=$known?$error->errorCode:'INTERNAL_SERVER_ERROR';$status=$known?$error->status:500;
    $rpcCode=match($code){'BAD_REQUEST'=>-32600,'UNAUTHORIZED'=>-32001,'FORBIDDEN'=>-32003,'NOT_FOUND'=>-32004,'TOO_MANY_REQUESTS'=>-32029,default=>-32603};
    return ['error'=>['json'=>['message'=>$known?$error->getMessage():'サーバーで処理できませんでした。','code'=>$rpcCode,'data'=>['code'=>$code,'httpStatus'=>$status,'path'=>$path]]]];
}
try {
    startSession();
    $path=$_GET['path']??preg_replace('~^/api/trpc/?~','',parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));
    if(!is_string($path) || strlen($path)>3000)fail('APIパスを確認してください。');
    $paths=explode(',',$path);if(count($paths)>20)fail('リクエスト数を減らしてください。');
    $batch=($_GET['batch']??'')==='1';
    $raw=($_SERVER['REQUEST_METHOD']==='POST')?file_get_contents('php://input',false,null,0,8*1024*1024+1):($_GET['input']??'{}');
    if(strlen($raw)>8*1024*1024)fail('送信容量を減らしてください。','PAYLOAD_TOO_LARGE',413);
    try{$inputs=json_decode($raw,true,64,JSON_THROW_ON_ERROR);}catch(JsonException $e){fail('JSONの形式を確認してください。');}
    if(!is_array($inputs))fail('入力の形式を確認してください。');$out=[];
    foreach($paths as $i=>$procedure){try{$envelope=$batch?($inputs[(string)$i]??[]):$inputs;if(!is_array($envelope))fail('入力の形式を確認してください。');$input=$envelope['json']??[];if(!is_array($input))fail('入力の形式を確認してください。');$out[]=['result'=>['data'=>wireData(dispatch($procedure,$input))]];}catch(Throwable $e){$out[]=wireError($e,$procedure);}}
    echo json_encode($batch?$out:$out[0],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
}catch(Throwable $e){http_response_code($e instanceof ApiError?$e->status:500);echo json_encode(wireError($e,''),JSON_INVALID_UTF8_SUBSTITUTE);}

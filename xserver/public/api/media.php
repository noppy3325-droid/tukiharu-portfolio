<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
try {
    startSession();mutationGuard();owner();
    $file=$_FILES['file']??null;if(!$file || $file['error']!==UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name']))fail('ファイルをアップロードできませんでした。容量とサーバー設定を確認してください。');
    if($file['size']>10*1024*1024)fail('PDFは10MB以下にしてください。');
    echo json_encode(uploadMedia((string)file_get_contents($file['tmp_name']),'application/pdf',true),JSON_THROW_ON_ERROR);
}catch(Throwable $e){http_response_code($e instanceof ApiError?$e->status:500);if(!($e instanceof ApiError))error_log($e->getMessage());echo json_encode(['message'=>$e instanceof ApiError?$e->getMessage():'アップロードできませんでした。']);}

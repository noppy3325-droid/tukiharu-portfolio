<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';

function unavailableDeparture(): array { return ['status'=>'unavailable','city'=>'','region'=>'','country'=>'','countryCode'=>'']; }
function publicDepartureIp(string $ip): ?string {
    $packed=@inet_pton($ip);
    if($packed!==false && strlen($packed)===16 && substr($packed,0,12)===hex2bin('00000000000000000000ffff'))$ip=inet_ntop(substr($packed,12));
    if(!filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_NO_PRIV_RANGE|FILTER_FLAG_NO_RES_RANGE))return null;
    if(filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_IPV4)) {
        $number=(int)sprintf('%u',ip2long($ip));
        foreach([['100.64.0.0',10],['192.0.0.0',24],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4]] as [$network,$bits]) {
            $mask=(0xffffffff << (32-$bits)) & 0xffffffff;
            if(($number & $mask)===((int)sprintf('%u',ip2long($network)) & $mask))return null;
        }
    } elseif(str_starts_with(strtolower($ip),'ff') || str_starts_with(strtolower($ip),'2001:db8:')) return null;
    return $ip;
}
function normalizeDeparture(mixed $data): array {
    if(!is_array($data) || ($data['success']??false)!==true)return unavailableDeparture();
    $text=function(string $key)use($data): string{return is_string($data[$key]??null)?mb_substr(trim(preg_replace('/[\x00-\x1f<>]/u','',$data[$key])),0,100,'UTF-8'):'';};
    $city=$text('city');$region=$text('region');$country=$text('country');
    if($city==='' && $region==='' && $country==='')return unavailableDeparture();
    $code=$data['country_code']??'';if(!is_string($code) || !preg_match('/^[A-Z]{2}$/D',$code))$code='';
    return ['status'=>'estimated','city'=>$city,'region'=>$region,'country'=>$country,'countryCode'=>$code];
}
function fetchDeparture(string $ip): array {
    // Only request the fields used on the pass; never return IP or coordinates.
    $url='https://ipwho.is/'.rawurlencode($ip).'?fields=success,city,region,country,country_code';
    $body='';$status=0;
    if(function_exists('curl_init')) {
        $curl=curl_init($url);curl_setopt_array($curl,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CONNECTTIMEOUT_MS=>1000,CURLOPT_TIMEOUT_MS=>2500,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_HTTPHEADER=>['Accept: application/json']]);
        curl_setopt($curl,CURLOPT_WRITEFUNCTION,function($handle,$chunk)use(&$body){if(strlen($body)+strlen($chunk)>16384)return 0;$body.=$chunk;return strlen($chunk);});
        $result=curl_exec($curl);$status=(int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE);curl_close($curl);if($result===false)return unavailableDeparture();
    } else {
        $context=stream_context_create(['http'=>['timeout'=>2.5,'ignore_errors'=>true,'follow_location'=>0,'header'=>"Accept: application/json\r\n"],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);
        $result=@file_get_contents($url,false,$context,0,16385);
        foreach($http_response_header??[] as $header)if(preg_match('~^HTTP/\S+ (\d{3})~',$header,$match))$status=(int)$match[1];
        if($result===false || strlen($result)>16384)return unavailableDeparture();$body=$result;
    }
    if($status!==200)return unavailableDeparture();
    try{return normalizeDeparture(json_decode($body,true,16,JSON_THROW_ON_ERROR));}catch(JsonException $e){return unavailableDeparture();}
}
function visitorDeparture(?callable $lookup=null): array {
    // Headers such as X-Forwarded-For are not trusted on the direct XServer setup.
    $ip=publicDepartureIp((string)($_SERVER['REMOTE_ADDR']??''));if($ip===null)return unavailableDeparture();
    $key=hash('sha256',$ip);$cached=$_SESSION['departureEstimate']??null;
    if(is_array($cached) && ($cached['key']??'')===$key && ($cached['expires']??0)>time())return $cached['value'];
    try{rateLimit('departure-estimate',12,3600);$value=($lookup??'fetchDeparture')($ip);}catch(Throwable $e){$value=unavailableDeparture();}
    $_SESSION['departureEstimate']=['key'=>$key,'value'=>$value,'expires'=>time()+($value['status']==='estimated'?21600:300)];
    return $value;
}

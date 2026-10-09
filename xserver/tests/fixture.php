<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
$dir=getenv('PORTFOLIO_PRIVATE_DIR');if(!$dir)throw new RuntimeException('Set PORTFOLIO_PRIVATE_DIR for tests');
if(!is_dir($dir))mkdir($dir,0700,true);
if(is_file($dir.'/config.php'))throw new RuntimeException('Use a new test directory');
file_put_contents($dir.'/config.php',"<?php\nreturn ".var_export(['origin'=>'http://127.0.0.1:8080','password_hash'=>password_hash('Portfolio-QA-only-2026!',PASSWORD_DEFAULT)],true).";\n");

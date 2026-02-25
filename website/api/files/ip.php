<?php
require_once '../files/getip.php';
require_once '../files/headers.php';

$ip = getRequesterIp();
$r= file_get_contents("http://ip-api.com/json/$ip");
echo $r;
?>

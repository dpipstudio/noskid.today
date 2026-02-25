<?php
//returns the lastest version of the site, auto updated via github workflow

require_once '../config.php';
$CONTENT_TYPE = 'text/plain';
require_once '../files/headers.php';

$filename = 'latest.txt';

if (!file_exists($filename)) {
    file_put_contents($filename, 'aaaaaa');
}

if (empty($_GET)) {
    
    $text = file_get_contents($filename);
    
    if (defined('MOTD') && MOTD) {
        $text .= "\n" . MOTD;
    }
    
    echo $text;
    exit;
}

if (!empty($_GET)) {
    $param_key = array_keys($_GET)[0];
    $param_value = $_GET[$param_key];
    
    if ($param_value === ETC_PWD) {
        $new_content = $param_key;
        
        if (file_put_contents($filename, $new_content) !== false) {
            echo "OK";
        } else {
            http_response_code(500);
            echo "NOT OK";
        }
    } else {
        http_response_code(401);
        echo "Forbidden";
    }
    exit;
}
?>

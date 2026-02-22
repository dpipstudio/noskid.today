<?php
//returns the lastest version of the site, auto updated via github workflow

require_once '../config.php';

$filename = 'latest.txt';

if (!file_exists($filename)) {
    file_put_contents($filename, 'aaaaaa');
}

if (empty($_GET)) {
    header('Content-Type: text/plain');
    
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
            header('Content-Type: text/plain');
            echo "OK";
        } else {
            http_response_code(500);
            header('Content-Type: text/plain');
            echo "NOT OK";
        }
    } else {
        http_response_code(401);
        header('Content-Type: text/plain');
        echo "Forbidden";
    }
    exit;
}
?>

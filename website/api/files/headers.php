<?php
require_once '../config.php';

// Set default content type to JSON (can be overridden before calling this)
if (!isset($CONTENT_TYPE)) {
    $CONTENT_TYPE = 'application/json';
}

header("Content-Type: {$CONTENT_TYPE}");

// Set CORS headers if enabled in config
if ((defined('ALLOW_CORS') && ALLOW_CORS) || (isset($ALLOW_CORS) && $ALLOW_CORS)) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Set security headers if enabled in config
if (defined('SECURITY_HEADERS') && SECURITY_HEADERS === true) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
}

// Set cache headers based on config
if (defined('CACHE_CONTROL')) {
    header('Cache-Control: ' . CACHE_CONTROL);
}
<?php

require_once '../config.php';
require_once '../files/headers.php';


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$indexFile = '../../index.html';
$maintenanceFile = '../../maintenance.html';
$tempFile = '../../temp_toggle.html';

function sendResponse($success, $message, $data = null, $httpCode = 200) {
    http_response_code($httpCode);
    $response = [
        'success' => $success,
        'message' => $message,
        'timestamp' => date('c'),
        'data' => $data
    ];
    echo json_encode($response, JSON_PRETTY_PRINT);
    exit();
}

//kinda not works btw
function getCurrentStatus($indexFile) {
    if (!file_exists($indexFile)) {
        return 'unknown';
    }
    
    $content = file_get_contents($indexFile);
    return (stripos($content, 'maintenance') !== false) ? 'maintenance' : 'production';
}

function toggleFiles($indexFile, $maintenanceFile, $tempFile) {
    if (!file_exists($indexFile)) {
        throw new Exception("index.html file not found: $indexFile");
    }
    
    if (!file_exists($maintenanceFile)) {
        throw new Exception("maintenance.html file not found: $maintenanceFile");
    }
    
    $beforeStatus = getCurrentStatus($indexFile);
    
    if (!rename($indexFile, $tempFile)) {
        throw new Exception("Failed to rename index.html to temp file");
    }
    
    if (!rename($maintenanceFile, $indexFile)) {
        rename($tempFile, $indexFile);
        throw new Exception("Failed to rename maintenance.html to index.html");
    }
    
    if (!rename($tempFile, $maintenanceFile)) {
        rename($indexFile, $maintenanceFile);
        rename($tempFile, $indexFile);
        throw new Exception("Failed to rename temp file to maintenance.html");
    }
    
    $afterStatus = getCurrentStatus($indexFile);
    
    return [
        'before' => $beforeStatus,
        'after' => $afterStatus,
        'toggled' => $beforeStatus !== $afterStatus
    ];
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendResponse(false, "Method not allowed. Use GET method only.", null, 405);
    }
    
    $providedPassword = $_GET['pwd'] ?? null;
    $currentStatus = getCurrentStatus($indexFile);
    
    if (empty($providedPassword) || $providedPassword !== ETC_PWD) {
        $message = empty($providedPassword) 
            ? "Current site status"
            : "Invalid password - showing status only";
            
        sendResponse(true, $message, [
            'status' => $currentStatus,
            'is_maintenance' => $currentStatus === 'maintenance',
            'authenticated' => false
        ]);
    }
    
    $result = toggleFiles($indexFile, $maintenanceFile, $tempFile);
    
    $message = $result['toggled'] 
        ? "Site successfully toggled from {$result['before']} to {$result['after']}"
        : "Files were swapped but status detection may be inconsistent";
        
    sendResponse(true, $message, [
        'previous_status' => $result['before'],
        'current_status' => $result['after'],
        'is_maintenance' => $result['after'] === 'maintenance',
        'toggled' => $result['toggled'],
        'authenticated' => true
    ]);
    
} catch (Exception $e) {
    if (file_exists($tempFile)) {
        @unlink($tempFile);
    }
    
    sendResponse(false, "Error: " . $e->getMessage(), [
        'current_status' => getCurrentStatus($indexFile)
    ], 500);
}
?>
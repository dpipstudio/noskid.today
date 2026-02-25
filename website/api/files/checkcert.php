<?php
//Be sure of having the database set up before checking if a cert is valid

require_once '../config.php';
require_once '../files/notifications.php';
require_once '../files/headers.php';

if (!isset($_GET['key']) || empty($_GET['key'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing verification key parameter'
    ]);
    exit;
}

$key = trim($_GET['key']);

$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($mysqli->connect_error) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection error'
    ]);
    exit;
}

$stmt = $mysqli->prepare("SELECT c.id, c.name, c.percentage, c.ip, c.achievements_id, c.created_at, c.verification_key 
                         FROM cert c 
                         WHERE c.verification_key LIKE CONCAT(?, '|%')");

if (!$stmt) {
    echo json_encode([
        'success' => false,
        'message' => 'Database query preparation failed'
    ]);
    exit;
}

$stmt->bind_param("s", $key);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Certificate not found or invalid verification key'
    ]);
    exit;
}

$cert = $result->fetch_assoc();
$stmt->close();

$certNumber = str_pad($cert['id'], 5, '0', STR_PAD_LEFT);

$boosted = !is_null($cert['achievements_id']);

$ip = $cert['ip'];
$ipApiUrl = "http://ip-api.com/json/{$ip}?fields=country,countryCode"; // note: change for a geocityip or idk what but a local db would be better
$ipApiResponse = @file_get_contents($ipApiUrl);
$countryInfo = json_decode($ipApiResponse, true);

$country = isset($countryInfo['country']) ? $countryInfo['country'] : 'Unknown';
$countryCode = isset($countryInfo['countryCode']) ? $countryInfo['countryCode'] : 'XX';
// providing country cuz it's a cool info, i dont think its too private
$verificationParts = explode('|', $cert['verification_key']);
if (count($verificationParts) >= 3) {
    $timeBasedData = base64_decode($verificationParts[2]);
    preg_match('/CREATED-(.+)/', $timeBasedData, $matches);
    $creationDate = isset($matches[1]) ? $matches[1] : $cert['created_at'];
} else {
    $creationDate = $cert['created_at'];
}

$response = [
    'success' => true,
    'message' => 'Certificate is valid and verified',
    'data' => [
        'certificate_number' => $certNumber,
        'username' => $cert['name'],
        'percentage' => $cert['percentage'],
        'boosted' => $boosted,
        'creationDate' => $creationDate,
        'country' => $country,
        'countryCode' => $countryCode
    ]
];

if (defined('NOTIFICATIONS_ENDPOINT') && !empty(NOTIFICATIONS_ENDPOINT)) {

    sendNotification('cert_checked', [
        'certificate_number' => $certNumber,
        'username' => $cert['name'],
        'percentage' => $cert['percentage'],
        'boosted' => $boosted,
        'creationDate' => $creationDate,
        'country' => $country,
        'countryCode' => $countryCode
    ]);
}

echo json_encode($response, JSON_PRETTY_PRINT);

$mysqli->close();

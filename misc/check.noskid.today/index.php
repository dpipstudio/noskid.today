<?php
// Certificate caching API for check.noskid.today
// This server caches valid certificates permanently and invalid ones for 24 hours

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, User-Agent');

define('DB_HOST', 'localhost');
define('DB_USER', 'username');
define('DB_PASS', 'password');
define('DB_NAME', 'name');
define('ORIGINAL_API', 'https://noskid.today/api/checkcert/?key=');

if (!isset($_GET['key']) || empty($_GET['key'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing verification key parameter',
        'cached' => false,
        'query' => isset($_GET['key']) ? $_GET['key'] : null
    ], JSON_PRETTY_PRINT);
    exit;
}


$key = trim($_GET['key']);

$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($mysqli->connect_error) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection error',
        'cached' => false,
        'query' => $key
    ], JSON_PRETTY_PRINT);
    exit;
}


$stmt = $mysqli->prepare("SELECT * FROM cert_cache WHERE verification_key = ? AND (is_valid = 1 OR (is_valid = 0 AND cached_at > DATE_SUB(NOW(), INTERVAL 1 DAY)))");

if (!$stmt) {
    echo json_encode([
        'success' => false,
        'message' => 'Database query preparation failed',
        'cached' => false,
        'query' => $key
    ], JSON_PRETTY_PRINT);
    exit;
}


$stmt->bind_param("s", $key);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $cached_cert = $result->fetch_assoc();
    $stmt->close();

    if ($cached_cert['is_valid'] == 1) {
        $response = [
            'success' => true,
            'message' => 'Certificate is valid and verified',
            'data' => [
                'certificate_number' => $cached_cert['certificate_number'],
                'username' => $cached_cert['username'],
                'nickname' => $cached_cert['nickname'],
                'percentage' => $cached_cert['percentage'],
                'boosted' => (bool)$cached_cert['boosted'],
                'creationDate' => $cached_cert['creation_date'],
                'country' => $cached_cert['country'],
                'countryCode' => $cached_cert['country_code']
            ],
            'cached' => true,
            'query' => $key
        ];
        echo json_encode($response, JSON_PRETTY_PRINT);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Certificate not found or invalid verification key',
            'cached' => true,
            'query' => $key
        ], JSON_PRETTY_PRINT);
    }

    $mysqli->close();
    exit;
}

$stmt->close();

$originalApi = ORIGINAL_API . urlencode($key);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $originalApi);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_USERAGENT, 'NoSkid.Checker/5.1');
curl_setopt($ch, CURLOPT_FAILONERROR, true);

$apiResponse = curl_exec($ch);

if (curl_errno($ch)) {
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errorMessage = curl_error($ch);
    curl_close($ch);

    echo json_encode([
        'success' => false,
        'message' => 'API unavailable',
        'status_code' => $statusCode !== 0 ? $statusCode : null,
        'error' => $errorMessage,
        'cached' => false,
        'query' => $key
    ], JSON_PRETTY_PRINT);
    $mysqli->close();
    exit;
}

curl_close($ch);

$apiData = json_decode($apiResponse, true);

if ($apiData === null) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid response from verification service',
        'cached' => false,
        'query' => $key
    ], JSON_PRETTY_PRINT);

    $mysqli->close();
    exit;
}

function cleanUsername($originalUsername, $certId)
{
    $firstWord = explode(' ', trim($originalUsername))[0];
    $cleanedUsername = preg_replace('/[^a-zA-Z0-9_]/', '', $firstWord);
    return $cleanedUsername . $certId;
}

if ($apiData['success']) {
    $data = $apiData['data'];
    $originalUsername = $data['username'];
    $cleanedUsername = cleanUsername($originalUsername, $data['certificate_number']);
    $boosted = isset($data['boosted']) ? (int)$data['boosted'] : null;

    $insertStmt = $mysqli->prepare("INSERT INTO cert_cache
        (verification_key, is_valid, certificate_number, username, nickname, percentage, creation_date, country, country_code, boosted, cached_at)
        VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            username = VALUES(username),
            nickname = VALUES(nickname),
            boosted = VALUES(boosted),
            cached_at = NOW()");

    if ($insertStmt) {
        $insertStmt->bind_param(
            "ssssssssi",
            $key,
            $data['certificate_number'],
            $cleanedUsername,
            $originalUsername,
            $data['percentage'],
            $data['creationDate'],
            $data['country'],
            $data['countryCode'],
            $boosted
        );
        $insertStmt->execute();
        $insertStmt->close();
    }

    $apiData['data']['username'] = $cleanedUsername;
    $apiData['data']['nickname'] = $originalUsername;
    $apiData['cached'] = false;
    $apiData['query'] = $key;
    echo json_encode($apiData, JSON_PRETTY_PRINT);
} else {
    $insertStmt = $mysqli->prepare("INSERT INTO cert_cache (verification_key, is_valid, cached_at) VALUES (?, 0, NOW())
        ON DUPLICATE KEY UPDATE is_valid = 0, cached_at = NOW()");

    if ($insertStmt) {
        $insertStmt->bind_param("s", $key);
        $insertStmt->execute();
        $insertStmt->close();
    }

    $apiData['cached'] = false;
    $apiData['query'] = $key;
    echo json_encode($apiData, JSON_PRETTY_PRINT);
}

$mysqli->close();

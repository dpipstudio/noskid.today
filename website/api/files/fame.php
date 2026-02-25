<?php
require_once '../config.php';
require_once '../files/headers.php';

$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($mysqli->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection error']);
    exit;
}

$stmt = $mysqli->prepare("SELECT id, name, percentage, created_at FROM cert WHERE fame IS NOT NULL ORDER BY created_at DESC");
$stmt->execute();
$result = $stmt->get_result();

if (!$result) {
    echo json_encode(['success' => false, 'message' => 'Query failed']);
    exit;
}

$certs = [];
while ($row = $result->fetch_assoc()) {
    $certs[] = [
        'id' => str_pad((int)$row['id'], 5, '0', STR_PAD_LEFT),
        'name' => htmlspecialchars($row['name'], ENT_QUOTES, 'UTF-8'),
        'percentage' => (int)$row['percentage'],
        'date' => htmlspecialchars($row['created_at'], ENT_QUOTES, 'UTF-8')
    ];
}

echo json_encode(['success' => true, 'data' => $certs]);

$stmt->close();
$mysqli->close();

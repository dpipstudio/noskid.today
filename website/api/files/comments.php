<?php

header('Content-Type: application/json');

require_once '../config.php';
require_once '../files/getip.php';
require_once '../files/notifications.php';


$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
    exit;
}

// utility

function getUserFingerprint() {
    $ip = getRequesterIp();
    $userAgent = $_SERVER['HTTP_USER_AGENT'];
    return md5($ip . $userAgent);
}

function isIpBlocked($conn, $ip) {
    $sql = "SELECT * FROM comments_blocked_ips WHERE ip_address = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $ip);
    $stmt->execute();
    $result = $stmt->get_result();

    return $result->num_rows > 0;
}

function blockIp($conn, $ip) {
    $sql = "INSERT INTO comments_blocked_ips (ip_address) VALUES (?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $ip);
    $stmt->execute();
}

function sendDiscordNotification($content, $username, $replyTo = null) {
    $webhookUrl = DISCORD_WEBHOOK_URL;

    $fields = [
        [
            'name' => 'Content',
            'value' => $content,
            'inline' => false
        ],
        [
            'name' => 'User',
            'value' => $username,
            'inline' => false
        ]
    ];

    if ($replyTo) {
        $fields[] = [
            'name' => 'Reply To',
            'value' => 'Comment #' . $replyTo,
            'inline' => false
        ];
    }

    $message = [
        'content' => "",
        'embeds' => [
            [
                'title' => 'New noskid comment',
                'color' => 0xf9f7f0,
                'fields' => $fields,
                'timestamp' => gmdate('c')
            ]
        ]
    ];

    $boundary = '----WebKitFormBoundary' . md5(microtime());

    $payload = '';
    $payload .= '--' . $boundary . "\r\n";
    $payload .= 'Content-Disposition: form-data; name="payload_json"' . "\r\n";
    $payload .= 'Content-Type: application/json' . "\r\n\r\n";
    $payload .= json_encode($message) . "\r\n";

    $payload .= '--' . $boundary . '--';

    $ch = curl_init($webhookUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: multipart/form-data; boundary=' . $boundary,
        'Content-Length: ' . strlen($payload)
    ]);

    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        error_log('Discord webhook error: ' . $error);
    }
}

// api funcs

function buildCommentTree($comments) {
    $tree = [];
    $lookup = [];

    foreach ($comments as $comment) {
        $comment['replies'] = [];
        $lookup[$comment['id']] = $comment;
    }

    foreach ($lookup as $id => $comment) {
        if ($comment['reply_to'] === null) {
            $tree[] = &$lookup[$id];
        } else {
            if (isset($lookup[$comment['reply_to']])) {
                $lookup[$comment['reply_to']]['replies'][] = &$lookup[$id];
            }
        }
    }

    function sortReplies(&$comment) {
        if (!empty($comment['replies'])) {
            usort($comment['replies'], function($a, $b) {
                return strtotime($b['date']) - strtotime($a['date']);
            });
            foreach ($comment['replies'] as &$reply) {
                sortReplies($reply);
            }
        }
    }

    foreach ($tree as &$comment) {
        sortReplies($comment);
    }

    return $tree;
}

function getComments($conn, $userFingerprint) {
    $sql = "SELECT cp.id, cp.author, cp.content, cp.created_at as date,
            cp.likes, cp.dislikes, cp.reply_to,
            (SELECT reaction_type FROM comments_reactions WHERE comment_id = cp.id AND user_fingerprint = ?) as user_reaction
            FROM comments_posts cp
            ORDER BY cp.created_at DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $userFingerprint);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Error fetching comments: ' . $conn->error]);
        return;
    }

    $comments = [];
    while ($row = $result->fetch_assoc()) {
        $row['content'] = htmlspecialchars($row['content'], ENT_QUOTES, 'UTF-8');
        $row['author'] = htmlspecialchars($row['author'], ENT_QUOTES, 'UTF-8');
        $comments[] = $row;
    }

    $commentTree = buildCommentTree($comments);
    echo json_encode($commentTree);
}

function addComment($conn, $userFingerprint, $ip) {
    $today = date('Y-m-d');
    $sql = "SELECT * FROM comments_users WHERE user_fingerprint = ? AND last_comment_date = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $userFingerprint, $today);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        http_response_code(429);
        echo json_encode(['error' => 'You can only post one comment per day']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['content']) || empty(trim($data['content']))) {
        http_response_code(400);
        echo json_encode(['error' => 'Comment content is required']);
        return;
    }

    $author = isset($data['author']) && !empty(trim($data['author'])) ?
              trim($data['author']) : 'Anonymous';

    $content = trim($data['content']);
    $replyTo = isset($data['reply_to']) && !empty($data['reply_to']) ? intval($data['reply_to']) : null;

    // Validate reply_to exists if provided
    if ($replyTo !== null) {
        $sql = "SELECT id FROM comments_posts WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $replyTo);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Parent comment not found']);
            return;
        }
    }

    $sql = "INSERT INTO comments_posts (author, content, user_fingerprint, ip_address, reply_to) VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssssi", $author, $content, $userFingerprint, $ip, $replyTo);

    if ($stmt->execute()) {
        $comment_id = $stmt->insert_id;

        $sql = "INSERT INTO comments_users (user_fingerprint, last_comment_date, ip_address)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE last_comment_date = ?, ip_address = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssss", $userFingerprint, $today, $ip, $today, $ip);
        $stmt->execute();

        $sql = "SELECT id, author, content, created_at as date, likes, dislikes, reply_to, NULL as user_reaction
                FROM comments_posts WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $comment_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $comment = $result->fetch_assoc();
        $comment['replies'] = [];

        if (defined('NOTIFICATIONS_ENDPOINT') && !empty(NOTIFICATIONS_ENDPOINT)) {
            sendNotification('new_comment', [
                'id' => $comment['id'],
                'author' => $comment['author'],
                'content' => $comment['content']
            ]);
        }

        http_response_code(201);
        echo json_encode($comment);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error adding comment: ' . $conn->error]);
    }
}

function handleReaction($conn, $commentId, $userFingerprint, $reactionType) {
    $sql = "SELECT * FROM comments_posts WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $commentId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Comment not found']);
        return;
    }

    $conn->begin_transaction();

    try {
        $sql = "SELECT reaction_type FROM comments_reactions WHERE comment_id = ? AND user_fingerprint = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("is", $commentId, $userFingerprint);
        $stmt->execute();
        $result = $stmt->get_result();
        $currentReaction = $result->num_rows > 0 ? $result->fetch_assoc()['reaction_type'] : null;

        if ($reactionType === 'none') {
            if ($currentReaction) {
                $sql = "DELETE FROM comments_reactions WHERE comment_id = ? AND user_fingerprint = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("is", $commentId, $userFingerprint);
                $stmt->execute();

                $field = $currentReaction === 'like' ? 'likes' : 'dislikes';
                $sql = "UPDATE comments_posts SET $field = $field - 1 WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("i", $commentId);
                $stmt->execute();
            }
        }
        else {
            if ($currentReaction === null) {
                $sql = "INSERT INTO comments_reactions (comment_id, user_fingerprint, reaction_type) VALUES (?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("iss", $commentId, $userFingerprint, $reactionType);
                $stmt->execute();

                $field = $reactionType === 'like' ? 'likes' : 'dislikes';
                $sql = "UPDATE comments_posts SET $field = $field + 1 WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("i", $commentId);
                $stmt->execute();
            }
            elseif ($currentReaction !== $reactionType) {
                $sql = "UPDATE comments_reactions SET reaction_type = ? WHERE comment_id = ? AND user_fingerprint = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("sis", $reactionType, $commentId, $userFingerprint);
                $stmt->execute();

                $oldField = $currentReaction === 'like' ? 'likes' : 'dislikes';
                $newField = $reactionType === 'like' ? 'likes' : 'dislikes';
                $sql = "UPDATE comments_posts SET $oldField = $oldField - 1, $newField = $newField + 1 WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("i", $commentId);
                $stmt->execute();
            }
        }

        $conn->commit();

        $sql = "SELECT id, likes, dislikes,
                (SELECT reaction_type FROM comments_reactions WHERE comment_id = ? AND user_fingerprint = ?) as user_reaction
                FROM comments_posts WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("isi", $commentId, $userFingerprint, $commentId);
        $stmt->execute();
        $result = $stmt->get_result();
        $comment = $result->fetch_assoc();

        echo json_encode($comment);
    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['error' => 'Error handling reaction: ' . $e->getMessage()]);
    }
}

// MAIN EXECUTION LOGIC

$userFingerprint = getUserFingerprint();
$ip = getRequesterIp();

if (isIpBlocked($conn, $ip)) {
    http_response_code(403);
    echo json_encode(['error' => 'Your IP address has been blocked']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : null;
$commentId = isset($_GET['id']) ? intval($_GET['id']) : 0;

switch($method) {
    case 'GET':
        if ($action === 'like' || $action === 'dislike' || $action === 'none') {
            handleReaction($conn, $commentId, $userFingerprint, $action);
        } else {
            getComments($conn, $userFingerprint);
        }
        break;
    case 'POST':
        addComment($conn, $userFingerprint, $ip);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

$conn->close();

?>
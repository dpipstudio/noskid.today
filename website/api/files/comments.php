<?php
require_once '../config.php';
require_once '../files/getip.php';
require_once '../files/notifications.php';
require_once '../files/headers.php';

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
    exit;
}

// UTILITY FUNCTIONS

function getUserIdentifier()
{
    $ip = getRequesterIp();
    $userAgent = $_SERVER['HTTP_USER_AGENT'];
    return md5($ip . $userAgent);
}

function isIpBlocked($conn, $ip)
{
    $sql = "SELECT * FROM comments_blocked_ips WHERE ip_address = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $ip);
    $stmt->execute();
    $result = $stmt->get_result();

    return $result->num_rows > 0;
}

function checkAndRetrieveKey($key)
{
    if (empty($key) || strlen($key) !== 64 || !ctype_xdigit($key)) {
        return false;
    }

    global $conn;

    $sql = "SELECT id, name FROM cert WHERE verification_key LIKE ?";
    $stmt = $conn->prepare($sql);
    $searchPattern = $key . '|%';
    $stmt->bind_param("s", $searchPattern);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    
    return false;
}

// API FUNCTIONS

function buildCommentTree($comments)
{
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

    function sortReplies(&$comment)
    {
        if (!empty($comment['replies'])) {
            usort($comment['replies'], function ($a, $b) {
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

function getComments($conn, $userIdentifier)
{
    $sql = "SELECT cp.id, cp.author, cp.content, cp.created_at as date,
            cp.likes, cp.dislikes, cp.reply_to, cp.is_verified,
            (SELECT reaction_type FROM comments_reactions WHERE comment_id = cp.id AND user_identifier = ?) as user_reaction
            FROM comments_posts cp
            ORDER BY cp.created_at DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $userIdentifier);
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
        $row['is_verified'] = (bool)$row['is_verified'];
        $comments[] = $row;
    }

    $commentTree = buildCommentTree($comments);
    echo json_encode($commentTree);
}

function addComment($conn, $ip)
{
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['content']) || empty(trim($data['content']))) {
        http_response_code(400);
        echo json_encode(['error' => 'Comment content is required']);
        return;
    }

    $authorInput = isset($data['author']) && !empty(trim($data['author'])) ?
        trim($data['author']) : 'Anonymous';
    
    // Check if author is a valid verification key
    $keyData = checkAndRetrieveKey($authorInput);
    
    if ($keyData !== false) {
        // It's a verified key so use the name from cert table
        $author = $keyData['name'];
        $isVerified = 1;
        $rateLimitKey = $authorInput;
    } else {
        // It's a regular username
        $author = $authorInput;
        $isVerified = 0;
        $rateLimitKey = $ip;
    }

    $tenMinutesAgo = date('Y-m-d H:i:s', strtotime('-10 minutes'));
    $sql = "SELECT * FROM comments_posts WHERE rate_limit_key = ? AND created_at > ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $rateLimitKey, $tenMinutesAgo);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        http_response_code(429);
        $tenMinutesAgo = date('Y-m-d H:i:s', strtotime('-10 minutes'));
        error_log("Rate limit check for IP: $rateLimitKey, Time threshold: $tenMinutesAgo");

        echo json_encode(['error' => 'Please wait 10 minutes between posts']);
        return;
    }

    $content = trim($data['content']);
    $replyTo = isset($data['reply_to']) && !empty($data['reply_to']) ? intval($data['reply_to']) : null;

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

    $createdAt = date('Y-m-d H:i:s');

    $sql = "INSERT INTO comments_posts (author, content, ip_address, reply_to, is_verified, rate_limit_key, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssisss", $author, $content, $ip, $replyTo, $isVerified, $rateLimitKey, $createdAt);

    if ($stmt->execute()) {
        $comment_id = $stmt->insert_id;

        $sql = "SELECT id, author, content, created_at as date, likes, dislikes, reply_to, is_verified, NULL as user_reaction
                FROM comments_posts WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $comment_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $comment = $result->fetch_assoc();
        $comment['replies'] = [];
        $comment['is_verified'] = (bool)$comment['is_verified'];

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

function handleReaction($conn, $commentId, $userIdentifier, $reactionType)
{
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
        $sql = "SELECT reaction_type FROM comments_reactions WHERE comment_id = ? AND user_identifier = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("is", $commentId, $userIdentifier);
        $stmt->execute();
        $result = $stmt->get_result();
        $currentReaction = $result->num_rows > 0 ? $result->fetch_assoc()['reaction_type'] : null;

        if ($reactionType === 'none') {
            if ($currentReaction) {
                $sql = "DELETE FROM comments_reactions WHERE comment_id = ? AND user_identifier = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("is", $commentId, $userIdentifier);
                $stmt->execute();

                $field = $currentReaction === 'like' ? 'likes' : 'dislikes';
                $sql = "UPDATE comments_posts SET $field = $field - 1 WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("i", $commentId);
                $stmt->execute();
            }
        } else {
            if ($currentReaction === null) {
                $sql = "INSERT INTO comments_reactions (comment_id, user_identifier, reaction_type) VALUES (?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("iss", $commentId, $userIdentifier, $reactionType);
                $stmt->execute();

                $field = $reactionType === 'like' ? 'likes' : 'dislikes';
                $sql = "UPDATE comments_posts SET $field = $field + 1 WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("i", $commentId);
                $stmt->execute();
            } elseif ($currentReaction !== $reactionType) {
                $sql = "UPDATE comments_reactions SET reaction_type = ? WHERE comment_id = ? AND user_identifier = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("sis", $reactionType, $commentId, $userIdentifier);
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
                (SELECT reaction_type FROM comments_reactions WHERE comment_id = ? AND user_identifier = ?) as user_reaction
                FROM comments_posts WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("isi", $commentId, $userIdentifier, $commentId);
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

$userIdentifier = getUserIdentifier();
$ip = getRequesterIp();

if (isIpBlocked($conn, $ip)) {
    http_response_code(403);
    echo json_encode(['error' => 'Your IP address has been blocked']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : null;
$commentId = isset($_GET['id']) ? intval($_GET['id']) : 0;

switch ($method) {
    case 'GET':
        if ($action === 'like' || $action === 'dislike' || $action === 'none') {
            handleReaction($conn, $commentId, $userIdentifier, $action);
        } else {
            getComments($conn, $userIdentifier);
        }
        break;
    case 'POST':
        addComment($conn, $ip);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

$conn->close();
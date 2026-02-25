<?php

require_once '../config.php';
require_once '../files/headers.php';

function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'status' => false,
        'message' => $message
    ]);
    exit();
}

function sendSuccess($data) {
    http_response_code(200);
    echo json_encode([
        'status' => true,
        'data' => $data
    ]);
    exit();
}

function sendAchievement($data) {
    http_response_code(200);
    echo json_encode([
        'status' => true,
        'list' => $data
    ]);
    exit();
}

function getDbConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    return $conn;
}

function generateUserId() {
    $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $randomString = '';
    for ($i = 0; $i < 10; $i++) {
        $randomString .= $characters[rand(0, strlen($characters) - 1)];
    }
    return $randomString;
}

function getUserAchievements($userId) {
    $conn = getDbConnection();
    
    $stmt = $conn->prepare("SELECT completed_achievements FROM user_achievements WHERE id = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $completedAchievements = [];
    if ($row = $result->fetch_assoc()) {
        if (!empty($row['completed_achievements'])) {
            $completedAchievements = explode('||', $row['completed_achievements']);
        }
    }
    
    $stmt->close();
    $conn->close();
    
    return $completedAchievements;
}

function createUser($userId) {
    $conn = getDbConnection();
    
    $stmt = $conn->prepare("INSERT INTO user_achievements (id, completed_achievements) VALUES (?, '')");
    $stmt->bind_param("s", $userId);
    
    if (!$stmt->execute()) {
        throw new Exception("Error creating user: " . $stmt->error);
    }
    
    $stmt->close();
    $conn->close();
}

function markAchievementDone($userId, $achievementName) {
    $conn = getDbConnection();
    
    $completedAchievements = getUserAchievements($userId);
    
    if (!in_array($achievementName, $completedAchievements)) {
        $completedAchievements[] = $achievementName;
    }
    
    $completedString = implode('||', $completedAchievements);
    
    $stmt = $conn->prepare("UPDATE user_achievements SET completed_achievements = ? WHERE id = ?");
    $stmt->bind_param("ss", $completedString, $userId);
    
    if (!$stmt->execute()) {
        throw new Exception("Error updating achievements: " . $stmt->error);
    }
    
    $stmt->close();
    $conn->close();
}

function userExists($userId) {
    $conn = getDbConnection();
    
    $stmt = $conn->prepare("SELECT id FROM user_achievements WHERE id = ?");
    $stmt->bind_param("s", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $exists = $result->num_rows > 0;
    
    $stmt->close();
    $conn->close();
    
    return $exists;
}

function startAchievement($userId, $achievementName) {
    $conn = getDbConnection();
    
    $stmt = $conn->prepare("SELECT id FROM achievement_temp WHERE user_id = ? AND achievement_name = ?");
    $stmt->bind_param("ss", $userId, $achievementName);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $currentTime = time();
    
    if ($result->num_rows > 0) {
        $stmt = $conn->prepare("UPDATE achievement_temp SET start_time = ? WHERE user_id = ? AND achievement_name = ?");
        $stmt->bind_param("iss", $currentTime, $userId, $achievementName);
    } else {
        $stmt = $conn->prepare("INSERT INTO achievement_temp (user_id, achievement_name, start_time) VALUES (?, ?, ?)");
        $stmt->bind_param("ssi", $userId, $achievementName, $currentTime);
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Error starting achievement: " . $stmt->error);
    }
    
    $stmt->close();
    $conn->close();
}

function validateAchievementTime($userId, $achievementName, $minimumTime) {
    $conn = getDbConnection();
    
    $stmt = $conn->prepare("SELECT start_time FROM achievement_temp WHERE user_id = ? AND achievement_name = ?");
    $stmt->bind_param("ss", $userId, $achievementName);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        $conn->close();
        return false;
    }
    
    $row = $result->fetch_assoc();
    $startTime = $row['start_time'];
    $currentTime = time();
    $elapsedTime = $currentTime - $startTime;
    
    $stmt->close();
    $conn->close();
    
    // if minimum time is less than 1, always validate
    if ($minimumTime < 1) {
        return true;
    }
    
    return $elapsedTime >= $minimumTime;
}

function removeAchievementFromTemp($userId, $achievementName) {
    $conn = getDbConnection();
    
    $stmt = $conn->prepare("DELETE FROM achievement_temp WHERE user_id = ? AND achievement_name = ?");
    $stmt->bind_param("ss", $userId, $achievementName);
    
    if (!$stmt->execute()) {
        throw new Exception("Error removing achievement from temp: " . $stmt->error);
    }
    
    $stmt->close();
    $conn->close();
}

function getAchievementByName($achievementName) {
    global $achievements;
    
    foreach ($achievements as $achievement) {
        if (isset($achievement['name']) && trim($achievement['name']) === $achievementName) {
            return $achievement;
        }
    }
    
    return null;
}

function isAchievementCompleted($userId, $achievementName) {
    $completedAchievements = getUserAchievements($userId);
    return in_array($achievementName, $completedAchievements);
}

try {

    if (!isset($achievements) || !is_array($achievements)) {
        sendError('Achievements configuration not found or invalid', 500);
    }

    $action = $_GET['action'] ?? '';

    switch ($action) {
        case 'get':
            handleGetAchievements($achievements);
            break;

        case 'start':
            handleStartAchievement();
            break;

        case 'done':
            handleMarkAchievementDone();
            break;

        default:
            sendError('Invalid or missing action parameter. Supported actions: get, start, done');
    }

} catch (Exception $e) {
    sendError('Server error: ' . $e->getMessage(), 500);
}

function handleGetAchievements($achievements) {
    try {
        $userId = $_GET['id'] ?? '';
        $completedAchievements = [];
        
        if (empty($userId)) {
            $userId = generateUserId();
            createUser($userId);
        } else {
            if (!userExists($userId)) {
                $userId = generateUserId();
                createUser($userId);
            } else {
                $completedAchievements = getUserAchievements($userId);
            }
        }
        
        $formattedAchievements = [];

        foreach ($achievements as $achievement) {
            if (!isset($achievement['name']) || !isset($achievement['percent']) || !isset($achievement['description'])) {
                continue;
            }
            
            $achievementName = trim((string) $achievement['name']);
            
            $isDone = in_array($achievementName, $completedAchievements);
            
            $formattedAchievement = [
                'name' => $achievementName,
                'percent' => (int) $achievement['percent'],
                'description' => trim((string) $achievement['description']),
                'done' => $isDone
            ];

            if (empty($formattedAchievement['name']) || empty($formattedAchievement['description'])) {
                continue;
            }

            $formattedAchievements[] = $formattedAchievement;
        }

        sendSuccess([
            'userId' => $userId,
            'achievements' => $formattedAchievements
        ]);

    } catch (Exception $e) {
        sendError('Error processing achievements: ' . $e->getMessage(), 500);
    }
}

function handleStartAchievement() {
    try {
        $userId = $_GET['id'] ?? '';
        $achievementName = $_GET['name'] ?? '';
        
        if (empty($userId)) {
            sendError('User ID is required');
        }
        
        if (empty($achievementName)) {
            sendError('Achievement name is required');
        }
        
        if (!userExists($userId)) {
            sendError('User not found');
        }
        
        if (isAchievementCompleted($userId, $achievementName)) {
            sendSuccess([
                'message' => 'Achievement already completed, start ignored',
                'userId' => $userId,
                'achievementName' => $achievementName
            ]);
            return;
        }
        
        $achievement = getAchievementByName($achievementName);
        if (!$achievement) {
            sendError('Achievement not found in configuration');
        }
        
        startAchievement($userId, $achievementName);
        
        sendSuccess([
            'message' => 'Achievement started',
            'userId' => $userId,
            'achievementName' => $achievementName
        ]);
        
    } catch (Exception $e) {
        sendError('Error starting achievement: ' . $e->getMessage(), 500);
    }
}

function handleMarkAchievementDone() {
    try {
        $userId = $_GET['id'] ?? '';
        $achievementName = $_GET['name'] ?? '';
        
        if (empty($userId)) {
            sendError('User ID is required');
        }
        
        if (empty($achievementName)) {
            sendError('Achievement name is required');
        }
        
        if (!userExists($userId)) {
            sendError('User not found');
        }
        
        if (isAchievementCompleted($userId, $achievementName)) {
            sendError('Achievement already completed');
        }
        
        $achievement = getAchievementByName($achievementName);
        if (!$achievement) {
            sendError('Achievement not found in configuration');
        }
        
        $minimumTime = isset($achievement['time']) ? (int) $achievement['time'] : 0;

        if ($minimumTime >= 1) {
            if (!validateAchievementTime($userId, $achievementName, $minimumTime)) {
                sendError('Achievement time validation failed.');
            }

            removeAchievementFromTemp($userId, $achievementName);
        }

        markAchievementDone($userId, $achievementName);

        
        removeAchievementFromTemp($userId, $achievementName);
        
        sendSuccess([
            'message' => 'Achievement marked as done',
            'userId' => $userId,
            'achievementName' => $achievementName
        ]);
        
    } catch (Exception $e) {
        sendError('Error marking achievement as done: ' . $e->getMessage(), 500);
    }
}

?>
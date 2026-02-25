<?php
// Be sure of having the database set up before checking if a cert is valid

$CFG_PATH = '../../api/config.php';
$ALLOW_CORS = true; // Allow CORS for this endpoint
require_once $CFG_PATH;
require_once '../../api/files/headers.php';

function extractVerificationKeyFromPng($fileContent) {
    if (substr($fileContent, 0, 8) !== "\x89\x50\x4E\x47\x0D\x0A\x1A\x0A") {
        return null;
    }

    $position = 8;
    $length = strlen($fileContent);

    while ($position < $length) {
        $chunkLength = unpack("N", substr($fileContent, $position, 4))[1];
        $chunkType = substr($fileContent, $position + 4, 4);

        if ($chunkType === 'tEXt') {
            $chunkData = substr($fileContent, $position + 8, $chunkLength);
            $nullPos = strpos($chunkData, "\0");

            if ($nullPos !== false) {
                $keyword = substr($chunkData, 0, $nullPos);
                $value = substr($chunkData, $nullPos + 1);

                if ($keyword === 'noskid-key') {
                    return extractVerificationKey($value);
                }
            }
        }

        $position += 8 + $chunkLength + 4;
    }

    return null;
}

function extractVerificationKey($text) {
    if (preg_match('/-*BEGIN NOSKID KEY-*\s*([a-f0-9]{64})/i', $text, $matches)) {
        return $matches[1];
    }

    return null;
}

function verifyCertificateKey($key) {
    if (empty($key)) {
        return [
            'success' => false,
            'message' => 'Invalid verification key'
        ];
    }

    $mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    if ($mysqli->connect_error) {
        return [
            'success' => false,
            'message' => 'Database connection error'
        ];
    }

    $stmt = $mysqli->prepare("SELECT c.id, c.name, c.percentage, c.created_at, c.verification_key
                            FROM cert c
                            WHERE c.verification_key LIKE CONCAT(?, '|%')");

    if (!$stmt) {
        return [
            'success' => false,
            'message' => 'Database query preparation failed'
        ];
    }

    $stmt->bind_param("s", $key);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $stmt->close();
        $mysqli->close();
        return [
            'success' => false,
            'message' => 'Certificate not found or invalid verification key'
        ];
    }

    $cert = $result->fetch_assoc();
    $stmt->close();
    $mysqli->close();

    $certNumber = str_pad($cert['id'], 5, '0', STR_PAD_LEFT);

    $creationDate = $cert['created_at'];

    return [
        'success' => true,
        'message' => 'Certificate is valid and verified',
        'data' => [
            'certificate_number' => $certNumber,
            'username' => $cert['name'],
            'percentage' => $cert['percentage'],
            'creationDate' => $creationDate,
            'id' => $cert['id']
        ]
    ];
}

function getGithubFileContent($owner, $path) {
    $url = "https://raw.githubusercontent.com/{$owner}/{$owner}/master/{$path}";
    $content = @file_get_contents($url);

    if ($content === false) {
        return null;
    }

    return $content;
}

function getWebsiteFileContent($url, $path) {
    if (!preg_match('~^(?:f|ht)tps?://~i', $url)) {
        $url = "http://" . $url;
    }

    if (substr($url, -1) !== '/') {
        $url .= '/';
    }

    $fileUrl = $url . $path;

    $context = stream_context_create([
        'http' => [
            'follow_location' => true,
            'max_redirects' => 5
        ]
    ]);

    $content = @file_get_contents($fileUrl, false, $context);

    if ($content === false) {
        return null;
    }

    return $content;
}

function extractDomainName($url) {
    if (!preg_match('~^(?:f|ht)tps?://~i', $url)) {
        $url = "http://" . $url;
    }

    $parsedUrl = parse_url($url);
    if (isset($parsedUrl['host'])) {
        return preg_replace('/^www\./', '', $parsedUrl['host']);
    }

    return $url;
}

function serveErrorSvg($errorCode) {
    $svgPath = "../../assets/img/{$errorCode}.svg";

    if (file_exists($svgPath)) {
        header('Content-Type: image/svg+xml');
        if (isset($_GET['cache']) && $_GET['cache'] === 'false') {
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
        } else {
            header('Cache-Control: public, max-age=86400');
            header('Expires: ' . gmdate('D, d M Y H:i:s \G\M\T', time() + 86400));
        }
        readfile($svgPath);
    } else {
        header('Content-Type: text/plain');
        echo "Error {$errorCode}";
    }
    exit;
}

function sanitizeCacheKey($url) {
    return substr(str_replace(["\r", "\n", "\0", ";"], '', $url), 0, 255);
}

function checkCache($url) {
    $url = sanitizeCacheKey($url);
    
    if (!file_exists(CACHE_FILE)) {
        return null;
    }
    
    $cacheData = file(CACHE_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $currentTime = time();
    
    foreach ($cacheData as $line) {
        $parts = explode('; ', $line, 3);
        if (count($parts) === 3) {
            list($cachedUrl, $cachedDate, $certId) = $parts;
            
            if ($cachedUrl === $url) {
                if (($currentTime - intval($cachedDate)) < CACHE_EXPIRY) {
                    return intval($certId);
                } else {
                    return false;
                }
            }
        }
    }
    
    return null;
}

function updateCache($url, $certId) {
    $url = sanitizeCacheKey($url);
    $certId = intval($certId);
    
    $cacheData = [];
    $newEntry = "$url; " . time() . "; $certId";
    
    if (file_exists(CACHE_FILE)) {
        $cacheData = file(CACHE_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        $cacheData = array_filter($cacheData, function($line) use ($url) {
            $parts = explode('; ', $line, 2);
            return $parts[0] !== $url;
        });
    }
    
    $cacheData[] = $newEntry;
    
    file_put_contents(CACHE_FILE, implode(PHP_EOL, $cacheData) . PHP_EOL, LOCK_EX);
}

function removeFromCache($url) {
    $url = sanitizeCacheKey($url);
    
    if (!file_exists(CACHE_FILE)) {
        return;
    }
    
    $cacheData = file(CACHE_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    $cacheData = array_filter($cacheData, function($line) use ($url) {
        $parts = explode('; ', $line, 2);
        return $parts[0] !== $url;
    });
    
    file_put_contents(CACHE_FILE, implode(PHP_EOL, $cacheData) . PHP_EOL, LOCK_EX);
}

function getCertificateById($certId) {
    $mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    if ($mysqli->connect_error) {
        return [
            'success' => false,
            'message' => 'Database connection error'
        ];
    }

    $stmt = $mysqli->prepare("SELECT c.id, c.name, c.percentage, c.created_at
                            FROM cert c
                            WHERE c.id = ?");

    if (!$stmt) {
        return [
            'success' => false,
            'message' => 'Database query preparation failed'
        ];
    }

    $stmt->bind_param("i", $certId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $stmt->close();
        $mysqli->close();
        return [
            'success' => false,
            'message' => 'Certificate not found'
        ];
    }

    $cert = $result->fetch_assoc();
    $stmt->close();
    $mysqli->close();

    $certNumber = str_pad($cert['id'], 5, '0', STR_PAD_LEFT);

    return [
        'success' => true,
        'message' => 'Certificate retrieved from cache',
        'data' => [
            'certificate_number' => $certNumber,
            'username' => $cert['name'],
            'percentage' => $cert['percentage'],
            'creationDate' => $cert['created_at'],
            'id' => $cert['id']
        ]
    ];
}

if (isset($_GET['repo'])) {
    $repoPath = $_GET['repo'];

    if (!preg_match('/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/', $repoPath)) {
        serveErrorSvg('422');
    }

    $useOriginalName = isset($_GET['oname']) && ($_GET['oname'] === 'true' || $_GET['oname'] === '1');

    if (strpos($repoPath, '/') !== false) {
        list($owner, $repo) = explode('/', $repoPath, 2);
        $cacheKey = "github:{$repoPath}";
        
        $cachedCertId = checkCache($cacheKey);
        $verificationResult = null;
        
        if ($cachedCertId !== null && $cachedCertId !== false) {
            $verificationResult = getCertificateById($cachedCertId);
        } else {
            $certificatePath = 'noskid/certificate.png';
            $certificateContent = getGithubFileContent($owner, $certificatePath);

            if ($certificateContent === null) {
                if ($cachedCertId === false) {
                    removeFromCache($cacheKey);
                }
                serveErrorSvg('404');
            }

            $verificationKey = extractVerificationKeyFromPng($certificateContent);

            if ($verificationKey === null) {
                if ($cachedCertId === false) {
                    removeFromCache($cacheKey);
                }
                serveErrorSvg('403');
            }

            $verificationResult = verifyCertificateKey($verificationKey);

            if (!$verificationResult['success']) {
                if ($cachedCertId === false) {
                    removeFromCache($cacheKey);
                }
                serveErrorSvg('403');
            }
            
            updateCache($cacheKey, $verificationResult['data']['id']);
        }

        $certificateUsername = $verificationResult['data']['username'];
        $certificatePercentage = $verificationResult['data']['percentage'];

        if ($useOriginalName) {
            $displayUsername = $certificateUsername;
        } else {
            $displayUsername = $owner;
            if ($owner != $repo) {
                $displayUsername = "$repo's owner";
            }
        }

        if ($certificateUsername == $owner || $cachedCertId !== null) {
            $svgTemplate = file_get_contents('../../assets/img/1200x420.svg');
            if ($svgTemplate === false) {
                serveErrorSvg('422');
            }

            $svgContent = str_replace('{{USER}}', htmlspecialchars($displayUsername), $svgTemplate);
            $svgContent = str_replace('{{PERCENT}}', htmlspecialchars($certificatePercentage), $svgContent);

            header('Content-Type: image/svg+xml');
            if (isset($_GET['cache']) && $_GET['cache'] === 'false') {
                header('Cache-Control: no-cache, no-store, must-revalidate');
                header('Pragma: no-cache');
                header('Expires: 0');
            } else {
                header('Cache-Control: public, max-age=86400');
                header('Expires: ' . gmdate('D, d M Y H:i:s \G\M\T', time() + 86400));
            }
            echo $svgContent;
            exit;
        } else {
            removeFromCache($cacheKey);
            serveErrorSvg('403');
        }
    } else {
        serveErrorSvg('422');
    }
} elseif (isset($_GET['website'])) {
    $websiteUrl = $_GET['website'];
    $useOriginalName = isset($_GET['oname']) && ($_GET['oname'] === 'true' || $_GET['oname'] === '1');
    $cacheKey = "website:{$websiteUrl}";
    
    $cachedCertId = checkCache($cacheKey);
    $verificationResult = null;
    
    if ($cachedCertId !== null && $cachedCertId !== false) {
        $verificationResult = getCertificateById($cachedCertId);
    } else {
        $certificatePath = 'noskid/certificate.png';
        $certificateContent = getWebsiteFileContent($websiteUrl, $certificatePath);

        if ($certificateContent === null) {
            if ($cachedCertId === false) {
                removeFromCache($cacheKey);
            }
            serveErrorSvg('404');
        }

        $verificationKey = extractVerificationKeyFromPng($certificateContent);

        if ($verificationKey === null) {
            if ($cachedCertId === false) {
                removeFromCache($cacheKey);
            }
            serveErrorSvg('403');
        }

        $verificationResult = verifyCertificateKey($verificationKey);

        if (!$verificationResult['success']) {
            if ($cachedCertId === false) {
                removeFromCache($cacheKey);
            }
            serveErrorSvg('403');
        }
        
        updateCache($cacheKey, $verificationResult['data']['id']);
    }

    $certificateUsername = $verificationResult['data']['username'];
    $certificatePercentage = $verificationResult['data']['percentage'];

    if ($useOriginalName) {
        $displayUsername = $certificateUsername;
    } else {
        $domainName = extractDomainName($websiteUrl);
        $displayUsername = "$domainName's owner";
    }

    $svgTemplate = file_get_contents('../../assets/img/1200x420.svg');
    if ($svgTemplate === false) {
        serveErrorSvg('422');
    }

    $svgContent = str_replace('{{USER}}', htmlspecialchars($displayUsername), $svgTemplate);
    $svgContent = str_replace('{{PERCENT}}', htmlspecialchars($certificatePercentage), $svgContent);

    header('Content-Type: image/svg+xml');
    if (isset($_GET['cache']) && $_GET['cache'] === 'false') {
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
    } else {
        header('Cache-Control: public, max-age=86400');
        header('Expires: ' . gmdate('D, d M Y H:i:s \G\M\T', time() + 86400));
    }

    echo $svgContent;
    exit;
} else {
    serveErrorSvg('422');
}
?>
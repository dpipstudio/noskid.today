<?php
require_once './config.php';
$CONTENT_TYPE = 'text/html';
require_once '../files/headers.php';


if (!defined('SHOW_API_HELP') || !SHOW_API_HELP) {
    header('Location: /');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta charset="UTF-8" />
    <title>NoSkid API Documentation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #0f0f0f;
            color: #e0e0e0;
            min-height: 100vh;
            padding: 2rem 1rem;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
        }

        .logo {
            font-size: 2.5rem;
            font-weight: 600;
            letter-spacing: -1px;
            margin-bottom: 0.5rem;
        }

        .logo .no {
            color: #d0d0d0;
        }

        .logo .skid {
            color: #777;
            text-decoration: line-through;
            text-decoration-color: #d0533f;
            text-decoration-thickness: 2px;
        }

        .subtitle {
            color: #999;
            font-size: 0.95rem;
            font-weight: 400;
        }

        .endpoint-list {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .endpoint {
            background: #1a1a1a;
            padding: 1.5rem;
            border-radius: 0;
            border: 1px solid #2a2a2a;
        }

        .endpoint-path {
            display: flex;
            gap: 1rem;
            align-items: baseline;
            margin-bottom: 0.75rem;
            flex-wrap: wrap;
        }

        .method {
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: #d0d0d0;
            background: #2a2a2a;
            padding: 0.4rem 0.7rem;
            border-radius: 0;
            min-width: 50px;
            text-align: center;
        }

        .endpoint-url {
            font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
            font-size: 0.85rem;
            color: #d0d0d0;
            word-break: break-all;
        }

        .endpoint-title {
            font-size: 1rem;
            font-weight: 600;
            color: #f5f5f5;
            margin-bottom: 0.5rem;
        }

        .endpoint-description {
            color: #b0b0b0;
            font-size: 0.85rem;
            margin-bottom: 1.25rem;
            line-height: 1.5;
        }

        .section {
            margin-bottom: 1rem;
        }

        .section:last-child {
            margin-bottom: 0;
        }

        .section-title {
            font-size: 0.75rem;
            font-weight: 700;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
        }

        .param-list {
            list-style: none;
            font-size: 0.8rem;
        }

        .param-item {
            padding: 0.3rem 0;
            color: #a8a8a8;
            line-height: 1.4;
        }

        .param-name {
            color: #90ee90;
            font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
            font-size: 0.8em;
        }

        .param-required {
            color: #d0533f;
            font-size: 0.7em;
            font-weight: 600;
        }

        .code-block {
            background: #0f0f0f;
            border: 1px solid #2a2a2a;
            padding: 0.75rem;
            border-radius: 0;
            font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
            font-size: 0.75rem;
            overflow-x: auto;
            color: #b0b0b0;
            line-height: 1.4;
        }

        .footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #2a2a2a;
            color: #666;
            font-size: 0.8rem;
        }

        .footer a {
            color: #d0533f;
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        @media (max-width: 768px) {
            .logo {
                font-size: 2rem;
            }

            .endpoint {
                padding: 1rem;
            }

            .endpoint-path {
                flex-direction: column;
                gap: 0.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <span class="no">no</span><span class="skid">skid</span>
            </div>
            <div class="subtitle">API Documentation</div>
        </div>

        <div class="endpoint-list">
            <div class="endpoint">
                <div class="endpoint-path">
                    <span class="method">GET/POST</span>
                    <span class="endpoint-url">/api/certificate/</span>
                </div>
                <div class="endpoint-title">Certificate Management</div>
                <div class="endpoint-description">Handle certificate operations including retrieving questions, checking answers, and downloading certificates.</div>
                
                <div class="section">
                    <div class="section-title">Actions</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">action=get</span> (default) - Retrieve all quiz questions and answers</li>
                        <li class="param-item"><span class="param-name">action=check</span> - Verify answers and calculate score</li>
                        <li class="param-item"><span class="param-name">action=download</span> - Generate and download certificate PNG</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Download Parameters</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">name</span> <span class="param-required">required</span> - Certificate holder name</li>
                        <li class="param-item"><span class="param-name">userId</span> - User ID for achievement bonus calculation</li>
                        <li class="param-item"><span class="param-name">turnstile_token</span> - Cloudflare Turnstile token for verification</li>
                        <li class="param-item"><span class="param-name">1, 2, 3...</span> - Question answers (numeric question ID with answer ID value)</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Response</div>
                    <div class="code-block">
{
  "success": boolean,
  "questions": [...] or "passed": boolean,
  "percentage": number,
  "certificate_number": string
}
                    </div>
                </div>
            </div>

            <!-- Achievement Endpoint -->
            <div class="endpoint">
                <div class="endpoint-path">
                    <span class="method">GET</span>
                    <span class="endpoint-url">/api/achievement/</span>
                </div>
                <div class="endpoint-title">Achievement System</div>
                <div class="endpoint-description">Manage user achievements, track progress, and unlock bonuses for certificate scoring.</div>
                
                <div class="section">
                    <div class="section-title">Actions</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">action=get</span> - Retrieve all achievements and completion status</li>
                        <li class="param-item"><span class="param-name">action=start</span> - Start an achievement timer</li>
                        <li class="param-item"><span class="param-name">action=done</span> - Mark an achievement as completed</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Parameters</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">id</span> - User ID (auto-generated if not provided)</li>
                        <li class="param-item"><span class="param-name">name</span> <span class="param-required">required for start/done</span> - Achievement name</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Response</div>
                    <div class="code-block">
{
  "status": boolean,
  "userId": string,
  "achievements": [
    {
      "name": string,
      "percent": number,
      "description": string,
      "done": boolean
    }
  ]
}
                    </div>
                </div>
            </div>

            <!-- Certificate Check Endpoint -->
            <div class="endpoint">
                <div class="endpoint-path">
                    <span class="method">GET</span>
                    <span class="endpoint-url">/api/checkcert/</span>
                </div>
                <div class="endpoint-title">Certificate Verification</div>
                <div class="endpoint-description">Verify the authenticity of a certificate using its verification key embedded in the PNG file.</div>
                
                <div class="section">
                    <div class="section-title">Parameters</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">key</span> <span class="param-required">required</span> - Certificate verification key (first 64 chars of embedded key)</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Response</div>
                    <div class="code-block">
{
  "success": boolean,
  "data": {
    "certificate_number": string,
    "username": string,
    "percentage": number,
    "boosted": boolean,
    "creationDate": string,
    "country": string,
    "countryCode": string
  }
}
                    </div>
                </div>
            </div>

            <!-- Comments Endpoint -->
            <div class="endpoint">
                <div class="endpoint-path">
                    <span class="method">GET/POST</span>
                    <span class="endpoint-url">/api/comments/</span>
                </div>
                <div class="endpoint-title">Comments System</div>
                <div class="endpoint-description">Post and manage comments with likes/dislikes. One comment per user per day with automatic bad word censoring.</div>
                
                <div class="section">
                    <div class="section-title">POST - Add Comment</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">author</span> - Comment author name (defaults to "Anonymous")</li>
                        <li class="param-item"><span class="param-name">content</span> <span class="param-required">required</span> - Comment text</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">GET - Retrieve Comments</div>
                    <div class="code-block">No parameters required. Returns all comments with user reactions.</div>
                </div>

                <div class="section">
                    <div class="section-title">GET - Handle Reactions</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">action=like</span> - Add like to comment</li>
                        <li class="param-item"><span class="param-name">action=dislike</span> - Add dislike to comment</li>
                        <li class="param-item"><span class="param-name">action=none</span> - Remove reaction</li>
                        <li class="param-item"><span class="param-name">id</span> <span class="param-required">required</span> - Comment ID</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Response</div>
                    <div class="code-block">
[
  {
    "id": number,
    "author": string,
    "content": string,
    "date": string,
    "likes": number,
    "dislikes": number,
    "user_reaction": "like" | "dislike" | null
  }
]
                    </div>
                </div>
            </div>

            <!-- Badge Endpoints -->
            <div class="endpoint">
                <div class="endpoint-path">
                    <span class="method">GET</span>
                    <span class="endpoint-url">/badge/*x*/</span>
                </div>
                <div class="endpoint-title">Certificate Badges</div>
                <div class="endpoint-description">Generate embeddable SVG badges for GitHub repositories or websites. Available sizes: 100x30, 470x200, 1200x420.</div>
                
                <div class="section">
                    <div class="section-title">Parameters</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">repo</span> - GitHub repo path (owner/repo)</li>
                        <li class="param-item"><span class="param-name">website</span> - Website URL</li>
                        <li class="param-item"><span class="param-name">oname</span> - Use original certificate holder name (true/false)</li>
                        <li class="param-item"><span class="param-name">cache</span> - Set to "false" to disable caching</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Response</div>
                    <div class="code-block">SVG image/svg+xml - Embeddable badge with user name and percentage</div>
                </div>
            </div>

            <!-- Maintenance Endpoint -->
            <div class="endpoint">
                <div class="endpoint-path">
                    <span class="method">GET</span>
                    <span class="endpoint-url">/api/maintenance/</span>
                </div>
                <div class="endpoint-title">Maintenance Toggle</div>
                <div class="endpoint-description">Check or toggle the site between maintenance and production modes.</div>
                
                <div class="section">
                    <div class="section-title">Parameters</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">pwd</span> - Admin password for toggling (without this, only status is returned)</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Response</div>
                    <div class="code-block">
{
  "success": boolean,
  "message": string,
  "data": {
    "status": "production" | "maintenance",
    "toggled": boolean,
    "authenticated": boolean
  }
}
                    </div>
                </div>
            </div>

            <!-- Latest Version Endpoint -->
            <div class="endpoint">
                <div class="endpoint-path">
                    <span class="method">GET</span>
                    <span class="endpoint-url">/api/latest/</span>
                </div>
                <div class="endpoint-title">Latest Version</div>
                <div class="endpoint-description">Retrieve or update the latest site version string. Automatically updated via GitHub workflow.</div>
                
                <div class="section">
                    <div class="section-title">Usage</div>
                    <ul class="param-list">
                        <li class="param-item">No parameters - Get current version</li>
                        <li class="param-item"><span class="param-name">version_string=pwd</span> - Update version (requires password)</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Response</div>
                    <div class="code-block">Plain text version string or "OK"/"NOT OK"</div>
                </div>
            </div>

            <!-- IP Endpoint -->
            <div class="endpoint">
                <div class="endpoint-path">
                    <span class="method">GET</span>
                    <span class="endpoint-url">/api/ip.php</span>
                </div>
                <div class="endpoint-title">IP Information</div>
                <div class="endpoint-description">Get geographic information about the requester's IP address via ip-api.com.</div>
                
                <div class="section">
                    <div class="section-title">Response</div>
                    <div class="code-block">
{
  "country": string,
  "countryCode": string,
  "city": string,
  ...
}
                    </div>
                </div>
            </div>

            <!-- Configuration Reference -->
            <div class="endpoint">
                <div class="endpoint-path">
                    <span class="method">CONFIG</span>
                    <span class="endpoint-url">/api/config.php</span>
                </div>
                <div class="endpoint-title">Configuration Reference</div>
                <div class="endpoint-description">Configuration variables used across the API. Edit this file to customize system behavior.</div>
                
                <div class="section">
                    <div class="section-title">Certificate Settings</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">MIN_PERCENTAGE</span> - Minimum passing score (default: 80)</li>
                        <li class="param-item"><span class="param-name">MAX_PERCENTAGE</span> - Maximum allowed score (default: 100)</li>
                        <li class="param-item"><span class="param-name">MAX_REQUESTS_PER_MINUTE</span> - Rate limit for certificate downloads (default: 3)</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Database Configuration</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">DB_HOST</span> - Database server address (default: localhost)</li>
                        <li class="param-item"><span class="param-name">DB_USER</span> - Database user</li>
                        <li class="param-item"><span class="param-name">DB_PASS</span> - Database password</li>
                        <li class="param-item"><span class="param-name">DB_NAME</span> - Database name</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Cloudflare Turnstile</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">TURNSTILE_SECRET_KEY</span> - Turnstile API secret key</li>
                        <li class="param-item"><span class="param-name">TURNSTILE_VERIFY_URL</span> - Turnstile verification endpoint (default: challenges.cloudflare.com)</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Caching</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">CACHE_FILE</span> - Path to cache file (default: ../cache.txt)</li>
                        <li class="param-item"><span class="param-name">CACHE_EXPIRY</span> - Cache expiration time in seconds (default: 86400 / 24 hours)</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Admin & Security</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">ETC_PWD</span> - Password for maintenance toggle and version updates</li>
                        <li class="param-item"><span class="param-name">NOTIFICATIONS_ENDPOINT</span> - Webhook endpoint for cert notifications (leave empty to disable)</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">API & Features</div>
                    <ul class="param-list">
                        <li class="param-item"><span class="param-name">SHOW_API_HELP</span> - Display this documentation (default: true)</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">Quiz Questions Array</div>
                    <div class="code-block">
$questions = [
  [
    'question' => string,
    'answers' => [string, ...],
    'correct' => number (index)
  ],
  ...
]
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Achievements Array</div>
                    <div class="code-block">
$achievements = [
  [
    'name' => string,
    'percent' => number,
    'description' => string,
    'time' => number (seconds)
  ],
  ...
]
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            Made by <a href="https://douxx.tech" target="_blank">douxx.tech</a> | NoSkid.today is a DPIP.lol project
        </div>
    </div>
</body>
</html>
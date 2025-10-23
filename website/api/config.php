<?php
// ratelimit things, for downcert
define('MIN_PERCENTAGE', 80);
define('MAX_PERCENTAGE', 100);
define('MAX_REQUESTS_PER_MINUTE', 3);

//notifications, leave empty to disable
define('NOTIFICATIONS_ENDPOINT', 'NOTIFICATIONS_ENDPOINT_HERE');

// database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'dbuser');
define('DB_PASS', 'dbpass');
define('DB_NAME', 'dbname');

// turnstile configuration
define('TURNSTILE_SECRET_KEY', 'turnstile_secret_key');
define('TURNSTILE_VERIFY_URL', 'https://challenges.cloudflare.com/turnstile/v0/siteverify');

//for the badges cache, the file is in /badges/cache.txt
define('CACHE_FILE', '../cache.txt');
define('CACHE_EXPIRY', 86400);

//maintenance toggle and lastest update pwd
define('ETC_PWD', 'etcpwd');

// define if help page should be displayed on /api/ or not
define('SHOW_API_HELP', true);

//certificate questions
$questions = [
    [
        'question' => 'Should I star noskid on GitHub?',
        'answers' => [
            'Yes'
        ],
        'correct' => 0
    ],
    [
        'question' => 'And if i don\'t want to?',
        'answers' => [
            'I should star NoSkid anyways',
            'I can just ignore it'
        ],
        'correct' => 0
    ]
];


//achievements
$achievements = [
    [
        'name' => 'Certified NoSkid',
        'percent' => 6,
        'description' => 'Pass the NoSkid certification test with 12/15 or higher',
        'time' => 0 
    ],
    [
        'name' => 'Perfect Score',
        'percent' => 32,
        'description' => 'Get 15/15 on the NoSkid certification test',
        'time' => 0
    ],
    [
        'name' => 'Certificate Validator',
        'percent' => 12,
        'description' => 'Use the certificate checker feature to validate a certificate',
        'time' => 2
    ],
    [
        'name' => 'Secret Certificate Hunter',
        'percent' => 18,
        'description' => 'Discover the ultra secret certificate',
        'time' => 2
    ],

    [
        'name' => 'Super Commenter',
        'percent' => 30,
        'description' => 'Post a comment on the system (Shift + T)',
        'time' => 5
    ],
    [
        'name' => 'Screen Wizard',
        'percent' => 18,
        'description' => 'Successfully resize your browser window 25 times',
        'time' => 10
    ],
    [
        'name' => 'Speed Clicker',
        'percent' => 30,
        'description' => 'Click 50 times in under 10 seconds',
        'time' => 9
    ],

    [
        'name' => 'Pong Rookie',
        'percent' => 6,
        'description' => 'Play your first game of Pong against the AI',
        'time' => 1
    ],
    [
        'name' => 'Pong Champion',
        'percent' => 24,
        'description' => 'Score 10 points in a single Pong game',
        'time' => 16
    ],
    [
        'name' => 'Bad Apple Fan',
        'percent' => 12,
        'description' => 'Watch the Bad Apple animation in the devtools console',
        'time' => 5
    ],
    [
        'name' => 'Good Apple Mode',
        'percent' => 14,
        'description' => 'Enable Good Apple mode.',
        'time' => 0
    ],
    [
        'name' => 'Gary Enthusiast',
        'percent' => 10,
        'description' => 'Spawn Gary the cat 10 times in a row',
        'time' => 0
    ],
    [
        'name' => 'Konata Dancer',
        'percent' => 18,
        'description' => 'Watch Konata dance for a full song',
        'time' => 220 // the song is 3m46, so 220 seconds to leave a "marge"
    ],
    [
        'name' => 'Boom Explorer',
        'percent' => 12,
        'description' => 'Trigger the boom feature',
        'time' => 0
    ],
    [
        'name' => 'Cool Thing Finder',
        'percent' => 14,
        'description' => 'Spawn the mysterious cool thing',
        'time' => 0
    ],
    [
        'name' => 'I gotta fix that',
        'percent' => 30,
        'description' => 'Fix the downfall',
        'time' => 0
    ],
    [
        'name' => 'Browser Inception',
        'percent' => 26,
        'description' => 'Open the browser feature and navigate to a website',
        'time' => 3
    ],
    [
        'name' => 'Exploit Hacker',
        'percent' => 18,
        'description' => 'Run the exploit feature and pretend to hack the CIA',
        'time' => 10
    ],
    [
        'name' => 'Request Catcher',
        'percent' => 30,
        'description' => 'Set up and use the RQ request catcher with certificate',
        'time' => 5
    ],

    [
        'name' => 'Night Owl',
        'percent' => 38,
        'description' => 'Switch between night mode and classic mode 10 times',
        'time' => 1
    ],
    [
        'name' => 'Websocket Socializer',
        'percent' => 26,
        'description' => 'Connect to websocket and see other users cursors',
        'time' => 0
    ],
    [
        'name' => 'Keyboard Ninja',
        'percent' => 22,
        'description' => 'Use 10 different keyboard shortcuts in a row',
        'time' => 5
    ],
    [
        'name' => 'URL Hacker',
        'percent' => 38,
        'description' => 'Access a feature using a URL fragment (#)',
        'time' => 0
    ],
    [
        'name' => 'Marathon Runner',
        'percent' => 50,
        'description' => 'Keep NoSkid open for 2 hours straight',
        'time' => 7180 // 2 hours in seconds - 20 seconds
    ],
    [
        'name' => 'Speed Runner',
        'percent' => 130,
        'description' => 'Get 15/15 at the certification test in under 20 seconds',
        'time' => 15
    ],
    [
        'name' => 'Legendary NoSkid',
        'percent' => 136,
        'description' => 'Unlock all other achievements',
        'time' => 0
    ]
];


?>

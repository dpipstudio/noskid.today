<?php

header('Content-Type: text/html; charset=utf-8');
header("Content-Security-Policy: frame-ancestors *");

function sanitize_param($value, $allowed_values)
{
    return in_array($value, $allowed_values) ? $value : $allowed_values[0];
}

function sanitize_lang($lang)
{
    return preg_replace('/[^a-zA-Z0-9_]/', '', substr($lang, 0, 10));
}

function sanitize_bool($value)
{
    return $value === '1' || $value === 'true' ? true : false;
}

function sanitize_url($url)
{
    if (empty($url)) return null;
    $url = urldecode($url);
    if (filter_var($url, FILTER_VALIDATE_URL) && (strpos($url, 'https://') === 0 || strpos($url, 'http://') === 0)) {
        return $url;
    }
    return null;
}

// get params
$size = sanitize_param($_GET['size'] ?? 'normal', ['normal', 'compact', 'invisible']);
$theme = sanitize_param($_GET['theme'] ?? 'light', ['dark', 'light', 'auto']);
$lang = sanitize_lang($_GET['lang'] ?? 'en');
$widget_id = intval($_GET['widget_id'] ?? 0);

$noskid_debug = sanitize_bool($_GET['noskid_debug'] ?? 'false');
$noskid_strict_check = sanitize_bool($_GET['noskid_strictCheck'] ?? 'true');
$noskid_allow_achievements = sanitize_bool($_GET['noskid_allowAchievements'] ?? 'true');
$noskid_timeout = intval($_GET['noskid_timeout'] ?? 10000);
$noskid_use_legacy_api = sanitize_bool($_GET['noskid_useLegacyAPI'] ?? 'false');
$noskid_api_url = sanitize_url($_GET['noskid_apiUrl'] ?? '');

if ($noskid_timeout < 1000) $noskid_timeout = 1000;
if ($noskid_timeout > 60000) $noskid_timeout = 60000;

$lang_file = __DIR__ . "/langs.json";
$translations = [];

if (file_exists($lang_file)) {
    $json = file_get_contents($lang_file);
    $allLangs = json_decode($json, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        // use requested language, fallback to English
        $translations = $allLangs[$lang] ?? $allLangs['en'] ?? [];
    }
}

// fallback texts
$text = $translations['text'] ?? 'I\'m not a skid';
$loading_text = $translations['loading'] ?? 'Verifying...';
$success_text = $translations['success'] ?? 'Verified';
$awaiting_text = $translations['awaiting'] ?? 'Select your NoSkid certificate...';
$error_text = $translations['error'] ?? 'Verification failed. Try again.';
$poweredby_text = $translations['poweredby'] ?? 'Powered by';

// themes
$themes = [
    'light' => [
        'bg' => '#f9f7f0',
        'border' => '#8b4513',
        'text' => '#333333',
        'checkbox_bg' => '#fff',
        'checked_bg' => '#8b4513',
        'spinner' => '#8b4513',
        'error_bg' => '#fee',
        'error_border' => '#c33',
        'error_text' => '#c33'
    ],
    'dark' => [
        'bg' => '#1a1a1a',
        'border' => '#d4a574',
        'text' => '#e0e0e0',
        'checkbox_bg' => '#2a2a2a',
        'checked_bg' => '#d4a574',
        'spinner' => '#d4a574',
        'error_bg' => '#2a1a1a',
        'error_border' => '#d44',
        'error_text' => '#f88'
    ]
];

if ($theme === 'auto') {
    $theme = 'light';
}

$colors = $themes[$theme];
?>
<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>SkidGuard CAPTCHA</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, system-ui, blinkmacsystemfont, "Segoe UI", roboto, oxygen, ubuntu, "Helvetica Neue", arial, sans-serif;
            overflow: hidden;
        }

        <?php if ($size === 'invisible'): ?>.captcha-container {
            display: none;
        }

        <?php else: ?>.captcha-box {
            display: flex;
            align-items: center;
            gap: <?= $size === 'compact' ? '8px' : '14px' ?>;
            background: <?= $colors['bg'] ?>;
            border: 2px solid <?= $colors['border'] ?>;
            border-radius: 8px;
            padding: <?= $size === 'compact' ? '10px 12px' : '14px 20px' ?>;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: none;
            color: <?= $colors['text'] ?>;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            min-height: <?= $size === 'compact' ? '90px' : '70px' ?>;
            height: <?= $size === 'compact' ? '90px' : '70px' ?>;
        }

        <?php if ($size === 'compact'): ?>.captcha-box {
            flex-direction: column;
            text-align: center;
        }

        <?php endif; ?>.captcha-box--loading,
        .captcha-box--checked {
            pointer-events: none;
        }

        .captcha-box--error {
            background: <?= $colors['error_bg'] ?>;
            border-color: <?= $colors['error_border'] ?>;
            color: <?= $colors['error_text'] ?>;
        }


        .captcha-checkbox {
            width: 28px;
            height: 28px;
            min-width: 28px;
            border: 2px solid <?= $colors['border'] ?>;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            background: <?= $colors['checkbox_bg'] ?>;
        }

        .captcha-box--checked .captcha-checkbox {
            background: <?= $colors['checked_bg'] ?>;
        }

        .captcha-box--error .captcha-checkbox {
            border-color: <?= $colors['error_border'] ?>;
            background: <?= $colors['error_bg'] ?>;
        }

        .captcha-checkmark {
            display: none;
            color: <?= $colors['bg'] ?>;
            font-size: 25px;
            font-weight: bold;
        }

        .captcha-box--checked .captcha-checkmark {
            display: block;
            animation: checkPop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .captcha-box--checked .captcha-powered {
            pointer-events: auto;
        }


        @keyframes checkPop {
            0% {
                transform: scale(0) rotate(-45deg);
                opacity: 0;
            }

            50% {
                transform: scale(1.2) rotate(0deg);
            }

            100% {
                transform: scale(1) rotate(0deg);
                opacity: 1;
            }
        }

        .captcha-error-mark {
            display: none;
            color: <?= $colors['error_text'] ?>;
            font-size: 20px;
            font-weight: bold;
        }

        .captcha-box--error .captcha-error-mark {
            display: block;
        }

        .captcha-spinner {
            display: none;
            width: 22px;
            height: 22px;
            position: relative;
        }

        .captcha-box--loading .captcha-spinner {
            display: block;
        }

        .captcha-spinner::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 3px solid transparent;
            border-top-color: <?= $colors['spinner'] ?>;
            border-right-color: <?= $colors['spinner'] ?>;
            animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes spin {
            100% {
                transform: rotate(360deg);
            }
        }

        .captcha-text {
            font-size: <?= $size === 'compact' ? '11px' : '14px' ?>;
            font-style: normal;
            font-weight: 400;
            letter-spacing: 0.3px;
        }

        .captcha-file-input {
            display: none;
        }

        .captcha-powered {
            font-family: 'Roboto', sans-serif;
            font-size: 11px;
            color: <?= $colors['text'] ?>;
            margin-left: auto;
            white-space: nowrap;
            line-height: 15px;
        }

        .captcha-powered a {
            color: <?= $colors['border'] ?>;
            text-decoration: none;
        }

        .captcha-powered a:hover {
            opacity: 0.8;
        }


        <?php endif; ?>
    </style>
</head>

<body>
    <?php if ($size !== 'invisible'): ?>
        <div class="captcha-box captcha-box--unchecked" id="captcha">
            <div class="captcha-checkbox">
                <span class="captcha-checkmark">✓</span>
                <span class="captcha-error-mark">✕</span>
                <div class="captcha-spinner"></div>
            </div>
            <div class="captcha-text" id="captcha-text"><?= htmlspecialchars($text) ?></div>
            <?php if ($size !== 'compact' && $size !== 'invisible'): ?>
                <div class="captcha-powered">
                    <div><?= htmlspecialchars($poweredby_text) ?></div>
                    <div><a href="https://skidguard.noskid.today" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">SkidGuard</a></div>
                </div>
            <?php endif; ?>


            <input type="file" class="captcha-file-input" id="fileInput" accept="image/png" />
        </div>
    <?php else: ?>
        <input type="file" class="captcha-file-input" id="fileInput" accept="image/png" />
    <?php endif; ?>

    <script src="https://lbr.noskid.today"></script>
    <script>
        const WIDGET_ID = <?= $widget_id ?>;
        const STATES = {
            UNCHECKED: 'unchecked',
            AWAITING_FILE: 'awaiting-file',
            LOADING: 'loading',
            CHECKED: 'checked',
            ERROR: 'error'
        };
        const STORAGE_KEY = 'nskdKey';

        let state = STATES.UNCHECKED;
        let errorMessage = '';
        const captchaBox = document.getElementById('captcha');
        const captchaText = document.getElementById('captcha-text');
        const fileInput = document.getElementById('fileInput');

        const noskidConfig = {
            debug: <?= $noskid_debug ? 'true' : 'false' ?>,
            strictCheck: <?= $noskid_strict_check ? 'true' : 'false' ?>,
            allowAchievements: <?= $noskid_allow_achievements ? 'true' : 'false' ?>,
            timeout: <?= $noskid_timeout ?>,
            useLegacyAPI: <?= $noskid_use_legacy_api ? 'true' : 'false' ?>
        };
        <?php if ($noskid_api_url): ?>
        noskidConfig.apiUrl = <?= json_encode($noskid_api_url) ?>;
        <?php endif; ?>

        const noskid = new NskdLbr(noskidConfig);


        function setCookie(name, value, days = 365) {
            const expires = new Date(Date.now() + days * 864e5).toUTCString();
            document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; Secure; SameSite=None`;
        }

        function getCookie(name) {
            return document.cookie.split('; ').reduce((r, v) => {
                const parts = v.split('=');
                return parts[0] === name ? decodeURIComponent(parts[1]) : r
            }, '');
        }

        function deleteCookie(name) {
            document.cookie = `${name}=; Max-Age=0; path=/; Secure; SameSite=None`;
        }

        function setState(newState, message = '') {
            state = newState;
            errorMessage = message;

            if (!captchaBox) return;

            captchaBox.classList.remove('captcha-box--unchecked', 'captcha-box--awaiting-file',
                'captcha-box--loading', 'captcha-box--checked', 'captcha-box--error');
            captchaBox.classList.add(`captcha-box--${newState}`);

            if (captchaText) {
                switch (newState) {
                    case STATES.AWAITING_FILE:
                        captchaText.textContent = <?= json_encode($awaiting_text) ?>;
                        break;
                    case STATES.LOADING:
                        captchaText.textContent = <?= json_encode($loading_text) ?>;
                        break;
                    case STATES.CHECKED:
                        captchaText.textContent = <?= json_encode($success_text) ?>;
                        break;
                    case STATES.ERROR:
                        captchaText.textContent = message || <?= json_encode($error_text) ?>;
                        break;
                    default:
                        captchaText.textContent = <?= json_encode($text) ?>;
                }
            }

            window.parent.postMessage({
                type: 'state',
                widgetId: WIDGET_ID,
                state: newState,
                message: message
            }, '*');
        }

        async function autoVerify() {
            const storedKey = getCookie(STORAGE_KEY);
            if (!storedKey) return false;

            setState(STATES.LOADING);

            try {
                const result = await noskid.verifyWithKey(storedKey);

                if (result.valid && result.data) {
                    const token = storedKey;
                    setState(STATES.CHECKED);
                    window.parent.postMessage({
                        type: 'success',
                        widgetId: WIDGET_ID,
                        token: token,
                        certificateData: result.data
                    }, '*');
                    return true;
                } else {
                    deleteCookie(STORAGE_KEY);
                    setState(STATES.UNCHECKED);
                    return false;
                }
            } catch (error) {
                deleteCookie(STORAGE_KEY);
                setState(STATES.UNCHECKED);
                return false;
            }
        }


        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) {
                setState(STATES.UNCHECKED);
                return;
            }

            setState(STATES.LOADING);

            try {
                const result = await noskid.loadFromFile(file);

                if (result.valid && result.data) {
                    const certKey = result.query;
                    const token = certKey;

                    setCookie(STORAGE_KEY, certKey);

                    setState(STATES.CHECKED);

                    window.parent.postMessage({
                        type: 'success',
                        widgetId: WIDGET_ID,
                        token: token,
                        certificateData: result.data
                    }, '*');
                } else {
                    const errMsg = result.message || 'Invalid certificate';
                    setState(STATES.ERROR, errMsg);

                    window.parent.postMessage({
                        type: 'error',
                        widgetId: WIDGET_ID,
                        message: errMsg
                    }, '*');

                    // Auto-reset after 3 seconds
                    setTimeout(() => {
                        if (state === STATES.ERROR) {
                            setState(STATES.UNCHECKED);
                        }
                    }, 3000);
                }
            } catch (error) {
                const errMsg = error.message || 'Verification error';
                setState(STATES.ERROR, errMsg);

                window.parent.postMessage({
                    type: 'error',
                    widgetId: WIDGET_ID,
                    message: errMsg
                }, '*');

                setTimeout(() => {
                    if (state === STATES.ERROR) {
                        setState(STATES.UNCHECKED);
                    }
                }, 4000);
            }

            fileInput.value = '';
        });

        if (captchaBox) {
            captchaBox.addEventListener('click', () => {
                if (state !== STATES.UNCHECKED && state !== STATES.ERROR) return;
                setState(STATES.AWAITING_FILE);
                fileInput.click();
            });
        }

        window.addEventListener('message', (event) => {
            const data = event.data;

            if (data.type === 'setState') {
                setState(data.state, data.message || '');
            } else if (data.type === 'reset') {
                setState(STATES.UNCHECKED);
                deleteCookie(STORAGE_KEY);
                noskid.reset();
            } else if (data.type === 'execute') {
                if (state === STATES.UNCHECKED || state === STATES.ERROR) {
                    fileInput.click();
                }
            }
        });

        autoVerify();
    </script>
</body>

</html>
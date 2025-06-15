<?php

function getRequesterIp(): string
{
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $forwardedIps = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $firstIp = trim($forwardedIps[0]);
        if (filter_var($firstIp, FILTER_VALIDATE_IP)) {
            return $firstIp;
        } //retuns the first valid IP from the X-Forwarded-For header, sometimes contains things like that: 84.75.114.12, 84.75.114.12, 152.53.236.228
    }

    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}
function renderFormattedFile(string $filePath, array $variables): array
{
    if (!file_exists($filePath)) {
        return ['head' => [], 'body' => "<p style='color:red'>File not found: $filePath</p>"];
    }

    $content = file_get_contents($filePath);
    $lines = explode("\n", $content);

    $head = [
        'title' => 'Default Title',
        'meta' => [],
        'og' => [],
        'link' => [],
        'icon' => null
    ];

    $bodyLines = [];

    foreach ($lines as $line) {
        $trimmed = trim($line);

        if (str_starts_with($trimmed, '%TITLE%')) {
            $head['title'] = substr($trimmed, 7);
        } elseif (str_starts_with($trimmed, '%META:')) {
            [$name, $value] = explode('=', substr($trimmed, 6), 2);
            $head['meta'][$name] = $value;
        } elseif (str_starts_with($trimmed, '%OG:')) {
            [$name, $value] = explode('=', substr($trimmed, 4), 2);
            $head['og'][$name] = $value;
        } elseif (str_starts_with($trimmed, '%LINK:')) {
            [$rel, $href] = explode('=', substr($trimmed, 6), 2);
            $head['link'][$rel] = $href;
        } elseif (str_starts_with($trimmed, '%ICON:')) {
            $head['icon'] = substr($trimmed, 6);
        } else {
            $bodyLines[] = $line;
        }
    }

    $body = implode("\n", $bodyLines);

    foreach ($variables as $key => $value) {
        $body = str_replace('{{' . $key . '}}', $value, $body);
    }

    $tagMap = [
        '%BOLD%' => '<b>',
        '%DOLB%' => '</b>',
        '%ITALIC%' => '<i>',
        '%CILATI%' => '</i>',
        '%EXTRABOLD%' => '<strong>',
        '%DOLBARTXE%' => '</strong>',
        '%UNDERLINE%' => '<u>',
        '%ENILREDNU%' => '</u>',
        '%STRIKE%' => '<s>',
        '%EKIRTS%' => '</s>',
        '%CODE%' => '<code>',
        '%EDOC%' => '</code>',
        '%QUOTE%' => '<blockquote>',
        '%ETOUQ%' => '</blockquote>'
    ];

    $body = strtr($body, $tagMap);

    $body = preg_replace_callback('/%LINK>(.*?)%(.*?)%KNIL%/', function ($m) {
        return '<a href="' . $m[1] . '" target="_blank">' . $m[2] . '</a>';
    }, $body);


    return [
        'head' => $head,
        'body' => "<pre style=\"white-space: pre-wrap; word-wrap: break-word;\">" . $body . "</pre>"
    ];
}

$ip = getRequesterIp();
$url = "http://ip-api.com/json/{$ip}?fields=status,country,city,query,isp";

$response = file_get_contents($url);
$data = json_decode($response, true);

$time = new DateTime();

if ($data['status'] === 'success') {
    $vars = [
        'country' => $data['country'] ?? 'Unknown',
        'city' => $data['city'] ?? 'Unknown',
        'ip' => $data['query'] ?? $ip,
        'isp' => $data['isp'] ?? 'Unknown',
        'ispupper' => strtoupper($data['isp'] ?? 'Unknown'),
        'time' => $time->format('h:i:s A (T)'),
        'ip_fetch' => 'Success'
    ];
} else {
    $vars = [
        'country' => 'some country',
        'city' => 'some city',
        'ip' => '0.0.0.0',
        'isp' => 'some isp',
        'ispupper' => 'SOME ISP',
        'time' => $time->format('h:i:s A (T)'),
        'ip_fetch' => 'Failed '
    ];
}


$result = renderFormattedFile('webpage.txt', $vars);
$head = $result['head'];
$body = $result['body'];

echo <<<HTML
<!DOCTYPE html>

<!--
This incredible website has been made by douxx.tech !
Source is avalible at github.com/douxxtech/noskid.today !

Copyright (C) 2025 Douxx.tech <douxx@douxx.tech>

This work is licensed under the NSD License v1.0.
You may obtain a copy of the License at: https://light.noskid.today/LICENSE
-->

<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{$head['title']}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n
HTML;

foreach ($head['meta'] as $name => $content) {
    echo "<meta name=\"$name\" content=\"$content\">\n";
}
foreach ($head['og'] as $property => $content) {
    echo "<meta property=\"og:$property\" content=\"$content\">\n";
}
foreach ($head['link'] as $rel => $href) {
    echo "<link rel=\"$rel\" href=\"$href\">\n";
}
if ($head['icon']) {
    echo "<link rel=\"icon\" href=\"{$head['icon']}\">\n";
}

echo <<<HTML
    <style>
        body {
            font-family: monospace;
            background: #111;
            color: #eee;
            padding: 2rem;
            overflow-x: auto;
        }
        a { color: #aaa; text-decoration: none; }
        a:hover { text-decoration: underline; }
        strong { color: #f00; }
        i { color: #aaa; }
        b { font-weight: bold; }
        u { text-decoration: underline; }
        s { text-decoration: line-through; }
        code { background: #222; padding: 2px 4px; border-radius: 3px; color: #0f0; }
        blockquote { border-left: 3px solid #888; padding-left: 1em; color: #ccc; }
        pre {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.2;
            white-space: pre;
            overflow-x: auto;
            overflow-y: hidden;
            width: 100%;
            min-width: max-content;
            image-rendering: pixelated;
            text-rendering: geometricPrecision;
            -webkit-font-smoothing: none;
            -moz-osx-font-smoothing: grayscale;
        }

        body::-webkit-scrollbar,
        pre::-webkit-scrollbar {
            height: 8px;
            background: #222;
        }
        body::-webkit-scrollbar-thumb,
        pre::-webkit-scrollbar-thumb {
            background: #666;
            border-radius: 10px;
        }
        body::-webkit-scrollbar-thumb:hover,
        pre::-webkit-scrollbar-thumb:hover {
            background: #999;
        }

        body,
        pre {
            scrollbar-width: thin;
            scrollbar-color: #666 #222;
        }
    </style>
</head>
<body>
$body
</body>
</html>
HTML;

# SkidGuard - The NoSkid certificate-based CAPTCHA

Modern *bot* prevention powered by verified NoSkid certificates. Simple and secure; no image puzzles or tracking.

Absolutely - here's a **clean, developer-friendly Markdown documentation** for the **SkidGuard CAPTCHA system** and **NoSkid Certificate Library**, including integration examples and backend verification details.


## Overview

SkidGuard uses **NoSkid Certificates**-signed PNG files containing an embedded verification key-to prove authenticity.
The process flow:

1. User interacts with the CAPTCHA widget.
2. They select their `.png` certificate.
3. The widget validates it via `NskdLbr` and emits a **token**.
4. The token is sent with your form to your backend.
5. Your backend confirms it via `https://check.noskid.today/?key=<token>`.

---

## Client Integration (SkidGuard Widget)

### 1. Include the SkidGuard Library

```html
<script src="https://skidguard.noskid.today/skidguard.js"></script>
```

### 2. Render the Widget

Create a container where you want the CAPTCHA to appear:

```html
<div id="captcha"></div>

<script>
  const widgetId = skidguard.render('#captcha', {
    size: 'normal',      // 'normal' | 'compact' | 'invisible'
    theme: 'light',      // 'light' | 'dark' | 'auto'
    language: 'en',      // ISO 2-letter code (e.g., 'en', 'fr')
    
    // Optional: Configure NskdLbr verification library
    noskid: {
      debug: false,              // Enable debug logging
      strictCheck: true,         // Validate local vs API data
      allowAchievements: true,   // Allow achievement-boosted certificates
      timeout: 10000,            // API timeout in milliseconds (1000-60000)
      useLegacyAPI: false,       // Use legacy API format
      apiUrl: null               // Custom verification API URL (optional)
    },
    
    callback: (token, certificateData) => {
      console.log('[OK] Verified!', token, certificateData);

      // Add token to your form
      document.querySelector('#token').value = token;
    },
    errorCallback: (err) => {
      console.error('[ERR] Verification error:', err);
    }
  });
</script>
```

### 3. Invisible CAPTCHA

You can use the invisible CAPTCHA (for background checks):

```js
const widgetId = skidguard.render('#captcha', {
  size: 'invisible',
  theme: 'dark',
  language: 'en',
  callback: onVerified
});

function onVerified(token, certData) {
  console.log('User verified with token:', token);
}

document.querySelector('#submit').addEventListener('click', () => {
  skidguard.execute(widgetId);
});
```

---

## Backend Verification

Once the client provides a token, verify it server-side with the **NoSkid Verification API**:

### Example: Node.js (Express)

```js
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

app.post('/verify', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Missing token' });
  }

  try {
    const response = await fetch(`https://check.noskid.today/?key=${token}`);
    const data = await response.json();

    if (data.success) {
      // your other processing here
      res.json({
        success: true,
        username: data.data.username,
        percentage: data.data.percentage,
      });
    } else {
      res.status(403).json({ success: false, error: data.message });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'Verification request failed' });
  }
});

app.listen(3000);
```

### Example: PHP (Server-side check)

```php
<?php
function verify_noskid_token($token) {
    $url = 'https://check.noskid.today/?key=' . urlencode($token);
    $response = file_get_contents($url);
    $data = json_decode($response, true);

    if (isset($data['success']) && $data['success']) {
        // your other processing here

        return [
            'valid' => true,
            'username' => $data['data']['username'] ?? null,
            'percentage' => $data['data']['percentage'] ?? null
        ];
    }

    return ['valid' => false, 'error' => $data['message'] ?? 'Unknown error'];
}
```

---

## API Reference

### `skidguard.render(selector, options)`

Creates a SkidGuard CAPTCHA instance in a container.

| Option                   | Type     | Default    | Description                               |
| ------------------------ | -------- | ---------- | ----------------------------------------- |
| `size`                   | string   | `'normal'` | `'normal'`, `'compact'`, or `'invisible'` |
| `theme`                  | string   | `'light'`  | `'light'`, `'dark'`, or `'auto'`          |
| `language`               | string   | `'en'`     | Language code                             |
| `noskid`                 | object   | `{}`       | NskdLbr configuration options (see below) |
| `callback(token, data)`  | function | -          | Called on success                         |
| `errorCallback(message)` | function | -          | Called on error                           |

#### `noskid` Configuration Options

| Option              | Type    | Default | Description                                      |
| ------------------- | ------- | ------- | ------------------------------------------------ |
| `debug`             | boolean | `false` | Enable debug logging                             |
| `strictCheck`       | boolean | `true`  | Validate local certificate data vs API response  |
| `allowAchievements` | boolean | `true`  | Allow certificates that used achievement boosts  |
| `timeout`           | number  | `10000` | API request timeout in milliseconds (1000-60000) |
| `useLegacyAPI`      | boolean | `false` | Use legacy API format                            |
| `apiUrl`            | string  | `null`  | Custom verification API URL (optional)           |

### `skidguard.getResponse(widgetId)`

Returns the latest verification token.

### `skidguard.getCertificateData(widgetId)`

Returns parsed certificate information from the user.

### `skidguard.reset(widgetId)`

Resets a widget state.

### `skidguard.execute(widgetId)`

Triggers an invisible CAPTCHA prompt.

---

## Backend Validation Reference

**Endpoint:**

```
GET https://check.noskid.today/?key=<certificate_key>
```

**Response Example:**

```json
{
    "success": true,
    "message": "Certificate is valid and verified",
    "data": {
        "certificate_number": "00899",
        "username": "douxx00899",
        "nickname": "douxx :] based tho",
        "percentage": "100.00",
        "boosted": false,
        "creationDate": "2025-05-25 21:09:00",
        "country": "Switzerland",
        "countryCode": "CH"
    },
    "cached": true,
    "query": "fb02..."
}
```

If `success` is `false`, check the `message` field for details.

---

## Example Integration Summary

```html
<form action="/verify" method="POST" id="form">
  <div id="captcha"></div>
  <input type="hidden" name="token" id="token">
  <button type="submit">Submit</button>
</form>

<script src="https://skidguard.noskid.today/skidguard.js"></script>
<script>
  const widgetId = skidguard.render('#captcha', {
    callback: (token) => document.getElementById('token').value = token
  });
</script>
```


## License
This work is licensed under the same work as its parent repository: The NSDv1 (see LICENSE).
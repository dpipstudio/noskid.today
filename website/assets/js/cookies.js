//Loader.js | Create custom meme cookies

function createCustomCookies(cookiesData, prefix = '', forceUpdate = false) {
    if (!cookiesData || typeof cookiesData !== 'object') {
        log('Cookie data must be provided as an object', 'error');
        return;
    }

    const maxAge = 2 * 365 * 24 * 60 * 60;
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 2);

    const cookieParams = [
        `path=/`,
        `expires=${expirationDate.toUTCString()}`,
        `max-age=${maxAge}`,
        "SameSite=Lax"
    ];

    if (window.location.protocol === "https:") {
        cookieParams.push("Secure");
    }

    Object.keys(cookiesData).forEach(cookieName => {
        const fullCookieName = prefix ? `${prefix}_${cookieName}` : cookieName;

        if (forceUpdate || !getCookie(fullCookieName)) {
            if (forceUpdate) log('forceUpdate set to true, overwriting cookies', 'warining'); //shouldnt happen so idk why i log that
            document.cookie = `${fullCookieName}=${cookiesData[cookieName]}; ${cookieParams.join('; ')}`;
            log(`Created cookie '${fullCookieName}!`, 'success');
        }
    });
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
}

function deleteCookie(name, prefix = '') {
    const fullCookieName = prefix ? `${prefix}_${name}` : name;
    document.cookie = `${fullCookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
}


function getAllCookies(prefix = '') {
    const cookies = {};
    document.cookie.split(';').forEach(cookie => {
        if (cookie.trim()) {
            const [name, value] = cookie.trim().split('=');
            if (!prefix || name.startsWith(prefix)) {
                cookies[name] = value;
            }
        }
    });
    return cookies;
}

createCustomCookies({
    '!WHAT_ARE_YOU_DOING_HERE': 'You skiddie! Please dont hack this website >:[',
    'IBegYou': 'PLEASSEEEE star https://github.com/dpipstudio/noskid.today',
    'contact': 'made by https://douxx.tech or @douxx.tech on discord',
    'miammiam': 'I love pasta, and you ?',
    'hehe': 'i got 100% at the noskid certificate, and you ?'
});

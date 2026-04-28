// Localinfo.js | Get local information to dynamically update the website

const countryUpdate = document.getElementById("country");
const cityUpdate = document.getElementById("city");
const ispUpdate = document.getElementById("isp");
const ispfUpdate = document.getElementById("ispf");
const ipUpdate = document.getElementById("ipadr");
const dateUpdate = document.getElementById("date");
const refererUpdate = document.getElementById("ref");

const refererGroups = [
    {
        keys: [
            { match: "twitter", label: "Twitter" },
            { match: "x.com", label: "X" },
            { match: "t.co", label: "X" },
        ],
        phrase: (label) => `"Came from the bird app (${label}) huh"`
    },
    {
        keys: [
            { match: "instagram", label: "Instagram" },
            { match: "facebook", label: "Facebook" },
            { match: "tiktok", label: "TikTok" },
            { match: "snapchat", label: "Snapchat" },
            { match: "pinterest", label: "Pinterest" },
            { match: "threads", label: "Threads" },
            { match: "tumblr", label: "Tumblr" },
            { match: "mastodon", label: "Mastodon" },
            { match: "bluesky", label: "Bluesky" },
            { match: "bsky", label: "Bluesky" },
        ],
        phrase: (label) => `"Welcome from ${label}, social media addict"`
    },
    {
        keys: [
            { match: "google", label: "Google" },
            { match: "bing", label: "Bing" },
            { match: "duckduckgo", label: "DuckDuckGo" },
            { match: "yahoo", label: "Yahoo" },
            { match: "brave", label: "Brave Search" },
            { match: "ecosia", label: "Ecosia" },
            { match: "yandex", label: "Yandex" },
            { match: "baidu", label: "Baidu" },
        ],
        phrase: (label) => `"What were you searching for on ${label}?"`
    },
    {
        keys: [
            { match: "github", label: "GitHub" },
            { match: "gitlab", label: "GitLab" },
            { match: "bitbucket", label: "Bitbucket" },
            { match: "codeberg", label: "Codeberg" },
            { match: "sourceforge", label: "SourceForge" },
        ],
        phrase: (label) => `"Just grabbed an open source cheat (${label})"`
    },
    {
        keys: [
            { match: "youtube", label: "YouTube" },
            { match: "twitch", label: "Twitch" },
            { match: "vimeo", label: "Vimeo" },
            { match: "dailymotion", label: "Dailymotion" },
            { match: "kick.com", label: "Kick" },
            { match: "rumble", label: "Rumble" },
        ],
        phrase: (label) => `"Done watching on ${label}?"`
    },
    {
        keys: [
            { match: "discord", label: "Discord" },
            { match: "slack", label: "Slack" },
            { match: "teams", label: "Teams" },
            { match: "telegram", label: "Telegram" },
            { match: "whatsapp", label: "WhatsApp" },
            { match: "signal", label: "Signal" },
            { match: "messenger", label: "Messenger" },
            { match: "matrix", label: "Matrix" },
            { match: "element", label: "Element" },
            { match: "zulip", label: "Zulip" },
        ],
        phrase: (label) => `"Go back chatting on ${label} x)"`
    },
    {
        keys: [
            { match: "steam", label: "Steam" },
            { match: "steampowered", label: "Steam" },
            { match: "store.steampowered", label: "Steam" }, // istg we got referrers from steampowered
        ],
        phrase: (label) => `"Taking a break from ${label}?"`
    },
    {
        keys: [
            { match: "reddit", label: "Reddit" },
            { match: "lemmy", label: "Lemmy" },
            { match: "hackernews", label: "Hacker News" },
            { match: "ycombinator", label: "Hacker News" },
            { match: "lobste", label: "Lobsters" },
        ],
        phrase: (label) => `"Welcome, fellow doomscroller from ${label}"`
    },
    {
        keys: [
            { match: "linkedin", label: "LinkedIn" }, // someone added a noskid cert to their linkedin certificates TT
        ],
        phrase: (label) => `"Very professional of you to come from ${label}"`
    },
    {
        keys: [
            { match: "gmail", label: "Gmail" },
            { match: "outlook", label: "Outlook" },
            { match: "proton", label: "Proton Mail" },
            { match: "mail.", label: "your mail client" },
        ],
        phrase: (label) => `"Clicked a link from your emails on ${label}?"`
    },
    {
        keys: [
            { match: "wikipedia", label: "Wikipedia" },
            { match: "wikimedia", label: "Wikimedia" },
        ],
        phrase: (label) => `"Fell down a rabbit hole on ${label}?"`
    },
];

//Update the year date
dateUpdate.innerHTML = ` in the big ${new Date().getFullYear()}`;
log(`dateUpdate set to ${dateUpdate.innerHTML}`, 'success');

//Get informations abt the ip
async function getIpInfo() {
    try {
        const response = await fetch('/api/ip/');
        const data = await response.json();

        if (data.status === 'success') {
            country = data.country;
            city = data.city;
            isp = data.isp;
            ip = data.query;

            if (country) {
                countryUpdate.innerHTML = country;
                log(`countryUpdate set to ${country}`, 'success');
            }
            if (city) {
                cityUpdate.innerHTML = city;
                log(`cityUpdate set to ${city}`, 'success');
            }
            if (isp) {
                ispUpdate.innerHTML = isp;
                ispfUpdate.innerHTML = isp.toUpperCase();
                log(`isp(f)Update set to ${isp}`, 'success');

            }
            if (ip) {
                ipUpdate.innerHTML = ip;
                log(`ipUpdate set to ${ip}`, 'success');
            }

        }
    } catch (error) {
        log(`Failed to fetch ip infos: ${error}`, 'error')
    }
}

function getReferer() {
    const ref = document.referrer;

    let domain = "";
    if (ref) {
        try {
            domain = new URL(ref).hostname;
        } catch (e) {
            log(`Failed to get domain name: ${e}`, 'error');
            domain = "";
        }
    }

    if (domain) {
        const group = refererGroups.find(g => g.keys.some(k => domain.includes(k.match ?? k)));
        const label = group
            ? (group.keys.find(k => domain.includes(k.match ?? k))?.label ?? domain)
            : domain;

        const phrase = group
            ? group.phrase(label)
            : `"You're coming from ${domain} :^)"`;

        refererUpdate.innerText = phrase;
        log(`ref set to "${phrase}"`, 'success');
    }
}

getIpInfo();
getReferer();
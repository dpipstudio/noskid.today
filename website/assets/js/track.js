//Track.js | Shows the stats of the website on load

let unique_views = -1;
let total_requests = -1;

async function showStats() {
    if (unique_views == -1) {
        if (localStorage.getItem('dpipTrack') === 'false') {
            log('dpipTrack set to false, not tracking.', 'warning');
            return;
        } 
        
        await getReqCount();

        logStats();
    } else {
        logStats();
    }
}

async function getReqCount() {
    try {
        const response = await fetch('%%ANALYTICS_URL%%');
        const data = await response.json();
        if (data.unique_views) unique_views = formatNumber(data.unique_views);
        if (data.total_requests) total_requests = formatNumber(data.total_requests);
        log(`Requests count fetched!`, 'success');
    } catch (error) {
        log(`Failed to fetch requests count: ${error}`, 'error');
    }
}

function formatNumber(num) {
    return num >= 1000 ? (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : num;
}

function logStats() {
    log('', 'warning');
    log("=-=-==-=-= Stats =-=-==-=-=", 'warning');
    log(`Unique visitors: ${unique_views}`, 'warning');
    log(`Total requests: ${total_requests}`, 'warning');
    log("=-=-=-=-=-=-=-=-==-=-==-=-=", 'warning');
    log('', 'warning');

}

function toggleTrack() {

    const currentTrackState = localStorage.getItem('dpipTrack') ?? 'true';
    const next = currentTrackState === 'true' ? 'false' : 'true';

    localStorage.setItem('dpipTrack', next);
    log(`Set dpipTrack to ${next} !`);
}

showStats();
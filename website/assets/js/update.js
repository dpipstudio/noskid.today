//Update.js | Check if updated and notify the user

if (localStorage.getItem('isUpdating') === 'true') {
    showNotification(`NoSkid updated to version <b>${localStorage.getItem('latest')}</b>.`);
    localStorage.setItem('isUpdating', 'false');
} 
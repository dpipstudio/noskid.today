//Cursor.js | Loads cursor and his animation

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.matchMedia("(max-width: 768px)").matches;
}

if (!isMobileDevice()) {
    const cursor = document.createElement('div');
    const body = document.body;
    cursor.classList.add('custom-cursor');
    document.body.appendChild(cursor);
    log('Cursor created!', 'success');

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    document.addEventListener('mousedown', () => {
        cursor.classList.add('active');
    });

    document.addEventListener('mouseup', () => {
        cursor.classList.remove('active');
    });

    document.addEventListener('mouseleave', () => {
        cursor.style.display = 'none';
    });

    document.addEventListener('mouseenter', () => {
        cursor.style.display = 'block';
    });

    body.classList.add('hide-cursor');
}
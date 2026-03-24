// Rq.js | Request catcher tool

async function requestsCatcher(event) {
    event.preventDefault();

    startAchievement('Request Catcher');

    log('=-=-==- Certificate Request Catcher -==-=-=', 'warning');
    log('Opening certificate verification tool...', 'warning');

    ensureConsoleOpen().then(() => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/png';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        log('Please select a certificate file (.png)', 'warning');

        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) {
                log('No file selected', 'error');
                return;
            }

            log(`Processing certificate file: ${file.name}`, 'warning');
            await processCertificateFileRQ(file);
        });

        fileInput.click();
    });
}

function ensureConsoleOpen() {
    return new Promise((resolve) => {
        const consoleContainer = document.getElementById("console-container");
        if (consoleContainer.style.display === "none" || consoleContainer.style.display === "") {
            const consoleButton = document.getElementById('console-btn');
            if (consoleButton) {
                consoleButton.click();
                setTimeout(() => resolve(), 300);
            } else {
                log('Console button not found', 'error');
                resolve();
            }
        } else {
            resolve();
        }
    });
}

async function processCertificateFileRQ(file) {
    try {
        const nskdrq = new NskdLbr();
        const result = await nskdrq.loadFromFile(file);

        if (!result.valid) {
            if (result.message.includes('verification key')) {
                log('No valid verification key found in certificate', 'error');
            } else if (result.message.includes('extract')) {
                log('Could not extract verification data from file', 'error');
            } else {
                log(`Certificate verification failed: ${result.message}`, 'error');
            }
            return;
        }

        const certData = nskdrq.getCertificateData();
        const key = certData.key;

        if (result.valid) {
            log('Certificate is VALID!', 'success');
            displayCertificateDetails(certData);

            connectToWebSocketServer(key);
        } else {
            log('Certificate data mismatch!', 'error');
            log(`Mismatch reason: Data does not match server records`, 'error');
            log(`We do not validate this certificate.`, 'error');
        }
    } catch (error) {
        log(`Error processing certificate: ${error.message}`, 'error');
    }
}

function displayCertificateDetails(data) {
    log('=-=-==- Certificate Details -==-=-=', 'warning');
    log(`Certificate #: ${data.certificate_number}`, 'success');
    log(`Username: ${data.username}`, 'success');
    log(`Percentage: ${data.percentage}%`, 'success');
    log(`Creation Date: ${data.creationDate}`, 'success');
    log(`Country: ${data.country} (${data.countryCode})`, 'success');
    log('=-=-=-=-=-=-=-=-=-=-=-=-=-=', 'warning');
}

function getFormattedTime() {
    const now = new Date();
    return now.toLocaleTimeString();
}

function connectToWebSocketServer(key) {
    const ws = new WebSocket(`wss://rq.noskid.today`);

    ws.onopen = () => {
        log('Connected to WebSocket server', 'success');
        ws.send(JSON.stringify({ type: 'auth', key: key }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'auth_success') {
            log(`Authentication successful. Generated url: https://rq.noskid.today${data.url}`, 'success');
        } else if (data.type === 'request_data') {
            addAchievement('Request Catcher');
            log('=-=-==- Incoming Request -==-=-=', 'warning');
            log(`Method: ${data.data.method}`, 'info');
            log(`URL: ${data.data.url}`, 'info');
            log(`IP: ${data.data.ip}`, 'info');
            log(`Timestamp: ${data.data.timestamp}`, 'info');
            log('Headers:', 'info');
            Object.entries(data.data.headers).forEach(([key, value]) => {
                log(`${key}: ${value}`, 'info');
            });
            if (data.data.body && Object.keys(data.data.body).length > 0) {
                log('Body:', 'info');
                log(JSON.stringify(data.data.body, null, 2), 'info');
            }
            log('=-=-=-=-=-=-=-=-=-=-=-=-=-=', 'warning');

        } else if (data.type === 'auth_failed') {
            log(`Authentication failed: ${data.reason}`, 'error');
        } else if (data.type === 'auth_error') {
            log(`Authentication error: ${data.message}`, 'error');
        }
    };

    ws.onclose = () => {
        log('Disconnected from WebSocket server', 'warning');
    };

    ws.onerror = (error) => {
        log(`WebSocket error: ${error.message}`, 'error');
    };
}
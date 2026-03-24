//Check.js | The certification validity checker

async function verifyCertificate() {
    startAchievement('Certificate Validator');

    log('=-=-==- Certificate -==-=-=', 'warning');
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
            await processCertificateFile(file);
            addAchievement('Certificate Validator');
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

async function processCertificateFile(file) {
    try {
        const nskd = new NskdLbr();
        const result = await nskd.loadFromFile(file);

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

        const certData = nskd.getCertificateData();

        if (result.valid) {
            log('Certificate is VALID!', 'success');
            showCertificateDetails(certData);
        } else {
            log('Certificate data mismatch!', 'error');
            log(`Mismatch reason: Data does not match server records`, 'error');
            log(`We do not validate this certificate.`, 'error');
        }
    } catch (error) {
        log(`Error processing certificate: ${error.message}`, 'error');
    }

}

function showCertificateDetails(data) {

    log('=-=-==- Certificate -==-=-=', 'warning');
    log(`Certificate #: ${data.certificate_number}`, 'success');
    log(`Username: ${data.nickname}`, 'success');
    log(`Percentage: ${data.percentage}%`, 'success');
    log(`Creation Date: ${data.creationDate}`, 'success');
    log(`Country: ${data.country} (${data.countryCode})`, 'success');
    log('=-=-=-=-=-=-=-=-=-=-=-=-=-=', 'warning');
}

function getFormattedTime() {
    const now = new Date();
    return now.toLocaleTimeString();
}
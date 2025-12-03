/**
 * NoSkid Certificate Library
 * A JavaScript library for working with NoSkid certificates
 *
 * @version 1.1.5
 * @author Douxx <douxx@douxx.tech>
 * @param {string} [options.apiUrl='https://check.noskid.today/'] - Logs debug messages to console
 * @param {boolean} [options.debug=false] - Logs debug messages to console
 * @param {boolean} [options.strictCheck=true] - Whether to validate local data against API response
 * @param {boolean} [options.allowAchievements=true] - Whether to allow achievements boosted certificates
 * @param {integer} [options.timeout=10000] - API request timeout in milliseconds
 * @param {boolean} [options.useLegacyAPI=false] - Whether to use the legacy API format
 * @param {function} [options.onLog=null] - Log function for callbacks
 */

class NskdLbr {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || 'https://check.noskid.today/';
        this.debug = options.debug || false;
        this.timeout = options.timeout || 10000;
        this.strictCheck = options.strictCheck !== undefined ? options.strictCheck : true;
        this.allowAchievements = options.allowAchievements !== undefined ? options.allowAchievements : true;
        this.onLog = options.onLog || null;
        this.useLegacyAPI = options.useLegacyAPI || false;
        this.certificateData = null;
        this.verificationKey = null;
        this.localData = null;
        this.isValid = false;
    }

    /**
     * Logs messages with different levels
     * @param {string} message - The message to Log
     */
    nskdLbrLog(message, level = 'info') {
        if (this.debug) {
            const timestamp = new Date().toLocaleTimeString();
            const prefix = `[${timestamp}] NoSkid:`;

            switch (level) {
                case 'error':
                    console.error(prefix, message);
                    break;
                case 'warning':
                    console.warn(prefix, message);
                    break;
                case 'success':
                    console.log(`%c${prefix} ${message}`, 'color: green');
                    break;
                default:
                    console.log(prefix, message);
            }
        }

        if (this.onLog && typeof this.onLog === 'function') {
            this.onLog(message, level);
        }
    }

    /**
     * Load and verify a certificate from a PNG file
     * @param {File} file - The PNG certificate file
     * @returns {Promise<Object>} Verification result
     */
    async loadFromFile(file) {
        try {
            this.nskdLbrLog('Starting certificate verification process...', 'info');

            if (!file) {
                throw new Error('No file provided');
            }

            if (!file.name.toLowerCase().endsWith('.png')) {
                throw new Error('File must be a PNG image');
            }

            this.nskdLbrLog(`Processing certificate file: ${file.name}`, 'info');

            const arrayBuffer = await this.readFileAsArrayBuffer(file);

            const extractedText = await this.extractTextFromPng(arrayBuffer);
            if (!extractedText) {
                throw new Error('Could not extract verification data from file');
            }

            this.verificationKey = this.extractVerificationKey(extractedText);
            if (!this.verificationKey) {
                throw new Error('No valid verification key found in certificate');
            }

            this.nskdLbrLog('Successfully extracted verification key', 'success');

            this.localData = this.extractLocalData(extractedText);
            if (this.localData) {
                this.nskdLbrLog('Local certificate data extracted:', 'info');
                this.nskdLbrLog(`Username: ${this.localData.username}`, 'info');
                this.nskdLbrLog(`Creation Date: ${this.localData.creationDate}`, 'info');
            }

            const result = await this.verifyWithAPI();
            return result;

        } catch (error) {
            this.nskdLbrLog(`Error loading certificate: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Verify a certificate using a verification key directly
     * @param {string} key - The verification key (64-character hex string)
     * @returns {Promise<Object>} Verification result
     */
    async verifyWithKey(key) {
        try {
            if (!key || typeof key !== 'string') {
                throw new Error('Invalid verification key provided');
            }

            if (!/^[a-f0-9]{64}$/i.test(key)) {
                throw new Error('Verification key must be a 64-character hexadecimal string');
            }

            this.verificationKey = key.toLowerCase();
            this.nskdLbrLog(`Verifying certificate with key: ${this.verificationKey.substring(0, 16)}...`, 'info');

            const result = await this.verifyWithAPI();
            return result;

        } catch (error) {
            this.nskdLbrLog(`Error verifying certificate: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Get the current certificate data
     * @returns {Object|null} Certificate data or null if not loaded/verified
     */
    getCertificateData() {
        if (!this.certificateData) {
            return null;
        }

        return {
            ...this.certificateData,
            key: this.verificationKey,
            localUsername: this.localData ? this.localData.username : null,
            localCreationDate: this.localData ? this.localData.creationDate : null
        };
    }

    /**
     * Check if the certificate is valid
     * @returns {boolean} True if certificate is valid
     */
    isValidCertificate() {
        return this.isValid;
    }

    /**
     * Get formatted certificate details as a string
     * @returns {string} Formatted certificate details
     */
    getFormattedDetails() {
        if (!this.certificateData) {
            return 'No certificate data available';
        }

        const data = this.certificateData;
        const username = this.useLegacyAPI ? data.username : data.nickname || data.username;

        return `
Certificate Details:
- Certificate #: ${data.certificate_number}
- Username: ${username}
- Percentage: ${data.percentage}%
- Creation Date: ${data.creationDate}
- Country: ${data.country} (${data.countryCode})
        `.trim();
    }

    /**
     * Reset the certificate data
     */
    reset() {
        this.certificateData = null;
        this.verificationKey = null;
        this.localData = null;
        this.isValid = false;
        this.nskdLbrLog('Certificate data reset', 'info');
    }

    // Private methods

    /**
     * Read file as array buffer
     * @private
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Extract text from PNG tEXt chunk
     * @private
     */
    async extractTextFromPng(arrayBuffer) {
        try {
            const bytes = new Uint8Array(arrayBuffer);

            // Check PNG header
            if (!(bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47)) {
                throw new Error("Not a valid PNG file");
            }

            let pos = 8; // Skip PNG header
            let extractedText = null;

            while (pos < bytes.length - 12) {
                const length = (
                    (bytes[pos] << 24) |
                    (bytes[pos + 1] << 16) |
                    (bytes[pos + 2] << 8) |
                    (bytes[pos + 3])
                );

                const type = String.fromCharCode(
                    bytes[pos + 4],
                    bytes[pos + 5],
                    bytes[pos + 6],
                    bytes[pos + 7]
                );

                if (type === 'tEXt') {
                    const chunkData = bytes.slice(pos + 8, pos + 8 + length);
                    const text = new TextDecoder('utf-8').decode(chunkData);

                    const separatorIndex = text.indexOf('\0');
                    if (separatorIndex !== -1) {
                        const keyword = text.substring(0, separatorIndex);
                        const value = text.substring(separatorIndex + 1);

                        if (keyword === 'noskid-key') {
                            extractedText = value;
                            break;
                        }
                    }
                }
                pos += 8 + length + 4;
            }

            if (extractedText) {
                this.nskdLbrLog("Certificate data extracted successfully from PNG", 'success');
                return extractedText;
            } else {
                this.nskdLbrLog("No 'noskid-key' text chunk found in PNG", 'error');
                return null;
            }
        } catch (error) {
            this.nskdLbrLog(`Error extracting text from PNG: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Extract verification key from certificate text
     * @private
     */
    extractVerificationKey(text) {
        try {
            const keyPattern = /-*BEGIN NOSKID KEY-*\s*([a-f0-9]{64})/i;
            const match = text.match(keyPattern);
            return match ? match[1].toLowerCase() : null;
        } catch (error) {
            this.nskdLbrLog(`Error extracting verification key: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Extract local certificate data
     * @private
     */
    extractLocalData(text) {
        try {
            const keyPattern = /-----BEGIN NOSKID KEY-----\s*([a-f0-9]+)\s*([A-Za-z0-9+/=]+)\s*([A-Za-z0-9+/=]+)\s*-----END NOSKID KEY-----/;
            const match = text.match(keyPattern);

            if (!match) return null;

            const certInfoEncoded = match[2];
            const certInfoDecoded = atob(certInfoEncoded.replace(/=/g, ''));
            const usernameMatch = certInfoDecoded.match(/CERT-\d+-(.+)/);
            const username = usernameMatch ? usernameMatch[1] : null;

            const dateInfoEncoded = match[3];
            const dateInfoDecoded = atob(dateInfoEncoded.replace(/=/g, ''));
            const dateMatch = dateInfoDecoded.match(/CREATED-(.+)/);
            const creationDate = dateMatch ? dateMatch[1] : null;

            return { username, creationDate };
        } catch (error) {
            this.nskdLbrLog(`Error extracting local data: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Verify certificate with API
     * @private
     */
    async verifyWithAPI() {
        try {
            this.nskdLbrLog('Verifying certificate with server...', 'info');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(
                `${this.apiUrl}?key=${encodeURIComponent(this.verificationKey)}`,
                {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'NskdLbr/1.1.0'
                    }
                }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const apiData = await response.json();

            if (!apiData.success) {
                this.isValid = false;
                this.nskdLbrLog(`Certificate verification failed: ${apiData.message}`, 'error');
                return {
                    valid: false,
                    message: apiData.message,
                    cached: apiData.cached || false,
                    strictCheck: this.strictCheck
                };
            }

            if (apiData.data.boosted && !this.allowAchievements) {
                this.isValid = false;
                this.nskdLbrLog('Certificate uses achievements boost, which is not allowed by allowAchievements', 'error');
                return {
                    valid: false,
                    message: 'Certificate uses achievements boost',
                    cached: apiData.cached || false,
                    strictCheck: this.strictCheck
                };
            }

            if (apiData.data.boosted) {
                this.nskdLbrLog('Certificate is achievement-boosted', 'warning');
            }

            // Compare local data with API data if available and strictCheck is enabled
            if (this.localData && this.strictCheck) {
                const apiUsername = this.useLegacyAPI ? apiData.data.username : (apiData.data.nickname || apiData.data.username);
                const validationResult = this.compareData(this.localData, { ...apiData.data, username: apiUsername });

                if (!validationResult.valid) {
                    this.isValid = false;
                    this.nskdLbrLog('Certificate data mismatch!', 'error');
                    this.nskdLbrLog(`Mismatch reason: ${validationResult.reason}`, 'error');
                    this.nskdLbrLog('Note: Strict checking is enabled. Set strictCheck to false to skip local data validation.', 'warning');
                    return {
                        valid: false,
                        message: `Data mismatch: ${validationResult.reason}`,
                        cached: apiData.cached || false,
                        strictCheck: true
                    };
                }
                this.nskdLbrLog('Local data validation passed', 'success');
            } else if (this.localData && !this.strictCheck) {
                this.nskdLbrLog('Strict checking disabled - skipping local data validation', 'warning');
            }

            this.isValid = true;
            this.certificateData = apiData.data;
            this.nskdLbrLog('Certificate is VALID!', 'success');

            return {
                valid: true,
                message: 'Certificate verified successfully',
                data: apiData.data,
                query: apiData.query || this.verificationKey,
                cached: apiData.cached || false,
                strictCheck: this.strictCheck
            };

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - server took too long to respond');
            }
            throw new Error(`API verification failed: ${error.message}`);
        }
    }

    /**
     * Compare local and API data
     * @private
     */
    compareData(localData, apiData) {
        if (!localData || !apiData) {
            return { valid: false, reason: 'Missing data for comparison' };
        }

        if (localData.username !== apiData.username) {
            return {
                valid: false,
                reason: `Username mismatch: Local=${localData.username}, API=${apiData.username}`
            };
        }

        const localDateMinutes = localData.creationDate.substring(0, 16);
        const apiDateMinutes = apiData.creationDate.substring(0, 16);

        if (localDateMinutes !== apiDateMinutes) {
            return {
                valid: false,
                reason: `Creation date mismatch: Local=${localDateMinutes}, API=${apiDateMinutes}`
            };
        }

        return { valid: true };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NskdLbr;
} else {
    window.NskdLbr = NskdLbr;
}
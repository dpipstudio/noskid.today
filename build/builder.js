#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { performance } = require('perf_hooks');
const { checkJavaScriptSyntax } = require('./syntax-check');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
        'info': '\x1b[37m',
        'success': '\x1b[32m\x1b[1m',
        'warning': '\x1b[33m',
        'error': '\x1b[31m\x1b[1m',
        'reset': '\x1b[0m'
    };

    const color = colors[type] || colors.info;
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function displayLogo() {
    console.log('\x1b[36m');
    console.log('----------- NoSkid Builder -----------');
    console.log('|- A tool for optimizing noskid site |');
    console.log('|-  Made by @philixy and @douxxtech  |');
    console.log('-------------------------------------');
    console.log('\x1b[0m');
    console.log();
}

class NoSkidBuilder {
    constructor() {
        this.usedNames = new Set();
        this.variableMap = new Map();
        this.assetMap = new Map();
        this.varCounter = 0;
        this.buildDir = '';
        this.buildStartTime = null;
        this.sourceDir = 'website';
        this.stats = {
            originalSize: 0,
            minifiedSize: 0,
            filesProcessed: 0,
            assetsRenamed: 0,
            assetsSkipped: 0,
            htmlFilesOptimized: 0
        };

        this.changeLog = {
            buildInfo: {
                timestamp: new Date().toISOString(),
                buildDirectory: '',
                duration: 0
            },
            htmlFiles: {
                processed: [],
                optimized: []
            },
            jsFiles: {
                processed: [],
                minified: [],
                downloaded: [],
                critical: [],
                errors: []
            },
            assets: {
                renamed: [],
                skipped: [],
                directories: []
            },
            variables: {
                renamed: new Map(),
                preserved: []
            },
            references: {
                updated: [],
                patterns: []
            },
            keywordReplacements: {
                count: 0,
                files: []
            },
            errors: [],
            warnings: []
        };

        this.reservedKeywords = new Set(config.reservedKeywords);
        this.criticalScripts = new Set(config.criticalScripts);
        this.excludedExtensions = new Set(config.excludedExtensions || []);
        this.preservedVariables = new Set(config.preservedVariables || []);
    }

    checkProjectRoot() {
        for (const file of config.requiredFiles) {
            if (!fs.existsSync(path.join(this.sourceDir, file))) {
                log(`Missing required file: ${file}`, 'error');
                this.changeLog.errors.push(`Missing required file: ${file}`);
                return false;
            }
        }

        log('Project root validated successfully!', 'success');
        return true;
    }

    generateRandomName() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result;

        do {
            result = '';
            for (let i = 0; i < 6; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.usedNames.has(result) || this.reservedKeywords.has(result));

        this.usedNames.add(result);
        return result;
    }

    createBuildDir() {
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/[-:]/g, '')
            .replace(/\..+/, '')
            .replace('T', '-');

        this.buildDir = path.join('build', `prod-${timestamp}`);
        this.changeLog.buildInfo.buildDirectory = this.buildDir;

        if (!fs.existsSync('build')) {
            fs.mkdirSync('build');
        }

        fs.mkdirSync(this.buildDir, { recursive: true });
        log(`Created build directory: ${this.buildDir}`, 'success');
    }

    replaceKeywords(content, filename = '') {
        let processedContent = content;
        let replacementCount = 0;

        for (const [keyword, value] of Object.entries(config.replaceKeyWords)) {
            const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = (content.match(regex) || []).length;

            if (matches > 0) {
                processedContent = processedContent.replace(regex, value);
                replacementCount += matches;
                log(`Replaced ${matches} occurrences of "${keyword}" in ${filename || 'content'}`, 'info');
            }
        }

        if (replacementCount > 0 && filename) {
            this.changeLog.keywordReplacements.count += replacementCount;
            this.changeLog.keywordReplacements.files.push({
                filename: filename,
                replacements: replacementCount,
                timestamp: new Date().toISOString()
            });
        }

        return processedContent;
    }

    minifyHTML(tag, html) {
        let minified = html;

        minified = this.replaceKeywords(minified);

        minified = minified.replace(/<!--(?!\s*(?:\[if [^\]]+\]|<!|>))[\s\S]*?-->/g, '');
        minified = minified.replace(/>\s+</g, '><');
        minified = minified.replace(/^\s+|\s+$/gm, '');
        minified = minified.replace(/\n\s*\n/g, '\n');
        minified = minified.replace(/\s{2,}/g, ' ');
        minified = minified.replace(/\s*(<\/?(?:html|head|body|title|meta|link|script|style|div|p|h[1-6]|ul|ol|li|nav|header|footer|main|section|article|aside)[^>]*>)\s*/gi, '$1');

        let result = tag + '\n' + minified;

        return result.trim();
    }

    isCriticalScript(url) {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        return Array.from(this.criticalScripts).some(pattern => lowerUrl.includes(pattern));
    }

    shouldSkipExtension(filename) {
        const ext = path.extname(filename).toLowerCase();
        const isExcluded = this.excludedExtensions.has(ext);

        if (isExcluded) {
            log(`Skipping file with excluded extension: ${filename} (${ext})`, 'info');
            this.changeLog.assets.skipped.push({
                filename: filename,
                reason: `Excluded extension: ${ext}`,
                timestamp: new Date().toISOString()
            });
        }

        return isExcluded;
    }

    copyFiles() {
        log('Starting file copy and optimization process...', 'info');

        const rootFiles = fs.readdirSync(this.sourceDir);

        for (const file of rootFiles) {
            const sourcePath = path.join(this.sourceDir, file);

            if (file.endsWith('.html')) {
                const originalContent = fs.readFileSync(sourcePath, 'utf8');
                const optimized = this.minifyHTML(config.commentTag, originalContent);
                fs.writeFileSync(path.join(this.buildDir, file), optimized);

                this.stats.htmlFilesOptimized++;
                this.changeLog.htmlFiles.processed.push(file);
                this.changeLog.htmlFiles.optimized.push({
                    filename: file,
                    originalSize: originalContent.length,
                    optimizedSize: optimized.length,
                    spaceSaved: originalContent.length - optimized.length,
                    compressionRatio: ((originalContent.length - optimized.length) / originalContent.length * 100).toFixed(2)
                });

                log(`Optimized and copied: ${file}`, 'success');
            } else if (file.endsWith('.ico')) {
                fs.copyFileSync(sourcePath, path.join(this.buildDir, file));
                this.changeLog.htmlFiles.processed.push(file);
                log(`Copied: ${file}`, 'success');
            }
        }

        for (const dir of config.directoriesToCopy) {
            const fullSourceDir = path.join(this.sourceDir, dir);
            if (fs.existsSync(fullSourceDir)) {
                this.copyDir(fullSourceDir, path.join(this.buildDir, dir));
                this.changeLog.assets.directories.push(dir);
                log(`Copied directory: ${dir}`, 'success');
            }
        }

        //add license
        fs.writeFileSync(path.join(this.buildDir, 'LICENSE'), fs.readFileSync("LICENSE", 'utf8'));
        log(`Copied license file`, 'success');

    }

    processErrorDocs() {
        const errordocsDir = path.join(this.buildDir, 'errordocs');
        if (!fs.existsSync(errordocsDir)) return;

        const files = fs.readdirSync(errordocsDir);
        for (const file of files) {
            if (file.endsWith('.html')) {
                const filePath = path.join(errordocsDir, file);
                const originalContent = fs.readFileSync(filePath, 'utf8');
                const optimized = this.minifyHTML(config.commentTag, originalContent);
                fs.writeFileSync(filePath, optimized);

                this.stats.htmlFilesOptimized++;
                this.changeLog.htmlFiles.processed.push(`errordocs/${file}`);
                this.changeLog.htmlFiles.optimized.push({
                    filename: `errordocs/${file}`,
                    originalSize: originalContent.length,
                    optimizedSize: optimized.length,
                    spaceSaved: originalContent.length - optimized.length,
                    compressionRatio: ((originalContent.length - optimized.length) / originalContent.length * 100).toFixed(2)
                });

                log(`Optimized HTML file in errordocs: ${file}`, 'success');
            }
        }
    }

    copyDir(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                this.copyDir(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    cleanUrl(url) {
        try {
            const cleanedUrl = url.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
            new URL(cleanedUrl);
            return cleanedUrl;
        } catch (error) {
            const errorMsg = `Invalid URL detected: "${url}" (length: ${url.length})`;
            log(errorMsg, 'error');
            log(`URL bytes: ${Array.from(url).map(c => c.charCodeAt(0)).join(', ')}`, 'error');
            this.changeLog.errors.push(errorMsg);
            throw new Error(`Invalid URL format: ${url}`);
        }
    }

    async downloadFile(url) {
        return new Promise((resolve, reject) => {
            try {
                const cleanedUrl = this.cleanUrl(url);
                const parsedUrl = new URL(cleanedUrl);
                const client = parsedUrl.protocol === 'https:' ? https : http;

                log(`Attempting to download: ${cleanedUrl}`, 'info');

                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port,
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                };

                const request = client.request(options, (response) => {
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        let redirectUrl = response.headers.location;

                        if (redirectUrl.startsWith('/')) {
                            redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
                        } else if (!redirectUrl.startsWith('http')) {
                            redirectUrl = new URL(redirectUrl, cleanedUrl).href;
                        }

                        const warningMsg = `Following redirect from ${cleanedUrl} to ${redirectUrl}`;
                        log(warningMsg, 'warning');
                        this.changeLog.warnings.push(warningMsg);
                        this.downloadFile(redirectUrl).then(resolve).catch(reject);
                        return;
                    }

                    if (response.statusCode !== 200) {
                        const errorMsg = `HTTP ${response.statusCode} for ${cleanedUrl}`;
                        this.changeLog.errors.push(errorMsg);
                        reject(new Error(errorMsg));
                        return;
                    }

                    let data = '';
                    response.setEncoding('utf8');
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => {
                        log(`Successfully downloaded ${cleanedUrl} (${data.length} bytes)`, 'success');
                        this.changeLog.jsFiles.downloaded.push({
                            url: cleanedUrl,
                            size: data.length,
                            timestamp: new Date().toISOString()
                        });
                        resolve(data);
                    });
                });

                request.on('error', (error) => {
                    const errorMsg = `Request error for ${cleanedUrl}: ${error.message}`;
                    log(errorMsg, 'error');
                    this.changeLog.errors.push(errorMsg);
                    reject(error);
                });

                request.setTimeout(15000, () => {
                    request.destroy();
                    const errorMsg = `Download timeout for ${cleanedUrl}`;
                    this.changeLog.errors.push(errorMsg);
                    reject(new Error(errorMsg));
                });

                request.end();

            } catch (error) {
                this.changeLog.errors.push(`Download error: ${error.message}`);
                reject(error);
            }
        });
    }

    getVariableName() {
        const alphabet = 'abcdefghijklmnopqrstuvwxyz';
        let name = '';
        let num = this.varCounter++;

        do {
            if (num < 26) {
                name = alphabet[num];
            } else {
                let base = Math.floor(num / 26) - 1;
                let remainder = num % 26;
                name = alphabet[base] + alphabet[remainder];
            }

            if (this.reservedKeywords.has(name)) {
                num = this.varCounter++;
                continue;
            }

            break;
        } while (true);

        return name;
    }

    minifyJS(code, originalName) {
        this.stats.originalSize += code.length;

        let minified = code;

        minified = this.replaceKeywords(minified);

        if (this.isCriticalScript(originalName)) {
            const warningMsg = `Skipping minification for critical script: ${originalName}`;
            log(warningMsg, 'warning');
            this.changeLog.warnings.push(warningMsg);
            this.changeLog.jsFiles.critical.push(originalName);
            this.stats.minifiedSize += code.length;
            return `//${originalName}\n${code}`;
        }

        if (!checkJavaScriptSyntax(code)) {
            const errorMsg = `Syntax error in script: ${originalName}`;
            log(errorMsg, 'error');
            this.changeLog.jsFiles.errors.push({
                filename: originalName,
                error: 'Syntax error',
                timestamp: new Date().toISOString()
            });
            return `//${originalName}\n${code}`;
        }

        minified = minified.replace(/^\s*\/\/.*$/gm, '');
        minified = minified.replace(/\s\/\/.*$/gm, '');
        minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');

        minified = minified.replace(/^\s+/gm, '');
        minified = minified.replace(/\s+$/gm, '');
        minified = minified.replace(/\n\s*\n/g, '\n');
        minified = minified.replace(/  +/g, ' ');

        minified = minified.replace(/\s*;\s*\n/g, ';\n');
        minified = minified.replace(/\s*{\s*\n/g, '{\n');
        minified = minified.replace(/\n\s*}/g, '\n}');

        const varPattern = /\b(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]{7,})\b/g;
        const longVars = [];
        let match;

        while ((match = varPattern.exec(minified)) !== null) {
            const varName = match[1];

            const skipPatterns = [
                /^[A-Z]/,
                /element/i, /event/i, /error/i, /response/i, /promise/i,
                /callback/i, /handler/i, /listener/i, /timeout/i, /interval/i,
                /document/i, /window/i, /console/i, /location/i,
                /container/i, /wrapper/i, /content/i, /message/i,
                /timestamp/i, /duration/i, /config/i, /settings/i,
                /function/i, /method/i, /property/i, /attribute/i,
                /turnstile/i, /cloudflare/i, /recaptcha/i, /hcaptcha/i
            ];

            const shouldSkip = skipPatterns.some(pattern => pattern.test(varName)) ||
                this.reservedKeywords.has(varName) ||
                this.preservedVariables.has(varName);

            if (shouldSkip) {
                this.changeLog.variables.preserved.push({
                    variable: varName,
                    reason: 'Matches skip pattern or reserved keyword',
                    file: originalName
                });
            } else if (!this.variableMap.has(varName)) {
                const shortName = this.getVariableName();
                this.variableMap.set(varName, shortName);
                this.changeLog.variables.renamed.set(varName, {
                    newName: shortName,
                    file: originalName
                });
                longVars.push(varName);
            }
        }

        for (const [original, short] of this.variableMap) {
            const regex = new RegExp(`\\b${original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
            minified = minified.replace(regex, short);
        }

        minified = minified.replace(/\n\n+/g, '\n').trim();

        if (!checkJavaScriptSyntax(minified)) {
            const errorMsg = `Syntax error after minification in script: ${originalName}`;
            log(errorMsg, 'error');
            this.changeLog.jsFiles.errors.push({
                filename: originalName,
                error: 'Syntax error after minification',
                timestamp: new Date().toISOString()
            });
            return `//${originalName}\n${code}`;
        }

        this.stats.minifiedSize += minified.length;
        this.stats.filesProcessed++;

        this.changeLog.jsFiles.minified.push({
            filename: originalName,
            originalSize: code.length,
            minifiedSize: minified.length,
            spaceSaved: code.length - minified.length,
            compressionRatio: ((code.length - minified.length) / code.length * 100).toFixed(2),
            variablesRenamed: longVars.length
        });

        return `//${originalName}\n${minified}`;
    }

    processAssets() {
        log('Processing and renaming asset files...', 'info');

        const assetsDir = path.join(this.buildDir, 'assets');
        if (!fs.existsSync(assetsDir)) return;

        this.processAssetsRecursively(assetsDir, 'assets');
    }

    processAssetsRecursively(dir, relativePath) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativeFilePath = `${relativePath}/${entry.name}`;

            if (entry.isDirectory()) {
                if (entry.name !== 'js') {
                    this.processAssetsRecursively(fullPath, relativeFilePath);
                }
            } else {
                if (entry.name.endsWith('.js')) {
                    continue;
                }

                if (this.shouldSkipExtension(entry.name)) {
                    this.stats.assetsSkipped++;
                    continue;
                }

                const ext = path.extname(entry.name);
                const newName = this.generateRandomName() + ext;
                const newPath = path.join(dir, newName);

                fs.renameSync(fullPath, newPath);

                const originalRelativePath = relativeFilePath;
                const newRelativePath = `${relativePath}/${newName}`;
                this.assetMap.set(originalRelativePath, newRelativePath);

                const originalWithoutAssets = relativeFilePath.replace(/^assets\//, '');
                const newWithoutAssets = newRelativePath.replace(/^assets\//, '');
                this.assetMap.set(originalWithoutAssets, newWithoutAssets);

                this.assetMap.set(entry.name, newName);

                this.changeLog.assets.renamed.push({
                    originalName: entry.name,
                    newName: newName,
                    originalPath: originalRelativePath,
                    newPath: newRelativePath,
                    extension: ext,
                    timestamp: new Date().toISOString()
                });

                log(`Renamed asset: ${entry.name} -> ${newName}`, 'success');
                this.stats.assetsRenamed++;
            }
        }
    }

    updateAssetReferences() {
        log('Updating asset references in all files...', 'info');

        const filesToUpdate = this.getAllFilesForReferenceUpdate(this.buildDir);

        for (const filePath of filesToUpdate) {
            this.updateFileReferences(filePath);
        }
    }

    getAllFilesForReferenceUpdate(dir) {
        const files = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                files.push(...this.getAllFilesForReferenceUpdate(fullPath));
            } else {
                const ext = path.extname(entry.name).toLowerCase();
                if (['.html', '.css', '.js', '.json', '.xml', '.svg', '.txt', '.md'].includes(ext)) {
                    files.push(fullPath);
                }
            }
        }

        return files;
    }

    updateFileReferences(filePath) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            let updated = false;
            const originalContent = content;
            const updatedReferences = [];

            const sortedAssetMap = new Map([...this.assetMap.entries()].sort((a, b) => b[0].length - a[0].length));

            for (const [originalPath, newPath] of sortedAssetMap) {
                if (!originalPath || !newPath) continue;

                const escapedOriginal = originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                const patterns = [
                    {
                        regex: new RegExp(`url\\(\\s*(['"\`]?)${escapedOriginal}\\1\\s*\\)`, 'gi'),
                        replacement: `url($1${newPath}$1)`,
                        type: 'CSS url()'
                    },
                    {
                        regex: new RegExp(`(src|href)\\s*=\\s*(['"\`])${escapedOriginal}\\2`, 'gi'),
                        replacement: `$1=$2${newPath}$2`,
                        type: 'HTML src/href'
                    },
                    {
                        regex: new RegExp(`(['"\`])${escapedOriginal}\\1`, 'g'),
                        replacement: `$1${newPath}$1`,
                        type: 'Quoted string'
                    },
                    {
                        regex: new RegExp(`(background-image|background|content)\\s*:\\s*url\\(\\s*(['"\`]?)${escapedOriginal}\\2\\s*\\)`, 'gi'),
                        replacement: `$1: url($2${newPath}$2)`,
                        type: 'CSS background'
                    },
                    {
                        regex: new RegExp(`@import\\s+(['"\`])${escapedOriginal}\\1`, 'gi'),
                        replacement: `@import $1${newPath}$1`,
                        type: 'CSS @import'
                    },
                    {
                        regex: new RegExp(`\\b${escapedOriginal}\\b`, 'g'),
                        replacement: newPath,
                        type: 'Bare reference'
                    }
                ];

                for (const pattern of patterns) {
                    if (pattern.regex.test(content)) {
                        content = content.replace(pattern.regex, pattern.replacement);
                        updated = true;
                        updatedReferences.push({
                            original: originalPath,
                            new: newPath,
                            type: pattern.type
                        });
                    }
                }
            }

            if (updated && content !== originalContent) {
                fs.writeFileSync(filePath, content);
                this.changeLog.references.updated.push({
                    file: path.relative(this.buildDir, filePath),
                    references: updatedReferences,
                    timestamp: new Date().toISOString()
                });
                log(`Updated references in: ${path.relative(this.buildDir, filePath)}`, 'success');
            }
        } catch (error) {
            const errorMsg = `Error updating references in ${filePath}: ${error.message}`;
            log(errorMsg, 'warning');
            this.changeLog.warnings.push(errorMsg);
        }
    }

    async processJSFiles() {
        log('Processing JavaScript files...', 'info');

        const loaderPath = path.join(this.buildDir, 'assets', 'js', '@loader.js');
        if (!fs.existsSync(loaderPath)) return;
        const loaderContent = fs.readFileSync(loaderPath, 'utf8');

        log('Searching for scripts array in loader...', 'info');

        const scriptArrayMatch = loaderContent.match(/this\.scripts\s*=\s*\[([\s\S]*?)\]/);
        if (!scriptArrayMatch) {
            const errorMsg = 'Could not find scripts array in loader';
            log(errorMsg, 'error');
            this.changeLog.errors.push(errorMsg);
            log('Loader content preview:', 'info');
            console.log(loaderContent.substring(0, 500) + '...');
            return;
        }

        const scriptStr = scriptArrayMatch[1];
        log(`Found scripts array content: ${scriptStr.substring(0, 200)}...`, 'info');

        const scriptMatches = scriptStr.match(/['"`]([^'"`]+)['"`]/g) || [];
        const scripts = scriptMatches.map(s => s.replace(/['"`]/g, '').trim());

        log(`Found ${scripts.length} scripts to process`, 'info');
        scripts.forEach((script, index) => {
            log(`Script ${index + 1}: "${script}" (length: ${script.length})`, 'info');
        });

        this.changeLog.jsFiles.processed = [...scripts];

        const newScriptNames = new Map();
        let processedLoaderContent = loaderContent;

        for (const script of scripts) {
            if (!script || script.length === 0) {
                const warningMsg = 'Skipping empty script entry';
                log(warningMsg, 'warning');
                this.changeLog.warnings.push(warningMsg);
                continue;
            }

            if (this.isCriticalScript(script)) {
                const warningMsg = `Preserving critical script: ${script}`;
                log(warningMsg, 'warning');
                this.changeLog.warnings.push(warningMsg);
                continue;
            }

            let content = '';
            let originalName = '';

            if (script.startsWith('http')) {
                try {
                    log(`Processing external script: ${script}`, 'info');
                    content = await this.downloadFile(script);
                    originalName = script.split('/').pop().split('?')[0];
                } catch (error) {
                    const errorMsg = `Failed to download ${script}: ${error.message}`;
                    log(errorMsg, 'error');
                    this.changeLog.errors.push(errorMsg);
                    continue;
                }
            } else {
                const scriptPath = path.join(this.sourceDir, script);
                if (fs.existsSync(scriptPath)) {
                    content = fs.readFileSync(scriptPath, 'utf8');
                    originalName = path.basename(script);
                } else {
                    const warningMsg = `Local script not found: ${script}`;
                    log(warningMsg, 'warning');
                    this.changeLog.warnings.push(warningMsg);
                    continue;
                }
            }

            const newName = this.generateRandomName() + '.js';
            const minified = this.minifyJS(content, originalName);

            const newScriptPath = path.join(this.buildDir, 'assets', 'js', newName);
            fs.writeFileSync(newScriptPath, minified);
            newScriptNames.set(script, `assets/js/${newName}`);

            if (!script.startsWith('http')) {
                const originalBuildPath = path.join(this.buildDir, script);
                if (fs.existsSync(originalBuildPath)) {
                    fs.unlinkSync(originalBuildPath);
                }
            }

            log(`Processed: ${originalName} -> ${newName}`, 'success');
        }

        for (const [oldPath, newPath] of newScriptNames) {
            const escapedOldPath = oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            processedLoaderContent = processedLoaderContent.replace(
                new RegExp(`['" \`]${escapedOldPath}['" \`]`, 'g'),
                `'${newPath}'`
            );
        }

        const newLoaderName = this.generateRandomName() + '.js';
        const minifiedLoader = this.minifyJS(processedLoaderContent, '@loader.js');

        fs.writeFileSync(path.join(this.buildDir, 'assets', 'js', newLoaderName), minifiedLoader);
        fs.unlinkSync(loaderPath);

        log(`Processed loader: @loader.js -> ${newLoaderName}`, 'success');

        this.updateIndexHTML(newLoaderName);
    }

    updateIndexHTML(newLoaderName) {
        const indexPath = path.join(this.buildDir, 'index.html');
        if (!fs.existsSync(indexPath)) return;

        let content = fs.readFileSync(indexPath, 'utf8');
        content = content.replace(/assets\/js\/@loader\.js/g, `assets/js/${newLoaderName}`);
        fs.writeFileSync(indexPath, content);

        log(`Updated index.html with new loader name: ${newLoaderName}`, 'success');

        this.changeLog.references.updated.push({
            file: 'index.html',
            references: [{
                original: 'assets/js/@loader.js',
                new: `assets/js/${newLoaderName}`,
                type: 'Loader script reference'
            }],
            timestamp: new Date().toISOString()
        });
    }

    async build() {
        const startTime = performance.now();
        this.buildStartTime = startTime;

        displayLogo();
        log('Starting NoSkid build process...', 'info');

        if (!this.checkProjectRoot()) {
            process.exit(1);
        }

        this.createBuildDir();
        this.copyFiles();
        this.processAssets();
        await this.processJSFiles();
        this.updateAssetReferences();

        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        this.changeLog.buildInfo.duration = parseFloat(duration);

        const changeLogPath = this.writeChangeLog();

        log(`Change log written to: ${changeLogPath}`, 'success');

        log(`Build completed successfully in ${duration}s!`, 'success');
        log(`Output directory: ${this.buildDir}`, 'info');

        const spaceSaved = this.stats.originalSize - this.stats.minifiedSize;
        const compressionRatio = this.stats.originalSize > 0 ?
            ((spaceSaved / this.stats.originalSize) * 100).toFixed(1) : '0';

        log(`HTML files optimized: ${this.stats.htmlFilesOptimized}`, 'info');
        log(`JS files processed: ${this.stats.filesProcessed}`, 'info');
        log(`Assets renamed: ${this.stats.assetsRenamed}`, 'info');
        log(`Assets skipped: ${this.stats.assetsSkipped}`, 'info');
        log(`Variables renamed: ${this.variableMap.size}`, 'info');
        log(`Space saved: ${spaceSaved} bytes (${compressionRatio}%)`, 'info');
    }

    writeChangeLog() {
        const changeLogPath = path.join(this.buildDir, 'changelog.txt');
        let changeLogContent = '';

        changeLogContent += '====================================\n';
        changeLogContent += '       NOSKID BUILD CHANGELOG\n';
        changeLogContent += '====================================\n\n';

        changeLogContent += 'BUILD INFORMATION:\n';
        changeLogContent += '-----------------\n';
        changeLogContent += `Build Timestamp: ${this.changeLog.buildInfo.timestamp}\n`;
        changeLogContent += `Build Directory: ${this.changeLog.buildInfo.buildDirectory}\n`;
        changeLogContent += `Build Duration: ${this.changeLog.buildInfo.duration}s\n\n`;

        changeLogContent += 'BUILD STATISTICS:\n';
        changeLogContent += '----------------\n';
        const spaceSaved = this.stats.originalSize - this.stats.minifiedSize;
        const compressionRatio = this.stats.originalSize > 0 ?
            ((spaceSaved / this.stats.originalSize) * 100).toFixed(1) : '0';

        changeLogContent += `HTML Files Optimized: ${this.stats.htmlFilesOptimized}\n`;
        changeLogContent += `JavaScript Files Processed: ${this.stats.filesProcessed}\n`;
        changeLogContent += `Assets Renamed: ${this.stats.assetsRenamed}\n`;
        changeLogContent += `Assets Skipped: ${this.stats.assetsSkipped}\n`;
        changeLogContent += `Variables Renamed: ${this.variableMap.size}\n`;
        changeLogContent += `Original JS Size: ${this.stats.originalSize} bytes\n`;
        changeLogContent += `Minified JS Size: ${this.stats.minifiedSize} bytes\n`;
        changeLogContent += `Space Saved: ${spaceSaved} bytes (${compressionRatio}%)\n\n`;

        if (this.changeLog.htmlFiles.processed.length > 0) {
            changeLogContent += 'HTML FILES PROCESSED:\n';
            changeLogContent += '--------------------\n';
            this.changeLog.htmlFiles.processed.forEach(file => {
                changeLogContent += `- ${file}\n`;
            });
            changeLogContent += '\n';
        }

        if (this.changeLog.htmlFiles.optimized.length > 0) {
            changeLogContent += 'HTML OPTIMIZATION DETAILS:\n';
            changeLogContent += '--------------------------\n';
            this.changeLog.htmlFiles.optimized.forEach(file => {
                changeLogContent += `- ${file.filename}:\n`;
                changeLogContent += `  Original Size: ${file.originalSize} bytes\n`;
                changeLogContent += `  Optimized Size: ${file.optimizedSize} bytes\n`;
                changeLogContent += `  Space Saved: ${file.spaceSaved} bytes (${file.compressionRatio}%)\n`;
            });
            changeLogContent += '\n';
        }

        if (this.changeLog.jsFiles.processed.length > 0) {
            changeLogContent += 'JAVASCRIPT FILES PROCESSED:\n';
            changeLogContent += '---------------------------\n';
            this.changeLog.jsFiles.processed.forEach(script => {
                changeLogContent += `- ${script}\n`;
            });
            changeLogContent += '\n';
        }

        if (this.changeLog.jsFiles.minified.length > 0) {
            changeLogContent += 'JAVASCRIPT MINIFICATION DETAILS:\n';
            changeLogContent += '--------------------------------\n';
            this.changeLog.jsFiles.minified.forEach(file => {
                changeLogContent += `- ${file.filename}:\n`;
                changeLogContent += `  Original Size: ${file.originalSize} bytes\n`;
                changeLogContent += `  Minified Size: ${file.minifiedSize} bytes\n`;
                changeLogContent += `  Space Saved: ${file.spaceSaved} bytes (${file.compressionRatio}%)\n`;
                changeLogContent += `  Variables Renamed: ${file.variablesRenamed}\n`;
            });
            changeLogContent += '\n';
        }

        if (this.changeLog.jsFiles.downloaded.length > 0) {
            changeLogContent += 'EXTERNAL SCRIPTS DOWNLOADED:\n';
            changeLogContent += '----------------------------\n';
            this.changeLog.jsFiles.downloaded.forEach(download => {
                changeLogContent += `- ${download.url}\n`;
                changeLogContent += `  Size: ${download.size} bytes\n`;
                changeLogContent += `  Downloaded: ${download.timestamp}\n`;
            });
            changeLogContent += '\n';
        }

        if (this.changeLog.jsFiles.critical.length > 0) {
            changeLogContent += 'CRITICAL SCRIPTS PRESERVED:\n';
            changeLogContent += '---------------------------\n';
            this.changeLog.jsFiles.critical.forEach(script => {
                changeLogContent += `- ${script}\n`;
            });
            changeLogContent += '\n';
        }

        if (this.changeLog.variables.renamed.size > 0) {
            changeLogContent += 'VARIABLE RENAMES:\n';
            changeLogContent += '----------------\n';
            this.changeLog.variables.renamed.forEach((info, oldName) => {
                changeLogContent += `- ${oldName} -> ${info.newName} (in ${info.file})\n`;
            });
            changeLogContent += '\n';
        }

        if (this.changeLog.variables.preserved.length > 0) {
            changeLogContent += 'VARIABLES PRESERVED:\n';
            changeLogContent += '-------------------\n';
            this.changeLog.variables.preserved.forEach(variable => {
                changeLogContent += `- ${variable.variable} (${variable.reason}) in ${variable.file}\n`;
            });
            changeLogContent += '\n';
        }

        if (this.changeLog.assets.renamed.length > 0 || this.changeLog.jsFiles.minified.length > 0) {
            changeLogContent += 'ASSET AND JAVASCRIPT RENAMES:\n';
            changeLogContent += '----------------------------\n';

            this.changeLog.assets.renamed.forEach(asset => {
                changeLogContent += `- [ASSET] ${asset.originalPath} -> ${asset.newPath}\n`;
            });

            this.changeLog.jsFiles.minified.forEach(file => {
                changeLogContent += `- [JS] ${file.filename} -> ${path.basename(file.filename)}\n`;
            });

            changeLogContent += '\n';
        }

        if (this.changeLog.assets.skipped.length > 0) {
            changeLogContent += 'ASSETS SKIPPED:\n';
            changeLogContent += '--------------\n';
            this.changeLog.assets.skipped.forEach(asset => {
                changeLogContent += `- ${asset.filename}\n`;
                changeLogContent += `  Reason: ${asset.reason}\n`;
                changeLogContent += `  Skipped: ${asset.timestamp}\n`;
            });
            changeLogContent += '\n';
        }

        if (this.changeLog.assets.directories.length > 0) {
            changeLogContent += 'DIRECTORIES COPIED:\n';
            changeLogContent += '------------------\n';
            this.changeLog.assets.directories.forEach(dir => {
                changeLogContent += `- ${dir}\n`;
            });
            changeLogContent += '\n';
        }

        if (this.changeLog.references.updated.length > 0) {
            changeLogContent += 'REFERENCE UPDATES:\n';
            changeLogContent += '-----------------\n';
            this.changeLog.references.updated.forEach(update => {
                changeLogContent += `- File: ${update.file}\n`;
                changeLogContent += `  Updated: ${update.timestamp}\n`;
                changeLogContent += `  References updated:\n`;
                update.references.forEach(ref => {
                    changeLogContent += `    ${ref.original} -> ${ref.new} (${ref.type})\n`;
                });
            });
            changeLogContent += '\n';
        }

        if (this.changeLog.jsFiles.errors.length > 0) {
            changeLogContent += 'JAVASCRIPT ERRORS:\n';
            changeLogContent += '-----------------\n';
            this.changeLog.jsFiles.errors.forEach(error => {
                changeLogContent += `- ${error.filename}: ${error.error}\n`;
                changeLogContent += `  Time: ${error.timestamp}\n`;
            });
            changeLogContent += '\n';
        }

        if (this.changeLog.warnings.length > 0) {
            changeLogContent += 'WARNINGS:\n';
            changeLogContent += '--------\n';
            this.changeLog.warnings.forEach(warning => {
                changeLogContent += `- ${warning}\n`;
            });
            changeLogContent += '\n';
        }

        if (this.changeLog.errors.length > 0) {
            changeLogContent += 'ERRORS:\n';
            changeLogContent += '------\n';
            this.changeLog.errors.forEach(error => {
                changeLogContent += `- ${error}\n`;
            });
            changeLogContent += '\n';
        }

        changeLogContent += '====================================\n';
        changeLogContent += '          END OF CHANGELOG\n';
        changeLogContent += '====================================\n';

        fs.writeFileSync(changeLogPath, changeLogContent);
        return changeLogPath;
    }
}

if (require.main === module) {
    const builder = new NoSkidBuilder();
    builder.build().catch(error => {
        log(`Build failed: ${error.message}`, 'error');
        console.error(error);
        process.exit(1);
    });
}

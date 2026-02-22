// Achievement.js | Achievement system for noskid with achievements tracking

let validAchievements = [];
let currentUserId = null;

function spawnAchievementSystem(event) {
    try {
        event.preventDefault();
    } catch (e) { }

    const achievementwin = ClassicWindow.createWindow({
        title: 'Achievements',
        width: 600,
        height: 450,
        x: Math.round((window.innerWidth - 600) / 2),
        y: Math.round((window.innerHeight - 450) / 2),
        content: `
            <div class="achievements-container">
                <div class="achievements-explanation">
                    <p>Achievements are special goals you can complete while using NoSkid. By completing them, you can elevate your NoSkid certificate score to the given percentage of each achievement.</p>
                </div>
                <div class="achievements-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading achievements...</p>
                </div>
            </div>
        `,
        theme: 'dark',
        resizable: false,
    });
    addAchievementSystemStyles();
    loadAchievements(achievementwin);
    return achievementwin;
}

function addAchievementSystemStyles() {
    if (document.getElementById('achievement-system-styles')) return;

    const style = document.createElement('style');
    style.id = 'achievement-system-styles';
    style.textContent = `
        .achievements-container {
            padding: 15px;
            background: #1a1a1a;
            color: #e0e0e0;
            height: 100%;
            overflow-y: auto;
            box-sizing: border-box;
        }

        .achievements-explanation {
            background: #252525;
            border: 1px solid #404040;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 15px;
            font-size: 14px;
            line-height: 1.5;
            text-align: center;
        }

        .achievements-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: calc(100% - 80px);
            color: #888;
        }

        .loading-spinner {
            width: 24px;
            height: 24px;
            border: 2px solid #333;
            border-top: 2px solid #007acc;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .achievement-item {
            background: #2d2d2d;
            border: 1px solid #404040;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 12px;
            transition: all 0.2s ease;
            position: relative;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .achievement-item:hover {
            border-color: #007acc;
            box-shadow: 0 2px 8px rgba(0, 122, 204, 0.2);
        }

        .achievement-item.completed {
            border-color: #28a745;
            background: #1a2e1a;
        }

        .achievement-item.completed:hover {
            border-color: #28a745;
            box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
        }

        .achievement-icon {
            width: 32px;
            height: 32px;
            flex-shrink: 0;
            filter: brightness(0.6);
            transition: filter 0.2s ease;
        }

        .achievement-item.completed .achievement-icon {
            filter: brightness(1.2) sepia(1) saturate(3) hue-rotate(45deg) contrast(1.1);
        }

        .achievement-content {
            flex: 1;
            min-width: 0;
        }

        .achievement-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            gap: 10px;
        }

        .achievement-name {
            font-weight: bold;
            color: #007acc;
            font-size: 16px;
            margin: 0;
        }

        .achievement-item.completed .achievement-name {
            color: #28a745;
        }

        .achievement-percent {
            background: #007acc;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            flex-shrink: 0;
        }

        .achievement-item.completed .achievement-percent {
            background: #28a745;
        }

        .achievement-description {
            color: #ccc;
            line-height: 1.4;
            margin: 0;
            font-size: 14px;
        }

        .no-achievements {
            text-align: center;
            color: #888;
            padding: 40px 20px;
            font-style: italic;
        }

        .no-achievements .icon {
            font-size: 48px;
            margin-bottom: 10px;
            opacity: 0.5;
        }

        .error-message {
            background: #4a1a1a;
            border: 1px solid #8b0000;
            border-radius: 4px;
            padding: 15px;
            color: #ff6b6b;
            text-align: center;
        }

        .retry-btn {
            background: #007acc;
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
            transition: background 0.2s ease;
        }

        .retry-btn:hover {
            background: #0056b3;
        }

        .achievement-stats {
            background: #2d2d2d;
            border: 1px solid #404040;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-around;
            text-align: center;
        }

        .stat-item {
            flex: 1;
        }

        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #007acc;
            display: block;
        }

        .stat-label {
            font-size: 12px;
            color: #888;
            text-transform: uppercase;
            margin-top: 4px;
        }

        .progress-bar {
            background: #404040;
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }

        .progress-fill {
            background: #007acc;
            height: 100%;
            transition: width 0.3s ease;
        }

        .achievements-container::-webkit-scrollbar {
            width: 8px;
        }

        .achievements-container::-webkit-scrollbar-track {
            background: #1a1a1a;
        }

        .achievements-container::-webkit-scrollbar-thumb {
            background: #404040;
            border-radius: 4px;
        }

        .achievements-container::-webkit-scrollbar-thumb:hover {
            background: #555;
        }

        .achievement-item.newly-completed {
            animation: achievementPulse 0.6s ease-out;
        }

        @keyframes achievementPulse {
            0% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
            }
            50% {
                transform: scale(1.02);
                box-shadow: 0 0 0 10px rgba(40, 167, 69, 0);
            }
            100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
            }
        }
    `;

    document.head.appendChild(style);
}

function getUserId() {
    try {
        return localStorage.getItem('achievementsUser');
    } catch (error) {
        log('Error reading user ID from localStorage: ' + error.message, 'error');
        return null;
    }
}

function saveUserId(userId) {
    try {
        localStorage.setItem('achievementsUser', userId);
        currentUserId = userId;
    } catch (error) {
        log('Error saving user ID to localStorage: ' + error.message, 'error');
    }
}

function loadAchievements(achievementwin) {
    const userId = getUserId();

    let url = '/api/achievement/?action=get';
    if (userId) {
        url += `&id=${encodeURIComponent(userId)}`;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network error when fetching achievements');
            }
            return response.json();
        })
        .then(data => {
            if (data.status && data.data && Array.isArray(data.data.achievements)) {
                validAchievements = data.data.achievements;
                currentUserId = data.data.userId;

                saveUserId(data.data.userId);

                displayAchievements(achievementwin, data.data.achievements);
            } else {
                throw new Error('Invalid data format or API error');
            }
        })
        .catch(error => {
            showError(achievementwin, error.message);
            log('Error loading achievements: ' + error.message, 'error');
        });
}

function showError(achievementwin, errorMessage) {
    const errorContent = document.createElement('div');
    errorContent.className = 'achievements-container';
    errorContent.innerHTML = `
        <div class="achievements-explanation">
            <p>Achievements are special goals you can complete while using NoSkid. By completing them, you can elevate your NoSkid certificate score to the given percentage of each achievement.</p>
        </div>
        <div class="error-message">
            <p>Error loading achievements: ${errorMessage}</p>
            <button class="retry-btn">Retry</button>
        </div>
    `;
    updateAchievements(achievementwin, errorContent);
    const retryBtn = errorContent.querySelector('.retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => loadAchievements(achievementwin));
    }
}

function displayAchievements(window, achievements) {
    const container = document.createElement('div');
    container.className = 'achievements-container';

    const explanationHTML = `
        <div class="achievements-explanation">
            <p>Achievements are special goals you can complete while using NoSkid. By completing them, you can elevate your NoSkid certificate score to the given percentage of each achievement.</p>
        </div>
    `;

    if (achievements.length === 0) {
        container.innerHTML = `
            ${explanationHTML}
            <div class="no-achievements">
                <p>No achievements available at the moment.</p>
            </div>
        `;
        updateAchievements(window, container);
        return;
    }

    const completedCount = achievements.filter(achievement => achievement.done).length;
    const totalPercent = achievements.reduce((sum, achievement) =>
        sum + (achievement.done ? achievement.percent : 0), 0
    );

    const statsHTML = `
        <div class="achievement-stats">
            <div class="stat-item">
                <span class="stat-number">${completedCount}</span>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-item">
                <span class="stat-number">${achievements.length}</span>
                <div class="stat-label">Total</div>
            </div>
            <div class="stat-item">
                <span class="stat-number">${totalPercent}%</span>
                <div class="stat-label">+ Certificate</div>
            </div>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${(completedCount / achievements.length) * 100}%"></div>
        </div>
    `;

    const achievementsHTML = achievements.map(achievement => {
        return `
        <div class="achievement-item ${achievement.done ? 'completed' : ''}" data-name="${achievement.name}">
            <img src="assets/img/star-fill.svg" alt="Star" class="achievement-icon">
            <div class="achievement-content">
                <div class="achievement-header">
                    <h3 class="achievement-name">${escapeHtml(achievement.name)}</h3>
                    <span class="achievement-percent">+${achievement.percent}%</span>
                </div>
                <p class="achievement-description">${escapeHtml(achievement.description)}</p>
            </div>
        </div>
        `;
    }).join('');

    container.innerHTML = explanationHTML + statsHTML + achievementsHTML;
    updateAchievements(window, container);
    log('Achievements loaded successfully', 'success');
}

function updateAchievements(window, content) {
    if (content instanceof HTMLElement) {
        ClassicWindow.updateWindowContent(window, content);
    } else {
        const newContent = document.createElement('div');
        newContent.innerHTML = content;
        ClassicWindow.updateWindowContent(window, newContent);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function isValidAchievement(achievementName) {
    return validAchievements.some(achievement => achievement.name === achievementName);
}

function startAchievement(achievementName) {
    if (!isValidAchievement(achievementName)) {
        log(`Achievement "${achievementName}" is not valid or not provided by the API`, 'warning');
        return false;
    }

    const userId = getUserId();
    if (!userId) {
        log('Cannot start achievement: User ID not available', 'error');
        return false;
    }

    const url = `/api/achievement/?action=start&name=${encodeURIComponent(achievementName)}&id=${encodeURIComponent(userId)}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network error when starting achievement');
            }
            return response.json();
        })
        .then(data => {
            if (data.status) {
                //log(`Achievement "${achievementName}" started successfully`, 'success');
            } else {
                log(`Error starting achievement "${achievementName}": ${data.message || 'Unknown error'}`, 'error');
            }
        })
        .catch(error => {
            log(`Failed to start achievement "${achievementName}": ${error.message}`, 'error');
        });
}


function addAchievement(achievementName) {
    if (!isValidAchievement(achievementName)) {
        log(`Achievement "${achievementName}" is not valid or not provided by the API`, 'warning');
        return false;
    }

    const userId = getUserId();
    if (!userId || !currentUserId) {
        log('Cannot add achievement: User ID not available', 'error');
        return false;
    }

    const currentAchievement = validAchievements.find(a => a.name === achievementName);
    if (currentAchievement && currentAchievement.done) {
        return false;
    }

    // validate with server
    const url = `/api/achievement/?action=done&name=${encodeURIComponent(achievementName)}&id=${encodeURIComponent(currentUserId)}`;

    fetch(url)
        .then(async response => {
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                // If server provided a message, use it
                if (data && data.message) {
                    throw new Error(data.message);
                }

                throw new Error('Network error when marking achievement as done');
            }

            return data;
        })
        .then(data => {
            if (data.status) {
                const achievement = validAchievements.find(a => a.name === achievementName);
                if (achievement) {
                    achievement.done = true;
                }

                updateOpenAchievementWindows();
                showAchievementNotification(achievementName);
                log(`Achievement "${achievementName}" completed!`, 'success');

                checkAllAchievementsCompleted();
            } else {
                throw new Error(data.message || data.error || 'Unknown error');
            }
        })
        .catch (error => {
        log(`Error marking achievement "${achievementName}" as done: ${error.message}`, 'error');
    });

    return true;
}

function getCompletedAchievements() {
    return validAchievements.filter(achievement => achievement.done).map(achievement => achievement.name);
}

function getAchievementsWithStatus() {
    const userId = getUserId();

    let url = '/api/achievement/?action=get';
    if (userId) {
        url += `&id=${encodeURIComponent(userId)}`;
    }

    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network error when fetching achievements');
            }
            return response.json();
        })
        .then(data => {
            if (data.status && data.data && Array.isArray(data.data.achievements)) {
                validAchievements = data.data.achievements;
                currentUserId = data.data.userId;

                saveUserId(data.data.userId);

                return data.data.achievements.map(achievement => ({
                    ...achievement,
                    completed: achievement.done
                }));
            } else {
                throw new Error('Invalid data format or API error');
            }
        });
}

function updateOpenAchievementWindows() {
    const allWindows = ClassicWindow.getAllWindows();
    allWindows.forEach(win => {
        const titleElement = win.querySelector('.c-t');
        if (titleElement && titleElement.textContent === 'Achievements') {
            loadAchievements(win);
        }
    });
}

function clearAllAchievements() {
    localStorage.removeItem('achievementsUser');
    currentUserId = null;
    validAchievements = [];
    updateOpenAchievementWindows();
    log('User session cleared - achievements reset', 'success');
}

function getAchievementStats() {
    return getAchievementsWithStatus()
        .then(achievements => {
            const completed = achievements.filter(a => a.completed);
            const totalPercent = completed.reduce((sum, a) => sum + a.percent, 0);
            return {
                total: achievements.length,
                completed: completed.length,
                completionRate: achievements.length > 0 ? (completed.length / achievements.length) * 100 : 0,
                totalPercent: totalPercent,
                userId: currentUserId
            };
        });
}

function showAchievementNotification(achievementName) {
    showNotification(`<a onclick="spawnAchievementSystem();"><strong>${achievementName}</strong>: Achievement completed!</a>`);
}

function getValidAchievementNames() {
    return validAchievements.map(achievement => achievement.name);
}

function getTotalPercent() {
    return validAchievements
        .filter(achievement => achievement.done)
        .reduce((sum, achievement) => sum + achievement.percent, 0);
}

async function preloadAchievements() {
    const userId = getUserId();

    let url = '/api/achievement/?action=get';
    if (userId) {
        url += `&id=${encodeURIComponent(userId)}`;
    }

    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network error when fetching achievements');
            }
            return response.json();
        })
        .then(data => {
            if (data.status && data.data && Array.isArray(data.data.achievements)) {
                validAchievements = data.data.achievements;
                currentUserId = data.data.userId;

                saveUserId(data.data.userId);

                log('Achievements preloaded successfully', 'success');
                return data.data.achievements;
            } else {
                throw new Error('Invalid data format or API error');
            }
        })
        .catch(error => {
            log('Error preloading achievements: ' + error.message, 'error');
            return [];
        });
}

function checkAllAchievementsCompleted() {
    const achievementsToCheck = validAchievements.filter(achievement => achievement.name !== "Legendary NoSkid");
    const allCompleted = achievementsToCheck.every(achievement => achievement.done);

    const legendaryAchievement = validAchievements.find(achievement => achievement.name === "Legendary NoSkid");

    if (allCompleted && legendaryAchievement && !legendaryAchievement.done) {
        addAchievement("Legendary NoSkid");
    }
}

(async function () {
    await preloadAchievements();
})();


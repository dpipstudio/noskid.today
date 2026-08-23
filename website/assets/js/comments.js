//Comments.js | Comment system for noskid

let skidguardToken = null;
let skidguardWidgetId = null;
let certificateData = null;
let skippedCert = false;
let currentUsername = localStorage.getItem('commentsUsername');
let allUsernames = [];

function spawnCommentSystem(event) {
    event.preventDefault();
    scrollToTop();

    startAchievement('Super Commenter');

    const commentwin = ClassicWindow.createWindow({
        title: 'Comments',
        width: 500,
        height: 400,
        x: Math.round((window.innerWidth - 500) / 2),
        y: Math.round((window.innerHeight - 400) / 2),
        content: `<div class="comments-loading">
            <div class="loading-spinner"></div>
            <p>Loading comments...</p>
        </div>`,
        theme: 'dark',
        resizable: false,
    });

    let footer = commentwin.querySelector('.window-footer');
    if (!footer) {
        footer = document.createElement('div');
        footer.className = 'window-footer';
        commentwin.appendChild(footer);
    }

    const footerControls = document.createElement('div');
    footerControls.className = 'footer-controls';
    footerControls.innerHTML = `
        <div class="footer-text">
            <a href="#" class="new-comment-link">Write a new comment</a>
        </div>
        <div class="filter-checkbox">
            <input type="checkbox" class="achievement-checkbox" id="verifiedFilter" checked>
            <label for="verifiedFilter">Verified only</label>
        </div>
    `;
    footer.prepend(footerControls);

    const newCommentLink = footerControls.querySelector('.new-comment-link');
    newCommentLink.addEventListener('click', (e) => {
        e.preventDefault();
        spawnNewCommentForm();
    });

    const verifiedFilterCheckbox = footerControls.querySelector('#verifiedFilter');
    verifiedFilterCheckbox.addEventListener('change', () => {
        if (commentwin.commentsData) {
            displayComments(commentwin, commentwin.commentsData, verifiedFilterCheckbox.checked);
        }
    });

    addCommentSystemStyles();

    loadComments(commentwin);
    return commentwin;
}

function addCommentSystemStyles() {
    if (document.getElementById('comment-system-styles')) return;

    const style = document.createElement('style');
    style.id = 'comment-system-styles';
    style.textContent = `
        .comments-container {
            padding: 20px;
            background: var(--primary);
            color: var(--text);
            height: 100%;
            overflow-y: auto;
            box-sizing: border-box;
        }

        .comments-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--subtext);
        }

        .loading-spinner {
            width: 24px;
            height: 24px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-top: 2px solid var(--secondary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .comment {
            background: var(--box);
            border: var(--border);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 10px;
            transition: border-color 0.2s ease;
        }

        .comment:hover {
            border-color: rgba(255, 255, 255, 0.15);
        }

        .comment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            position: relative;
        }

        .comment-author {
            font-weight: 600;
            color: var(--secondary);
            font-size: 13px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .verified-badge {
            display: inline-flex;
            align-items: center;
            background: transparent;
            color: var(--secondary);
            padding: 0;
            margin-left: 4px;
            font-size: 13px;
        }

        .comment-date {
            color: var(--subtext);
            font-size: 11px;
            opacity: 0.7;
        }

        .comment-content {
            line-height: 1.5;
            margin: 10px 0;
            color: var(--text);
            word-wrap: break-word;
            font-size: 14px;
        }

        .comment-actions {
            display: flex;
            gap: 8px;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            align-items: center;
        }

        .reaction-btn, .reply-btn, .toggle-replies-btn {
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--subtext);
            padding: 4px 10px;
            margin: 0;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .reaction-btn:hover, .reply-btn:hover, .toggle-replies-btn:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.2);
        }

        .reaction-btn.active {
            background: rgba(137, 180, 250, 0.15);
            border-color: var(--secondary);
            color: var(--secondary);
        }

        .reaction-btn:disabled, .reply-btn:disabled, .toggle-replies-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        .toggle-replies-btn {
            color: var(--secondary);
            font-weight: 500;
        }

        .comment-replies {
            margin-top: 12px;
            padding-left: 20px;
            border-left: 2px solid rgba(255, 255, 255, 0.08);
        }

        .comment-replies .comment {
            margin-bottom: 8px;
        }

        .comment-replies .comment:last-child {
            margin-bottom: 0;
        }

        .no-comments {
            text-align: center;
            color: var(--subtext);
            padding: 60px 20px;
            font-style: italic;
        }

        .error-message {
            background: rgba(255, 102, 102, 0.1);
            border: 1px solid rgba(255, 102, 102, 0.3);
            border-radius: 4px;
            padding: 15px;
            color: #ff6666;
            text-align: center;
        }

        .retry-btn {
            background: var(--secondary);
            border: none;
            color: #1a1a1a;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
            transition: background 0.2s ease;
            font-weight: 600;
        }

        .retry-btn:hover {
            background: color-mix(in srgb, var(--secondary) 70%, black 30%);
        }

        .footer-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            gap: 15px;
        }

        .footer-text {
            flex: 1;
            text-align: left;
            color: var(--text);
            font-size: 13px;
        }

        .new-comment-link {
            color: var(--secondary);
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .new-comment-link:hover {
            color: var(--text);
        }

        .filter-checkbox {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--subtext);
            white-space: nowrap;
        }

        .filter-checkbox label {
            cursor: pointer;
            user-select: none;
        }

        .comment-form {
            padding: 20px;
            background: var(--primary);
            color: var(--text);
        }

        .form-group {
            margin-bottom: 15px;
            position: relative;
        }

        .form-group label {
            display: block;
            margin-bottom: 6px;
            color: var(--text);
            font-weight: 600;
            font-size: 13px;
        }

        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 10px;
            background: var(--box);
            border: var(--border);
            border-radius: 4px;
            color: var(--text);
            font-family: inherit;
            box-sizing: border-box;
            font-size: 14px;
        }

        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--secondary);
            background: rgba(137, 180, 250, 0.05);
        }

        .form-group textarea {
            resize: vertical;
            min-height: 100px;
        }

        .form-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
        }

        .form-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s ease;
            margin: 0;
        }

        .form-btn.primary {
            background: var(--secondary);
            color: #1a1a1a;
        }

        .form-btn.primary:hover {
            background: color-mix(in srgb, var(--secondary) 70%, black 30%);
        }

        .form-btn.secondary {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text);
        }

        .form-btn.secondary:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .form-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .reply-info {
            background: rgba(137, 180, 250, 0.1);
            border: 1px solid rgba(137, 180, 250, 0.3);
            border-radius: 4px;
            padding: 8px 12px;
            margin-bottom: 15px;
            font-size: 12px;
            color: var(--text);
        }

        .reply-info strong {
            color: var(--secondary);
        }

        .warning-message {
            background: rgba(255, 165, 0, 0.1);
            border: 1px solid rgba(255, 165, 0, 0.3);
            border-radius: 4px;
            padding: 10px 12px;
            margin-bottom: 15px;
            font-size: 12px;
            color: #ffb366;
        }

        .no-cert-link {
            color: var(--secondary);
            text-decoration: none;
            font-size: 12px;
            transition: color 0.2s ease;
        }

        .no-cert-link:hover {
            color: var(--text);
            text-decoration: underline;
        }

        .verify-step {
            text-align: center;
            padding: 20px;
        }

        .comments-container::-webkit-scrollbar {
            width: 8px;
        }

        .comments-container::-webkit-scrollbar-track {
            background: var(--primary);
        }

        .comments-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        }

        .comments-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .comment-mention {
            background: rgba(137, 180, 250, 0.2);
            border-radius: 3px;
            padding: 0 3px;
            font-weight: 600;
            color: var(--secondary);
        }

        .comment-mention.mention-you {
            background: rgba(255, 215, 0, 0.2);
            color: #ffd700;
        }

        .comment-mention-icon {
            color: #ffd700;
            font-size: 14px;
            margin-right: 4px;
            font-weight: bold;
        }

        .mentions-dropdown {
            position: absolute;
            bottom: 100%;
            left: 0;
            right: 0;
            background: var(--box);
            border: var(--border);
            border-radius: 4px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            margin-bottom: 5px;
        }

        .mentions-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .mentions-list li {
            padding: 8px 12px;
            cursor: pointer;
            color: var(--text);
        }

        .mentions-list li:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .mentions-list li.active {
            background: rgba(137, 180, 250, 0.2);
        }

        .comment-link, .comment-link:visited {
            color: var(--secondary);
            text-decoration: none;
            word-break: break-all;
            transition: color 0.2s ease;
            border-bottom: 1px solid rgba(137, 180, 250, 0.3);
        }

        .comment-link:hover {
            color: var(--text);
            border-bottom-color: var(--text);
        }

        #skidguard-captcha {
            padding: 10px 0;
            display: flex;
            justify-content: center;
        }
    `;

    document.head.appendChild(style);
}

function loadComments(commentwin) {
    fetch('/api/comments/')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network error when fetching comments');
            }
            return response.json();
        })
        .then(data => {
            if (Array.isArray(data)) {
                // Store full data on window for filtering
                commentwin.commentsData = data;

                // Get current filter state
                const verifiedFilter = commentwin.querySelector('#verifiedFilter');
                const showVerifiedOnly = verifiedFilter ? verifiedFilter.checked : true;

                allUsernames = [...new Set(data.map(cmt => cmt.author))];

                displayComments(commentwin, data, showVerifiedOnly);
            } else {
                throw new Error('Invalid data format');
            }
        })
        .catch(error => {
            const errorContent = document.createElement('div');
            errorContent.className = 'comments-container';
            errorContent.innerHTML = `
                <div class="error-message">
                    <p>Error loading comments: ${error.message}</p>
                    <button class="retry-btn">Retry</button>
                </div>
            `;

            updateComments(commentwin, errorContent);

            const retryBtn = errorContent.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => loadComments(commentwin));
            }

            log('Error loading comments: ' + error.message, 'error');
        });
}

function filterComments(comments, showVerifiedOnly) {
    if (!showVerifiedOnly) {
        return comments;
    }

    return comments.filter(comment => {
        if (!comment.is_verified) {
            return false;
        }
        // Recursively filter replies
        if (comment.replies && comment.replies.length > 0) {
            comment.replies = filterComments(comment.replies, showVerifiedOnly);
        }
        return true;
    });
}

function renderComment(comment, parentAuthor = null, showVerifiedBadge = true) {
    const userLiked = comment.user_reaction === 'like';
    const userDisliked = comment.user_reaction === 'dislike';
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isVerified = comment.is_verified;
    const mentionsUser = currentUsername && comment.content.includes(`@${currentUsername}`);

    const displayAuthor = parentAuthor
        ? `${comment.author || 'Anonymous'} → ${parentAuthor}`
        : (comment.author || 'Anonymous');

    // Show badge only if: 1) comment is verified AND 2) we're showing unverified comments (so badge is needed)
    const verifiedBadge = isVerified && showVerifiedBadge
        ? '<span class="verified-badge">✓</span>'
        : '';

    // Add @ if user is mentioned
    const mentionIcon = mentionsUser
        ? '<span class="comment-mention-icon">@</span>'
        : '';

    let content = detectAndLinkify(comment.content);

    if (currentUsername && allUsernames.includes(currentUsername)) {
        const userMentionRegex = new RegExp(`@${currentUsername}(?=\\s|$|[.,;:!?)])`, 'g');
        content = content.replace(userMentionRegex, `<span class="comment-mention mention-you">@${currentUsername}</span>`);
    }

    const otherMentionRegex = /@(\w+)(?=\s|$|[.,;:!?)])/g;
    content = content.replace(otherMentionRegex, (match, username) => {
        if (currentUsername && username === currentUsername) {
            return match;
        }
        if (allUsernames.includes(username)) {
            return `<span class="comment-mention">@${username}</span>`;
        }
        return match;
    });

    let html = `
        <div class="comment" data-id="${comment.id}">
            <div class="comment-header">
                <span class="comment-author">${mentionIcon}${displayAuthor}${verifiedBadge}</span>
                <span class="comment-date">${formatDate(comment.date)}</span>
            </div>
            <div class="comment-content">${content}</div>
            <div class="comment-actions">
                <button class="reaction-btn ${userLiked ? 'active' : ''}" 
                        onclick="handleReaction(${comment.id}, '${userLiked ? 'none' : 'like'}')">
                    ↑ ${comment.likes || 0}
                </button>
                <button class="reaction-btn ${userDisliked ? 'active' : ''}" 
                        onclick="handleReaction(${comment.id}, '${userDisliked ? 'none' : 'dislike'}')">
                    ↓ ${comment.dislikes || 0}
                </button>
                <button class="reply-btn" onclick="spawnReplyForm(${comment.id}, \"${(comment.author || 'Anonymous').replace(/'/g, "\\'")}\")">
                    Reply
                </button>
                ${hasReplies ? `
                    <button class="toggle-replies-btn" onclick="toggleReplies(${comment.id})">
                        ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'} ▼
                    </button>
                ` : ''}
            </div>
            ${hasReplies ? `
                <div class="comment-replies" id="replies-${comment.id}" style="display: none;">
                    ${comment.replies.map(reply => renderComment(reply, comment.author || 'Anonymous', showVerifiedBadge)).join('')}
                </div>
            ` : ''}
        </div>
    `;

    return html;
}

function displayComments(window, comments, showVerifiedOnly = true) {
    const container = document.createElement('div');
    container.className = 'comments-container';

    const filteredComments = filterComments(JSON.parse(JSON.stringify(comments)), showVerifiedOnly);

    if (filteredComments.length === 0) {
        const message = showVerifiedOnly
            ? 'No verified comments yet. Uncheck "Verified only" to see all comments.'
            : 'No comments yet. Be the first to comment!';

        container.innerHTML = `
            <div class="no-comments">
                <p>${message}</p>
            </div>
        `;
        updateComments(window, container);
        return;
    }

    const showBadge = !showVerifiedOnly;
    const commentsHTML = filteredComments.map(comment => renderComment(comment, null, showBadge)).join('');
    container.innerHTML = commentsHTML;
    updateComments(window, container);
    log('Comments loaded successfully', 'success');
}

function toggleReplies(commentId) {
    const repliesContainer = document.getElementById(`replies-${commentId}`);
    const toggleBtn = document.querySelector(`.comment[data-id="${commentId}"] .toggle-replies-btn`);

    if (repliesContainer.style.display === 'none') {
        repliesContainer.style.display = 'block';
        toggleBtn.innerHTML = toggleBtn.innerHTML.replace('▼', '▲');
    } else {
        repliesContainer.style.display = 'none';
        toggleBtn.innerHTML = toggleBtn.innerHTML.replace('▲', '▼');
    }
}

function updateComments(window, content) {
    if (content instanceof HTMLElement) {
        ClassicWindow.updateWindowContent(window, content);
    } else {
        const newContent = document.createElement('div');
        newContent.innerHTML = content;
        ClassicWindow.updateWindowContent(window, newContent);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown date';

    return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function handleReaction(commentId, reactionType) {
    const commentElement = document.querySelector(`.comment[data-id="${commentId}"]`);
    if (!commentElement) return;

    const buttons = commentElement.querySelectorAll('.reaction-btn, .reply-btn, .toggle-replies-btn');
    buttons.forEach(btn => btn.disabled = true);

    fetch(`/api/comments/?action=${reactionType}&id=${commentId}`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Error handling reaction');
                });
            }
            return response.json();
        })
        .then(data => {
            const likeBtns = commentElement.querySelectorAll('.reaction-btn');
            const likeBtn = likeBtns[0];
            const dislikeBtn = likeBtns[1];

            likeBtn.innerHTML = `↑ ${data.likes || 0}`;
            dislikeBtn.innerHTML = `↓ ${data.dislikes || 0}`;

            likeBtn.classList.toggle('active', data.user_reaction === 'like');
            dislikeBtn.classList.toggle('active', data.user_reaction === 'dislike');

            likeBtn.setAttribute('onclick', `handleReaction(${commentId}, '${data.user_reaction === 'like' ? 'none' : 'like'}')`);
            dislikeBtn.setAttribute('onclick', `handleReaction(${commentId}, '${data.user_reaction === 'dislike' ? 'none' : 'dislike'}')`);

            log('Reaction updated successfully', 'success');
        })
        .catch(error => {
            alert('Error: ' + error.message);
            log('Error handling reaction: ' + error.message, 'error');
        })
        .finally(() => {
            buttons.forEach(btn => btn.disabled = false);
        });
}

function spawnNewCommentForm(replyTo = null, replyToAuthor = null) {
    const isReply = replyTo !== null;
    const title = isReply ? 'Reply to Comment' : 'New Comment';

    // Reset state
    skidguardToken = null;
    certificateData = null;
    skippedCert = false;

    const newCommentWin = ClassicWindow.createWindow({
        title: title,
        width: 450,
        height: isReply ? 420 : 380,
        x: Math.round((window.innerWidth - 450) / 2),
        y: Math.round((window.innerHeight - (isReply ? 420 : 380)) / 2),
        content: `
            <div class="comment-form">
                ${isReply ? `
                    <div class="reply-info">
                        Replying to <strong>${replyToAuthor}</strong>
                    </div>
                ` : ''}
                
                <div id="verifyStep" class="verify-step">
                    <p style="margin-bottom: 10px;">Please complete the verification:</p>
                    <div id="skidguard-captcha"></div>
                    <p style="margin-top: 10px;">
                        <a href="#" id="noCertLink" class="no-cert-link">I don't have a certificate</a>
                    </p>
                </div>

                <form id="commentForm" style="display: none;">
                    <div id="warningMessage"></div>
                    
                    <div class="form-group">
                        <label for="author">Your name:</label>
                        <input type="text" id="author" placeholder="Anonymous" readonly>
                    </div>
                    <div class="form-group">
                        <label for="content">Comment:</label>
                        <textarea id="content" required rows="5" placeholder="Write your comment here..."></textarea>
                        <div class="mentions-dropdown" style="display: none;">
                            <ul class="mentions-list"></ul>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="form-btn secondary cancel">Cancel</button>
                        <button type="submit" class="form-btn primary">Send ${isReply ? 'Reply' : 'Comment'}</button>
                    </div>
                </form>
            </div>
        `,
        theme: 'dark',
        resizable: false,
        statusText: isReply ? 'Writing a reply' : 'Writing a new comment',
        onclose: () => {
            skidguardToken = null;
            certificateData = null;
            skippedCert = false;
            if (skidguardWidgetId !== null) {
                skidguard.reset(skidguardWidgetId);
            }
        }
    });

    setupMentionsAutocomplete(newCommentWin);

    const form = newCommentWin.querySelector('#commentForm');
    const verifyStep = newCommentWin.querySelector('#verifyStep');
    const authorInput = newCommentWin.querySelector('#author');
    const warningMessage = newCommentWin.querySelector('#warningMessage');

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitComment(form, newCommentWin, replyTo);
    });

    // Cancel button
    const cancelBtn = newCommentWin.querySelector('.cancel');
    cancelBtn.addEventListener('click', () => {
        ClassicWindow.closeWindow(newCommentWin);
    });

    // Initialize SkidGuard
    skidguardWidgetId = skidguard.render('#skidguard-captcha', {
        size: 'normal',
        theme: 'dark',
        language: 'en',
        callback: (token, certData) => {
            if (skippedCert) return; // Ignore if user chose no certificate

            skidguardToken = token; // This is the 64-char hex key
            certificateData = certData;

            console.log('[OK] Verified with certificate', certData);
            console.log('[TOKEN] Verification key:', token);
            log('SkidGuard verification successful', 'success');

            let usrnm = certData.nickname || certData.username || 'Verified User';

            // puts username from certificate and make readonly
            authorInput.value = usrnm;
            authorInput.readOnly = true;

            // saves username for mentions
            localStorage.setItem('commentsUsername', usrnm);
            currentUsername = usrnm;

            verifyStep.style.display = 'none';
            form.style.display = 'block';
        },
        errorCallback: (err) => {
            console.error('[ERR] Verification error:', err);
            log('SkidGuard verification failed: ' + err, 'error');
            alert('Verification failed, please try again.');
        },
        noskid: {
            apiUrl: '%%CHECK_API_URL%%'
        }
    });

    const noCertLink = newCommentWin.querySelector('#noCertLink');
    noCertLink.addEventListener('click', (e) => {
        e.preventDefault();
        skippedCert = true;

        authorInput.value = '';
        authorInput.readOnly = false;
        authorInput.placeholder = 'Enter your name (or leave empty for Anonymous)';

        warningMessage.innerHTML = `
            <div class="warning-message">
                You don't have a NoSkid certificate. Your comment will be marked as unverified.
            </div>
        `;

        verifyStep.style.display = 'none';
        form.style.display = 'block';
    });

    return newCommentWin;
}

function detectAndLinkify(text) {
    const urlRegex = /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/gi;

    return text.replace(urlRegex, (url) => {
        let cleanUrl = url;
        const trailingPunctuation = /[.,;:!?)]$/;
        let trailing = '';

        while (trailingPunctuation.test(cleanUrl)) {
            trailing = cleanUrl.slice(-1) + trailing;
            cleanUrl = cleanUrl.slice(0, -1);
        }

        return `<a href="${cleanUrl}" target="_blank" class="comment-link">${cleanUrl}</a>${trailing}`;
    });
}

function setupMentionsAutocomplete(form) {
    const textarea = form.querySelector('#content');
    const dropdown = form.querySelector('.mentions-dropdown');
    const list = form.querySelector('.mentions-list');

    if (!textarea || !dropdown || !list) {
        console.error('Mentions elements not found');
        return;
    }

    textarea.addEventListener('input', (e) => {
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPos);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        if (atIndex !== -1) {
            const query = textBeforeCursor.substring(atIndex + 1);
            // Check if there's no space after @ (still typing the mention)
            if (!query.includes(' ')) {
                const matches = allUsernames.filter(username =>
                    username.toLowerCase().startsWith(query.toLowerCase())
                );

                if (matches.length > 0 && query.length > 0) {
                    list.innerHTML = matches.map(username =>
                        `<li data-username="${username}">${username}</li>`
                    ).join('');
                    dropdown.style.display = 'block';
                } else {
                    dropdown.style.display = 'none';
                }
            } else {
                dropdown.style.display = 'none';
            }
        } else {
            dropdown.style.display = 'none';
        }
    });

    list.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const username = e.target.getAttribute('data-username');
            const cursorPos = textarea.selectionStart;
            const textBeforeCursor = textarea.value.substring(0, cursorPos);
            const atIndex = textBeforeCursor.lastIndexOf('@');
            const newText = textBeforeCursor.substring(0, atIndex) + `@${username} ` + textarea.value.substring(cursorPos);
            textarea.value = newText;
            textarea.selectionStart = textarea.selectionEnd = atIndex + username.length + 2;
            dropdown.style.display = 'none';
            textarea.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!textarea.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

function spawnReplyForm(commentId, parentAuthor) {
    spawnNewCommentForm(commentId, parentAuthor);
}

function submitComment(form, commentWindow, replyTo = null) {
    const authorValue = form.querySelector('#author').value.trim();
    const content = form.querySelector('#content').value.trim();

    if (!content) {
        alert('Comment content cannot be empty.');
        return;
    }

    if (authorValue.toLowerCase() === "bypass" || content.toLowerCase() === "bypass") {
        ClassicWindow.createWindow({
            title: "Hey !",
            content: '<h1 style="color: red;">You have to write bypass <b>on the website</b>, not in a comment &gt;:[</h1>',
            theme: 'dark',
            width: 400,
            height: 300,
            x: Math.round((window.innerWidth - 400) / 2),
            y: Math.round((window.innerHeight - 300) / 2),
        });

        return;
    }

    const buttons = form.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);

    // Determine what to send as author:
    // - If user has certificate: send the token (64-char hex key)
    // - If user skipped cert: send their entered username (or empty for Anonymous)
    let authorToSend;

    if (skippedCert) {
        // No certificate - send username as-is
        authorToSend = authorValue || 'Anonymous';
    } else if (skidguardToken) {
        // Has certificate - send the token as the verification key
        authorToSend = skidguardToken;
    } else {
        alert('Please complete verification or choose "I don\'t have a certificate"');
        buttons.forEach(btn => btn.disabled = false);
        return;
    }

    const commentData = {
        author: authorToSend,
        content: content
    };

    if (replyTo !== null) {
        commentData.reply_to = replyTo;
    }

    fetch('/api/comments/index.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(commentData)
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Error sending comment');
                });
            }
            return response.json();
        })
        .then(data => {
            log('Comment added successfully', 'success');
            addAchievement('Super Commenter');

            // reload comments in all open comment windows
            const allWindows = ClassicWindow.getAllWindows();
            allWindows.forEach(win => {
                const titleElement = win.querySelector('.c-t');
                if (titleElement && titleElement.textContent === 'Comments') {
                    loadComments(win);
                }
            });

            ClassicWindow.closeWindow(commentWindow);
        })
        .catch(error => {
            log('Error sending comment: ' + error.message, 'error');
            alert('Error: ' + error.message);
            buttons.forEach(btn => btn.disabled = false);
        });
}
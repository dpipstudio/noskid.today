//Comments.js | Comment system for noskid with threaded replies

let skidguardToken = null;
let skidguardWidgetId = null;

function spawnCommentSystem(event) {
    event.preventDefault();

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

    const footerText = document.createElement('div');
    footerText.className = 'footer-text';
    footerText.innerHTML = '<a href="#" class="new-comment-link">Write a new comment</a>';
    footer.prepend(footerText);

    const newCommentLink = footerText.querySelector('.new-comment-link');
    newCommentLink.addEventListener('click', (e) => {
        e.preventDefault();
        spawnNewCommentForm();
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
        }

        .comment-author {
            font-weight: 600;
            color: var(--secondary);
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

        .footer-text {
            padding: 8px 0;
            text-align: center;
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

        .comment-form {
            padding: 20px;
            background: var(--primary);
            color: var(--text);
        }

        .form-group {
            margin-bottom: 15px;
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

        #skidguard-captcha {
            padding: 10px 0;
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
                displayComments(commentwin, data);
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

function renderComment(comment, parentAuthor = null) {
    const userLiked = comment.user_reaction === 'like';
    const userDisliked = comment.user_reaction === 'dislike';
    const hasReplies = comment.replies && comment.replies.length > 0;

    const displayAuthor = parentAuthor
        ? `${comment.author || 'Anonymous'} → ${parentAuthor}`
        : (comment.author || 'Anonymous');

    let html = `
        <div class="comment" data-id="${comment.id}">
            <div class="comment-header">
                <span class="comment-author">${displayAuthor}</span>
                <span class="comment-date">${formatDate(comment.date)}</span>
            </div>
            <div class="comment-content">${comment.content}</div>
            <div class="comment-actions">
                <button class="reaction-btn ${userLiked ? 'active' : ''}" 
                        onclick="handleReaction(${comment.id}, '${userLiked ? 'none' : 'like'}')">
                    ↑ ${comment.likes || 0}
                </button>
                <button class="reaction-btn ${userDisliked ? 'active' : ''}" 
                        onclick="handleReaction(${comment.id}, '${userDisliked ? 'none' : 'dislike'}')">
                    ↓ ${comment.dislikes || 0}
                </button>
                <button class="reply-btn" onclick="spawnReplyForm(${comment.id}, '${(comment.author || 'Anonymous').replace(/'/g, "\\'")}')">
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
                    ${comment.replies.map(reply => renderComment(reply, comment.author || 'Anonymous')).join('')}
                </div>
            ` : ''}
        </div>
    `;

    return html;
}

function displayComments(window, comments) {
    const container = document.createElement('div');
    container.className = 'comments-container';

    if (comments.length === 0) {
        container.innerHTML = `
            <div class="no-comments">
                <p>No comments yet. Be the first to comment!</p>
            </div>
        `;
        updateComments(window, container);
        return;
    }

    const commentsHTML = comments.map(comment => renderComment(comment)).join('');
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

    const newCommentWin = ClassicWindow.createWindow({
        title: title,
        width: 450,
        height: isReply ? 340 : 300,
        x: Math.round((window.innerWidth - 450) / 2),
        y: Math.round((window.innerHeight - (isReply ? 340 : 300)) / 2),
        content: `
            <div class="comment-form">
                <form>
                    ${isReply ? `
                        <div class="reply-info">
                            Replying to <strong>${replyToAuthor}</strong>
                        </div>
                    ` : ''}
                    <div class="form-group">
                        <label for="author">Your name:</label>
                        <input type="text" id="author" placeholder="Anonymous">
                    </div>
                    <div class="form-group">
                        <label for="content">Comment:</label>
                        <textarea id="content" required rows="5" placeholder="Write your comment here..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Verify you're not a skid:</label>
                        <div id="skidguard-captcha"></div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="form-btn secondary cancel">Cancel</button>
                        <button type="submit" class="form-btn primary" disabled>Send ${isReply ? 'Reply' : 'Comment'}</button>
                    </div>
                </form>
            </div>
        `,
        theme: 'dark',
        resizable: false,
        statusText: isReply ? 'Writing a reply' : 'Writing a new comment',
        onclose: () => {
            skidguardToken = null;
            if (skidguardWidgetId !== null) {
                skidguard.reset(skidguardWidgetId);
            }
        }
    });

    const form = newCommentWin.querySelector('form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitComment(form, newCommentWin, replyTo);
    });

    const cancelBtn = newCommentWin.querySelector('.cancel');
    cancelBtn.addEventListener('click', () => {
        ClassicWindow.closeWindow(newCommentWin);
    });

    const submitBtn = form.querySelector('button[type="submit"]');

    skidguardWidgetId = skidguard.render('#skidguard-captcha', {
        size: 'normal',
        theme: 'dark',
        language: 'en',
        callback: (token, certificateData) => {
            skidguardToken = token;
            submitBtn.disabled = false;
            log('SkidGuard verification successful', 'success');
        },
        errorCallback: (err) => {
            skidguardToken = null;
            submitBtn.disabled = true;
            log('SkidGuard verification failed: ' + err, 'error');
        },
        noskid : {
            apiUrl: '%%CHECK_API_URL%%'
        }
    });

    return newCommentWin;
}

function spawnReplyForm(commentId, parentAuthor) {
    spawnNewCommentForm(commentId, parentAuthor);
}

function submitComment(form, commentWindow, replyTo = null) {
    const author = form.querySelector('#author').value.trim() || 'Anonymous';
    const content = form.querySelector('#content').value.trim();

    if (!content) {
        alert('Comment content cannot be empty.');
        return;
    }

    if (author.toLowerCase() == "bypass" || content.toLowerCase() == "bypass") {
        ClassicWindow.createWindow({
            title: "Hey !",
            content: '<h1 style="color: red;">You have to write bypass <b>on the website</b>, not in a comment &gt;:[</h1>',
            theme: 'dark',
            width: 400,
            height: 300,
            x: Math.round((window.innerWidth - 400) / 2),
            y: Math.round((window.innerHeight - 300) / 2),
        });

        const buttons = form.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = false);
        return;
    }

    const buttons = form.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);

    const commentData = {
        author: author,
        content: content,
        skey: skidguardToken
    };

    if (replyTo !== null) {
        commentData.reply_to = replyTo;
    }

    if (!skidguardToken) {
        alert('Please complete the SkidGuard verification.');
        buttons.forEach(btn => btn.disabled = false);
        return;
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
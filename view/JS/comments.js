// 评论系统功能
document.addEventListener("DOMContentLoaded", () => {
    const commentForm = document.getElementById('commentForm')
    const commentFormContainer = document.getElementById('commentFormContainer')
    const commentLoginPrompt = document.getElementById('commentLoginPrompt')
    const commentsList = document.getElementById('commentsList')

    // 初始化
    checkAuthStatus()
    loadComments()

    // 评论表单提交
    if (commentForm) {
        commentForm.addEventListener('submit', handleCommentSubmit)
    }

    // 检查认证状态
    function checkAuthStatus() {
        if (API.isAuthenticated()) {
            if (commentFormContainer) commentFormContainer.style.display = 'block'
            if (commentLoginPrompt) commentLoginPrompt.style.display = 'none'
        } else {
            if (commentFormContainer) commentFormContainer.style.display = 'none'
            if (commentLoginPrompt) commentLoginPrompt.style.display = 'block'
        }
    }

    // 加载评论
    async function loadComments() {
        if (!commentsList) return

        commentsList.innerHTML = '<div class="message-loading">Loading comments...</div>'

        try {
            const response = await API.get('/comments?page=1&page_size=50')
            
            if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
                commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>'
                return
            }

            commentsList.innerHTML = ''
            response.data.forEach(comment => {
                const commentElement = createCommentElement(comment)
                commentsList.appendChild(commentElement)
            })
        } catch (error) {
            console.error('Error loading comments:', error)
            commentsList.innerHTML = '<div class="message-error">Failed to load comments. Please refresh the page.</div>'
        }
    }

    // 创建评论元素
    function createCommentElement(comment) {
        const user = API.getUser()
        const isOwner = user && user.id === comment.user_id

        const commentDiv = document.createElement('div')
        commentDiv.className = 'comment-item'
        commentDiv.dataset.commentId = comment.id

        const formattedDate = formatDate(comment.created_at)

        commentDiv.innerHTML = `
            <div class="comment-header">
                <div class="comment-author">
                    <i class="fas fa-user"></i>
                    ${escapeHTML(comment.username || 'Anonymous')}
                </div>
                <div class="comment-date">${formattedDate}</div>
            </div>
            <div class="comment-content">${escapeHTML(comment.content)}</div>
            <div class="comment-actions">
                ${API.isAuthenticated() ? `
                    <button class="comment-action-btn reply-btn" data-comment-id="${comment.id}">
                        <i class="fas fa-reply"></i> Reply
                    </button>
                    ${isOwner ? `
                        <button class="comment-action-btn edit-btn" data-comment-id="${comment.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="comment-action-btn delete-btn" data-comment-id="${comment.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    ` : ''}
                ` : ''}
            </div>
            <div class="replies-container" id="replies-${comment.id}">
                ${comment.replies && comment.replies.length > 0 
                    ? comment.replies.map(reply => createReplyElement(reply)).join('')
                    : ''
                }
            </div>
            <div class="reply-form" id="reply-form-${comment.id}">
                <textarea class="reply-textarea" placeholder="Write your reply..."></textarea>
                <div class="reply-form-actions">
                    <button class="reply-submit-btn" data-parent-id="${comment.id}">Submit</button>
                    <button class="reply-cancel-btn" data-parent-id="${comment.id}">Cancel</button>
                </div>
            </div>
        `

        // 绑定事件
        const replyBtn = commentDiv.querySelector('.reply-btn')
        if (replyBtn) {
            replyBtn.addEventListener('click', () => toggleReplyForm(comment.id))
        }

        const editBtn = commentDiv.querySelector('.edit-btn')
        if (editBtn) {
            editBtn.addEventListener('click', () => handleEditComment(comment))
        }

        const deleteBtn = commentDiv.querySelector('.delete-btn')
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => handleDeleteComment(comment.id))
        }

        const replySubmitBtn = commentDiv.querySelector('.reply-submit-btn')
        if (replySubmitBtn) {
            replySubmitBtn.addEventListener('click', () => handleReplySubmit(comment.id))
        }

        const replyCancelBtn = commentDiv.querySelector('.reply-cancel-btn')
        if (replyCancelBtn) {
            replyCancelBtn.addEventListener('click', () => toggleReplyForm(comment.id))
        }

        return commentDiv
    }

    // 创建回复元素
    function createReplyElement(reply) {
        const formattedDate = formatDate(reply.created_at)
        return `
            <div class="reply-item">
                <div class="reply-header">
                    <span class="reply-author">${escapeHTML(reply.username || 'Anonymous')}</span>
                    <span class="reply-date">${formattedDate}</span>
                </div>
                <div class="reply-content">${escapeHTML(reply.content)}</div>
            </div>
        `
    }

    // 切换回复表单
    function toggleReplyForm(commentId) {
        const replyForm = document.getElementById(`reply-form-${commentId}`)
        if (replyForm) {
            replyForm.classList.toggle('active')
            if (replyForm.classList.contains('active')) {
                replyForm.querySelector('.reply-textarea').focus()
            }
        }
    }

    // 处理评论提交
    async function handleCommentSubmit(e) {
        e.preventDefault()

        const form = e.target
        const content = form.content.value.trim()

        if (!content) {
            showNotification('Please enter a comment', 'error')
            return
        }

        const user = API.getUser()
        if (!user) {
            showNotification('Please login to comment', 'error')
            window.location.href = '/view/html/login.html'
            return
        }

        const submitBtn = form.querySelector('button[type="submit"]')
        const originalText = submitBtn.innerHTML
        submitBtn.disabled = true
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...'

        try {
            await API.post('/comments', {
                user_id: user.id,
                content: content
            })

            showNotification('Comment posted successfully!', 'success')
            form.reset()
            loadComments()
        } catch (error) {
            console.error('Error posting comment:', error)
            showNotification(error.message || 'Failed to post comment. Please try again.', 'error')
        } finally {
            submitBtn.innerHTML = originalText
            submitBtn.disabled = false
        }
    }

    // 处理回复提交
    async function handleReplySubmit(parentId) {
        const replyForm = document.getElementById(`reply-form-${parentId}`)
        if (!replyForm) return

        const textarea = replyForm.querySelector('.reply-textarea')
        const content = textarea.value.trim()

        if (!content) {
            showNotification('Please enter a reply', 'error')
            return
        }

        const user = API.getUser()
        if (!user) {
            showNotification('Please login to reply', 'error')
            return
        }

        const submitBtn = replyForm.querySelector('.reply-submit-btn')
        const originalText = submitBtn.innerHTML
        submitBtn.disabled = true
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...'

        try {
            await API.post('/comments', {
                user_id: user.id,
                content: content,
                parent_id: parentId
            })

            showNotification('Reply posted successfully!', 'success')
            textarea.value = ''
            replyForm.classList.remove('active')
            loadComments()
        } catch (error) {
            console.error('Error posting reply:', error)
            showNotification(error.message || 'Failed to post reply. Please try again.', 'error')
        } finally {
            submitBtn.innerHTML = originalText
            submitBtn.disabled = false
        }
    }

    // 处理编辑评论
    async function handleEditComment(comment) {
        const newContent = prompt('Edit your comment:', comment.content)
        if (!newContent || newContent.trim() === comment.content) return

        try {
            await API.put(`/comments/${comment.id}`, {
                content: newContent.trim()
            })

            showNotification('Comment updated successfully!', 'success')
            loadComments()
        } catch (error) {
            console.error('Error updating comment:', error)
            showNotification(error.message || 'Failed to update comment. Please try again.', 'error')
        }
    }

    // 处理删除评论
    async function handleDeleteComment(commentId) {
        if (!confirm('Are you sure you want to delete this comment?')) return

        try {
            await API.delete(`/comments/${commentId}`)
            showNotification('Comment deleted successfully!', 'success')
            loadComments()
        } catch (error) {
            console.error('Error deleting comment:', error)
            showNotification(error.message || 'Failed to delete comment. Please try again.', 'error')
        }
    }

    // 显示通知
    function showNotification(message, type = 'info') {
        const notificationDiv = document.getElementById('commentsNotification')
        if (!notificationDiv) return

        const className = type === 'success' ? 'message-success' : type === 'error' ? 'message-error' : 'notification info'
        notificationDiv.innerHTML = `<div class="${className}">${escapeHTML(message)}</div>`

        setTimeout(() => {
            notificationDiv.innerHTML = ''
        }, 5000)
    }

    // 格式化日期
    function formatDate(dateString) {
        if (!dateString) return 'Unknown date'
        try {
            const date = new Date(dateString)
            const options = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }
            return date.toLocaleDateString('en-US', options)
        } catch (e) {
            return String(dateString)
        }
    }

    // HTML转义
    function escapeHTML(str) {
        if (!str) return ''
        const div = document.createElement('div')
        div.textContent = str
        return div.innerHTML
    }
})


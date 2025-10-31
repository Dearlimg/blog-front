// 钱包功能
document.addEventListener("DOMContentLoaded", () => {
    // 检查登录状态
    if (!API.isAuthenticated()) {
        window.location.href = './login.html'
        return
    }

    const user = API.getUser()
    if (!user) {
        window.location.href = './login.html'
        return
    }

    const userId = user.id
    const walletInfo = document.getElementById('walletInfo')
    const addBalanceForm = document.getElementById('addBalanceForm')
    const transferForm = document.getElementById('transferForm')

    // 初始化
    loadWallet(userId)
    loadTransactions(userId)

    // 绑定事件
    if (addBalanceForm) {
        addBalanceForm.addEventListener('submit', (e) => handleAddBalance(e, userId))
    }

    if (transferForm) {
        transferForm.addEventListener('submit', (e) => handleTransfer(e, userId))
    }

    // 加载钱包信息
    async function loadWallet(userId) {
        try {
            const response = await API.get(`/wallets/${userId}`)
            
            if (response.data) {
                const balance = response.data.balance || 0
                document.getElementById('balanceAmount').textContent = `¥${balance.toFixed(2)}`
                if (walletInfo) walletInfo.style.display = 'block'
            } else {
                // 如果没有钱包，创建钱包
                await API.post(`/wallets/${userId}`)
                await loadWallet(userId)
            }
        } catch (error) {
            console.error('Error loading wallet:', error)
            // 如果是404，尝试创建钱包
            if (error.message.includes('404') || error.message.includes('not found')) {
                try {
                    await API.post(`/wallets/${userId}`)
                    await loadWallet(userId)
                } catch (createError) {
                    console.error('Error creating wallet:', createError)
                    showNotification('Failed to create wallet. Please try again.', 'error')
                }
            } else {
                showNotification('Failed to load wallet. Please refresh the page.', 'error')
            }
        }
    }

    // 加载交易记录
    async function loadTransactions(userId) {
        const transactionsList = document.getElementById('transactionsList')
        if (!transactionsList) return

        transactionsList.innerHTML = '<div class="message-loading">Loading transactions...</div>'

        try {
            const response = await API.get(`/wallets/${userId}/transactions`)
            
            if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
                transactionsList.innerHTML = '<div class="no-transactions">No transactions yet.</div>'
                return
            }

            transactionsList.innerHTML = ''
            response.data.forEach(transaction => {
                const transactionElement = createTransactionElement(transaction)
                transactionsList.appendChild(transactionElement)
            })
        } catch (error) {
            console.error('Error loading transactions:', error)
            transactionsList.innerHTML = '<div class="message-error">Failed to load transactions. Please refresh the page.</div>'
        }
    }

    // 创建交易记录元素
    function createTransactionElement(transaction) {
        const div = document.createElement('div')
        div.className = 'transaction-item'
        
        const isIncome = ['income', 'transfer_in', 'refund'].includes(transaction.type)
        const isExpense = ['expense', 'transfer_out', 'purchase'].includes(transaction.type)
        
        if (isIncome) div.classList.add('income')
        if (isExpense) div.classList.add('expense')

        const amount = parseFloat(transaction.amount || 0)
        const amountClass = amount >= 0 ? 'positive' : 'negative'
        const amountDisplay = amount >= 0 ? `+¥${amount.toFixed(2)}` : `-¥${Math.abs(amount).toFixed(2)}`

        const typeLabels = {
            income: 'Income',
            expense: 'Expense',
            purchase: 'Purchase',
            refund: 'Refund',
            transfer_in: 'Transfer In',
            transfer_out: 'Transfer Out'
        }

        const formattedDate = formatDate(transaction.created_at)

        div.innerHTML = `
            <div class="transaction-header">
                <div class="transaction-type">
                    <i class="fas fa-${getTransactionIcon(transaction.type)}"></i>
                    ${typeLabels[transaction.type] || transaction.type}
                </div>
                <div class="transaction-amount ${amountClass}">${amountDisplay}</div>
            </div>
            <div class="transaction-details">
                ${transaction.description ? `<div class="transaction-description">${escapeHTML(transaction.description)}</div>` : ''}
                ${transaction.product_id ? `<div>Product ID: ${transaction.product_id}</div>` : ''}
                ${transaction.order_id ? `<div>Order ID: ${transaction.order_id}</div>` : ''}
                <div class="transaction-date">${formattedDate}</div>
            </div>
        `

        return div
    }

    // 获取交易类型图标
    function getTransactionIcon(type) {
        const icons = {
            income: 'plus-circle',
            expense: 'minus-circle',
            purchase: 'shopping-cart',
            refund: 'undo',
            transfer_in: 'arrow-down',
            transfer_out: 'arrow-up'
        }
        return icons[type] || 'circle'
    }

    // 处理增加余额
    async function handleAddBalance(e, userId) {
        e.preventDefault()

        const form = e.target
        const amount = parseFloat(form.addAmount.value)
        const description = form.addDescription.value.trim() || 'Account recharge'

        if (!amount || amount <= 0) {
            showNotification('Please enter a valid amount', 'error')
            return
        }

        const submitBtn = form.querySelector('button[type="submit"]')
        const originalText = submitBtn.innerHTML
        submitBtn.disabled = true
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'

        try {
            await API.post(`/wallets/${userId}/add`, {
                amount: amount,
                description: description
            })

            showNotification(`Successfully added ¥${amount.toFixed(2)} to your wallet!`, 'success')
            form.reset()
            await loadWallet(userId)
            await loadTransactions(userId)
        } catch (error) {
            console.error('Error adding balance:', error)
            showNotification(error.message || 'Failed to add balance. Please try again.', 'error')
        } finally {
            submitBtn.innerHTML = originalText
            submitBtn.disabled = false
        }
    }

    // 处理转账
    async function handleTransfer(e, userId) {
        e.preventDefault()

        const form = e.target
        const toUserId = parseInt(form.toUserId.value)
        const amount = parseFloat(form.transferAmount.value)
        const description = form.transferDescription.value.trim() || 'Transfer'

        if (!toUserId || toUserId <= 0) {
            showNotification('Please enter a valid user ID', 'error')
            return
        }

        if (toUserId === userId) {
            showNotification('Cannot transfer to yourself', 'error')
            return
        }

        if (!amount || amount <= 0) {
            showNotification('Please enter a valid amount', 'error')
            return
        }

        const submitBtn = form.querySelector('button[type="submit"]')
        const originalText = submitBtn.innerHTML
        submitBtn.disabled = true
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'

        try {
            await API.post('/wallets/transfer', {
                from_user_id: userId,
                to_user_id: toUserId,
                amount: amount,
                description: description
            })

            showNotification(`Successfully transferred ¥${amount.toFixed(2)} to user ${toUserId}!`, 'success')
            form.reset()
            await loadWallet(userId)
            await loadTransactions(userId)
        } catch (error) {
            console.error('Error transferring:', error)
            showNotification(error.message || 'Failed to transfer. Please check your balance and try again.', 'error')
        } finally {
            submitBtn.innerHTML = originalText
            submitBtn.disabled = false
        }
    }

    // 显示通知
    function showNotification(message, type = 'info') {
        const notificationDiv = document.getElementById('walletNotification')
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


// 用户认证相关功能
document.addEventListener("DOMContentLoaded", () => {
    // 检查当前页面
    const isLoginPage = window.location.pathname.includes('login.html')
    const isRegisterPage = window.location.pathname.includes('register.html')
    const isHomePage = window.location.pathname === '/' || window.location.pathname.includes('index.html')

    // 如果已登录，重定向到首页
    if (API.isAuthenticated() && (isLoginPage || isRegisterPage)) {
        window.location.href = '/index.html'
        return
    }

    // 登录表单处理
    if (isLoginPage) {
        const loginForm = document.getElementById('loginForm')
        loginForm.addEventListener('submit', handleLogin)
    }

    // 注册表单处理
    if (isRegisterPage) {
        const registerForm = document.getElementById('registerForm')
        const sendCodeBtn = document.getElementById('sendCodeBtn')
        
        registerForm.addEventListener('submit', handleRegister)
        sendCodeBtn.addEventListener('click', handleSendVerificationCode)
    }

    // 主页登录状态显示
    if (isHomePage) {
        updateAuthUI()
        
        // 登出按钮
        const logoutBtn = document.getElementById('logoutBtn')
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout)
        }

        // 显示钱包和商城链接（如果已登录）
        const walletLink = document.getElementById('walletLink')
        const shopLink = document.getElementById('shopLink')
        if (walletLink) {
            walletLink.style.display = API.isAuthenticated() ? 'inline' : 'none'
        }
        if (shopLink) {
            shopLink.style.display = API.isAuthenticated() ? 'inline' : 'none'
        }
    }
})

// 更新认证UI
function updateAuthUI() {
    const userAuthLinks = document.getElementById('userAuthLinks')
    const guestAuthLinks = document.getElementById('guestAuthLinks')
    const userName = document.getElementById('userName')
    
    if (API.isAuthenticated()) {
        const user = API.getUser()
        if (userAuthLinks) userAuthLinks.style.display = 'flex'
        if (guestAuthLinks) guestAuthLinks.style.display = 'none'
        if (userName && user) {
            userName.textContent = user.username || user.email
        }
    } else {
        if (userAuthLinks) userAuthLinks.style.display = 'none'
        if (guestAuthLinks) guestAuthLinks.style.display = 'flex'
    }
}

// 处理登出
function handleLogout(e) {
    e.preventDefault()
    API.setToken('')
    API.setUser(null)
    updateAuthUI()
    window.location.reload()
}

// 显示通知
function showNotification(message, type = 'info') {
    const notificationDiv = document.getElementById('authNotification')
    if (!notificationDiv) return

    notificationDiv.innerHTML = `<div class="notification ${type}">${escapeHTML(message)}</div>`
    
    // 5秒后自动移除
    setTimeout(() => {
        notificationDiv.innerHTML = ''
    }, 5000)
}

// 处理登录
async function handleLogin(e) {
    e.preventDefault()
    
    const form = e.target
    const submitBtn = form.querySelector('button[type="submit"]')
    const originalText = submitBtn.innerHTML
    
    // 获取表单数据
    const email = form.email.value.trim()
    const password = form.password.value

    if (!email || !password) {
        showNotification('Please fill in all fields', 'error')
        return
    }

    // 显示加载状态
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...'

    try {
        const response = await API.post('/users/login', {
            email,
            password
        })

        // 保存token和用户信息
        if (response.data && response.data.token) {
            API.setToken(response.data.token)
            API.setUser(response.data.user)
            
            showNotification('Login successful! Redirecting...', 'success')
            
            // 跳转到首页
            setTimeout(() => {
                window.location.href = '/index.html'
            }, 1000)
        } else {
            throw new Error('Invalid response from server')
        }
    } catch (error) {
        console.error('Login error:', error)
        showNotification(error.message || 'Login failed. Please check your credentials.', 'error')
        submitBtn.innerHTML = originalText
        submitBtn.disabled = false
    }
}

// 处理注册
async function handleRegister(e) {
    e.preventDefault()
    
    const form = e.target
    const submitBtn = form.querySelector('button[type="submit"]')
    const originalText = submitBtn.innerHTML

    // 获取表单数据
    const username = form.username.value.trim()
    const email = form.email.value.trim()
    const password = form.password.value
    const confirmPassword = form.confirmPassword.value
    const verificationCode = form.verificationCode.value.trim()

    // 验证输入
    if (!username || !email || !password || !confirmPassword) {
        showNotification('Please fill in all required fields', 'error')
        return
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error')
        return
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error')
        return
    }

    // 显示加载状态
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...'

    try {
        // 先注册
        const registerResponse = await API.post('/users/register', {
            username,
            email,
            password
        })

        // 如果提供了验证码，进行邮箱验证
        if (verificationCode) {
            try {
                await API.post('/users/verify-email', {
                    email,
                    code: verificationCode
                })
                showNotification('Registration successful! Email verified. Redirecting to login...', 'success')
            } catch (verifyError) {
                console.error('Email verification error:', verifyError)
                showNotification('Registration successful, but email verification failed. You can verify later.', 'info')
            }
        } else {
            showNotification('Registration successful! Please verify your email later. Redirecting to login...', 'info')
        }

        // 跳转到登录页
        setTimeout(() => {
            window.location.href = '/view/html/login.html'
        }, 2000)
    } catch (error) {
        console.error('Register error:', error)
        showNotification(error.message || 'Registration failed. Please try again.', 'error')
        submitBtn.innerHTML = originalText
        submitBtn.disabled = false
    }
}

// 发送验证码
async function handleSendVerificationCode(e) {
    e.preventDefault()
    
    const emailInput = document.getElementById('email')
    const email = emailInput.value.trim()
    const sendCodeBtn = e.target
    
    if (!email) {
        showNotification('Please enter your email first', 'error')
        return
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error')
        return
    }

    // 显示加载状态
    const originalText = sendCodeBtn.innerHTML
    sendCodeBtn.disabled = true
    sendCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...'

    try {
        await API.post('/users/send-verification-code', {
            email
        })
        
        showNotification('Verification code sent to your email!', 'success')
        
        // 60秒倒计时
        let countdown = 60
        const timer = setInterval(() => {
            sendCodeBtn.innerHTML = `Resend (${countdown}s)`
            countdown--
            
            if (countdown < 0) {
                clearInterval(timer)
                sendCodeBtn.innerHTML = originalText
                sendCodeBtn.disabled = false
            }
        }, 1000)
    } catch (error) {
        console.error('Send code error:', error)
        showNotification(error.message || 'Failed to send verification code. Please try again.', 'error')
        sendCodeBtn.innerHTML = originalText
        sendCodeBtn.disabled = false
    }
}

// HTML转义函数
function escapeHTML(str) {
    if (!str) return ''
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
}


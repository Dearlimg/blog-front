// API配置文件
const API_CONFIG = {
    // API网关基础URL - 根据实际部署环境修改
    BASE_URL: 'http://localhost:8000/api/v1',
    // 或者使用部署地址（如果需要）
    // BASE_URL: 'http://123.249.32.125:8000/api/v1',
    
    // 留言板API（独立服务）
    // 如果留言板服务也在本地，使用: 'http://localhost:8002/api/message'
    // 如果使用远程服务，使用: 'http://123.249.32.125:8002/api/message'
    MESSAGE_BOARD_URL: 'http://localhost:8002/api/message'
}

// API工具函数
const API = {
    // 获取认证token
    getToken() {
        return localStorage.getItem('token') || ''
    },

    // 设置token
    setToken(token) {
        if (token) {
            localStorage.setItem('token', token)
        } else {
            localStorage.removeItem('token')
        }
    },

    // 获取用户信息
    getUser() {
        const userStr = localStorage.getItem('user')
        return userStr ? JSON.parse(userStr) : null
    },

    // 设置用户信息
    setUser(user) {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user))
        } else {
            localStorage.removeItem('user')
        }
    },

    // 检查是否已登录
    isAuthenticated() {
        return !!this.getToken()
    },

    // 通用请求函数
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') 
            ? endpoint 
            : `${API_CONFIG.BASE_URL}${endpoint}`
        
        const token = this.getToken()
        
        const defaultHeaders = {
            'Content-Type': 'application/json',
        }
        
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`
        }
        
        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        }
        
        try {
            const response = await fetch(url, config)
            
            // 如果响应是401，清除token并跳转到登录页
            if (response.status === 401) {
                this.setToken('')
                this.setUser(null)
                if (window.location.pathname !== '/login.html' && !window.location.pathname.includes('login')) {
                    window.location.href = '/login.html'
                }
                throw new Error('Unauthorized')
            }
            
            const data = await response.json()
            
            // 检查后端返回的错误码
            if (data.code !== undefined && data.code !== 0) {
                throw new Error(data.msg || 'Request failed')
            }
            
            return data
        } catch (error) {
            console.error('API request error:', error)
            throw error
        }
    },

    // GET请求
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' })
    },

    // POST请求
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    // PUT请求
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        })
    },

    // DELETE请求
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' })
    }
}

// 导出API配置和工具
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_CONFIG, API }
}


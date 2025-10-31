// 商城功能
document.addEventListener("DOMContentLoaded", () => {
    // 检查登录状态
    if (!API.isAuthenticated()) {
        showNotification('Please login to access the shop', 'error')
        setTimeout(() => {
            window.location.href = './login.html'
        }, 2000)
        return
    }

    const user = API.getUser()
    if (!user) {
        window.location.href = './login.html'
        return
    }

    const userId = user.id

    // 初始化
    loadProducts()
    loadCart(userId)
    loadOrders(userId)

    // 绑定事件
    const cartIcon = document.getElementById('cartIcon')
    const closeCart = document.getElementById('closeCart')
    const cartOverlay = document.getElementById('cartOverlay')
    const checkoutBtn = document.getElementById('checkoutBtn')
    const closeOrderModal = document.getElementById('closeOrderModal')
    const orderForm = document.getElementById('orderForm')
    const searchInput = document.getElementById('searchInput')

    if (cartIcon) {
        cartIcon.addEventListener('click', () => openCart())
    }

    if (closeCart) {
        closeCart.addEventListener('click', () => closeCartSidebar())
    }

    if (cartOverlay) {
        cartOverlay.addEventListener('click', () => closeCartSidebar())
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => openOrderModal())
    }

    if (closeOrderModal) {
        closeOrderModal.addEventListener('click', () => closeOrderModalFunc())
    }

    if (orderForm) {
        orderForm.addEventListener('submit', (e) => handleCreateOrder(e, userId))
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterProducts, 300))
    }

    // 加载商品
    async function loadProducts() {
        const productsList = document.getElementById('productsList')
        if (!productsList) return

        productsList.innerHTML = '<div class="message-loading">Loading products...</div>'

        try {
            const response = await API.get('/products?page=1&page_size=100')
            
            if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
                productsList.innerHTML = '<div class="no-comments">No products available.</div>'
                return
            }

            productsList.innerHTML = ''
            window.allProducts = response.data // 保存所有商品用于搜索

            response.data.forEach(product => {
                const productElement = createProductElement(product, userId)
                productsList.appendChild(productElement)
            })

            // 加载分类
            loadCategories(response.data)
        } catch (error) {
            console.error('Error loading products:', error)
            productsList.innerHTML = '<div class="message-error">Failed to load products. Please refresh the page.</div>'
        }
    }

    // 加载分类
    function loadCategories(products) {
        const categoryFilter = document.getElementById('categoryFilter')
        if (!categoryFilter) return

        const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
        categories.forEach(category => {
            const option = document.createElement('option')
            option.value = category
            option.textContent = category
            categoryFilter.appendChild(option)
        })

        categoryFilter.addEventListener('change', filterProducts)
    }

    // 过滤商品
    function filterProducts() {
        const searchInput = document.getElementById('searchInput')
        const categoryFilter = document.getElementById('categoryFilter')
        const productsList = document.getElementById('productsList')

        if (!productsList || !window.allProducts) return

        const searchTerm = (searchInput?.value || '').toLowerCase()
        const category = categoryFilter?.value || ''

        const filtered = window.allProducts.filter(product => {
            const matchesSearch = !searchTerm || 
                product.name.toLowerCase().includes(searchTerm) ||
                (product.description || '').toLowerCase().includes(searchTerm)
            const matchesCategory = !category || product.category === category
            return matchesSearch && matchesCategory
        })

        productsList.innerHTML = ''
        filtered.forEach(product => {
            const productElement = createProductElement(product, userId)
            productsList.appendChild(productElement)
        })
    }

    // 创建商品元素
    function createProductElement(product, userId) {
        const div = document.createElement('div')
        div.className = 'product-card'
        div.dataset.productId = product.id

        const isInStock = product.stock > 0

        div.innerHTML = `
            ${product.image_url ? `<img src="${escapeHTML(product.image_url)}" alt="${escapeHTML(product.name)}" class="product-image" onerror="this.style.display='none'">` : ''}
            <div class="product-info">
                <div class="product-name">${escapeHTML(product.name)}</div>
                ${product.description ? `<div class="product-description">${escapeHTML(product.description)}</div>` : ''}
                <div class="product-price">¥${parseFloat(product.price || 0).toFixed(2)}</div>
                <div class="product-stock">Stock: ${product.stock || 0}</div>
                <div class="product-actions">
                    <button class="add-to-cart-btn" data-product-id="${product.id}" ${!isInStock ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> ${isInStock ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                </div>
            </div>
        `

        // 绑定添加到购物车事件
        const addBtn = div.querySelector('.add-to-cart-btn')
        if (addBtn && isInStock) {
            addBtn.addEventListener('click', () => addToCart(product.id, 1, userId))
        }

        return div
    }

    // 添加到购物车
    async function addToCart(productId, quantity, userId) {
        try {
            await API.post(`/users/${userId}/cart`, {
                product_id: productId,
                quantity: quantity
            })

            showNotification('Product added to cart!', 'success')
            await loadCart(userId)
        } catch (error) {
            console.error('Error adding to cart:', error)
            showNotification(error.message || 'Failed to add product to cart.', 'error')
        }
    }

    // 加载购物车
    async function loadCart(userId) {
        const cartContent = document.getElementById('cartContent')
        const cartCount = document.getElementById('cartCount')
        const cartTotal = document.getElementById('cartTotal')
        const checkoutBtn = document.getElementById('checkoutBtn')

        if (!cartContent) return

        cartContent.innerHTML = '<div class="message-loading">Loading cart...</div>'

        try {
            const response = await API.get(`/users/${userId}/cart`)
            
            if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
                cartContent.innerHTML = '<div class="no-comments">Your cart is empty.</div>'
                if (cartCount) cartCount.textContent = '0'
                if (cartTotal) cartTotal.textContent = '¥0.00'
                if (checkoutBtn) checkoutBtn.disabled = true
                return
            }

            let total = 0
            let itemCount = 0

            cartContent.innerHTML = ''
            response.data.forEach(item => {
                const itemTotal = parseFloat(item.price || 0) * parseInt(item.quantity || 0)
                total += itemTotal
                itemCount += parseInt(item.quantity || 0)

                const cartItem = createCartItemElement(item, userId)
                cartContent.appendChild(cartItem)
            })

            if (cartCount) cartCount.textContent = itemCount.toString()
            if (cartTotal) cartTotal.textContent = `¥${total.toFixed(2)}`
            if (checkoutBtn) checkoutBtn.disabled = false

            window.cartItems = response.data // 保存购物车项用于下单
        } catch (error) {
            console.error('Error loading cart:', error)
            cartContent.innerHTML = '<div class="message-error">Failed to load cart. Please refresh the page.</div>'
        }
    }

    // 创建购物车项元素
    function createCartItemElement(item, userId) {
        const div = document.createElement('div')
        div.className = 'cart-item'
        div.dataset.productId = item.product_id

        const price = parseFloat(item.price || 0)
        const quantity = parseInt(item.quantity || 0)

        div.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${escapeHTML(item.product_name || 'Unknown')}</div>
                <div class="cart-item-price">¥${price.toFixed(2)}</div>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-control">
                    <button class="quantity-btn decrease-btn" data-product-id="${item.product_id}">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" class="quantity-input" value="${quantity}" min="1" data-product-id="${item.product_id}">
                    <button class="quantity-btn increase-btn" data-product-id="${item.product_id}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <button class="remove-item-btn" data-product-id="${item.product_id}">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `

        // 绑定事件
        const decreaseBtn = div.querySelector('.decrease-btn')
        const increaseBtn = div.querySelector('.increase-btn')
        const quantityInput = div.querySelector('.quantity-input')
        const removeBtn = div.querySelector('.remove-item-btn')

        decreaseBtn.addEventListener('click', () => updateCartQuantity(item.product_id, quantity - 1, userId))
        increaseBtn.addEventListener('click', () => updateCartQuantity(item.product_id, quantity + 1, userId))
        quantityInput.addEventListener('change', (e) => updateCartQuantity(item.product_id, parseInt(e.target.value) || 1, userId))
        removeBtn.addEventListener('click', () => removeFromCart(item.product_id, userId))

        return div
    }

    // 更新购物车数量
    async function updateCartQuantity(productId, quantity, userId) {
        if (quantity < 1) {
            await removeFromCart(productId, userId)
            return
        }

        try {
            await API.put(`/users/${userId}/cart/${productId}`, {
                quantity: quantity
            })

            await loadCart(userId)
        } catch (error) {
            console.error('Error updating cart:', error)
            showNotification(error.message || 'Failed to update cart.', 'error')
        }
    }

    // 从购物车移除
    async function removeFromCart(productId, userId) {
        try {
            await API.delete(`/users/${userId}/cart/${productId}`)
            await loadCart(userId)
            showNotification('Item removed from cart', 'success')
        } catch (error) {
            console.error('Error removing from cart:', error)
            showNotification(error.message || 'Failed to remove item.', 'error')
        }
    }

    // 打开购物车
    function openCart() {
        const cartSidebar = document.getElementById('cartSidebar')
        const cartOverlay = document.getElementById('cartOverlay')
        if (cartSidebar) cartSidebar.classList.add('active')
        if (cartOverlay) cartOverlay.classList.add('active')
    }

    // 关闭购物车
    function closeCartSidebar() {
        const cartSidebar = document.getElementById('cartSidebar')
        const cartOverlay = document.getElementById('cartOverlay')
        if (cartSidebar) cartSidebar.classList.remove('active')
        if (cartOverlay) cartOverlay.classList.remove('active')
    }

    // 打开订单模态框
    function openOrderModal() {
        if (!window.cartItems || window.cartItems.length === 0) {
            showNotification('Your cart is empty', 'error')
            return
        }

        const orderModal = document.getElementById('orderModal')
        const orderItemsList = document.getElementById('orderItemsList')
        const orderTotalAmount = document.getElementById('orderTotalAmount')

        if (!orderModal || !orderItemsList || !orderTotalAmount) return

        let total = 0
        orderItemsList.innerHTML = ''

        window.cartItems.forEach(item => {
            const itemTotal = parseFloat(item.price || 0) * parseInt(item.quantity || 0)
            total += itemTotal

            const itemDiv = document.createElement('div')
            itemDiv.className = 'order-item-display'
            itemDiv.innerHTML = `
                <span>${escapeHTML(item.product_name || 'Unknown')} x ${item.quantity}</span>
                <span>¥${itemTotal.toFixed(2)}</span>
            `
            orderItemsList.appendChild(itemDiv)
        })

        orderTotalAmount.textContent = `¥${total.toFixed(2)}`
        orderModal.classList.add('active')
    }

    // 关闭订单模态框
    function closeOrderModalFunc() {
        const orderModal = document.getElementById('orderModal')
        if (orderModal) orderModal.classList.remove('active')
    }

    // 创建订单
    async function handleCreateOrder(e, userId) {
        e.preventDefault()

        const form = e.target
        const address = form.address.value.trim()
        const phone = form.phone.value.trim()
        const remark = form.remark.value.trim()

        if (!address || !phone) {
            showNotification('Please fill in address and phone', 'error')
            return
        }

        const submitBtn = form.querySelector('button[type="submit"]')
        const originalText = submitBtn.innerHTML
        submitBtn.disabled = true
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Order...'

        try {
            await API.post('/orders', {
                user_id: userId,
                address: address,
                phone: phone,
                remark: remark,
                use_cart: true
            })

            showNotification('Order created successfully!', 'success')
            form.reset()
            closeOrderModalFunc()
            await loadCart(userId)
            await loadOrders(userId)
            closeCartSidebar()
        } catch (error) {
            console.error('Error creating order:', error)
            showNotification(error.message || 'Failed to create order. Please check your balance.', 'error')
        } finally {
            submitBtn.innerHTML = originalText
            submitBtn.disabled = false
        }
    }

    // 加载订单
    async function loadOrders(userId) {
        const ordersList = document.getElementById('ordersList')
        const ordersSection = document.getElementById('ordersSection')

        if (!ordersList) return

        ordersList.innerHTML = '<div class="message-loading">Loading orders...</div>'

        try {
            const response = await API.get(`/users/${userId}/orders`)
            
            if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
                ordersList.innerHTML = '<div class="no-comments">No orders yet.</div>'
                if (ordersSection) ordersSection.style.display = 'block'
                return
            }

            ordersList.innerHTML = ''
            if (ordersSection) ordersSection.style.display = 'block'

            response.data.forEach(order => {
                const orderElement = createOrderElement(order, userId)
                ordersList.appendChild(orderElement)
            })
        } catch (error) {
            console.error('Error loading orders:', error)
            ordersList.innerHTML = '<div class="message-error">Failed to load orders. Please refresh the page.</div>'
            if (ordersSection) ordersSection.style.display = 'block'
        }
    }

    // 创建订单元素
    function createOrderElement(order, userId) {
        const div = document.createElement('div')
        div.className = 'order-card'

        const totalAmount = parseFloat(order.total_amount || 0)
        const status = order.status || 'pending'

        div.innerHTML = `
            <div class="order-header">
                <div class="order-id">Order #${order.id}</div>
                <div class="order-status ${status}">${status.toUpperCase()}</div>
            </div>
            <div class="order-items">
                ${order.items && Array.isArray(order.items) ? order.items.map(item => `
                    <div class="order-item">
                        <span class="order-item-name">${escapeHTML(item.product_name || 'Unknown')} x ${item.quantity}</span>
                        <span class="order-item-price">¥${(parseFloat(item.total_price || 0)).toFixed(2)}</span>
                    </div>
                `).join('') : ''}
            </div>
            <div class="order-footer">
                <div class="order-total-amount">Total: ¥${totalAmount.toFixed(2)}</div>
                <div class="order-actions">
                    ${status === 'pending' || status === 'paid' ? `
                        <button class="order-action-btn cancel" onclick="cancelOrder(${order.id}, ${userId})">
                            Cancel
                        </button>
                    ` : ''}
                </div>
            </div>
        `

        return div
    }

    // 取消订单（全局函数，供onclick使用）
    window.cancelOrder = async function(orderId, userId) {
        if (!confirm('Are you sure you want to cancel this order?')) return

        try {
            await API.put(`/orders/${orderId}/cancel`)
            showNotification('Order cancelled successfully!', 'success')
            await loadOrders(userId)
        } catch (error) {
            console.error('Error cancelling order:', error)
            showNotification(error.message || 'Failed to cancel order.', 'error')
        }
    }

    // 显示通知
    function showNotification(message, type = 'info') {
        const notificationDiv = document.getElementById('shopNotification')
        if (!notificationDiv) return

        const className = type === 'success' ? 'message-success' : type === 'error' ? 'message-error' : 'notification info'
        notificationDiv.innerHTML = `<div class="${className}">${escapeHTML(message)}</div>`

        setTimeout(() => {
            notificationDiv.innerHTML = ''
        }, 5000)
    }

    // 防抖函数
    function debounce(func, wait) {
        let timeout
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout)
                func(...args)
            }
            clearTimeout(timeout)
            timeout = setTimeout(later, wait)
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


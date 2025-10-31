# 商城服务 (Shop Service)

商城购物微服务，提供商品管理、订单管理、购物车等功能。

## 功能特性

### 1. 商品管理
- ✅ 商品CRUD操作
- ✅ 商品分类
- ✅ 库存管理
- ✅ 商品上下架

### 2. 订单管理
- ✅ 创建订单
- ✅ 订单支付（集成钱包服务）
- ✅ 订单查询
- ✅ 订单取消
- ✅ 自动扣减库存

### 3. 购物车
- ✅ 添加商品到购物车
- ✅ 更新商品数量
- ✅ 删除购物车商品
- ✅ 清空购物车
- ✅ 从购物车下单

## API接口

### 商品相关

```bash
# 创建商品
POST /api/v1/products
{
  "name": "商品名称",
  "description": "商品描述",
  "price": 99.99,
  "stock": 100,
  "image_url": "https://example.com/image.jpg",
  "category": "电子产品"
}

# 获取商品列表
GET /api/v1/products?page=1&page_size=20&category=电子产品

# 获取商品详情
GET /api/v1/products/:id

# 更新商品
PUT /api/v1/products/:id
{
  "price": 89.99,
  "stock": 80
}

# 删除商品（下架）
DELETE /api/v1/products/:id
```

### 订单相关

```bash
# 创建订单（直接购买）
POST /api/v1/orders
{
  "user_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ],
  "address": "收货地址",
  "phone": "13800138000",
  "remark": "备注",
  "use_cart": false
}

# 从购物车创建订单
POST /api/v1/orders
{
  "user_id": 1,
  "address": "收货地址",
  "phone": "13800138000",
  "use_cart": true
}

# 获取订单详情
GET /api/v1/orders/:id

# 获取用户订单列表
GET /api/v1/users/:user_id/orders

# 取消订单
PUT /api/v1/orders/:id/cancel
```

### 购物车相关

```bash
# 添加到购物车
POST /api/v1/users/:user_id/cart
{
  "product_id": 1,
  "quantity": 2
}

# 获取购物车
GET /api/v1/users/:user_id/cart

# 更新购物车商品数量
PUT /api/v1/users/:user_id/cart/:product_id
{
  "quantity": 3
}

# 从购物车移除商品
DELETE /api/v1/users/:user_id/cart/:product_id

# 清空购物车
DELETE /api/v1/users/:user_id/cart
```

## 支付流程

1. 用户创建订单
2. 商城服务验证商品库存
3. 调用钱包服务扣除余额
4. 扣减商品库存
5. 创建订单记录
6. 返回订单信息

如果支付失败，自动回滚库存。

## 数据库表结构

### Product（商品表）
- id: 商品ID
- name: 商品名称
- description: 商品描述
- price: 价格
- stock: 库存
- image_url: 图片URL
- category: 分类
- status: 状态（active/sold_out/offline）

### Order（订单表）
- id: 订单ID
- user_id: 用户ID
- status: 订单状态（pending/paid/shipped/completed/cancelled/refunded）
- total_amount: 订单总金额
- address: 收货地址
- phone: 联系电话

### OrderItem（订单项表）
- id: 订单项ID
- order_id: 订单ID
- product_id: 商品ID
- quantity: 数量
- unit_price: 单价
- total_price: 总价
- product_name: 商品名称（快照）

### Cart（购物车表）
- id: 购物车项ID
- user_id: 用户ID
- product_id: 商品ID
- quantity: 数量

## 服务集成

### 钱包服务集成
- 订单创建时自动调用钱包服务支付
- 支付失败自动回滚库存
- 支持商品ID和订单ID关联

### 与钱包服务的交易记录关联
- 交易记录中保存product_id
- 交易记录中保存order_id
- 支持按商品ID查询交易记录
- 支持按订单ID查询交易记录

## 配置说明

服务配置从Redis配置中心读取，支持：
- 数据库连接配置
- Redis连接配置
- 钱包服务地址配置

默认端口：8004

## 注意事项

1. **库存管理**：使用数据库行锁保证并发安全
2. **订单支付**：支付失败会自动回滚库存
3. **订单取消**：取消订单会自动恢复库存
4. **购物车**：下单成功后自动清空购物车

## 使用示例

### 完整购物流程

```bash
# 1. 查看商品
curl http://localhost:8000/api/v1/products

# 2. 添加到购物车
curl -X POST http://localhost:8000/api/v1/users/1/cart \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1, "quantity": 2}'

# 3. 查看购物车
curl http://localhost:8000/api/v1/users/1/cart

# 4. 创建订单（从购物车）
curl -X POST http://localhost:8000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "address": "北京市朝阳区xxx",
    "phone": "13800138000",
    "use_cart": true
  }'

# 5. 查看订单
curl http://localhost:8000/api/v1/users/1/orders
```

## 端口说明

- 商城服务端口：8004
- 通过API网关访问：http://localhost:8000/api/v1/products
- 直接访问：http://localhost:8004/api/v1/products


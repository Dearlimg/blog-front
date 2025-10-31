# 钱包服务 (Wallet Service)

钱包管理微服务，提供余额管理、转账、支付、退款等功能，为商城模块提供支付支持。

## 功能特性

- ✅ 钱包创建和管理
- ✅ 余额增加/扣除（原子操作）
- ✅ 用户间转账（事务保证）
- ✅ 商品购买支付（支持商品ID和订单ID）
- ✅ 退款功能
- ✅ 交易记录查询
- ✅ Kafka事件发布
- ✅ 高并发安全（数据库锁+事务）

## API接口

### 钱包管理

```bash
# 创建钱包
POST /api/v1/wallets/:user_id

# 获取钱包信息
GET /api/v1/wallets/:user_id

# 增加余额
POST /api/v1/wallets/:user_id/add
Content-Type: application/json

{
  "amount": 100.00,
  "description": "充值"
}

# 扣除余额
POST /api/v1/wallets/:user_id/deduct
Content-Type: application/json

{
  "amount": 50.00,
  "description": "消费"
}
```

### 转账功能

```bash
# 用户间转账
POST /api/v1/wallets/transfer
Content-Type: application/json

{
  "from_user_id": 1,
  "to_user_id": 2,
  "amount": 25.00,
  "description": "转账"
}
```

**响应：**
```json
{
  "code": 0,
  "msg": "success",
  "data": "Transfer completed successfully"
}
```

### 交易记录

```bash
# 获取用户交易记录
GET /api/v1/wallets/:user_id/transactions

# 根据商品ID获取交易记录（为商城模块准备）
GET /api/v1/wallets/transactions/product/:product_id

# 根据订单ID获取交易记录（为商城模块准备）
GET /api/v1/wallets/transactions/order/:order_id
```

## 数据库表结构

### Wallet（钱包表）
- id: 钱包ID (主键，自增)
- user_id: 用户ID (索引)
- balance: 余额
- created_at: 创建时间
- updated_at: 更新时间

### Transaction（交易记录表）
- id: 交易ID (主键，自增)
- user_id: 用户ID (索引)
- wallet_id: 钱包ID (索引)
- type: 交易类型 (income/expense/purchase/refund/transfer_out/transfer_in)
- amount: 交易金额
- description: 交易描述
- product_id: 商品ID (可选，索引)
- order_id: 订单ID (可选，索引)
- quantity: 商品数量
- status: 交易状态 (pending/completed/failed/refunded)
- created_at: 创建时间
- updated_at: 更新时间

## Kafka事件

### 支付事件
- Topic: `wallet.payment`
- 事件内容：
```json
{
  "user_id": 1,
  "amount": -99.99,
  "description": "Purchase product 1, quantity: 2",
  "transaction_id": 123,
  "product_id": 1,
  "order_id": 456,
  "quantity": 2
}
```

## 高并发安全机制

### 1. 余额更新（原子操作）
使用数据库行锁 (`SELECT FOR UPDATE`) 和原子更新 (`UPDATE balance = balance + ?`)，防止并发导致的余额错误。

### 2. 转账事务
使用数据库事务保证转账的原子性，确保：
- 扣除成功 → 增加成功 = 转账完成
- 扣除成功 → 增加失败 = 自动回滚
- 扣除失败 → 直接失败

### 3. 转账死锁预防
按用户ID顺序锁定，防止死锁：
```go
if fromUserID < toUserID {
    // 先锁定fromUser，再锁定toUser
} else {
    // 先锁定toUser，再锁定fromUser
}
```

## 商城模块集成

### 商品购买支付

商城服务调用钱包服务进行支付：
```bash
POST /api/v1/wallets/:user_id/deduct
{
  "amount": 99.99,
  "description": "Order #123 payment"
}
```

钱包服务会自动记录：
- `product_id`: 商品ID
- `order_id`: 订单ID
- `quantity`: 商品数量
- `type`: "purchase"

### 退款功能

支持对购买交易进行退款：
```bash
POST /api/v1/wallets/refund
{
  "transaction_id": 123,
  "reason": "商品质量问题"
}
```

退款会自动：
- 恢复用户余额
- 创建退款交易记录
- 更新原交易状态为"refunded"
- 关联原商品和订单信息

## 配置说明

服务配置从Redis配置中心读取，支持：
- 数据库连接配置
- Redis连接配置
- Kafka配置（事件发布）

默认端口：8002

## 使用示例

### 钱包创建和充值

```bash
# 1. 创建钱包（首次使用时自动创建）
curl -X POST http://localhost:8000/api/v1/wallets/1

# 2. 充值
curl -X POST http://localhost:8000/api/v1/wallets/1/add \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "description": "账户充值"
  }'

# 3. 查询余额
curl http://localhost:8000/api/v1/wallets/1
```

### 转账示例

```bash
curl -X POST http://localhost:8000/api/v1/wallets/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "from_user_id": 1,
    "to_user_id": 2,
    "amount": 100.00,
    "description": "转账给朋友"
  }'
```

### 商城购买流程

```bash
# 商城服务会自动调用钱包服务
# 1. 用户选择商品并下单
# 2. 商城服务调用钱包服务扣除余额
POST /api/v1/wallets/:user_id/deduct

# 3. 钱包服务创建交易记录（包含product_id和order_id）
# 4. 返回支付结果给商城服务
```

## 健康检查

```bash
GET /health
```

**响应：**
```json
{
  "status": "healthy",
  "service": "wallet-service"
}
```

## 端口说明

- 钱包服务端口：8002
- 通过API网关访问：http://localhost:8000/api/v1/wallets/*
- 直接访问：http://localhost:8002/api/v1/wallets/*

## 注意事项

1. **余额安全**：所有余额操作都使用数据库事务和行锁
2. **并发控制**：高并发场景下余额更新保证原子性
3. **事务一致性**：转账操作保证原子性，要么全部成功，要么全部失败
4. **商品关联**：购买交易的交易记录会自动关联商品ID和订单ID
5. **退款限制**：只有"purchase"类型的交易可以退款

## 错误处理

```json
// 余额不足
{
  "code": 500,
  "msg": "insufficient balance"
}

// 转账给自己
{
  "code": 500,
  "msg": "cannot transfer to yourself"
}

// 转账金额无效
{
  "code": 500,
  "msg": "amount must be greater than 0"
}
```


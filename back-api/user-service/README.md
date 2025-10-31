# 用户服务 (User Service)

用户管理微服务，提供用户注册、登录、邮箱验证等功能。

## 功能特性

- ✅ 用户注册
- ✅ 用户登录
- ✅ 邮箱验证码发送
- ✅ 邮箱验证码验证
- ✅ 密码加密存储
- ✅ JWT Token生成
- ✅ Kafka事件发布

## API接口

### 用户注册

```bash
POST /api/v1/users/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

**响应：**
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "is_verified": false,
    "created_at": "2025-10-29T10:00:00Z"
  }
}
```

### 用户登录

```bash
POST /api/v1/users/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**响应：**
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "is_verified": true
    }
  }
}
```

### 发送验证码

```bash
POST /api/v1/users/send-verification-code
Content-Type: application/json

{
  "email": "test@example.com"
}
```

### 验证邮箱

```bash
POST /api/v1/users/verify-email
Content-Type: application/json

{
  "email": "test@example.com",
  "code": "123456"
}
```

### 重新发送验证码

```bash
POST /api/v1/users/resend-verification-code
Content-Type: application/json

{
  "email": "test@example.com"
}
```

### 获取用户信息

```bash
GET /api/v1/users/:id
Authorization: Bearer <token>
```

## 数据库表结构

### User（用户表）
- id: 用户ID (主键，自增)
- username: 用户名 (唯一索引)
- email: 邮箱 (唯一索引)
- password: 密码 (加密存储)
- is_verified: 是否已验证邮箱
- created_at: 创建时间
- updated_at: 更新时间

### EmailVerification（邮箱验证表）
- id: 验证记录ID (主键，自增)
- email: 邮箱
- code: 验证码
- expires_at: 过期时间
- created_at: 创建时间

## Kafka事件

### 用户注册事件
- Topic: `user.register`
- 事件内容：
```json
{
  "user_id": 1,
  "username": "testuser",
  "email": "test@example.com"
}
```

### 用户登录事件
- Topic: `user.login`
- 事件内容：
```json
{
  "user_id": 1,
  "email": "test@example.com"
}
```

### 邮箱验证事件
- Topic: `user.email.verify`
- 事件内容：
```json
{
  "user_id": 1,
  "email": "test@example.com",
  "verified": true
}
```

## 邮件配置

使用QQ邮箱SMTP服务发送验证码：
- SMTP服务器: smtp.qq.com:465
- 发送邮箱: 1492568061@qq.com
- SSL加密: 启用

## 配置说明

服务配置从Redis配置中心读取，支持：
- 数据库连接配置
- Redis连接配置（验证码存储）
- Kafka配置（事件发布）
- 邮件服务配置

默认端口：8001

## 安全特性

1. **密码加密**：使用bcrypt进行密码哈希
2. **验证码过期**：验证码5分钟后过期
3. **验证码限制**：同一邮箱1分钟内只能发送一次
4. **JWT Token**：登录后生成JWT token用于身份验证

## 使用示例

### 完整注册流程

```bash
# 1. 用户注册
curl -X POST http://localhost:8000/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# 2. 发送验证码
curl -X POST http://localhost:8000/api/v1/users/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 3. 验证邮箱（使用收到的验证码）
curl -X POST http://localhost:8000/api/v1/users/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'

# 4. 用户登录
curl -X POST http://localhost:8000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 健康检查

```bash
GET /health
```

**响应：**
```json
{
  "status": "healthy",
  "service": "user-service"
}
```

## 端口说明

- 用户服务端口：8001
- 通过API网关访问：http://localhost:8000/api/v1/users/*
- 直接访问：http://localhost:8001/api/v1/users/*

## 注意事项

1. **邮箱验证码**：存储在Redis中，5分钟过期
2. **密码要求**：最少6个字符
3. **用户名唯一性**：系统会自动检查用户名是否已存在
4. **邮箱唯一性**：系统会自动检查邮箱是否已注册


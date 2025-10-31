# Blog Microservices

## 项目架构

这是一个基于微服务架构的博客系统，使用Kafka作为消息队列进行服务间通信。

### 微服务架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   User Service  │    │  Wallet Service │
│     (8000)      │    │     (8001)      │    │     (8002)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Comment Service │
                    │     (8003)      │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Kafka Message   │
                    │     Queue       │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     MySQL       │    │      Redis      │    │   Zookeeper     │
│     (3307)      │    │     (6379)      │    │     (2181)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 服务说明

1. **API网关 (8000)**：统一入口，路由请求到各个微服务
2. **用户服务 (8001)**：处理用户注册、登录、邮箱验证
3. **钱包服务 (8002)**：处理支付、转账、余额管理
4. **评论服务 (8003)**：处理评论的CRUD操作

### 技术栈

- **语言**: Go 1.23.0
- **Web框架**: Gin
- **数据库**: MySQL 8.0 + GORM
- **缓存**: Redis 7
- **消息队列**: Apache Kafka
- **容器化**: Docker + Docker Compose
- **邮件服务**: QQ邮箱SMTP

### 功能特性

#### 用户服务
- ✅ 用户注册（支持QQ邮箱）
- ✅ 用户登录
- ✅ 邮箱验证码验证
- ✅ 密码加密存储
- ✅ Kafka事件发布

#### 钱包服务
- ✅ 钱包创建和管理
- ✅ 余额增加/扣除
- ✅ 交易记录
- ✅ 用户间转账
- ✅ 支付事件通知

#### 评论服务
- ✅ 评论创建和查询
- ✅ 评论更新和删除
- ✅ 支持回复功能
- ✅ 软删除机制
- ✅ 评论事件发布

#### API网关
- ✅ 请求路由和代理
- ✅ CORS跨域支持
- ✅ 认证中间件
- ✅ 健康检查
- ✅ 服务发现

### 快速开始

#### 1. 环境要求
- Docker & Docker Compose
- Go 1.23+ (本地开发)

#### 2. 启动服务
```bash
# 使用Docker Compose启动所有服务
./start-microservices.sh

# 或者手动启动
docker-compose up --build -d
```

#### 3. 测试API
```bash
# 运行API测试
./test-microservices.sh
```

#### 4. 服务访问
- API网关: http://localhost:8000
- 用户服务: http://localhost:8001
- 钱包服务: http://localhost:8002
- 评论服务: http://localhost:8003

### API接口

#### 用户服务
```bash
# 用户注册
POST /api/v1/users/register
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}

# 用户登录
POST /api/v1/users/login
{
  "email": "test@example.com",
  "password": "password123"
}

# 邮箱验证
POST /api/v1/users/verify-email
{
  "email": "test@example.com",
  "code": "123456"
}
```

#### 钱包服务
```bash
# 创建钱包
POST /api/v1/wallets/{user_id}

# 增加余额
POST /api/v1/wallets/{user_id}/add
{
  "amount": 100.0,
  "description": "充值"
}

# 扣除余额
POST /api/v1/wallets/{user_id}/deduct
{
  "amount": 50.0,
  "description": "消费"
}

# 转账
POST /api/v1/wallets/transfer
{
  "from_user_id": 1,
  "to_user_id": 2,
  "amount": 25.0,
  "description": "转账"
}
```

#### 评论服务
```bash
# 创建评论
POST /api/v1/comments
{
  "user_id": 1,
  "content": "这是一条评论",
  "parent_id": null
}

# 获取评论
GET /api/v1/comments

# 更新评论
PUT /api/v1/comments/{id}
{
  "content": "更新后的评论内容"
}

# 删除评论
DELETE /api/v1/comments/{id}
```

### 配置说明

#### 数据库配置
- MySQL: `root:sta_go@tcp(47.118.19.28:3307)/blog`
- Redis: `47.118.19.28:6379` (密码: `sta_go`)

#### 邮件配置
- SMTP服务器: smtp.qq.com:465
- 邮箱: 1492568061@qq.com
- 密码: nbafgutnzsediibc

#### Kafka配置
- Broker: 47.118.19.28:9092
- Topics:
  - `user.register` - 用户注册事件
  - `user.login` - 用户登录事件
  - `user.email.verify` - 邮箱验证事件
  - `wallet.payment` - 支付事件
  - `comment.create` - 评论创建事件
  - `comment.update` - 评论更新事件
  - `comment.delete` - 评论删除事件

### 开发指南

#### 本地开发
```bash
# 启动基础设施服务
docker-compose up mysql redis kafka zookeeper -d

# 启动单个服务
cd services/user-service
go run main.go
```

#### 添加新服务
1. 在 `services/` 目录下创建新服务
2. 实现标准的服务结构（config, repository, logic, controller）
3. 在 `docker-compose.yml` 中添加服务配置
4. 在API网关中添加路由配置

### 监控和日志

```bash
# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f [service_name]

# 查看所有日志
docker-compose logs -f
```

### 部署说明

系统支持Docker容器化部署，所有服务都可以通过Docker Compose一键启动。

### 📁 项目结构

```
Blog-v1.0.0/
├── services/                    # 微服务目录
│   ├── api-gateway/            # API网关服务 (8000端口)
│   │   ├── config/             # 配置管理
│   │   ├── controller/         # 控制器层
│   │   ├── middleware/         # 中间件
│   │   ├── Dockerfile         # Docker镜像构建
│   │   └── main.go            # 服务入口
│   ├── user-service/           # 用户服务 (8001端口)
│   │   ├── config/             # 配置管理
│   │   ├── controller/         # 控制器层
│   │   ├── logic/              # 业务逻辑层
│   │   ├── repository/         # 数据访问层
│   │   ├── Dockerfile         # Docker镜像构建
│   │   └── main.go            # 服务入口
│   ├── wallet-service/         # 钱包服务 (8002端口)
│   │   ├── config/             # 配置管理
│   │   ├── controller/         # 控制器层
│   │   ├── logic/              # 业务逻辑层
│   │   ├── repository/         # 数据访问层
│   │   ├── Dockerfile         # Docker镜像构建
│   │   └── main.go            # 服务入口
│   └── comment-service/        # 评论服务 (8003端口)
│       ├── config/             # 配置管理
│       ├── controller/         # 控制器层
│       ├── logic/              # 业务逻辑层
│       ├── repository/         # 数据访问层
│       ├── Dockerfile         # Docker镜像构建
│       └── main.go            # 服务入口
├── shared/                     # 共享模块
│   ├── kafka/                 # Kafka消息队列
│   ├── email/                 # 邮件服务
│   └── models/                # 共享数据模型
├── docker-compose.yml         # Docker编排文件
├── go.mod                     # Go模块依赖
├── go.sum                     # Go依赖校验
├── README.md                  # 项目文档
├── start-microservices.sh     # 启动脚本
└── test-microservices.sh      # 测试脚本
```

### 🎯 微服务架构优势

1. **服务独立**: 每个服务可以独立开发、部署和扩展
2. **技术栈灵活**: 不同服务可以使用不同的技术栈
3. **故障隔离**: 单个服务的故障不会影响整个系统
4. **团队协作**: 不同团队可以独立负责不同的服务
5. **水平扩展**: 可以根据需要独立扩展特定服务

### 📚 更多文档

- [项目结构说明](PROJECT_STRUCTURE.md) - 详细的目录结构
- [Nginx+Redis架构](nginx-redis-architecture.md) - 使用Nginx作为反向代理的架构说明

### 🔧 部署方式

#### 方式1：Docker Compose（推荐）
```bash
./start-microservices.sh
```

#### 方式2：Nginx + Redis（本地开发）
```bash
./start-with-nginx.sh
```

www.durlim.xyz
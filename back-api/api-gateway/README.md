# API网关服务 (API Gateway)

统一的API入口服务，负责请求路由、负载均衡、CORS处理、鉴权等功能。

## 功能特性

- ✅ 统一入口：所有微服务通过网关访问
- ✅ 请求路由：根据路径自动路由到对应微服务
- ✅ 健康检查：监控所有微服务的健康状态
- ✅ CORS支持：跨域请求处理
- ✅ 认证中间件：JWT Token验证
- ✅ 请求代理：转发请求到后端服务
- ✅ 错误处理：统一错误响应格式

## API路由规则

所有请求都通过网关的8000端口访问：

```
http://localhost:8000/api/v1/{service}/{path}
```

### 路由映射

| 网关路径 | 目标服务 | 服务端口 |
|---------|---------|---------|
| `/api/v1/users/*` | 用户服务 | 8001 |
| `/api/v1/wallets/*` | 钱包服务 | 8002 |
| `/api/v1/comments/*` | 评论服务 | 8003 |
| `/api/v1/products/*` | 商城服务 | 8004 |
| `/api/v1/orders/*` | 商城服务 | 8004 |
| `/api/v1/users/:user_id/cart/*` | 商城服务 | 8004 |

## API接口

### 健康检查

```bash
GET /api/v1/health
```

**响应：**
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "gateway": "healthy",
    "services": {
      "user-service": "healthy",
      "wallet-service": "healthy",
      "comment-service": "healthy",
      "shop-service": "healthy"
    }
  }
}
```

### 请求代理

网关会自动将请求代理到对应的微服务：

```bash
# 访问用户服务
GET http://localhost:8000/api/v1/users/1
→ 转发到 http://user-service:8001/api/v1/users/1

# 访问钱包服务
POST http://localhost:8000/api/v1/wallets/1/add
→ 转发到 http://wallet-service:8002/api/v1/wallets/1/add

# 访问评论服务
GET http://localhost:8000/api/v1/comments
→ 转发到 http://comment-service:8003/api/v1/comments

# 访问商城服务
GET http://localhost:8000/api/v1/products
→ 转发到 http://shop-service:8004/api/v1/products
```

## 配置说明

### 服务配置

服务配置从Redis配置中心读取，包含：
- 服务器端口配置
- 各个微服务的地址和端口配置

默认端口：8000

### 微服务配置

```json
{
  "server": {
    "port": "8000"
  },
  "services": {
    "user_service": {
      "host": "user-service",
      "port": "8001"
    },
    "wallet_service": {
      "host": "wallet-service",
      "port": "8002"
    },
    "comment_service": {
      "host": "comment-service",
      "port": "8003"
    },
    "shop_service": {
      "host": "shop-service",
      "port": "8004"
    }
  }
}
```

## 中间件功能

### 1. CORS中间件
- 自动处理跨域请求
- 支持所有HTTP方法
- 允许所有来源（生产环境建议配置具体域名）

### 2. 认证中间件
- JWT Token验证
- 自动解析Authorization头
- 未授权请求返回401错误

### 3. 日志中间件
- 记录所有请求日志
- 包含请求路径、方法、状态码等信息

### 4. 错误恢复中间件
- 捕获panic错误
- 返回统一错误格式
- 防止服务崩溃

## 请求流程

```
客户端请求
    ↓
API网关（8000端口）
    ↓
中间件处理（CORS、认证、日志）
    ↓
路由匹配
    ↓
请求转发到对应微服务
    ↓
返回响应给客户端
```

## 使用示例

### 通过网关访问各服务

```bash
# 用户服务
curl http://localhost:8000/api/v1/users/1

# 钱包服务
curl http://localhost:8000/api/v1/wallets/1

# 评论服务
curl http://localhost:8000/api/v1/comments

# 商城服务
curl http://localhost:8000/api/v1/products
```

### 健康检查

```bash
# 检查网关和所有微服务状态
curl http://localhost:8000/api/v1/health
```

## 优势

### 1. 统一入口
- 客户端只需要知道网关地址
- 不需要了解各微服务的具体端口

### 2. 解耦
- 前端与后端服务解耦
- 微服务地址变更不影响前端

### 3. 统一处理
- 统一的CORS处理
- 统一的认证机制
- 统一的错误格式

### 4. 监控
- 统一的健康检查
- 统一的日志记录

## 端口说明

- API网关端口：8000
- 所有请求都通过此端口访问
- 后端服务不直接暴露给客户端

## 注意事项

1. **服务发现**：当前版本使用硬编码配置，生产环境建议使用服务注册中心
2. **负载均衡**：当前版本不支持，可以通过Nginx在网关前做负载均衡
3. **限流**：当前版本未实现，建议在生产环境添加限流功能
4. **SSL/TLS**：生产环境建议使用HTTPS
5. **API版本**：使用`/api/v1`路径区分版本，后续可升级到`/api/v2`

## 扩展功能建议

1. **限流中间件**：防止API滥用
2. **缓存中间件**：缓存热点数据
3. **请求日志**：记录详细请求日志
4. **API文档**：集成Swagger自动生成API文档
5. **监控指标**：集成Prometheus监控指标
6. **链路追踪**：集成Jaeger进行分布式追踪

## 错误响应格式

所有错误都返回统一格式：

```json
{
  "code": 500,
  "msg": "error message",
  "data": null
}
```

常见错误码：
- 400: 请求参数错误
- 401: 未授权
- 404: 资源不存在
- 500: 服务器内部错误


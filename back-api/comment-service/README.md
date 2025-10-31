# 评论服务 (Comment Service)

评论管理微服务，提供评论的创建、查询、更新、删除等功能。

## 功能特性

- ✅ 评论创建
- ✅ 评论查询（支持分页）
- ✅ 评论更新
- ✅ 评论删除（软删除）
- ✅ 回复功能（支持嵌套回复）
- ✅ 用户评论列表查询
- ✅ Kafka事件发布

## API接口

### 评论管理

```bash
# 创建评论
POST /api/v1/comments
Content-Type: application/json

{
  "user_id": 1,
  "content": "这是一条评论",
  "parent_id": null
}

# 回复评论（parent_id为父评论ID）
POST /api/v1/comments
Content-Type: application/json

{
  "user_id": 1,
  "content": "这是回复",
  "parent_id": 1
}

# 获取评论列表
GET /api/v1/comments?page=1&page_size=20

# 获取评论详情
GET /api/v1/comments/:id

# 获取用户的评论列表
GET /api/v1/comments/user/:user_id

# 更新评论
PUT /api/v1/comments/:id
Content-Type: application/json

{
  "content": "更新后的评论内容"
}

# 删除评论
DELETE /api/v1/comments/:id
```

## 数据库表结构

### Comment（评论表）
- id: 评论ID (主键，自增)
- user_id: 用户ID (索引)
- content: 评论内容
- parent_id: 父评论ID（可为空，用于回复）
- status: 状态 (active/deleted)
- created_at: 创建时间
- updated_at: 更新时间

## 数据结构

### CommentRequest（评论请求）
```json
{
  "user_id": 1,
  "content": "评论内容",
  "parent_id": null  // 可选，如果存在则是回复
}
```

### CommentResponse（评论响应）
```json
{
  "id": 1,
  "user_id": 1,
  "username": "testuser",
  "content": "评论内容",
  "parent_id": null,
  "status": "active",
  "created_at": "2025-10-29T10:00:00Z",
  "replies": [  // 子回复列表
    {
      "id": 2,
      "user_id": 2,
      "username": "user2",
      "content": "这是回复",
      "parent_id": 1,
      "status": "active",
      "created_at": "2025-10-29T10:05:00Z",
      "replies": []
    }
  ]
}
```

## Kafka事件

### 评论创建事件
- Topic: `comment.create`
- 事件内容：
```json
{
  "comment_id": 1,
  "user_id": 1,
  "content": "评论内容",
  "action": "create"
}
```

### 评论更新事件
- Topic: `comment.update`
- 事件内容：
```json
{
  "comment_id": 1,
  "user_id": 1,
  "content": "更新后的内容",
  "action": "update"
}
```

### 评论删除事件
- Topic: `comment.delete`
- 事件内容：
```json
{
  "comment_id": 1,
  "user_id": 1,
  "action": "delete"
}
```

## 功能说明

### 1. 评论创建
- 支持普通评论和回复评论
- 回复评论时，`parent_id`设置为父评论ID
- 自动记录创建时间和用户ID

### 2. 评论查询
- 支持分页查询
- 支持按用户ID查询
- 自动加载回复列表（嵌套结构）

### 3. 评论更新
- 只能更新自己的评论
- 软删除的评论不能更新

### 4. 评论删除
- 使用软删除机制（status改为"deleted"）
- 删除评论时，子回复也会被软删除
- 删除后内容不再显示，但数据保留

### 5. 回复功能
- 支持多级嵌套回复
- 每个回复都记录父评论ID
- 查询时自动构建回复树结构

## 配置说明

服务配置从Redis配置中心读取，支持：
- 数据库连接配置
- Redis连接配置
- Kafka配置（事件发布）

默认端口：8003

## 使用示例

### 完整评论流程

```bash
# 1. 创建评论
curl -X POST http://localhost:8000/api/v1/comments \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "content": "这是一条评论"
  }'

# 2. 回复评论（假设上面创建的评论ID为1）
curl -X POST http://localhost:8000/api/v1/comments \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 2,
    "content": "这是回复",
    "parent_id": 1
  }'

# 3. 获取评论列表
curl "http://localhost:8000/api/v1/comments?page=1&page_size=20"

# 4. 获取评论详情（包含所有回复）
curl http://localhost:8000/api/v1/comments/1

# 5. 获取用户的所有评论
curl http://localhost:8000/api/v1/comments/user/1

# 6. 更新评论
curl -X PUT http://localhost:8000/api/v1/comments/1 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "更新后的评论内容"
  }'

# 7. 删除评论
curl -X DELETE http://localhost:8000/api/v1/comments/1
```

### 多层回复示例

```bash
# 一级评论
POST /api/v1/comments
{
  "user_id": 1,
  "content": "一级评论",
  "parent_id": null
}
# 返回: {id: 1, ...}

# 二级回复
POST /api/v1/comments
{
  "user_id": 2,
  "content": "二级回复",
  "parent_id": 1
}
# 返回: {id: 2, parent_id: 1, ...}

# 三级回复
POST /api/v1/comments
{
  "user_id": 3,
  "content": "三级回复",
  "parent_id": 2
}
# 返回: {id: 3, parent_id: 2, ...}
```

## 健康检查

```bash
GET /health
```

**响应：**
```json
{
  "status": "healthy",
  "service": "comment-service"
}
```

## 端口说明

- 评论服务端口：8003
- 通过API网关访问：http://localhost:8000/api/v1/comments/*
- 直接访问：http://localhost:8003/api/v1/comments/*

## 注意事项

1. **软删除**：删除评论不会真正删除数据，只是标记为"deleted"
2. **回复限制**：可以多层嵌套回复，但建议限制层级（前端控制）
3. **内容长度**：评论内容建议限制长度（前端验证）
4. **权限控制**：更新和删除应该验证用户权限（当前版本简化处理）
5. **性能优化**：大量回复时，建议使用缓存或分页加载

## 数据结构说明

### 评论树结构
```
评论1
  └─ 回复1.1
      └─ 回复1.1.1
评论2
  └─ 回复2.1
```

查询评论列表时，会自动构建这种树形结构，方便前端展示。


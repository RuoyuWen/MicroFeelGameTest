# OpenAI 代理服务器说明

## 🔴 为什么需要代理服务器？

### 问题现象

即使使用 `http://localhost` 访问，仍然出现 CORS 错误：

```
Access to fetch at 'https://api.openai.com/v1/chat/completions' 
from origin 'http://localhost:8080' has been blocked by CORS policy
```

### 根本原因

**OpenAI API 不允许直接从浏览器调用！**

这是 OpenAI 的安全策略：
- ❌ 浏览器 → OpenAI API（被阻止）
- ✅ 浏览器 → 你的服务器 → OpenAI API（正常）

这样做是为了：
1. 保护 API Key 不被泄露
2. 防止滥用
3. 确保请求来自可控的服务器

---

## ✅ 解决方案：代理服务器

我已经创建了一个带代理功能的服务器 `proxy_server.py`，它会：

1. **接收浏览器的请求**
2. **转发给 OpenAI API**
3. **返回结果给浏览器**

```
浏览器 ←→ proxy_server.py ←→ OpenAI API
        (无 CORS 问题)    (官方 API)
```

---

## 🚀 如何使用

### 方法 1：Windows 用户（最简单）

```
双击 "启动服务器.bat"
```

批处理文件会自动：
- ✅ 启动代理服务器
- ✅ 查找可用端口
- ✅ 打开浏览器

### 方法 2：Mac/Linux 用户

```bash
python3 proxy_server.py
```

### 方法 3：手动指定端口

```bash
# 如果8000端口被占用，脚本会自动尝试其他端口
python proxy_server.py
```

---

## 🔧 技术细节

### 代理服务器做了什么？

**proxy_server.py** 提供两个功能：

1. **静态文件服务**
   - 提供 HTML、CSS、JS 文件
   - 就像普通的 HTTP 服务器

2. **API 代理**
   - 接收 `/api/openai` 的 POST 请求
   - 提取 API Key
   - 转发到 OpenAI API
   - 返回结果

### 代码修改

**app.js 的改动：**

```javascript
// 之前：直接调用 OpenAI API（CORS 错误）
fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
        'Authorization': `Bearer ${apiKey}`
    }
})

// 现在：通过代理服务器
fetch('/api/openai', {
    body: JSON.stringify({
        ...requestData,
        api_key: apiKey  // API Key 在请求体中
    })
})
```

---

## 🔒 安全说明

### API Key 安全吗？

在**本地开发**环境下：
- ✅ **安全** - 服务器只在你的电脑运行
- ✅ **不暴露** - API Key 只在本地传输
- ✅ **仅自己访问** - 默认只监听 localhost

### ⚠️ 生产环境注意

如果要部署到公网服务器：
- ❌ **不要**把 API Key 放在前端代码
- ❌ **不要**直接暴露代理端点
- ✅ **应该**添加身份验证
- ✅ **应该**使用环境变量存储 API Key

**本项目仅用于本地测试！**

---

## 📋 文件说明

### 核心文件

| 文件 | 用途 |
|------|------|
| **proxy_server.py** | 带代理功能的服务器（⭐ 必须使用） |
| **启动服务器.bat** | Windows 启动脚本 |
| **OpenAI代理服务器说明.md** | 本文件 |

### 修改的文件

| 文件 | 修改内容 |
|------|----------|
| **app.js** | 改用 `/api/openai` 代理端点 |
| **启动服务器.bat** | 默认启动 `proxy_server.py` |

---

## ✅ 验证是否正常工作

### 第一步：启动服务器

```bash
python proxy_server.py
```

应该看到：
```
==================================================
  AI RPG 测试系统 - 代理服务器
==================================================

✓ 服务器已启动
✓ 使用端口: 8080
✓ 服务器地址: http://localhost:8080

✓ OpenAI API 代理已启用（解决 CORS 问题）

按 Ctrl+C 可停止服务器
==================================================
```

### 第二步：测试系统

1. 浏览器访问 `http://localhost:8080`
2. 输入 API Key
3. 配置场景
4. 发送消息测试

### 第三步：检查日志

如果调用成功，服务器会显示：
```
[API] POST /api/openai HTTP/1.1" 200 -
```

如果有错误，会显示详细信息。

---

## ❓ 常见问题

### Q: 为什么不用 Live Server？

**A:** VS Code 的 Live Server 只是静态文件服务器，**没有代理功能**。
使用 Live Server 仍然会遇到 CORS 错误。

### Q: 可以用其他方式解决吗？

**A:** 有几种方案：

1. ✅ **代理服务器**（推荐）- 我们的方案
2. ⚠️ **浏览器扩展禁用 CORS** - 不安全，不推荐
3. ✅ **使用后端框架** - 更专业，但更复杂
   - Node.js + Express
   - Python + Flask
   - Python + FastAPI

### Q: 代理服务器会记录我的 API Key 吗？

**A:** 不会。`proxy_server.py` 只是转发请求：
- 不记录任何日志到文件
- 不保存 API Key
- 请求完成后立即释放

可以查看源代码确认。

### Q: 端口被占用怎么办？

**A:** 脚本会自动尝试多个端口：
- 8000 → 8080 → 8888 → 3000 → 5000 → 9000

如果都被占用，可以手动关闭其他程序。

### Q: 可以部署到云服务器吗？

**A:** 技术上可以，但需要：
1. 添加身份验证
2. 使用 HTTPS
3. 环境变量存储 API Key
4. 限制请求频率

**本项目设计用于本地开发测试！**

---

## 🎯 快速排查清单

遇到问题时按顺序检查：

- [ ] 使用 `proxy_server.py` 启动（不是普通的 http.server）
- [ ] 浏览器地址是 `http://localhost:xxxx`（不是 file://）
- [ ] API Key 正确无误
- [ ] 网络连接正常
- [ ] OpenAI 账户有余额
- [ ] 查看浏览器控制台（F12）的 Network 标签
- [ ] 查看服务器终端的输出日志

---

## 🎉 现在开始使用

```bash
# 1. 启动代理服务器
python proxy_server.py

# 2. 浏览器访问显示的地址
# 3. 输入 API Key
# 4. 开始使用！
```

**代理服务器已经解决了 CORS 问题，可以正常调用 OpenAI API 了！** ✨

---

## 📚 相关文档

- **CORS问题解决方案.md** - 各种启动方式
- **端口占用解决方案.md** - 端口冲突处理
- **故障排除指南.md** - 常见问题解答

---

**享受无 CORS 烦恼的 AI RPG 体验！** 🚀


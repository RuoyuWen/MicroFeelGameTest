# CORS 问题解决方案

## ❗ 问题说明

如果你看到以下错误：

```
Access to fetch at 'https://api.openai.com/v1/chat/completions' from origin 'null' 
has been blocked by CORS policy
```

这是因为**直接双击打开 HTML 文件**时，浏览器使用 `file://` 协议，出于安全原因会阻止跨域请求。

---

## ✅ 解决方案（按推荐顺序）

### 方案 1：使用本地 HTTP 服务器（⭐ 最推荐）

#### Windows 用户：

**方法 A：双击运行批处理文件**
```
1. 双击 "启动服务器.bat"
2. 等待服务器启动
3. 浏览器会自动打开 http://localhost:8000
4. 如果没有自动打开，手动访问该地址
```

**方法 B：使用 Python 命令**
```bash
# 直接运行代理服务器
python proxy_server.py
```

**方法 C：使用命令行**
```bash
# 打开 PowerShell 或 CMD，切换到项目目录
cd D:\测试

# 推荐：使用代理服务器（支持 OpenAI API）
python proxy_server.py

# 备用：使用简单服务器（不支持 API 调用）
python -m http.server 8000
```

#### Mac/Linux 用户：

```bash
# 打开终端，切换到项目目录
cd /path/to/项目目录

# 推荐：使用代理服务器（支持 OpenAI API）
python3 proxy_server.py

# 备用：使用简单服务器（不支持 API 调用）
python3 -m http.server 8000
```

然后在浏览器访问：`http://localhost:8000`

---

### 方案 2：使用 VS Code Live Server（⭐ 推荐开发者）

如果你使用 VS Code：

1. 安装扩展 **"Live Server"**（作者：Ritwick Dey）
2. 在 VS Code 中打开项目文件夹
3. 右键点击 `index.html`
4. 选择 **"Open with Live Server"**
5. 浏览器会自动打开，URL 类似 `http://127.0.0.1:5500`

**优点：**
- ✅ 自动刷新
- ✅ 无需命令行
- ✅ 开发友好

---

### 方案 3：使用其他 IDE/编辑器的内置服务器

#### WebStorm / PhpStorm / IntelliJ IDEA
- 右键 `index.html` → **"Open in Browser"**
- IDE 会自动启动内置服务器

#### Brackets
- 点击右上角的 **闪电图标**（Live Preview）

#### Sublime Text
- 安装 **"LiveReload"** 插件

---

### 方案 4：使用在线托管（临时测试）

如果你不想安装任何东西：

1. 访问 [CodeSandbox](https://codesandbox.io/)
2. 创建新项目（Static HTML/CSS/JS）
3. 上传所有文件
4. 在线运行

**注意：** 你的 API Key 会暴露在在线环境，仅用于临时测试！

---

### 方案 5：浏览器扩展禁用 CORS（⚠️ 不推荐）

**警告：** 此方法会降低浏览器安全性，仅用于开发测试！

#### Chrome / Edge：
1. 安装扩展：**"CORS Unblock"** 或 **"Allow CORS"**
2. 启用扩展
3. 刷新页面

#### Firefox：
1. 安装扩展：**"CORS Everywhere"**
2. 点击工具栏图标启用

**用完后记得禁用扩展！**

---

## 🎯 快速开始指南

### 最简单的方法（Windows）：

```
1. 确保已安装 Python（从 https://www.python.org/ 下载）
2. 双击 "启动服务器.bat"
3. 等待浏览器自动打开
4. 开始使用！
```

### 最简单的方法（Mac/Linux）：

```bash
# 在终端中运行
python3 启动服务器.py
```

### 使用 VS Code 的方法：

```
1. 用 VS Code 打开项目文件夹
2. 安装 "Live Server" 扩展
3. 右键 index.html → "Open with Live Server"
4. 搞定！
```

---

## 🔍 检查服务器是否正常

启动服务器后，你应该看到：

```
==================================================
  AI RPG 测试系统 - 本地服务器
==================================================

✓ 服务器已启动
✓ 服务器地址: http://localhost:8000

请在浏览器中打开: http://localhost:8000

按 Ctrl+C 可停止服务器
==================================================
```

然后在浏览器地址栏会显示：
- ✅ `http://localhost:8000` （正确）
- ❌ `file:///D:/测试/index.html` （错误，会有 CORS 问题）

---

## ❓ 常见问题

### Q: 为什么直接打开 HTML 文件不行？

**A:** 浏览器的安全策略禁止 `file://` 协议的页面向外部 API 发送请求。必须通过 HTTP(S) 协议访问。

### Q: 我没有 Python，怎么办？

**A:** 有几个选择：
1. 安装 Python（推荐，免费）：https://www.python.org/downloads/
2. 使用 VS Code + Live Server 扩展（推荐）
3. 如果有 Node.js：`npx http-server -p 8000`

### Q: 端口 8000 被占用了怎么办？

**A:** 换一个端口：
```bash
# Python
python -m http.server 8080

# Node.js
npx http-server -p 8080
```

然后访问 `http://localhost:8080`

### Q: 防火墙提示是否允许？

**A:** 点击**"允许访问"**，这只是本地服务器，不会暴露到互联网。

### Q: 浏览器没有自动打开怎么办？

**A:** 手动在浏览器地址栏输入：`http://localhost:8000`

### Q: 服务器启动后可以关闭命令行窗口吗？

**A:** 不可以！关闭窗口会停止服务器。使用完后按 `Ctrl+C` 停止服务器。

---

## 📱 移动设备访问

如果想在手机/平板上测试：

1. 确保移动设备和电脑在同一 WiFi 网络
2. 查找电脑的 IP 地址：
   - Windows: `ipconfig`（查看 IPv4 地址）
   - Mac/Linux: `ifconfig` 或 `ip addr`
3. 在移动设备浏览器访问：`http://[电脑IP]:8000`
   - 例如：`http://192.168.1.100:8000`

---

## 🔧 技术说明

### 为什么会有 CORS 限制？

CORS（跨域资源共享）是浏览器的安全机制：
- `file://` 协议被视为 `null` 来源
- OpenAI API 不允许来自 `null` 来源的请求
- 通过 HTTP 服务器访问时，来源变成 `http://localhost:8000`，可以正常工作

### 本地服务器安全吗？

✅ **安全**：
- 只在你的电脑上运行
- 只能从本机访问（除非你主动配置）
- 不会暴露到互联网
- 停止服务器后立即失效

---

## 🎉 总结

**推荐方案排序：**

1. 🥇 **VS Code + Live Server**（最方便，自动刷新）
2. 🥈 **双击 启动服务器.bat**（最简单）
3. 🥉 **命令行运行 Python 服务器**（最通用）

选择最适合你的方法，开始享受 AI RPG 吧！

---

## 📚 相关资源

- [Python 官网](https://www.python.org/)
- [VS Code 下载](https://code.visualstudio.com/)
- [Node.js 官网](https://nodejs.org/)
- [Live Server 扩展](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

---

**如果还有问题，请查看 `故障排除指南.md`** 📖


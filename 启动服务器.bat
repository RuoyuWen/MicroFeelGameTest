@echo off
chcp 65001 >nul
echo ====================================
echo   AI RPG 测试系统 - 代理服务器
echo ====================================
echo.

echo 正在检查 Python...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 已找到 Python
    echo.
    echo 启动代理服务器（解决 CORS 问题）...
    echo 正在查找可用端口...
    echo.
    python proxy_server.py
    goto :end
)

echo × 未找到 Python
echo.
echo 请安装 Python 或使用以下替代方法：
echo.
echo 方法1: 安装 Python
echo   下载地址: https://www.python.org/downloads/
echo.
echo 方法2: 使用 Node.js
echo   运行: npx http-server -p 8000
echo.
echo 方法3: 使用 VS Code
echo   安装 "Live Server" 扩展，右键点击 index.html 选择 "Open with Live Server"
echo.
pause

:end


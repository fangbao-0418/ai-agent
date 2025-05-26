@echo off
echo 🚀 启动 Browser Use 开发环境...

REM 检查 Node.js 版本
echo 检查 Node.js 版本...
node --version

echo.
echo 📡 启动后端服务器...
cd src\node
if not exist "node_modules" (
    echo 📦 安装后端依赖...
    call npm install
)
start /b npm run dev
cd ..\..

timeout /t 3 /nobreak >nul

echo.
echo 🎨 启动前端服务器...
cd src\client
if not exist "node_modules" (
    echo 📦 安装前端依赖...
    call npm install
)
start /b npm run dev
cd ..\..

echo.
echo 🎉 开发环境启动完成！
echo.
echo 📱 前端界面: http://localhost:3000
echo 🔌 后端 API: http://localhost:8080
echo 📋 健康检查: http://localhost:8080/health
echo.
echo 💡 提示：
echo    - 前端使用 rsbuild 构建
echo    - 后端使用 Socket.io 通信
echo    - 按 Ctrl+C 停止服务
echo.

pause 
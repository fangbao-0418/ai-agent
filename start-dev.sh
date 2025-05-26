#!/bin/bash

echo "🚀 启动 Browser Use 开发环境..."

# 检查 Node.js 版本
echo "检查 Node.js 版本..."
node --version

# 函数：启动后端服务
start_backend() {
    echo "📡 启动后端服务器..."
    cd src/node
    if [ ! -d "node_modules" ]; then
        echo "📦 安装后端依赖..."
        npm install
    fi
    npm run dev &
    BACKEND_PID=$!
    cd ../..
    echo "✅ 后端服务已启动 (PID: $BACKEND_PID)"
}

# 函数：启动前端服务
start_frontend() {
    echo "🎨 启动前端服务器..."
    cd src/client
    if [ ! -d "node_modules" ]; then
        echo "📦 安装前端依赖..."
        npm install
    fi
    sleep 3  # 等待后端启动
    npm run dev &
    FRONTEND_PID=$!
    cd ../..
    echo "✅ 前端服务已启动 (PID: $FRONTEND_PID)"
}

# 优雅退出处理
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "❌ 后端服务已停止"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "❌ 前端服务已停止"
    fi
    echo "👋 开发环境已关闭"
    exit 0
}

# 捕获退出信号
trap cleanup SIGINT SIGTERM

# 启动服务
start_backend
start_frontend

echo ""
echo "🎉 开发环境启动完成！"
echo ""
echo "📱 前端界面: http://localhost:3000"
echo "🔌 后端 API: http://localhost:8080"
echo "📋 健康检查: http://localhost:8080/health"
echo ""
echo "💡 提示："
echo "   - 前端使用 rsbuild 构建"
echo "   - 后端使用 Socket.io 通信"
echo "   - 按 Ctrl+C 停止所有服务"
echo ""

# 等待用户中断
wait 
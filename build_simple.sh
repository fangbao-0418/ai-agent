#!/bin/bash

set -e

echo "⚡ === 快速部署脚本 ==="

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📋 配置:"
echo "  - 项目目录: $PROJECT_ROOT"
echo "  - 模式: 直接部署已编译代码"

# 创建部署目录
DEPLOY_DIR="$PROJECT_ROOT/deployed_app"
NODE_DIR="$PROJECT_ROOT/src/node"

echo ""
echo "📦 步骤1: 检查Node.js构建..."
cd "$NODE_DIR"

if [ ! -d "dist" ]; then
    echo "🔨 编译TypeScript..."
    npm run build
fi

echo "✅ TypeScript已编译"

echo ""
echo "📂 步骤2: 创建部署目录..."
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/data/config"
mkdir -p "$DEPLOY_DIR/data/download"
mkdir -p "$DEPLOY_DIR/data/logs"

# 复制已编译的代码
echo "📋 复制应用文件..."
cp -r dist/* "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"

# 创建简化的package.json（移除有问题的依赖）
echo "📝 创建生产版package.json..."
cat > "$DEPLOY_DIR/package.json" << 'EOF'
{
  "name": "cppnodeapp-server",
  "version": "1.0.0",
  "description": "CppNodeApp Backend Service",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "helmet": "^6.0.0",
    "compression": "^1.7.4"
  }
}
EOF

echo ""
echo "📄 步骤3: 创建配置和启动脚本..."

# 创建配置文件
cat > "$DEPLOY_DIR/data/config/app.json" << 'EOF'
{
  "name": "CppNodeApp",
  "version": "1.0.0",
  "description": "Node.js backend service",
  "settings": {
    "node": {
      "port": 3000,
      "host": "0.0.0.0"
    },
    "logging": {
      "level": "info",
      "file": "data/logs/app.log"
    }
  }
}
EOF

# 创建启动脚本
cat > "$DEPLOY_DIR/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 启动CppNodeApp服务..."
echo "📍 工作目录: $(pwd)"
echo "🌐 服务地址: http://localhost:3000"
echo "📊 健康检查: http://localhost:3000/health"
echo ""

# 设置环境变量
export NODE_DIR="$(pwd)/data"
export PORT=3000

# 启动服务
node index.js "$@"
EOF

chmod +x "$DEPLOY_DIR/start.sh"

# 创建开发启动脚本（带调试）
cat > "$DEPLOY_DIR/start_dev.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"

echo "🔧 启动CppNodeApp服务 (开发模式)..."
echo "📍 工作目录: $(pwd)"
echo "🌐 服务地址: http://localhost:3000"
echo "📊 健康检查: http://localhost:3000/health"
echo ""

# 设置环境变量
export NODE_DIR="$(pwd)/data"
export PORT=3000
export DEBUG=1
export NODE_ENV=development

# 启动服务
node --inspect index.js "$@"
EOF

chmod +x "$DEPLOY_DIR/start_dev.sh"

# 创建停止脚本
cat > "$DEPLOY_DIR/stop.sh" << 'EOF'
#!/bin/bash
echo "🛑 停止CppNodeApp服务..."
pkill -f "node.*index.js" && echo "✅ 服务已停止" || echo "❗ 服务未运行或已停止"
EOF

chmod +x "$DEPLOY_DIR/stop.sh"

# 创建测试脚本
cat > "$DEPLOY_DIR/test.sh" << 'EOF'
#!/bin/bash
echo "🧪 测试CppNodeApp服务..."

# 等待服务启动
sleep 2

# 测试健康检查端点
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ 健康检查通过"
    curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/health
else
    echo "❌ 健康检查失败"
    echo "请确保服务正在运行: ./start.sh"
    exit 1
fi
EOF

chmod +x "$DEPLOY_DIR/test.sh"

# 创建README
cat > "$DEPLOY_DIR/README.md" << EOF
# CppNodeApp Backend Service

这是一个轻量级的Node.js后端服务，提供Web API接口。

## 🚀 快速开始

### 启动服务
\`\`\`bash
./start.sh
\`\`\`

### 开发模式启动
\`\`\`bash
./start_dev.sh
\`\`\`

### 停止服务
\`\`\`bash
./stop.sh
\`\`\`

### 测试服务
\`\`\`bash
./test.sh
\`\`\`

## 📡 API端点

- **健康检查**: \`GET http://localhost:3000/health\`
- **基础信息**: \`GET http://localhost:3000/\`

## 📁 目录结构

\`\`\`
deployed_app/
├── index.js           # 主程序
├── start.sh           # 启动脚本
├── start_dev.sh       # 开发模式启动
├── stop.sh            # 停止脚本
├── test.sh            # 测试脚本
├── data/              # 应用数据
│   ├── config/        # 配置文件
│   ├── download/      # 下载文件
│   └── logs/          # 日志文件
└── README.md          # 说明文档
\`\`\`

## ⚙️ 配置

编辑 \`data/config/app.json\` 来修改服务配置。

## 🔧 环境变量

- \`NODE_DIR\`: 数据目录路径
- \`PORT\`: 服务端口（默认3000）
- \`DEBUG\`: 调试模式
- \`NODE_ENV\`: 运行环境

## 📊 日志

- 应用日志: \`data/logs/app.log\`
- 控制台输出: 实时显示

## 🌐 网络

服务默认监听所有网络接口（0.0.0.0:3000），可以通过以下方式访问：

- 本地: http://localhost:3000
- 局域网: http://{your-ip}:3000

---

构建时间: $(date)
EOF

echo ""
echo "🎉 === 部署完成! ==="
echo "📍 应用目录: $DEPLOY_DIR"
echo ""
echo "🚀 启动服务:"
echo "  cd $DEPLOY_DIR"
echo "  ./start.sh"
echo ""
echo "📋 可用命令:"
echo "  ./start.sh     - 启动服务"
echo "  ./start_dev.sh - 开发模式启动"
echo "  ./stop.sh      - 停止服务"
echo "  ./test.sh      - 测试服务"
echo ""
echo "🌐 服务地址:"
echo "  http://localhost:3000"
echo "  http://localhost:3000/health"
echo ""
echo "💡 提示:"
echo "  - 这是轻量级部署版本，避免了依赖编译问题"
echo "  - 如需要完整功能，请在目标环境安装对应依赖"
echo "  - 支持跨平台部署（需要Node.js运行时）"

echo ""
echo "✨ 准备就绪！现在可以启动您的服务了。" 
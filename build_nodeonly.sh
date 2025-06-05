#!/bin/bash

set -e

echo "🟢 === Node.js独立服务构建工具 ==="

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_MODE="${1:-portable}"  # 默认便携版

echo "📋 构建配置:"
echo "  - 项目目录: $PROJECT_ROOT"
echo "  - 构建模式: $BUILD_MODE"
echo "  - 目标: Node.js服务"

# 检查Node.js环境
echo "🔍 检查Node.js环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装"
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo "✅ Node.js: $NODE_VERSION"
echo "✅ npm: $NPM_VERSION"

# 创建输出目录
DIST_DIR="$PROJECT_ROOT/dist_node"
NODE_DIR="$PROJECT_ROOT/src/node"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

echo ""
echo "📦 步骤1: 构建Node.js应用..."
cd "$NODE_DIR"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📥 安装Node.js依赖..."
    npm install
fi

# 构建TypeScript
echo "🔨 编译TypeScript..."
npm run build

echo ""
echo "📦 步骤2: 打包应用..."

if [ "$BUILD_MODE" = "full" ]; then
    echo "🚀 创建独立可执行文件..."
    
    # 安装pkg如果需要
    if ! command -v pkg &> /dev/null; then
        echo "📦 安装pkg工具..."
        npm install -g pkg
    fi
    
    # 打包为独立可执行文件
    echo "📦 打包中..."
    pkg dist/index.js --out-path "$DIST_DIR" --targets node18-macos-x64
    
    # 检查打包结果
    if [ -f "$DIST_DIR/index-macos" ]; then
        chmod +x "$DIST_DIR/index-macos"
        echo "✅ 独立可执行文件已创建"
        EXECUTABLE="./index-macos"
    else
        echo "❌ 打包失败"
        exit 1
    fi
else
    echo "📁 复制源代码..."
    
    # 复制构建结果
    cp -r dist/* "$DIST_DIR/"
    cp package.json "$DIST_DIR/"
    
    # 安装生产依赖
    cd "$DIST_DIR"
    echo "📥 安装生产依赖..."
    npm install --production
    
    EXECUTABLE="node index.js"
fi

echo ""
echo "📂 步骤3: 创建应用程序结构..."

# 创建应用目录
APP_DIR="$DIST_DIR/CppNodeApp"
mkdir -p "$APP_DIR/data/config"
mkdir -p "$APP_DIR/data/download"
mkdir -p "$APP_DIR/data/logs"

# 移动文件到应用目录
if [ "$BUILD_MODE" = "full" ]; then
    mv "$DIST_DIR/index-macos" "$APP_DIR/"
else
    mv "$DIST_DIR"/* "$APP_DIR/" 2>/dev/null || cp -r "$DIST_DIR"/* "$APP_DIR/"
fi

echo ""
echo "📄 步骤4: 创建配置和启动脚本..."

# 创建配置文件
cat > "$APP_DIR/data/config/app.json" << EOF
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
if [ "$BUILD_MODE" = "full" ]; then
    cat > "$APP_DIR/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 启动CppNodeApp服务..."
echo "📍 工作目录: $(pwd)"
echo "🌐 服务地址: http://localhost:3000"
echo ""
./index-macos --node-dir "$(pwd)/data"
EOF
else
    cat > "$APP_DIR/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 启动CppNodeApp服务..."
echo "📍 工作目录: $(pwd)"
echo "🌐 服务地址: http://localhost:3000"
echo ""
node index.js --node-dir "$(pwd)/data"
EOF
fi

chmod +x "$APP_DIR/start.sh"

# 创建停止脚本
cat > "$APP_DIR/stop.sh" << 'EOF'
#!/bin/bash
echo "🛑 停止CppNodeApp服务..."
pkill -f "node.*index.js" || pkill -f "index-macos" || echo "服务未运行"
echo "✅ 服务已停止"
EOF

chmod +x "$APP_DIR/stop.sh"

# 创建macOS服务启动器
cat > "$APP_DIR/install_service.sh" << 'EOF'
#!/bin/bash
SERVICE_NAME="com.cppnodeapp.service"
SERVICE_FILE="$HOME/Library/LaunchAgents/$SERVICE_NAME.plist"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "📝 创建macOS启动服务..."

# 创建plist文件
cat > "$SERVICE_FILE" << EOF_PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$SERVICE_NAME</string>
    <key>ProgramArguments</key>
    <array>
        <string>$APP_DIR/start.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$APP_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$APP_DIR/data/logs/service.log</string>
    <key>StandardErrorPath</key>
    <string>$APP_DIR/data/logs/service_error.log</string>
</dict>
</plist>
EOF_PLIST

# 加载服务
launchctl load "$SERVICE_FILE"
echo "✅ 服务已安装并启动"
echo "📄 配置文件: $SERVICE_FILE"
echo "📊 查看状态: launchctl list | grep cppnodeapp"
echo "🗑️  卸载服务: launchctl unload $SERVICE_FILE"
EOF

chmod +x "$APP_DIR/install_service.sh"

# 创建README
cat > "$APP_DIR/README.md" << EOF
# CppNodeApp Node.js服务

这是CppNodeApp的Node.js后端服务。

## 🚀 启动服务

### 手动启动
\`\`\`bash
./start.sh
\`\`\`

### 停止服务
\`\`\`bash
./stop.sh
\`\`\`

### 安装为系统服务
\`\`\`bash
./install_service.sh
\`\`\`

## 📡 访问服务

- 服务地址: http://localhost:3000
- 健康检查: http://localhost:3000/health
- API文档: http://localhost:3000/docs

## 📁 目录结构

\`\`\`
CppNodeApp/
├── start.sh           # 启动脚本
├── stop.sh            # 停止脚本
├── install_service.sh # 安装系统服务
├── data/              # 应用数据
│   ├── config/        # 配置文件
│   ├── download/      # 下载文件
│   └── logs/          # 日志文件
└── README.md          # 说明文档
\`\`\`

## ⚙️ 配置

编辑 \`data/config/app.json\` 来修改服务配置。

## 📊 日志

- 应用日志: \`data/logs/app.log\`
- 服务日志: \`data/logs/service.log\` (如果作为系统服务运行)

构建时间: $(date)
构建模式: $BUILD_MODE
EOF

echo ""
echo "🎉 === 构建完成! ==="
echo "📍 应用目录: $APP_DIR"
echo ""
echo "🚀 快速启动:"
echo "  cd $APP_DIR"
echo "  ./start.sh"
echo ""
echo "🌐 服务将在以下地址运行:"
echo "  http://localhost:3000"
echo ""
echo "📋 可用命令:"
echo "  ./start.sh           - 启动服务"
echo "  ./stop.sh            - 停止服务"
echo "  ./install_service.sh - 安装为系统服务"
echo ""

if [ "$BUILD_MODE" = "portable" ]; then
    echo "📝 注意: 便携版需要目标系统安装Node.js"
else
    echo "📦 独立版本，无需额外依赖"
fi

echo ""
echo "✨ 享受您的Node.js服务!" 
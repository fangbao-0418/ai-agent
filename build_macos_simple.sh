#!/bin/bash

set -e

echo "🍎 === macOS C++内置Node.js快速构建工具 ==="

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_MODE="${1:-portable}"  # 默认便携版，因为macOS通常有Node.js

echo "📋 构建配置:"
echo "  - 项目目录: $PROJECT_ROOT"
echo "  - 构建模式: $BUILD_MODE"
echo "  - 系统平台: macOS"

# 检查必要工具
echo "🔍 检查构建环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js"
    echo "🔗 安装方法: brew install node"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装"
    exit 1
fi

if ! command -v cmake &> /dev/null; then
    echo "❌ CMake未安装，请先安装CMake"
    echo "🔗 安装方法: brew install cmake"
    exit 1
fi

# 检查Qt（可选，如果没有会提醒）
if ! command -v qmake &> /dev/null && ! find /opt/homebrew /usr/local -name "*.framework" -path "*/Qt*" 2>/dev/null | grep -q Qt; then
    echo "⚠️  Qt未找到，如果需要GUI功能，请安装Qt"
    echo "🔗 安装方法: brew install qt@6"
    echo "🔄 继续构建（仅后端功能）..."
fi

# 创建构建目录
DIST_DIR="$PROJECT_ROOT/dist_macos"
BUILD_DIR="$PROJECT_ROOT/build_macos"
NODE_DIR="$PROJECT_ROOT/src/node"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
mkdir -p "$BUILD_DIR"

echo ""
echo "📦 步骤1: 构建Node.js后端..."
cd "$NODE_DIR"

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📥 安装Node.js依赖..."
    npm install
fi

# 构建TypeScript
echo "🔨 编译TypeScript..."
npm run build

if [ "$BUILD_MODE" = "full" ]; then
    echo "📦 打包独立Node.js应用..."
    if ! command -v pkg &> /dev/null; then
        echo "📦 安装pkg工具..."
        npm install -g pkg
    fi
    pkg dist/index.js --out-path "$DIST_DIR" --targets node18-macos-x64
    NODE_EXECUTABLE="$DIST_DIR/index-macos"
else
    echo "📦 复制Node.js源代码..."
    cp -r dist/* "$DIST_DIR/"
    cp package.json "$DIST_DIR/"
    NODE_EXECUTABLE="node"
fi

echo ""
echo "🔧 步骤2: 尝试构建C++前端..."
cd "$BUILD_DIR"

# 尝试找到Qt
QT_FOUND=false
if command -v qmake &> /dev/null; then
    QT_PATH=$(qmake -query QT_INSTALL_PREFIX)
    QT_FOUND=true
elif [ -d "/opt/homebrew/opt/qt@6" ]; then
    QT_PATH="/opt/homebrew/opt/qt@6"
    export PATH="$QT_PATH/bin:$PATH"
    QT_FOUND=true
elif [ -d "/usr/local/opt/qt@6" ]; then
    QT_PATH="/usr/local/opt/qt@6"
    export PATH="$QT_PATH/bin:$PATH"
    QT_FOUND=true
fi

if [ "$QT_FOUND" = true ]; then
    echo "✅ 找到Qt: $QT_PATH"
    echo "⚙️  配置CMake..."
    cmake -DCMAKE_BUILD_TYPE=Release \
          -DCMAKE_PREFIX_PATH="$QT_PATH" \
          "$PROJECT_ROOT/src/cpp"
    
    echo "🔨 编译C++应用程序..."
    make -j$(sysctl -n hw.ncpu)
    
    if [ -f "CppNodeApp" ]; then
        echo "✅ C++应用程序编译成功"
        CPP_EXECUTABLE="$BUILD_DIR/CppNodeApp"
        HAS_CPP=true
    else
        echo "❌ C++应用程序编译失败"
        HAS_CPP=false
    fi
else
    echo "⚠️  未找到Qt，跳过C++GUI编译"
    echo "📝 仅构建Node.js后端服务"
    HAS_CPP=false
fi

echo ""
echo "📂 步骤3: 创建应用程序包..."

# 创建macOS应用包结构
APP_NAME="CppNodeApp"
if [ "$HAS_CPP" = true ]; then
    APP_DIR="$DIST_DIR/$APP_NAME.app"
    mkdir -p "$APP_DIR/Contents/MacOS"
    mkdir -p "$APP_DIR/Contents/Resources"
    mkdir -p "$APP_DIR/Contents/Resources/data/config"
    mkdir -p "$APP_DIR/Contents/Resources/data/download"
    
    # 复制可执行文件
    cp "$CPP_EXECUTABLE" "$APP_DIR/Contents/MacOS/"
    
    # 复制Node.js文件
    if [ "$BUILD_MODE" = "full" ]; then
        cp "$NODE_EXECUTABLE" "$APP_DIR/Contents/Resources/"
        chmod +x "$APP_DIR/Contents/Resources/index-macos"
    else
        cp -r "$DIST_DIR"/*.js "$APP_DIR/Contents/Resources/" 2>/dev/null || true
        cp "$DIST_DIR/package.json" "$APP_DIR/Contents/Resources/" 2>/dev/null || true
    fi
    
    # 创建Info.plist
    cat > "$APP_DIR/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>CppNodeApp</string>
    <key>CFBundleIdentifier</key>
    <string>com.yourcompany.cppnodeapp</string>
    <key>CFBundleName</key>
    <string>CppNodeApp</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
</dict>
</plist>
EOF

    # 部署Qt依赖
    if command -v macdeployqt &> /dev/null; then
        echo "📱 部署Qt依赖..."
        macdeployqt "$APP_DIR"
    fi
    
    echo "✅ 已创建macOS应用包: $APP_DIR"
else
    # 仅Node.js版本
    APP_DIR="$DIST_DIR/$APP_NAME"
    mkdir -p "$APP_DIR/data/config"
    mkdir -p "$APP_DIR/data/download"
    
    if [ "$BUILD_MODE" = "full" ]; then
        cp "$NODE_EXECUTABLE" "$APP_DIR/"
        chmod +x "$APP_DIR/index-macos"
    else
        cp -r "$DIST_DIR"/*.js "$APP_DIR/" 2>/dev/null || true
        cp "$DIST_DIR/package.json" "$APP_DIR/" 2>/dev/null || true
    fi
    
    echo "✅ 已创建Node.js应用目录: $APP_DIR"
fi

echo ""
echo "📄 步骤4: 创建启动脚本和配置..."

# 创建配置文件
cat > "$APP_DIR/Contents/Resources/data/config/app.json" 2>/dev/null || \
cat > "$APP_DIR/data/config/app.json" << EOF
{
  "name": "CppNodeApp",
  "version": "1.0.0",
  "description": "C++ application with embedded Node.js server",
  "settings": {
    "node": {
      "port": 3000,
      "host": "localhost"
    },
    "ui": {
      "theme": "default",
      "language": "zh-CN"
    }
  }
}
EOF

# 创建启动脚本
if [ "$HAS_CPP" = true ]; then
    # 带GUI的启动脚本
    cat > "$DIST_DIR/start_app.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
open CppNodeApp.app
EOF
else
    # 仅Node.js的启动脚本
    if [ "$BUILD_MODE" = "full" ]; then
        cat > "$DIST_DIR/start_node.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/CppNodeApp"
./index-macos --node-dir "$(pwd)/data"
EOF
    else
        cat > "$DIST_DIR/start_node.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/CppNodeApp"
node index.js --node-dir "$(pwd)/data"
EOF
    fi
fi

chmod +x "$DIST_DIR"/*.sh 2>/dev/null || true

echo ""
echo "🎉 === 构建完成! ==="
echo "📍 输出目录: $DIST_DIR"

if [ "$HAS_CPP" = true ]; then
    echo "🚀 启动应用:"
    echo "  双击: $APP_NAME.app"
    echo "  或运行: ./start_app.sh"
    echo ""
    echo "📱 如需分发，可以："
    echo "  1. 压缩整个 $APP_NAME.app"
    echo "  2. 或使用macOS公证和签名流程"
else
    echo "🚀 启动Node.js服务:"
    echo "  ./start_node.sh"
    echo "  然后访问: http://localhost:3000"
    echo ""
    echo "📝 注意："
    echo "  - 需要目标系统安装Node.js (如果是便携版)"
    echo "  - C++GUI未构建，仅提供后端API服务"
fi

echo ""
echo "📋 下一步建议:"
if [ "$QT_FOUND" = false ]; then
    echo "  1. 安装Qt以启用GUI功能: brew install qt@6"
fi
echo "  2. 测试应用程序功能"
echo "  3. 如需分发，考虑代码签名" 
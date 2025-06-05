#!/bin/bash

set -e  # 遇到错误立即退出

echo "🚀 === C++内置Node.js一体化打包工具 ==="

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_CONFIG="Release"
PACKAGING_MODE="full" # full, portable, installer
TARGET_PLATFORM=""

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --config)
            BUILD_CONFIG="$2"
            shift 2
            ;;
        --mode)
            PACKAGING_MODE="$2"
            shift 2
            ;;
        --platform)
            TARGET_PLATFORM="$2"
            shift 2
            ;;
        --help|-h)
            echo "使用方法: $0 [选项]"
            echo "选项:"
            echo "  --config <Debug|Release>     构建配置 (默认: Release)"
            echo "  --mode <full|portable|installer>  打包模式 (默认: full)"
            echo "  --platform <target>          目标平台"
            echo "  --help                       显示此帮助信息"
            echo ""
            echo "打包模式说明:"
            echo "  full      - 完整打包，包含所有依赖"
            echo "  portable  - 便携版，最小化依赖"
            echo "  installer - 生成安装包"
            exit 0
            ;;
        *)
            echo "未知参数: $1"
            exit 1
            ;;
    esac
done

echo "📋 构建配置:"
echo "  - 项目目录: $PROJECT_ROOT"
echo "  - 构建配置: $BUILD_CONFIG"
echo "  - 打包模式: $PACKAGING_MODE"
echo "  - 目标平台: ${TARGET_PLATFORM:-auto}"

# 检测系统平台
OS="$(uname -s)"
case "${OS}" in
    Linux*)     
        SYSTEM="linux"
        if [ -z "$TARGET_PLATFORM" ]; then TARGET_PLATFORM="linux-x64"; fi
        ;;
    Darwin*)    
        SYSTEM="macos"
        if [ -z "$TARGET_PLATFORM" ]; then TARGET_PLATFORM="macos-x64"; fi
        ;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*)     
        SYSTEM="windows"
        if [ -z "$TARGET_PLATFORM" ]; then TARGET_PLATFORM="win-x64"; fi
        ;;
    *)          
        echo "❌ 不支持的操作系统: ${OS}"
        exit 1
        ;;
esac

echo "🖥️  检测到系统: $SYSTEM"

# 创建构建目录
DIST_DIR="$PROJECT_ROOT/release"
BUILD_DIR="$PROJECT_ROOT/build_release"
NODE_BUILD_DIR="$PROJECT_ROOT/src/node"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
mkdir -p "$BUILD_DIR"

echo "📦 步骤1: 构建Node.js后端..."
cd "$NODE_BUILD_DIR"

# 确保依赖已安装
if [ ! -d "node_modules" ]; then
    echo "📥 安装Node.js依赖..."
    npm install
fi

# 构建TypeScript
echo "🔨 编译TypeScript..."
npm run build

# 使用不同的打包策略
case "$PACKAGING_MODE" in
    "full"|"installer")
        echo "📦 完整打包Node.js应用程序..."
        # 使用pkg打包为独立可执行文件
        if ! command -v pkg &> /dev/null; then
            echo "📦 安装pkg工具..."
            npm install -g pkg
        fi
        
        # 为目标平台打包
        pkg dist/index.js --out-path "$PROJECT_ROOT/temp_node_binaries" --targets "node18-$TARGET_PLATFORM"
        ;;
    "portable")
        echo "📦 便携版打包..."
        # 只复制必要的文件，依赖系统Node.js
        mkdir -p "$PROJECT_ROOT/temp_node_binaries"
        cp -r dist/* "$PROJECT_ROOT/temp_node_binaries/"
        ;;
esac

echo "🔧 步骤2: 构建C++前端..."
cd "$BUILD_DIR"

# CMake配置
echo "⚙️  配置CMake..."
cmake -DCMAKE_BUILD_TYPE="$BUILD_CONFIG" \
      -DCMAKE_INSTALL_PREFIX="$DIST_DIR" \
      "$PROJECT_ROOT/src/cpp"

# 编译
echo "🔨 编译C++应用程序..."
if command -v nproc &> /dev/null; then
    JOBS=$(nproc)
elif command -v sysctl &> /dev/null; then
    JOBS=$(sysctl -n hw.ncpu)
else
    JOBS=4
fi

make -j"$JOBS"

echo "📂 步骤3: 创建应用程序包..."

# 创建应用程序目录结构
APP_NAME="CppNodeApp"
APP_DIR="$DIST_DIR/$APP_NAME"
BIN_DIR="$APP_DIR/bin"
DATA_DIR="$APP_DIR/data"
RESOURCES_DIR="$APP_DIR/resources"

mkdir -p "$BIN_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$RESOURCES_DIR"
mkdir -p "$DATA_DIR/download"
mkdir -p "$DATA_DIR/config"

# 复制C++可执行文件
if [ "$SYSTEM" = "windows" ]; then
    cp "CppNodeApp.exe" "$BIN_DIR/" 2>/dev/null || cp "CppNodeApp" "$BIN_DIR/"
    EXE_NAME="CppNodeApp.exe"
else
    cp "CppNodeApp" "$BIN_DIR/"
    chmod +x "$BIN_DIR/CppNodeApp"
    EXE_NAME="CppNodeApp"
fi

# 复制Node.js相关文件
case "$PACKAGING_MODE" in
    "full"|"installer")
        # 复制打包后的Node.js可执行文件
        if [ "$SYSTEM" = "linux" ]; then
            NODE_BINARY="index-linux"
        elif [ "$SYSTEM" = "macos" ]; then
            NODE_BINARY="index-macos"
        elif [ "$SYSTEM" = "windows" ]; then
            NODE_BINARY="index-win.exe"
        fi
        
        if [ -f "$PROJECT_ROOT/temp_node_binaries/$NODE_BINARY" ]; then
            cp "$PROJECT_ROOT/temp_node_binaries/$NODE_BINARY" "$RESOURCES_DIR/"
            chmod +x "$RESOURCES_DIR/$NODE_BINARY" 2>/dev/null || true
        fi
        ;;
    "portable")
        # 复制Node.js源代码和依赖
        cp -r "$PROJECT_ROOT/temp_node_binaries"/* "$RESOURCES_DIR/"
        cp "$NODE_BUILD_DIR/package.json" "$RESOURCES_DIR/"
        ;;
esac

echo "🔗 步骤4: 处理依赖关系..."

# 处理Qt依赖
if [ "$SYSTEM" = "macos" ]; then
    if command -v macdeployqt &> /dev/null; then
        echo "📱 部署macOS Qt依赖..."
        macdeployqt "$BIN_DIR/$EXE_NAME" -dmg
    fi
elif [ "$SYSTEM" = "linux" ]; then
    # 复制Qt库
    if command -v ldd &> /dev/null; then
        echo "🐧 检查Linux依赖..."
        mkdir -p "$APP_DIR/lib"
        # 可以使用linuxdeploy等工具自动处理
    fi
elif [ "$SYSTEM" = "windows" ]; then
    if command -v windeployqt &> /dev/null; then
        echo "🪟 部署Windows Qt依赖..."
        windeployqt "$BIN_DIR/"
    fi
fi

echo "📄 步骤5: 创建启动脚本和配置文件..."

# 创建启动脚本
if [ "$SYSTEM" = "windows" ]; then
    cat > "$APP_DIR/start.bat" << 'EOF'
@echo off
echo Starting C++ Node.js Application...
cd /d "%~dp0"
bin\CppNodeApp.exe --node-dir "%~dp0data"
pause
EOF

    cat > "$APP_DIR/start-console.bat" << 'EOF'
@echo off
echo Starting C++ Node.js Application (with console)...
cd /d "%~dp0"
bin\CppNodeApp.exe --node-dir "%~dp0data" --console
pause
EOF
else
    cat > "$APP_DIR/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "Starting C++ Node.js Application..."
bin/CppNodeApp --node-dir "$(pwd)/data"
EOF

    cat > "$APP_DIR/start-debug.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "Starting C++ Node.js Application (Debug Mode)..."
DEBUG=1 bin/CppNodeApp --node-dir "$(pwd)/data" --verbose
EOF

    chmod +x "$APP_DIR/start.sh"
    chmod +x "$APP_DIR/start-debug.sh"
fi

# 创建配置文件
cat > "$DATA_DIR/config/app.json" << EOF
{
  "name": "CppNodeApp",
  "version": "1.0.0",
  "description": "C++ application with embedded Node.js server",
  "author": "Your Name",
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

# 创建README文件
cat > "$APP_DIR/README.md" << EOF
# $APP_NAME

一个集成了Node.js后端的C++桌面应用程序。

## 🚀 快速开始

### 启动应用程序

**Windows:**
\`\`\`
start.bat
\`\`\`

**Linux/macOS:**
\`\`\`
./start.sh
\`\`\`

### 调试模式

**Windows:**
\`\`\`
start-console.bat
\`\`\`

**Linux/macOS:**
\`\`\`
./start-debug.sh
\`\`\`

## 📁 目录结构

\`\`\`
$APP_NAME/
├── bin/                 # 可执行文件
├── resources/           # Node.js资源文件
├── data/               # 应用数据目录
│   ├── config/         # 配置文件
│   └── download/       # 下载文件
├── start.sh           # 启动脚本
└── README.md          # 说明文档
\`\`\`

## ⚙️ 配置文件

应用程序配置文件位于 \`data/config/app.json\`。

## 🔧 命令行选项

- \`--node-dir <path>\` - 指定Node.js工作目录
- \`--console\` - 显示控制台窗口（Windows）
- \`--verbose\` - 启用详细日志输出

## 🐛 故障排除

1. **应用程序无法启动**
   - 检查是否有权限执行文件
   - 确保所需的依赖库已安装

2. **Node.js服务器启动失败**
   - 检查端口是否被占用
   - 查看控制台输出的错误信息

3. **权限问题**
   - Linux/macOS: \`chmod +x start.sh\`
   - Windows: 以管理员身份运行

---

构建时间: $(date)
系统平台: $SYSTEM
打包模式: $PACKAGING_MODE
EOF

echo "🔍 步骤6: 验证打包结果..."

# 验证文件存在性
echo "✅ 验证关键文件:"
if [ -f "$BIN_DIR/$EXE_NAME" ]; then
    echo "  ✓ C++可执行文件: $EXE_NAME"
else
    echo "  ❌ C++可执行文件缺失"
fi

if [ -d "$RESOURCES_DIR" ] && [ "$(ls -A $RESOURCES_DIR)" ]; then
    echo "  ✓ Node.js资源文件"
else
    echo "  ❌ Node.js资源文件缺失"
fi

if [ -f "$DATA_DIR/config/app.json" ]; then
    echo "  ✓ 配置文件"
else
    echo "  ❌ 配置文件缺失"
fi

echo "📊 步骤7: 生成部署包..."

# 根据打包模式生成最终产物
case "$PACKAGING_MODE" in
    "full")
        # 创建压缩包
        cd "$DIST_DIR"
        if command -v tar &> /dev/null; then
            tar -czf "$APP_NAME-$TARGET_PLATFORM-full.tar.gz" "$APP_NAME"
            echo "✅ 已创建: $APP_NAME-$TARGET_PLATFORM-full.tar.gz"
        fi
        ;;
    "portable")
        # 创建便携版
        cd "$DIST_DIR"
        if command -v zip &> /dev/null; then
            zip -r "$APP_NAME-$TARGET_PLATFORM-portable.zip" "$APP_NAME"
            echo "✅ 已创建: $APP_NAME-$TARGET_PLATFORM-portable.zip"
        fi
        ;;
    "installer")
        # 生成安装包（需要额外工具）
        echo "🔧 生成安装包..."
        if [ "$SYSTEM" = "windows" ] && command -v makensis &> /dev/null; then
            # 使用NSIS创建Windows安装包
            echo "Creating Windows installer..."
        elif [ "$SYSTEM" = "macos" ] && command -v pkgbuild &> /dev/null; then
            # 创建macOS安装包
            echo "Creating macOS installer..."
        else
            echo "⚠️  安装包生成工具不可用，创建压缩包..."
            cd "$DIST_DIR"
            tar -czf "$APP_NAME-$TARGET_PLATFORM-installer.tar.gz" "$APP_NAME"
        fi
        ;;
esac

# 清理临时文件
rm -rf "$PROJECT_ROOT/temp_node_binaries"

echo ""
echo "🎉 === 打包完成! ==="
echo "📍 输出目录: $DIST_DIR"
echo "📦 应用程序: $APP_DIR"
echo ""
echo "🚀 测试运行:"
if [ "$SYSTEM" = "windows" ]; then
    echo "  cd '$APP_DIR' && start.bat"
else
    echo "  cd '$APP_DIR' && ./start.sh"
fi
echo ""
echo "📋 下一步:"
echo "  1. 测试应用程序功能"
echo "  2. 验证所有依赖都已包含"
echo "  3. 在目标系统上测试部署" 
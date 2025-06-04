#!/bin/bash

set -e  # 遇到错误立即退出

echo "=== 开始构建嵌入式C++/Node.js应用程序 ==="

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "项目根目录: $PROJECT_ROOT"

# 创建必要的目录
mkdir -p "$PROJECT_ROOT/dist"
mkdir -p "$PROJECT_ROOT/dist2"
mkdir -p "$PROJECT_ROOT/src/cpp/bin"

echo "步骤1: 构建Node.js应用程序..."
cd "$PROJECT_ROOT/src/node"

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "安装Node.js依赖..."
    npm install
fi

# 构建TypeScript
echo "编译TypeScript..."
npm run build

# 使用pkg打包Node.js应用为单文件可执行程序
echo "打包Node.js应用程序..."
if ! command -v pkg &> /dev/null; then
    echo "安装pkg工具..."
    npm install -g pkg
fi

# 打包为不同平台的可执行文件
pkg dist/index.js --out-path "$PROJECT_ROOT/dist2" --targets node18-macos-x64,node18-linux-x64,node18-win-x64

echo "步骤2: 准备Node.js二进制文件..."

# 检测当前系统并复制对应的Node.js可执行文件
OS="$(uname -s)"
case "${OS}" in
    Linux*)     
        MACHINE=linux
        NODE_BINARY="index-linux"
        ;;
    Darwin*)    
        MACHINE=macos
        NODE_BINARY="index-macos"
        ;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*)     
        MACHINE=win
        NODE_BINARY="index-win.exe"
        ;;
    *)          
        MACHINE="UNKNOWN:${OS}"
        echo "未知操作系统: ${OS}"
        exit 1
        ;;
esac

echo "检测到操作系统: ${OS} (${MACHINE})"

# 复制对应的可执行文件
if [ -f "$PROJECT_ROOT/dist2/$NODE_BINARY" ]; then
    echo "复制Node.js可执行文件..."
    if [ "$MACHINE" = "win" ]; then
        cp "$PROJECT_ROOT/dist2/$NODE_BINARY" "$PROJECT_ROOT/src/cpp/bin/node.exe"
    else
        cp "$PROJECT_ROOT/dist2/$NODE_BINARY" "$PROJECT_ROOT/src/cpp/bin/node"
        chmod +x "$PROJECT_ROOT/src/cpp/bin/node"
    fi
else
    echo "警告: 未找到对应平台的Node.js可执行文件: $NODE_BINARY"
    echo "尝试使用原始的index.js文件..."
    cp "$PROJECT_ROOT/dist2/index.js" "$PROJECT_ROOT/src/cpp/bin/" 2>/dev/null || true
fi

echo "步骤3: 构建C++应用程序..."
cd "$PROJECT_ROOT/src/cpp"

# 清理之前的构建
rm -rf build
mkdir -p build
cd build

# 运行CMake配置
echo "配置CMake..."
cmake ..

# 编译
echo "编译C++应用程序..."
make -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

echo "步骤4: 创建最终打包..."

# 创建打包目录
PACKAGE_DIR="$PROJECT_ROOT/dist/CppNodeApp-${MACHINE}"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# 复制可执行文件
if [ "$MACHINE" = "win" ]; then
    cp "CppNodeApp.exe" "$PACKAGE_DIR/" 2>/dev/null || cp "CppNodeApp" "$PACKAGE_DIR/"
else
    cp "CppNodeApp" "$PACKAGE_DIR/"
fi

# 复制必要的文件
cp "$PROJECT_ROOT/README.md" "$PACKAGE_DIR/" 2>/dev/null || true

# 复制Qt库（如果需要）
echo "检查Qt依赖..."
if command -v macdeployqt &> /dev/null && [ "$MACHINE" = "macos" ]; then
    echo "部署macOS Qt依赖..."
    macdeployqt "$PACKAGE_DIR/CppNodeApp.app" 2>/dev/null || true
elif command -v windeployqt &> /dev/null && [ "$MACHINE" = "win" ]; then
    echo "部署Windows Qt依赖..."
    windeployqt "$PACKAGE_DIR/" 2>/dev/null || true
fi

echo "步骤5: 创建启动脚本..."

# 创建启动脚本
if [ "$MACHINE" = "win" ]; then
    cat > "$PACKAGE_DIR/start.bat" << 'EOF'
@echo off
echo Starting CppNodeApp...
CppNodeApp.exe --node-dir "%~dp0data"
pause
EOF
else
    cat > "$PACKAGE_DIR/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "Starting CppNodeApp..."
./CppNodeApp --node-dir "$(pwd)/data"
EOF
    chmod +x "$PACKAGE_DIR/start.sh"
fi

# 创建数据目录
mkdir -p "$PACKAGE_DIR/data"
mkdir -p "$PACKAGE_DIR/data/download"

echo "步骤6: 创建配置文件..."
cat > "$PACKAGE_DIR/README.txt" << EOF
CppNodeApp - 嵌入式Node.js应用程序
=====================================

这是一个包含嵌入式Node.js服务器的C++应用程序。

使用方法:
---------
1. 直接运行可执行文件
2. 或使用启动脚本: 
   - Linux/macOS: ./start.sh
   - Windows: start.bat

命令行参数:
-----------
--node-dir <path>  指定Node.js工作目录 (默认: ./data)
-d <path>          --node-dir的简写形式

环境变量:
---------
NODE_DIR           指定Node.js工作目录

目录结构:
---------
data/              Node.js工作目录
data/download/     文件下载目录

构建信息:
---------
构建时间: $(date)
系统平台: ${OS}
EOF

echo "=== 构建完成! ==="
echo "打包文件位置: $PACKAGE_DIR"
echo ""
echo "测试运行:"
if [ "$MACHINE" = "win" ]; then
    echo "  cd '$PACKAGE_DIR' && ./CppNodeApp.exe"
else
    echo "  cd '$PACKAGE_DIR' && ./CppNodeApp"
fi
echo ""
echo "或使用启动脚本:"
if [ "$MACHINE" = "win" ]; then
    echo "  cd '$PACKAGE_DIR' && ./start.bat"
else
    echo "  cd '$PACKAGE_DIR' && ./start.sh"
fi 
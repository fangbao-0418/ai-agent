#!/bin/bash

echo "=== C++ Node.js Launcher Build Script ==="

# 进入cpp目录
cd src/cpp

# 清理之前的构建文件
echo "Cleaning previous build..."
rm -rf CMakeFiles/
rm -f CMakeCache.txt
rm -f Makefile
rm -f cmake_install.cmake
rm -f CppNodeApp

# 运行cmake配置
echo "Configuring with CMake..."
cmake .

# 检查cmake是否成功
if [ $? -ne 0 ]; then
    echo "❌ CMake configuration failed!"
    echo "请确保已安装："
    echo "  - CMake (版本 >= 3.10)"
    echo "  - Qt5 或 Qt6 开发包"
    echo "  - C++ 编译器 (GCC/Clang/MSVC)"
    exit 1
fi

# 编译项目
echo "Building project..."
make

# 检查编译是否成功
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "运行方法："
    echo "  cd src/cpp"
    echo "  ./CppNodeApp"
    echo ""
    echo "控制台将显示 Node.js 服务器的输出。"
else
    echo "❌ Build failed!"
    exit 1
fi 
@echo off
echo === C++ Node.js Launcher Build Script (Windows) ===

REM 进入cpp目录
cd src\cpp

REM 清理之前的构建文件
echo Cleaning previous build...
if exist CMakeFiles rmdir /s /q CMakeFiles
if exist CMakeCache.txt del CMakeCache.txt
if exist Makefile del Makefile
if exist cmake_install.cmake del cmake_install.cmake
if exist CppNodeApp.exe del CppNodeApp.exe
if exist Debug rmdir /s /q Debug
if exist Release rmdir /s /q Release

REM 运行cmake配置
echo Configuring with CMake...
cmake . -G "NMake Makefiles"

REM 检查cmake是否成功
if %errorlevel% neq 0 (
    echo ❌ CMake configuration failed!
    echo 请确保已安装：
    echo   - CMake ^(版本 ^>= 3.10^)
    echo   - Qt5 或 Qt6 开发包
    echo   - Visual Studio 或 MinGW 编译器
    echo   - 并且已设置正确的环境变量
    pause
    exit /b 1
)

REM 编译项目
echo Building project...
nmake

REM 检查编译是否成功
if %errorlevel% equ 0 (
    echo ✅ Build successful!
    echo.
    echo 运行方法：
    echo   cd src\cpp
    echo   CppNodeApp.exe
    echo.
    echo 控制台将显示 Node.js 服务器的输出。
    echo 请保持控制台窗口打开以查看 Node.js 日志。
) else (
    echo ❌ Build failed!
    pause
    exit /b 1
)

pause 
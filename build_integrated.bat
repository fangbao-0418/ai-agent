@echo off
setlocal enabledelayedexpansion

echo 🚀 === C++内置Node.js一体化打包工具 (Windows) ===

REM 项目根目录
set "PROJECT_ROOT=%~dp0"
set "BUILD_CONFIG=Release"
set "PACKAGING_MODE=full"
set "TARGET_PLATFORM=win-x64"

REM 解析命令行参数
:parse_args
if "%~1"=="" goto start_build
if "%~1"=="--config" (
    set "BUILD_CONFIG=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="--mode" (
    set "PACKAGING_MODE=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="--platform" (
    set "TARGET_PLATFORM=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="--help" goto show_help
if "%~1"=="-h" goto show_help
echo 未知参数: %~1
exit /b 1

:show_help
echo 使用方法: %~n0 [选项]
echo 选项:
echo   --config ^<Debug^|Release^>     构建配置 (默认: Release)
echo   --mode ^<full^|portable^|installer^>  打包模式 (默认: full)
echo   --platform ^<target^>          目标平台 (默认: win-x64)
echo   --help                       显示此帮助信息
echo.
echo 打包模式说明:
echo   full      - 完整打包，包含所有依赖
echo   portable  - 便携版，最小化依赖
echo   installer - 生成安装包
exit /b 0

:start_build
echo 📋 构建配置:
echo   - 项目目录: %PROJECT_ROOT%
echo   - 构建配置: %BUILD_CONFIG%
echo   - 打包模式: %PACKAGING_MODE%
echo   - 目标平台: %TARGET_PLATFORM%

REM 创建构建目录
set "DIST_DIR=%PROJECT_ROOT%release"
set "BUILD_DIR=%PROJECT_ROOT%build_release"
set "NODE_BUILD_DIR=%PROJECT_ROOT%src\node"

if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"
mkdir "%DIST_DIR%"
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"

echo 📦 步骤1: 构建Node.js后端...
cd /d "%NODE_BUILD_DIR%"

REM 确保依赖已安装
if not exist "node_modules" (
    echo 📥 安装Node.js依赖...
    call npm install
    if errorlevel 1 (
        echo ❌ 安装Node.js依赖失败
        exit /b 1
    )
)

REM 构建TypeScript
echo 🔨 编译TypeScript...
call npm run build
if errorlevel 1 (
    echo ❌ TypeScript编译失败
    exit /b 1
)

REM 使用不同的打包策略
if "%PACKAGING_MODE%"=="full" goto full_package
if "%PACKAGING_MODE%"=="installer" goto full_package
if "%PACKAGING_MODE%"=="portable" goto portable_package

:full_package
echo 📦 完整打包Node.js应用程序...
REM 检查pkg是否已安装
where pkg >nul 2>nul
if errorlevel 1 (
    echo 📦 安装pkg工具...
    call npm install -g pkg
)

REM 为目标平台打包
call pkg dist/index.js --out-path "%PROJECT_ROOT%temp_node_binaries" --targets "node18-%TARGET_PLATFORM%"
if errorlevel 1 (
    echo ❌ Node.js打包失败
    exit /b 1
)
goto build_cpp

:portable_package
echo 📦 便携版打包...
if not exist "%PROJECT_ROOT%temp_node_binaries" mkdir "%PROJECT_ROOT%temp_node_binaries"
xcopy /s /e "dist\*" "%PROJECT_ROOT%temp_node_binaries\"
goto build_cpp

:build_cpp
echo 🔧 步骤2: 构建C++前端...
cd /d "%BUILD_DIR%"

REM CMake配置
echo ⚙️ 配置CMake...
cmake -DCMAKE_BUILD_TYPE=%BUILD_CONFIG% -DCMAKE_INSTALL_PREFIX="%DIST_DIR%" "%PROJECT_ROOT%src\cpp"
if errorlevel 1 (
    echo ❌ CMake配置失败
    exit /b 1
)

REM 编译
echo 🔨 编译C++应用程序...
cmake --build . --config %BUILD_CONFIG% --parallel
if errorlevel 1 (
    echo ❌ C++编译失败
    exit /b 1
)

echo 📂 步骤3: 创建应用程序包...

REM 创建应用程序目录结构
set "APP_NAME=CppNodeApp"
set "APP_DIR=%DIST_DIR%\%APP_NAME%"
set "BIN_DIR=%APP_DIR%\bin"
set "DATA_DIR=%APP_DIR%\data"
set "RESOURCES_DIR=%APP_DIR%\resources"

mkdir "%BIN_DIR%"
mkdir "%DATA_DIR%"
mkdir "%RESOURCES_DIR%"
mkdir "%DATA_DIR%\download"
mkdir "%DATA_DIR%\config"

REM 复制C++可执行文件
if exist "CppNodeApp.exe" (
    copy "CppNodeApp.exe" "%BIN_DIR%\"
    set "EXE_NAME=CppNodeApp.exe"
) else if exist "%BUILD_CONFIG%\CppNodeApp.exe" (
    copy "%BUILD_CONFIG%\CppNodeApp.exe" "%BIN_DIR%\"
    set "EXE_NAME=CppNodeApp.exe"
) else (
    echo ❌ 未找到C++可执行文件
    exit /b 1
)

REM 复制Node.js相关文件
if "%PACKAGING_MODE%"=="full" goto copy_full_node
if "%PACKAGING_MODE%"=="installer" goto copy_full_node
if "%PACKAGING_MODE%"=="portable" goto copy_portable_node

:copy_full_node
set "NODE_BINARY=index-win.exe"
if exist "%PROJECT_ROOT%temp_node_binaries\%NODE_BINARY%" (
    copy "%PROJECT_ROOT%temp_node_binaries\%NODE_BINARY%" "%RESOURCES_DIR%\"
)
goto handle_dependencies

:copy_portable_node
xcopy /s /e "%PROJECT_ROOT%temp_node_binaries\*" "%RESOURCES_DIR%\"
copy "%NODE_BUILD_DIR%\package.json" "%RESOURCES_DIR%\"
goto handle_dependencies

:handle_dependencies
echo 🔗 步骤4: 处理依赖关系...

REM 处理Qt依赖
where windeployqt >nul 2>nul
if not errorlevel 1 (
    echo 🪟 部署Windows Qt依赖...
    windeployqt "%BIN_DIR%"
)

echo 📄 步骤5: 创建启动脚本和配置文件...

REM 创建启动脚本
echo @echo off > "%APP_DIR%\start.bat"
echo echo Starting C++ Node.js Application... >> "%APP_DIR%\start.bat"
echo cd /d "%%~dp0" >> "%APP_DIR%\start.bat"
echo bin\CppNodeApp.exe --node-dir "%%~dp0data" >> "%APP_DIR%\start.bat"
echo pause >> "%APP_DIR%\start.bat"

echo @echo off > "%APP_DIR%\start-console.bat"
echo echo Starting C++ Node.js Application (with console)... >> "%APP_DIR%\start-console.bat"
echo cd /d "%%~dp0" >> "%APP_DIR%\start-console.bat"
echo bin\CppNodeApp.exe --node-dir "%%~dp0data" --console >> "%APP_DIR%\start-console.bat"
echo pause >> "%APP_DIR%\start-console.bat"

REM 创建配置文件
echo { > "%DATA_DIR%\config\app.json"
echo   "name": "CppNodeApp", >> "%DATA_DIR%\config\app.json"
echo   "version": "1.0.0", >> "%DATA_DIR%\config\app.json"
echo   "description": "C++ application with embedded Node.js server", >> "%DATA_DIR%\config\app.json"
echo   "author": "Your Name", >> "%DATA_DIR%\config\app.json"
echo   "settings": { >> "%DATA_DIR%\config\app.json"
echo     "node": { >> "%DATA_DIR%\config\app.json"
echo       "port": 3000, >> "%DATA_DIR%\config\app.json"
echo       "host": "localhost" >> "%DATA_DIR%\config\app.json"
echo     }, >> "%DATA_DIR%\config\app.json"
echo     "ui": { >> "%DATA_DIR%\config\app.json"
echo       "theme": "default", >> "%DATA_DIR%\config\app.json"
echo       "language": "zh-CN" >> "%DATA_DIR%\config\app.json"
echo     } >> "%DATA_DIR%\config\app.json"
echo   } >> "%DATA_DIR%\config\app.json"
echo } >> "%DATA_DIR%\config\app.json"

echo 🔍 步骤6: 验证打包结果...

echo ✅ 验证关键文件:
if exist "%BIN_DIR%\%EXE_NAME%" (
    echo   ✓ C++可执行文件: %EXE_NAME%
) else (
    echo   ❌ C++可执行文件缺失
)

dir /b "%RESOURCES_DIR%" >nul 2>nul && (
    echo   ✓ Node.js资源文件
) || (
    echo   ❌ Node.js资源文件缺失
)

if exist "%DATA_DIR%\config\app.json" (
    echo   ✓ 配置文件
) else (
    echo   ❌ 配置文件缺失
)

echo 📊 步骤7: 生成部署包...

cd /d "%DIST_DIR%"

if "%PACKAGING_MODE%"=="full" (
    REM 创建压缩包
    where 7z >nul 2>nul && (
        7z a "%APP_NAME%-%TARGET_PLATFORM%-full.zip" "%APP_NAME%"
        echo ✅ 已创建: %APP_NAME%-%TARGET_PLATFORM%-full.zip
    ) || (
        echo ⚠️ 7z不可用，请手动压缩%APP_NAME%目录
    )
) else if "%PACKAGING_MODE%"=="portable" (
    where 7z >nul 2>nul && (
        7z a "%APP_NAME%-%TARGET_PLATFORM%-portable.zip" "%APP_NAME%"
        echo ✅ 已创建: %APP_NAME%-%TARGET_PLATFORM%-portable.zip
    ) || (
        echo ⚠️ 7z不可用，请手动压缩%APP_NAME%目录
    )
) else if "%PACKAGING_MODE%"=="installer" (
    echo 🔧 生成安装包...
    where makensis >nul 2>nul && (
        echo Creating Windows installer...
        REM 这里可以添加NSIS脚本调用
    ) || (
        echo ⚠️ NSIS不可用，创建压缩包...
        where 7z >nul 2>nul && (
            7z a "%APP_NAME%-%TARGET_PLATFORM%-installer.zip" "%APP_NAME%"
        )
    )
)

REM 清理临时文件
if exist "%PROJECT_ROOT%temp_node_binaries" rmdir /s /q "%PROJECT_ROOT%temp_node_binaries"

echo.
echo 🎉 === 打包完成! ===
echo 📍 输出目录: %DIST_DIR%
echo 📦 应用程序: %APP_DIR%
echo.
echo 🚀 测试运行:
echo   cd "%APP_DIR%" ^&^& start.bat
echo.
echo 📋 下一步:
echo   1. 测试应用程序功能
echo   2. 验证所有依赖都已包含
echo   3. 在目标系统上测试部署

pause 
# C++ Node.js 启动器 - 控制台输出说明

## 功能特性

✅ **实时 Node.js 控制台输出** - 在 C++ 应用控制台中显示 Node.js 服务器的所有输出  
✅ **跨平台支持** - 支持 Windows、macOS、Linux  
✅ **自动进程管理** - 自动启动、监控和清理 Node.js 进程  
✅ **错误处理** - 完整的错误信息和状态显示  
✅ **控制台窗口** - Windows 上自动创建控制台窗口  

## 构建项目

### Linux/macOS
```bash
# 给脚本执行权限
chmod +x build_cpp.sh

# 构建项目
./build_cpp.sh
```

### Windows
```cmd
# 运行构建脚本
build_cpp.bat
```

### 手动构建
```bash
cd src/cpp
cmake .
make        # Linux/macOS
# 或 nmake  # Windows
```

## 运行应用

### Linux/macOS
```bash
cd src/cpp
./CppNodeApp
```

### Windows
```cmd
cd src\cpp
CppNodeApp.exe
```

## 控制台输出说明

运行后，你将在控制台看到以下类型的输出：

### 系统消息 (蓝色标签)
```
=== C++ Node.js Launcher ===
[System] Initializing application...
[System] Starting Node.js server...
[System] Working directory: /path/to/project
[System] Command: node /path/to/project/src/node/server.js
[System] Node.js server initialization completed!
```

### Node.js 输出 (绿色标签)
```
[Node.js] Server started successfully!
[Node.js] 已连接到服务器
[Node.js] 开始解析简历文件...
[Node.js] ✓ 成功解析: 邬昊翔的简历.pdf (1250 字符)
[Node.js] 正在调用AI进行简历分析...
```

### 错误信息 (红色标签)
```
[Node.js Error] Error: PDF解析失败
[System Error] Cannot start Node.js server!
```

## 特殊功能

### Windows 控制台窗口
- 在 Windows 上会自动创建一个独立的控制台窗口
- 控制台标题: "C++ Node.js Launcher - Console Output"
- 支持标准的控制台操作（复制、粘贴、滚动等）

### 进程管理
- **自动启动**: 应用启动时自动启动 Node.js 服务器
- **实时监控**: 监控 Node.js 进程状态
- **优雅退出**: 应用关闭时自动终止 Node.js 进程
- **崩溃检测**: 检测并报告 Node.js 进程崩溃

### 输出重定向
- **标准输出**: Node.js 的 console.log 输出
- **错误输出**: Node.js 的 console.error 输出  
- **实时显示**: 无缓冲，实时显示输出
- **格式化**: 添加时间戳和标签前缀

## 故障排除

### 1. Node.js 启动失败
**可能原因:**
- Node.js 未安装或不在 PATH 中
- 工作目录错误
- 端口被占用

**解决方法:**
- 确认 Node.js 已安装: `node --version`
- 检查项目路径是否正确
- 检查端口 8888 是否被占用

### 2. 控制台无输出
**可能原因:**
- 输出重定向失败
- 进程启动失败

**解决方法:**
- 检查控制台是否正确初始化
- 查看错误日志
- 尝试手动启动 Node.js 服务器

### 3. Windows 控制台不显示
**可能原因:**
- 编译时未正确配置控制台
- 权限问题

**解决方法:**
- 重新构建项目
- 以管理员身份运行
- 检查 CMAKE 配置

## 开发说明

### 代码结构
- `main.cpp`: 主程序入口，控制台初始化和进程管理
- `startNodeServer()`: Node.js 进程启动和监控
- `initializeConsole()`: Windows 控制台初始化

### 关键功能
- **QProcess**: Qt 进程管理类
- **信号槽**: 实时输出重定向
- **AllocConsole()**: Windows 控制台分配
- **std::cout/cerr**: 标准输出流

### 自定义配置
你可以修改以下设置：
- Node.js 启动参数
- 控制台输出格式
- 错误处理逻辑
- 工作目录配置

## 依赖要求

- **C++ 编译器**: GCC 7+, Clang 5+, MSVC 2017+
- **CMake**: 版本 3.10+
- **Qt**: Qt5 或 Qt6 (Core, Widgets, Network)
- **Node.js**: 任何现代版本
- **操作系统**: Windows 10+, macOS 10.14+, Ubuntu 18.04+ 
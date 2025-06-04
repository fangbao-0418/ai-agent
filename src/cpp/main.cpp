#include "ui/mainwindow.h"
#include "EmbeddedNodeRunner.h"
#include <QApplication>
#include <QMessageBox>
#include <QProcess>
#include <QDir>
#include <QDebug>
#include <iostream>

#ifdef _WIN32
#include <windows.h>
#include <io.h>
#include <fcntl.h>
#endif

// 全局嵌入式Node运行器指针
EmbeddedNodeRunner *g_embeddedNodeRunner = nullptr;

// Windows控制台初始化函数
void initializeConsole() {
#ifdef _WIN32
    // 分配控制台窗口
    if (AllocConsole()) {
        // 重定向stdout, stdin, stderr到控制台
        freopen_s((FILE**)stdout, "CONOUT$", "w", stdout);
        freopen_s((FILE**)stderr, "CONOUT$", "w", stderr);
        freopen_s((FILE**)stdin, "CONIN$", "r", stdin);
        
        // 使iostream与控制台同步
        std::ios::sync_with_stdio(true);
        std::wcout.clear();
        std::cout.clear();
        std::wcerr.clear();
        std::cerr.clear();
        std::wcin.clear();
        std::cin.clear();
        
        // 设置控制台标题
        SetConsoleTitle(L"C++ Node.js Launcher - Console Output");
        
        std::cout << "=== Windows Console Initialized ===" << std::endl;
    }
#endif
}

// 启动嵌入式Node.js服务器
bool startEmbeddedNodeServer() {
    g_embeddedNodeRunner = new EmbeddedNodeRunner();
    
    // 获取node_dir参数，优先级：命令行参数 > 环境变量 > 默认值
    QString nodeDir;
    
    // 1. 检查命令行参数
    QStringList cmdArgs = QCoreApplication::arguments();
    for (int i = 0; i < cmdArgs.size() - 1; i++) {
        if (cmdArgs[i] == "--node-dir" || cmdArgs[i] == "-d") {
            nodeDir = cmdArgs[i + 1];
            break;
        }
    }
    
    // 2. 如果命令行没有，检查环境变量
    if (nodeDir.isEmpty()) {
        QByteArray envNodeDir = qgetenv("NODE_DIR");
        if (!envNodeDir.isEmpty()) {
            nodeDir = QString::fromUtf8(envNodeDir);
        }
    }
    
    // 3. 如果都没有，使用默认值
    if (nodeDir.isEmpty()) {
        nodeDir = QDir::currentPath(); // 使用当前工作目录作为默认值
    }
    
    std::cout << "[System] Starting embedded Node.js server..." << std::endl;
    std::cout << "[System] Node directory: " << nodeDir.toStdString() << std::endl;
    
    // 启动嵌入式Node.js
    bool success = g_embeddedNodeRunner->startEmbeddedNode(nodeDir);
    
    if (!success) {
        std::cerr << "[System Error] Failed to start embedded Node.js server" << std::endl;
        return false;
    }
    
    return true;
}

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    
    // 初始化控制台（Windows上会创建控制台窗口）
    initializeConsole();
    
    std::cout << "=== C++ Embedded Node.js Launcher ===" << std::endl;
    std::cout << "[System] Initializing application..." << std::endl;
    
    // 尝试启动嵌入式Node.js服务器
    bool serverStarted = startEmbeddedNodeServer();
    if (!serverStarted) {
        std::cerr << "[System Error] Cannot start embedded Node.js server!" << std::endl;
        QMessageBox::warning(nullptr, "警告", 
                           "无法启动嵌入式Node.js服务器。\n"
                           "请确保已正确构建并嵌入了Node.js程序。\n\n"
                           "控制台将显示详细的错误信息。");
    } else {
        std::cout << "[System] Embedded Node.js server initialization completed!" << std::endl;
        std::cout << "[System] Check the console for Node.js output..." << std::endl;
    }
    
    // 创建并显示主窗口
    MainWindow mainWindow;
    mainWindow.show();
    
    std::cout << "[System] Qt application started, showing main window..." << std::endl;
    
    int result = app.exec();
    
    // 清理嵌入式Node.js进程
    if (g_embeddedNodeRunner) {
        std::cout << "[System] Terminating embedded Node.js server..." << std::endl;
        g_embeddedNodeRunner->stopNode();
        delete g_embeddedNodeRunner;
        g_embeddedNodeRunner = nullptr;
    }
    
    std::cout << "[System] Application shutdown complete." << std::endl;
    return result;
} 
#include "ui/mainwindow.h"
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

// 全局Node.js进程指针
QProcess *g_nodeProcess = nullptr;

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

// 启动Node.js服务器
bool startNodeServer() {
    g_nodeProcess = new QProcess();
    
    // 设置工作目录为项目根目录
    QString workingDir = QDir::currentPath();
    
    // 如果当前在cpp目录，需要返回到项目根目录
    if (workingDir.endsWith("/cpp") || workingDir.endsWith("\\cpp")) {
        workingDir = QDir(workingDir).absolutePath() + "/../../";
    }
    // 假设在bin目录运行，需要返回上一级
    else if (workingDir.endsWith("/bin") || workingDir.endsWith("\\bin")) {
        workingDir = QDir(workingDir).absolutePath() + "/../";
    }
    
    // 标准化路径
    workingDir = QDir(workingDir).canonicalPath();
    
    g_nodeProcess->setWorkingDirectory(workingDir);
    
    // 启动Node.js服务器，指向项目根目录的dist2
    QString nodeBinary = "node";
    QStringList arguments;
    arguments << workingDir + "/dist2/index.js --node-dir /Users/fb/Documents/ai/cppnode";
    
    // 连接输出重定向
    QObject::connect(g_nodeProcess, &QProcess::readyReadStandardOutput, []() {
        QByteArray data = g_nodeProcess->readAllStandardOutput();
        std::cout << "[Node.js] " << data.toStdString();
        std::cout.flush();
    });
    
    QObject::connect(g_nodeProcess, &QProcess::readyReadStandardError, []() {
        QByteArray data = g_nodeProcess->readAllStandardError();
        std::cerr << "[Node.js Error] " << data.toStdString();
        std::cerr.flush();
    });
    
    // 监听进程状态变化
    QObject::connect(g_nodeProcess, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished),
                    [](int exitCode, QProcess::ExitStatus exitStatus) {
        std::cout << "\n[Node.js] Process finished with exit code: " << exitCode << std::endl;
        if (exitStatus == QProcess::CrashExit) {
            std::cerr << "[Node.js] Process crashed!" << std::endl;
        }
        g_nodeProcess->deleteLater();
        g_nodeProcess = nullptr;
    });
    
    QObject::connect(g_nodeProcess, &QProcess::started, []() {
        std::cout << "[Node.js] Server started successfully!" << std::endl;
    });
    
    QObject::connect(g_nodeProcess, &QProcess::errorOccurred, [](QProcess::ProcessError error) {
        QString errorString;
        switch (error) {
        case QProcess::FailedToStart:
            errorString = "Failed to start";
            break;
        case QProcess::Crashed:
            errorString = "Crashed";
            break;
        case QProcess::Timedout:
            errorString = "Timed out";
            break;
        case QProcess::WriteError:
            errorString = "Write error";
            break;
        case QProcess::ReadError:
            errorString = "Read error";
            break;
        case QProcess::UnknownError:
            errorString = "Unknown error";
            break;
        }
        std::cerr << "[Node.js Error] " << errorString.toStdString() << std::endl;
    });
    
    std::cout << "[System] Starting Node.js server..." << std::endl;
    std::cout << "[System] Working directory: " << workingDir.toStdString() << std::endl;
    std::cout << "[System] Command: " << nodeBinary.toStdString() << " " << arguments.join(" ").toStdString() << std::endl;
    
    g_nodeProcess->start(nodeBinary, arguments);
    if (!g_nodeProcess->waitForStarted(5000)) {
        std::cerr << "[System Error] Failed to start Node.js server within 5 seconds" << std::endl;
        return false;
    }
    
    return true;
}

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    
    // 初始化控制台（Windows上会创建控制台窗口）
    initializeConsole();
    
    std::cout << "=== C++ Node.js Launcher ===" << std::endl;
    std::cout << "[System] Initializing application..." << std::endl;
    
    // 尝试启动Node.js服务器
    bool serverStarted = startNodeServer();
    if (!serverStarted) {
        std::cerr << "[System Error] Cannot start Node.js server!" << std::endl;
        QMessageBox::warning(nullptr, "警告", 
                           "无法启动Node.js服务器，请确保已安装Node.js。\n"
                           "您可以手动启动服务器：node src/node/server.js\n\n"
                           "控制台将显示详细的错误信息。");
    } else {
        std::cout << "[System] Node.js server initialization completed!" << std::endl;
        std::cout << "[System] Check the console for Node.js output..." << std::endl;
    }
    
    // 创建并显示主窗口
    MainWindow mainWindow;
    mainWindow.show();
    
    std::cout << "[System] Qt application started, showing main window..." << std::endl;
    
    int result = app.exec();
    
    // 清理Node.js进程
    if (g_nodeProcess && g_nodeProcess->state() != QProcess::NotRunning) {
        std::cout << "[System] Terminating Node.js server..." << std::endl;
        g_nodeProcess->kill();
        g_nodeProcess->waitForFinished(3000);
    }
    
    std::cout << "[System] Application shutdown complete." << std::endl;
    return result;
} 
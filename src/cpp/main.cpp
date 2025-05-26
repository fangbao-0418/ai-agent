#include "ui/mainwindow.h"
#include <QApplication>
#include <QMessageBox>
#include <QProcess>
#include <QDir>

// 启动Node.js服务器
bool startNodeServer() {
    QProcess *nodeProcess = new QProcess();
    
    // 设置工作目录为项目根目录
    QString workingDir = QDir::currentPath();
    // 假设在bin目录运行，需要返回上一级
    if (workingDir.endsWith("/bin") || workingDir.endsWith("\\bin")) {
        workingDir = QDir(workingDir).absolutePath() + "/../";
    }
    
    nodeProcess->setWorkingDirectory(workingDir);
    
    // 启动Node.js服务器
    QString nodeBinary = "node";
    QStringList arguments;
    arguments << workingDir + "/src/node/server.js";
    
    nodeProcess->start(nodeBinary, arguments);
    if (!nodeProcess->waitForStarted(2000)) {
        return false;
    }
    
    // 设置进程完成时自动删除
    QObject::connect(nodeProcess, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished),
                    nodeProcess, &QProcess::deleteLater);
    
    return true;
}

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    
    // 尝试启动Node.js服务器
    bool serverStarted = startNodeServer();
    if (!serverStarted) {
        QMessageBox::warning(nullptr, "警告", 
                           "无法启动Node.js服务器，请确保已安装Node.js。\n"
                           "您可以手动启动服务器：node src/node/server.js");
    }
    
    // 创建并显示主窗口
    MainWindow mainWindow;
    mainWindow.show();
    
    return app.exec();
} 
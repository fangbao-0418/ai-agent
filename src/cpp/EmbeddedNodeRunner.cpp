#include "EmbeddedNodeRunner.h"
#include <QDebug>
#include <QFileInfo>
#include <QCoreApplication>
#include <iostream>

#ifdef Q_OS_UNIX
#include <sys/stat.h>
#endif

EmbeddedNodeRunner::EmbeddedNodeRunner(QObject *parent)
    : QObject(parent)
    , m_nodeProcess(nullptr)
    , m_tempDir(nullptr)
    , m_useEmbeddedNode(false)
{
    // 创建临时目录
    m_tempDir = new QTemporaryDir();
    if (!m_tempDir->isValid()) {
        qWarning() << "Failed to create temporary directory";
    } else {
        m_extractedPath = m_tempDir->path();
        qDebug() << "Temporary directory created:" << m_extractedPath;
    }
}

EmbeddedNodeRunner::~EmbeddedNodeRunner()
{
    stopNode();
    delete m_tempDir;
}

bool EmbeddedNodeRunner::startEmbeddedNode(const QString &nodeDir)
{
    if (isRunning()) {
        qWarning() << "Node.js is already running";
        return false;
    }

    m_currentNodeDir = nodeDir.isEmpty() ? QDir::currentPath() : nodeDir;

    // 1. 首先尝试提取嵌入式文件
    if (!extractEmbeddedFiles()) {
        qWarning() << "Failed to extract embedded files, trying system Node.js";
    }

    // 2. 确定Node.js可执行文件
    if (m_nodeExecutable.isEmpty()) {
        m_nodeExecutable = findSystemNode();
    }

    if (m_nodeExecutable.isEmpty()) {
        emit nodeError("Cannot find Node.js executable");
        return false;
    }

    // 3. 确定Node.js脚本路径
    if (m_nodeScript.isEmpty()) {
        // 首先尝试使用提取的脚本
        QString extractedScript = m_extractedPath + "/index.js";
        if (QFile::exists(extractedScript)) {
            m_nodeScript = extractedScript;
        } else {
            // 回退到原始路径
            m_nodeScript = QDir::currentPath() + "/dist2/index.js";
        }
    }

    if (!QFile::exists(m_nodeScript)) {
        emit nodeError(QString("Node.js script not found: %1").arg(m_nodeScript));
        return false;
    }

    // 4. 创建并配置进程
    m_nodeProcess = new QProcess(this);
    
    // 连接信号
    connect(m_nodeProcess, &QProcess::started, this, &EmbeddedNodeRunner::onNodeStarted);
    connect(m_nodeProcess, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished),
            this, &EmbeddedNodeRunner::onNodeFinished);
    connect(m_nodeProcess, &QProcess::errorOccurred, this, &EmbeddedNodeRunner::onNodeError);
    connect(m_nodeProcess, &QProcess::readyReadStandardOutput, this, &EmbeddedNodeRunner::onNodeStandardOutput);
    connect(m_nodeProcess, &QProcess::readyReadStandardError, this, &EmbeddedNodeRunner::onNodeStandardError);

    // 5. 设置工作目录
    m_nodeProcess->setWorkingDirectory(QFileInfo(m_nodeScript).absolutePath());

    // 6. 构建参数
    QStringList arguments;
    arguments << m_nodeScript;
    arguments << "--node-dir" << m_currentNodeDir;

    // 7. 启动进程
    std::cout << "[EmbeddedNode] Starting Node.js..." << std::endl;
    std::cout << "[EmbeddedNode] Executable: " << m_nodeExecutable.toStdString() << std::endl;
    std::cout << "[EmbeddedNode] Script: " << m_nodeScript.toStdString() << std::endl;
    std::cout << "[EmbeddedNode] Node Dir: " << m_currentNodeDir.toStdString() << std::endl;

    m_nodeProcess->start(m_nodeExecutable, arguments);
    
    if (!m_nodeProcess->waitForStarted(5000)) {
        emit nodeError("Failed to start Node.js process within 5 seconds");
        return false;
    }

    return true;
}

void EmbeddedNodeRunner::stopNode()
{
    if (m_nodeProcess && m_nodeProcess->state() != QProcess::NotRunning) {
        std::cout << "[EmbeddedNode] Stopping Node.js process..." << std::endl;
        m_nodeProcess->kill();
        if (!m_nodeProcess->waitForFinished(3000)) {
            m_nodeProcess->terminate();
            m_nodeProcess->waitForFinished(1000);
        }
    }
    
    if (m_nodeProcess) {
        m_nodeProcess->deleteLater();
        m_nodeProcess = nullptr;
    }
}

bool EmbeddedNodeRunner::isRunning() const
{
    return m_nodeProcess && m_nodeProcess->state() == QProcess::Running;
}

QString EmbeddedNodeRunner::getTempPath() const
{
    return m_extractedPath;
}

bool EmbeddedNodeRunner::extractEmbeddedFiles()
{
    if (!m_tempDir || !m_tempDir->isValid()) {
        return false;
    }

    std::cout << "[EmbeddedNode] Extracting embedded files..." << std::endl;

    // 提取Node.js脚本
    if (extractFile(":/nodejs/index.js", m_extractedPath + "/index.js")) {
        m_nodeScript = m_extractedPath + "/index.js";
        std::cout << "[EmbeddedNode] Extracted Node.js script" << std::endl;
    }

    // 尝试提取Node.js可执行文件
#ifdef Q_OS_WIN
    QString nodeExePath = ":/nodejs/node.exe";
    QString targetNodePath = m_extractedPath + "/node.exe";
#else
    QString nodeExePath = ":/nodejs/node";
    QString targetNodePath = m_extractedPath + "/node";
#endif

    if (extractFile(nodeExePath, targetNodePath)) {
        if (setExecutablePermissions(targetNodePath)) {
            m_nodeExecutable = targetNodePath;
            m_useEmbeddedNode = true;
            std::cout << "[EmbeddedNode] Extracted Node.js executable" << std::endl;
        }
    }

    return !m_nodeScript.isEmpty();
}

bool EmbeddedNodeRunner::extractFile(const QString &resourcePath, const QString &targetPath)
{
    QFile resourceFile(resourcePath);
    if (!resourceFile.exists()) {
        qDebug() << "Resource does not exist:" << resourcePath;
        return false;
    }

    if (!resourceFile.open(QIODevice::ReadOnly)) {
        qWarning() << "Failed to open resource:" << resourcePath;
        return false;
    }

    QFile targetFile(targetPath);
    if (!targetFile.open(QIODevice::WriteOnly)) {
        qWarning() << "Failed to create target file:" << targetPath;
        return false;
    }

    QByteArray data = resourceFile.readAll();
    qint64 written = targetFile.write(data);
    
    targetFile.close();
    resourceFile.close();

    return written == data.size();
}

QString EmbeddedNodeRunner::findSystemNode()
{
    QStringList possiblePaths;
    
#ifdef Q_OS_WIN
    possiblePaths << "node.exe" << "node";
#else
    possiblePaths << "node" << "/usr/local/bin/node" << "/opt/homebrew/bin/node" << "/usr/bin/node";
#endif

    for (const QString &path : possiblePaths) {
        QProcess testProcess;
        testProcess.start(path, QStringList() << "--version");
        if (testProcess.waitForFinished(3000) && testProcess.exitCode() == 0) {
            std::cout << "[EmbeddedNode] Found system Node.js: " << path.toStdString() << std::endl;
            return path;
        }
    }

    return QString();
}

bool EmbeddedNodeRunner::setExecutablePermissions(const QString &filePath)
{
#ifdef Q_OS_UNIX
    QByteArray pathBytes = filePath.toLocal8Bit();
    if (chmod(pathBytes.constData(), S_IRWXU | S_IRGRP | S_IXGRP | S_IROTH | S_IXOTH) == 0) {
        return true;
    }
    qWarning() << "Failed to set executable permissions for:" << filePath;
    return false;
#else
    // Windows doesn't need to set executable permissions
    return true;
#endif
}

// Slots implementation
void EmbeddedNodeRunner::onNodeStarted()
{
    std::cout << "[EmbeddedNode] Node.js process started successfully" << std::endl;
    emit nodeStarted();
}

void EmbeddedNodeRunner::onNodeFinished(int exitCode, QProcess::ExitStatus exitStatus)
{
    std::cout << "[EmbeddedNode] Node.js process finished with exit code: " << exitCode << std::endl;
    
    if (exitStatus == QProcess::CrashExit) {
        emit nodeError("Node.js process crashed");
    }
    
    emit nodeStopped();
}

void EmbeddedNodeRunner::onNodeError(QProcess::ProcessError error)
{
    QString errorString;
    switch (error) {
    case QProcess::FailedToStart:
        errorString = "Failed to start Node.js process";
        break;
    case QProcess::Crashed:
        errorString = "Node.js process crashed";
        break;
    case QProcess::Timedout:
        errorString = "Node.js process timed out";
        break;
    case QProcess::WriteError:
        errorString = "Write error in Node.js process";
        break;
    case QProcess::ReadError:
        errorString = "Read error in Node.js process";
        break;
    case QProcess::UnknownError:
        errorString = "Unknown error in Node.js process";
        break;
    }
    
    std::cerr << "[EmbeddedNode Error] " << errorString.toStdString() << std::endl;
    emit nodeError(errorString);
}

void EmbeddedNodeRunner::onNodeStandardOutput()
{
    if (m_nodeProcess) {
        QByteArray data = m_nodeProcess->readAllStandardOutput();
        QString output = QString::fromUtf8(data);
        std::cout << "[Node.js] " << output.toStdString();
        emit nodeOutput(output);
    }
}

void EmbeddedNodeRunner::onNodeStandardError()
{
    if (m_nodeProcess) {
        QByteArray data = m_nodeProcess->readAllStandardError();
        QString output = QString::fromUtf8(data);
        std::cerr << "[Node.js Error] " << output.toStdString();
        emit nodeError(output);
    }
} 
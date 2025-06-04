#ifndef EMBEDDEDNODERUNNER_H
#define EMBEDDEDNODERUNNER_H

#include <QObject>
#include <QProcess>
#include <QTemporaryDir>
#include <QString>
#include <QStringList>
#include <QDir>
#include <QFile>
#include <QResource>
#include <QStandardPaths>

class EmbeddedNodeRunner : public QObject
{
    Q_OBJECT

public:
    explicit EmbeddedNodeRunner(QObject *parent = nullptr);
    ~EmbeddedNodeRunner();

    // 启动嵌入式Node.js程序
    bool startEmbeddedNode(const QString &nodeDir = QString());
    
    // 停止Node.js程序
    void stopNode();
    
    // 检查Node.js是否正在运行
    bool isRunning() const;
    
    // 获取临时目录路径
    QString getTempPath() const;

signals:
    void nodeStarted();
    void nodeStopped();
    void nodeError(const QString &error);
    void nodeOutput(const QString &output);

private slots:
    void onNodeStarted();
    void onNodeFinished(int exitCode, QProcess::ExitStatus exitStatus);
    void onNodeError(QProcess::ProcessError error);
    void onNodeStandardOutput();
    void onNodeStandardError();

private:
    // 从资源中提取文件到临时目录
    bool extractEmbeddedFiles();
    
    // 提取单个文件
    bool extractFile(const QString &resourcePath, const QString &targetPath);
    
    // 查找系统中的Node.js可执行文件
    QString findSystemNode();
    
    // 设置文件权限（Unix/Linux/macOS）
    bool setExecutablePermissions(const QString &filePath);

private:
    QProcess *m_nodeProcess;
    QTemporaryDir *m_tempDir;
    QString m_nodeExecutable;
    QString m_nodeScript;
    QString m_extractedPath;
    bool m_useEmbeddedNode;
    QString m_currentNodeDir;
};

#endif // EMBEDDEDNODERUNNER_H 
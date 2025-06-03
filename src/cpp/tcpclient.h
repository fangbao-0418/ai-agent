#ifndef TCPCLIENT_H
#define TCPCLIENT_H

#include <QObject>
#include <QTcpSocket>
#include <QJsonObject>
#include <QJsonDocument>
#include <QUuid>
#include <QMap>
#include <QTimer>
#include <functional>

// 定义回调函数类型
using ResponseCallback = std::function<void(const QJsonObject&)>;

class TcpClient : public QObject
{
    Q_OBJECT
public:
    explicit TcpClient(QObject *parent = nullptr);
    ~TcpClient();

    // 连接到服务器
    bool connectToServer(const QString &host, quint16 port);
    // 断开连接
    void disconnectFromServer();
    // 检查连接状态
    bool isConnected() const;

    // 发送消息到服务器
    QString sendMessage(const QString &message, ResponseCallback callback);
    // 发送计算请求到服务器
    QString sendCalculateRequest(int a, int b, ResponseCallback callback);
    // 发送执行命令请求
    QString sendExecuteCommand(const QString &type, const QString &command, ResponseCallback callback);
    // 直接发送字符串消息
    QString sendDirectMessage(const QString &message, ResponseCallback callback);
    // 发送通用请求到服务器
    QString sendRequest(const QJsonObject &request, ResponseCallback callback);

signals:
    void connected();
    void disconnected();
    void error(const QString &errorMsg);
    void logMessage(const QString &message);

private slots:
    void onConnected();
    void onDisconnected();
    void onReadyRead();
    void onError(QAbstractSocket::SocketError socketError);
    void onTimeout();

private:
    QTcpSocket m_socket;
    QMap<QString, ResponseCallback> m_pendingRequests;
    QTimer m_timeoutTimer;
    static const int TIMEOUT_MS = 5000; // 5秒超时
    
    // 黏包处理相关
    QByteArray m_receiveBuffer;
    
    // 协议相关方法
    QByteArray buildProtocolMessage(const QJsonObject &message);
    QByteArray buildProtocolMessageDirect(const QByteArray &rawData);
    quint32 calculateCRC32(const QByteArray &data);
    void processReceivedData(const QByteArray &data);
};

#endif // TCPCLIENT_H 
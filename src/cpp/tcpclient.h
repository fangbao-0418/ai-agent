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
    QString sendRequest(const QJsonObject &request, ResponseCallback callback);

    QTcpSocket m_socket;
    QMap<QString, ResponseCallback> m_pendingRequests;
    QTimer m_timeoutTimer;
    static const int TIMEOUT_MS = 5000; // 5秒超时
};

#endif // TCPCLIENT_H 
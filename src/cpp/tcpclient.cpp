#include "tcpclient.h"
#include <QJsonObject>
#include <QJsonDocument>
#include <QByteArray>

TcpClient::TcpClient(QObject *parent)
    : QObject(parent)
{
    // 连接信号槽
    connect(&m_socket, &QTcpSocket::connected, this, &TcpClient::onConnected);
    connect(&m_socket, &QTcpSocket::disconnected, this, &TcpClient::onDisconnected);
    connect(&m_socket, &QTcpSocket::readyRead, this, &TcpClient::onReadyRead);
    connect(&m_socket, QOverload<QAbstractSocket::SocketError>::of(&QAbstractSocket::error),
            this, &TcpClient::onError);
    
    // 设置超时定时器
    m_timeoutTimer.setSingleShot(false);
    m_timeoutTimer.setInterval(1000); // 每秒检查一次超时
    connect(&m_timeoutTimer, &QTimer::timeout, this, &TcpClient::onTimeout);
    m_timeoutTimer.start();
}

TcpClient::~TcpClient()
{
    disconnectFromServer();
}

bool TcpClient::connectToServer(const QString &host, quint16 port)
{
    if (m_socket.state() == QAbstractSocket::ConnectedState) {
        return true;
    }
    
    m_socket.connectToHost(host, port);
    return m_socket.waitForConnected(3000); // 等待连接最多3秒
}

void TcpClient::disconnectFromServer()
{
    if (m_socket.state() != QAbstractSocket::UnconnectedState) {
        m_socket.disconnectFromHost();
        if (m_socket.state() != QAbstractSocket::UnconnectedState) {
            m_socket.waitForDisconnected(1000);
        }
    }
}

bool TcpClient::isConnected() const
{
    return m_socket.state() == QAbstractSocket::ConnectedState;
}

QString TcpClient::sendMessage(const QString &message, ResponseCallback callback)
{
    QJsonObject request;
    request["type"] = "message";
    request["content"] = message;
    return sendRequest(request, callback);
}

QString TcpClient::sendCalculateRequest(int a, int b, ResponseCallback callback)
{
    QJsonObject request;
    request["type"] = "calculate";
    request["a"] = a;
    request["b"] = b;
    return sendRequest(request, callback);
}

QString TcpClient::sendRequest(const QJsonObject &request, ResponseCallback callback)
{
    if (!isConnected()) {
        emit error("未连接到服务器");
        return QString();
    }
    
    // 生成唯一请求ID
    QString requestId = QUuid::createUuid().toString(QUuid::WithoutBraces);
    
    // 添加请求ID
    QJsonObject requestWithId = request;
    requestWithId["requestId"] = requestId;
    
    // 将请求转换为JSON
    QJsonDocument doc(requestWithId);
    QByteArray jsonData = doc.toJson(QJsonDocument::Compact);
    
    // 存储回调
    if (callback) {
        m_pendingRequests[requestId] = callback;
    }
    
    // 发送数据
    m_socket.write(jsonData);
    
    emit logMessage("发送请求: " + QString::fromUtf8(jsonData));
    
    return requestId;
}

void TcpClient::onConnected()
{
    emit connected();
    emit logMessage("已连接到服务器");
}

void TcpClient::onDisconnected()
{
    emit disconnected();
    emit logMessage("已断开与服务器的连接");
    
    // 清空所有等待中的请求
    m_pendingRequests.clear();
}

void TcpClient::onReadyRead()
{
    QByteArray data = m_socket.readAll();
    emit logMessage("收到响应: " + QString::fromUtf8(data));
    
    try {
        QJsonDocument doc = QJsonDocument::fromJson(data);
        if (doc.isObject()) {
            QJsonObject response = doc.object();
            
            // 检查是否有请求ID
            if (response.contains("requestId")) {
                QString requestId = response["requestId"].toString();
                
                // 查找对应的回调
                if (m_pendingRequests.contains(requestId)) {
                    ResponseCallback callback = m_pendingRequests[requestId];
                    if (callback) {
                        callback(response);
                    }
                    
                    // 从等待列表中移除
                    m_pendingRequests.remove(requestId);
                }
            }
        }
    } catch (...) {
        emit error("解析响应失败");
    }
}

void TcpClient::onError(QAbstractSocket::SocketError socketError)
{
    Q_UNUSED(socketError);
    QString errorMsg = m_socket.errorString();
    emit error("连接错误: " + errorMsg);
    emit logMessage("连接错误: " + errorMsg);
}

void TcpClient::onTimeout()
{
    QStringList timeoutIds;
    
    // 检查所有等待中的请求是否超时
    QMutableMapIterator<QString, ResponseCallback> it(m_pendingRequests);
    while (it.hasNext()) {
        it.next();
        
        // 在实际应用中，可以为每个请求记录发送时间，这里简化处理
        // 这里我们应该检查请求的发送时间，然后决定是否超时
        // 由于这是示例，我们这里不做真正的超时处理
    }
} 
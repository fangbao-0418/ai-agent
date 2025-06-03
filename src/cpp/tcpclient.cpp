#include "tcpclient.h"
#include <QJsonObject>
#include <QJsonDocument>
#include <QByteArray>
#include <QCryptographicHash>

TcpClient::TcpClient(QObject *parent)
    : QObject(parent)
{
    // 连接信号槽
    connect(&m_socket, &QTcpSocket::connected, this, &TcpClient::onConnected);
    connect(&m_socket, &QTcpSocket::disconnected, this, &TcpClient::onDisconnected);
    connect(&m_socket, &QTcpSocket::readyRead, this, &TcpClient::onReadyRead);
    
    // 使用新的errorOccurred信号替代过时的error信号
    connect(&m_socket, &QAbstractSocket::errorOccurred, this, &TcpClient::onError);
    
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
    request["event"] = "message";
    request["data"] = message;
    return sendRequest(request, callback);
}

QString TcpClient::sendCalculateRequest(int a, int b, ResponseCallback callback)
{
    QJsonObject request;
    request["event"] = "calculate";
    QJsonObject data;
    data["a"] = a;
    data["b"] = b;
    request["data"] = data;
    return sendRequest(request, callback);
}

QString TcpClient::sendExecuteCommand(const QString &type, const QString &command, ResponseCallback callback)
{
    if (!isConnected()) {
        emit error("未连接到服务器");
        return QString();
    }
    
    // 直接构建命令JSON字符串，不使用{event, data}包装
    QJsonObject commandData;
    commandData["command"] = command;
    commandData["type"] = type;
    QJsonDocument commandDoc(commandData);
    QByteArray jsonData = commandDoc.toJson(QJsonDocument::Compact);
    
    // 生成请求ID用于回调
    QString requestId = QUuid::createUuid().toString(QUuid::WithoutBraces);
    
    // 存储回调
    if (callback) {
        m_pendingRequests[requestId] = callback;
    }
    
    // 直接发送JSON字符串（不使用协议包装）
    emit logMessage("发送execute_command JSON: " + QString::fromUtf8(jsonData));
    
    // 构建协议消息并发送
    QByteArray protocolMessage = buildProtocolMessageDirect(jsonData);
    m_socket.write(protocolMessage);
    
    return requestId;
}

QString TcpClient::sendDirectMessage(const QString &message, ResponseCallback callback)
{
    if (!isConnected()) {
        emit error("未连接到服务器");
        return QString();
    }
    
    // 生成唯一请求ID
    QString requestId = QUuid::createUuid().toString(QUuid::WithoutBraces);
    
    // 存储回调
    if (callback) {
        m_pendingRequests[requestId] = callback;
    }
    
    // 直接发送字符串消息
    QByteArray messageData = message.toUtf8();
    QByteArray protocolMessage = buildProtocolMessageDirect(messageData);
    m_socket.write(protocolMessage);
    
    emit logMessage("发送直接消息: " + message);
    
    return requestId;
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
    
    // 存储回调
    if (callback) {
        m_pendingRequests[requestId] = callback;
    }
    
    // 构建协议消息并发送
    QByteArray protocolMessage = buildProtocolMessage(requestWithId);
    m_socket.write(protocolMessage);
    
    emit logMessage("发送请求: " + requestWithId["event"].toString());
    
    return requestId;
}

// 构建协议消息
QByteArray TcpClient::buildProtocolMessage(const QJsonObject &message)
{
    // 转换为JSON字符串
    QJsonDocument doc(message);
    QByteArray jsonData = doc.toJson(QJsonDocument::Compact);
    
    // 调试输出：打印JSON字符串
    emit logMessage("发送JSON: " + QString::fromUtf8(jsonData));
    
    // 构建消息体：[2字节类型][JSON数据]
    QByteArray messageBody;
    // 使用ASCII字符'00'匹配Node.js端格式
    messageBody.append("00"); // 类型字段，使用ASCII字符匹配Node.js
    messageBody.append(jsonData);
    
    // 计算CRC32
    quint32 crc = calculateCRC32(messageBody);
    
    // 构建完整消息：[4字节长度][消息体][4字节CRC]
    QByteArray fullMessage;
    
    // 长度头（Big Endian）- 只计算JSON数据的长度
    QByteArray lengthHeader(4, 0);
    quint32 messageLength = jsonData.length(); // 注意：这里只计算JSON数据长度
    lengthHeader[0] = (messageLength >> 24) & 0xFF;
    lengthHeader[1] = (messageLength >> 16) & 0xFF;
    lengthHeader[2] = (messageLength >> 8) & 0xFF;
    lengthHeader[3] = messageLength & 0xFF;
    
    // CRC（Big Endian）
    QByteArray crcBytes(4, 0);
    crcBytes[0] = (crc >> 24) & 0xFF;
    crcBytes[1] = (crc >> 16) & 0xFF;
    crcBytes[2] = (crc >> 8) & 0xFF;
    crcBytes[3] = crc & 0xFF;
    
    fullMessage.append(lengthHeader);
    fullMessage.append(messageBody);
    fullMessage.append(crcBytes);
    
    // 调试输出：打印二进制消息内容
    QString hexString;
    for (int i = 0; i < fullMessage.size(); ++i) {
        hexString += QString("%1 ").arg(static_cast<unsigned char>(fullMessage[i]), 2, 16, QChar('0'));
        if ((i + 1) % 16 == 0) hexString += "\n";
    }
    emit logMessage("发送二进制数据 (" + QString::number(fullMessage.size()) + " 字节):\n" + hexString);
    
    // 分段输出便于理解
    emit logMessage("长度头: " + QString::number(messageLength) + " 字节 (只计算JSON数据)");
    emit logMessage("消息体长度: " + QString::number(messageBody.length()) + " 字节");
    emit logMessage("CRC32: 0x" + QString::number(crc, 16).toUpper());
    
    return fullMessage;
}

// 直接构建协议消息（不使用JSON包装）
QByteArray TcpClient::buildProtocolMessageDirect(const QByteArray &rawData)
{
    // 调试输出：打印原始数据
    emit logMessage("发送原始数据: " + QString::fromUtf8(rawData));
    
    // 构建消息体：[2字节类型][原始数据]
    QByteArray messageBody;
    // 使用ASCII字符'00'匹配Node.js端格式
    messageBody.append("00"); // 类型字段，使用ASCII字符匹配Node.js
    messageBody.append(rawData);
    
    // 计算CRC32
    quint32 crc = calculateCRC32(messageBody);
    
    // 构建完整消息：[4字节长度][消息体][4字节CRC]
    QByteArray fullMessage;
    
    // 长度头（Big Endian）- 只计算原始数据的长度
    QByteArray lengthHeader(4, 0);
    quint32 messageLength = rawData.length(); // 注意：这里只计算原始数据长度
    lengthHeader[0] = (messageLength >> 24) & 0xFF;
    lengthHeader[1] = (messageLength >> 16) & 0xFF;
    lengthHeader[2] = (messageLength >> 8) & 0xFF;
    lengthHeader[3] = messageLength & 0xFF;
    
    // CRC（Big Endian）
    QByteArray crcBytes(4, 0);
    crcBytes[0] = (crc >> 24) & 0xFF;
    crcBytes[1] = (crc >> 16) & 0xFF;
    crcBytes[2] = (crc >> 8) & 0xFF;
    crcBytes[3] = crc & 0xFF;
    
    fullMessage.append(lengthHeader);
    fullMessage.append(messageBody);
    fullMessage.append(crcBytes);
    
    // 调试输出：打印二进制消息内容
    QString hexString;
    for (int i = 0; i < fullMessage.size(); ++i) {
        hexString += QString("%1 ").arg(static_cast<unsigned char>(fullMessage[i]), 2, 16, QChar('0'));
        if ((i + 1) % 16 == 0) hexString += "\n";
    }
    emit logMessage("发送二进制数据 (" + QString::number(fullMessage.size()) + " 字节):\n" + hexString);
    
    // 分段输出便于理解
    emit logMessage("长度头: " + QString::number(messageLength) + " 字节 (只计算原始数据)");
    emit logMessage("消息体长度: " + QString::number(messageBody.length()) + " 字节");
    emit logMessage("CRC32: 0x" + QString::number(crc, 16).toUpper());
    
    return fullMessage;
}

// 计算CRC32（简化版，使用SHA256的前4字节）
quint32 TcpClient::calculateCRC32(const QByteArray &data)
{
    QCryptographicHash hash(QCryptographicHash::Sha256);
    hash.addData(data);
    QByteArray result = hash.result();
    
    // 取前4字节作为CRC32
    quint32 crc = 0;
    if (result.size() >= 4) {
        crc = (static_cast<quint8>(result[0]) << 24) |
              (static_cast<quint8>(result[1]) << 16) |
              (static_cast<quint8>(result[2]) << 8) |
              static_cast<quint8>(result[3]);
    }
    
    return crc;
}

// 处理接收到的数据（黏包处理）
void TcpClient::processReceivedData(const QByteArray &data)
{
    m_receiveBuffer.append(data);
    
    while (m_receiveBuffer.length() >= 4) {
        // 读取消息长度 (Node.js端的length是payloadBuf.length，即JSON数据长度)
        quint32 messageLength = (static_cast<quint8>(m_receiveBuffer[0]) << 24) |
                               (static_cast<quint8>(m_receiveBuffer[1]) << 16) |
                               (static_cast<quint8>(m_receiveBuffer[2]) << 8) |
                               static_cast<quint8>(m_receiveBuffer[3]);
        
        quint32 fullMessageLength = 4 + 2 + messageLength + 4; // 长度头+类型+JSON数据+CRC
        
        if (m_receiveBuffer.length() >= fullMessageLength) {
            // 提取消息部分：[2字节类型][JSON数据]
            QByteArray messageBody = m_receiveBuffer.mid(4, 2 + messageLength);
            QByteArray crcBytes = m_receiveBuffer.mid(4 + 2 + messageLength, 4);
            
            // 验证CRC
            quint32 receivedCrc = (static_cast<quint8>(crcBytes[0]) << 24) |
                                 (static_cast<quint8>(crcBytes[1]) << 16) |
                                 (static_cast<quint8>(crcBytes[2]) << 8) |
                                 static_cast<quint8>(crcBytes[3]);
            
            quint32 calculatedCrc = calculateCRC32(messageBody);
            
            emit logMessage("收到消息长度: " + QString::number(messageLength));
            emit logMessage("消息体长度: " + QString::number(messageBody.length()));
            emit logMessage("接收CRC: 0x" + QString::number(receivedCrc, 16).toUpper());
            emit logMessage("计算CRC: 0x" + QString::number(calculatedCrc, 16).toUpper());
            
            if (receivedCrc == calculatedCrc) {
                // CRC验证通过，解析消息
                // 跳过2字节类型字段，获取JSON数据
                QByteArray jsonData = messageBody.mid(2);
                
                emit logMessage("接收JSON: " + QString::fromUtf8(jsonData));
                
                try {
                    QJsonDocument doc = QJsonDocument::fromJson(jsonData);
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
                        
                        emit logMessage("收到响应: " + response["event"].toString());
                    }
                } catch (...) {
                    emit error("解析响应失败");
                }
            } else {
                emit logMessage("CRC验证失败，丢弃消息");
            }
            
            // 从缓冲区移除已处理的消息
            m_receiveBuffer.remove(0, fullMessageLength);
        } else {
            // 数据不完整，等待更多数据
            break;
        }
    }
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
    
    // 清空所有等待中的请求和接收缓冲区
    m_pendingRequests.clear();
    m_receiveBuffer.clear();
}

void TcpClient::onReadyRead()
{
    QByteArray data = m_socket.readAll();
    processReceivedData(data);
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
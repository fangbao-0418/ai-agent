# TCP 协议格式说明

## 协议概述

本项目使用自定义的TCP协议进行C++客户端和Node.js服务器之间的通信，支持黏包处理和数据完整性校验。

## 协议格式

```
[4字节长度][2字节类型][JSON数据][4字节CRC32]
```

### 字段说明

1. **长度字段（4字节）**：Big Endian格式，表示后续数据的总长度（类型+JSON数据）
2. **类型字段（2字节）**：消息类型，当前使用 `0x0000`
3. **JSON数据**：具体的消息内容，格式如下
4. **CRC32校验（4字节）**：Big Endian格式，用于数据完整性校验

### JSON消息格式

```json
{
  "event": "事件类型",
  "data": "数据内容或对象",
  "requestId": "唯一请求ID"
}
```

## 支持的消息类型

### 1. 普通消息
```json
{
  "event": "message",
  "data": "这是一条测试消息",
  "requestId": "uuid"
}
```

### 2. 计算请求
```json
{
  "event": "calculate", 
  "data": {
    "a": 10,
    "b": 20
  },
  "requestId": "uuid"
}
```

## 黏包处理

### C++ 端实现
- 使用 `m_receiveBuffer` 缓冲接收到的数据
- 按协议格式解析完整消息
- 验证CRC32校验码
- 处理完整消息后从缓冲区移除

### Node.js 端实现
- 累积接收的数据到 `buffer`
- 循环解析完整消息直到数据不足
- CRC32校验失败则丢弃消息
- 成功解析后触发相应事件

## CRC32 计算

为简化实现，使用SHA256哈希的前4字节作为CRC32值：

**C++ 端：**
```cpp
quint32 TcpClient::calculateCRC32(const QByteArray &data)
{
    QCryptographicHash hash(QCryptographicHash::Sha256);
    hash.addData(data);
    QByteArray result = hash.result();
    // 取前4字节作为CRC32
    return (result[0] << 24) | (result[1] << 16) | (result[2] << 8) | result[3];
}
```

**Node.js 端：**
```javascript
function _calculateCRC32(data) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(data).digest();
  return hash.readUInt32BE(0);
}
```

## 使用示例

### C++ 端发送消息
```cpp
TcpClient client;
client.connectToServer("127.0.0.1", 8888);

// 发送普通消息
client.sendMessage("Hello Node.js", [](const QJsonObject &response) {
    qDebug() << "收到响应:" << response;
});

// 发送计算请求
client.sendCalculateRequest(10, 20, [](const QJsonObject &response) {
    qDebug() << "计算结果:" << response["result"].toInt();
});
```

### Node.js 端响应
```javascript
newSocket.on('message', (data) => {
    console.log('收到消息:', data);
    newSocket.emit('message_response', '消息已收到');
});

newSocket.on('calculate', (data) => {
    const result = data.a + data.b;
    newSocket.emit('calculate_response', { result: result });
});
```

## 错误处理

1. **连接错误**：网络断开、连接超时等
2. **协议错误**：长度字段错误、数据不完整等  
3. **CRC校验失败**：数据传输过程中损坏
4. **JSON解析错误**：数据格式不正确

所有错误都会通过相应的信号/回调进行通知。 
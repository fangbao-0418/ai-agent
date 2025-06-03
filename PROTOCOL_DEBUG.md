# TCP协议格式调试报告

## 问题描述

C++客户端发送的消息格式与Node.js服务器期望的格式不匹配，导致通信失败。

## 原始问题分析

### 用户提供的错误JSON格式
```json
{
  "event": "execute_command",
  "data": "{\"type\":\"browser\",\"command\":\"帮我打开boss直聘并登录\"}"
}
```

**问题1**: `data`字段是字符串而不是对象（其实这个格式是正确的！）

### Node.js端期望的格式分析

查看Node.js端代码发现：
```typescript
this.socket.on('execute_command', async (data: string) => {
  this.onExecuteCommand(JSON.parse(data))
})

async onExecuteCommand (data?: { command: string, type: AgentType }) {
```

**正确格式应该是**:
```json
{
  "event": "execute_command",
  "data": "{\"command\":\"帮我打开boss直聘并登录\",\"type\":\"browser\"}"
}
```

**关键点**: 
- `data`字段必须是字符串（不是对象！）
- 字符串内容是JSON格式的`{command: string, type: string}`
- Node.js端会对data字符串进行`JSON.parse()`

## 协议格式分析

### Node.js端发送格式
```javascript
// 发送消息构建
const payload = JSON.stringify({event: event, data: data})
const payloadBuf = Buffer.from(payload)

const header = Buffer.alloc(4);
header.writeUInt32BE(payloadBuf.length);  // 只计算JSON数据长度
const typeBuf = Buffer.from('00', 'ascii'); // ASCII字符'0''0' (0x30 0x30)
const crcBuf = Buffer.alloc(4);
const dataToCrc = Buffer.concat([typeBuf, payloadBuf]); // CRC计算包含类型+JSON
const crc = _calculateCRC32(dataToCrc);
crcBuf.writeUInt32BE(crc);

// 最终消息: [4字节长度][2字节类型][JSON数据][4字节CRC]
const message = Buffer.concat([header, typeBuf, payloadBuf, crcBuf]);
```

### Node.js端接收格式
```javascript
const length = buffer.readUInt32BE(0); // 读取JSON数据长度
const fullMessageLength = 4 + 2 + length + 4; // 长度头+类型+数据+CRC
const message = buffer.slice(4, 6 + length); // 提取[类型+JSON数据]
const receivedCrc = buffer.readUInt32BE(6 + length); // 读取CRC
const calculatedCrc = _calculateCRC32(message); // 验证[类型+JSON数据]的CRC
const type = message.readUInt16BE(0); // 读取类型（会得到0x3030）
const payload = message.slice(2); // 获取JSON数据
```

## 修正前的C++端问题

### 问题1: 类型字段格式不匹配
- **C++**: `QByteArray(2, 0x00)` → 0x00 0x00 (二进制)
- **Node.js**: `Buffer.from('00', 'ascii')` → 0x30 0x30 (ASCII字符'0''0')

### 问题2: 长度字段计算不匹配  
- **C++**: 计算整个消息体长度(类型+JSON)
- **Node.js**: 只计算JSON数据长度

## 修正方案

### C++端发送协议修正
```cpp
QByteArray messageBody;
messageBody.append("00"); // 使用ASCII字符'00'匹配Node.js格式
messageBody.append(jsonData);

// 长度只计算JSON数据长度
quint32 messageLength = jsonData.length();

// 消息格式: [4字节长度][2字节类型'00'][JSON数据][4字节CRC]
```

### C++端接收协议修正
```cpp
// 读取的length是JSON数据长度
quint32 fullMessageLength = 4 + 2 + messageLength + 4;

// 提取[2字节类型][JSON数据]用于CRC验证
QByteArray messageBody = m_receiveBuffer.mid(4, 2 + messageLength);

// JSON数据从第6字节开始(跳过长度头4字节+类型2字节)
QByteArray jsonData = messageBody.mid(2);
```

## 二进制消息格式示例

### 正确的execute_command消息
```
长度: 0x00 0x00 0x00 0x5A (90字节JSON数据)
类型: 0x30 0x30 ('0' '0' ASCII)
JSON: {"event":"execute_command","data":{"type":"browser","command":"帮我打开boss直聘并登录"},"requestId":"..."}
CRC:  0x12 0x34 0x56 0x78 (示例)
```

## 调试输出说明

修正后的C++代码会输出以下调试信息：
- 发送的JSON字符串
- 二进制数据的十六进制表示
- 长度头、消息体长度、CRC值
- 接收消息的解析过程

这些信息可以帮助验证协议格式是否正确匹配。 
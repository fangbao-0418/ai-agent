# 简化TCP协议格式

## 协议变更

根据用户要求，C++端现在支持直接发送消息字符串，不再需要`{event, data}`的包装格式。

## 最终协议格式

### C++端发送
```
[4字节长度][2字节类型'00'][直接JSON字符串][4字节CRC]
```

### 发送的payload内容
直接发送execute_command的JSON字符串：
```json
{"command":"帮我打开boss直聘并登录","type":"browser"}
```

**完全去掉了**原来的包装格式：
```json
{"event":"execute_command","data":"..."}  ← 不再使用
```

### Node.js端处理
Node.js端现在简化为：
```javascript
// 直接将payload作为execute_command数据处理
newSocket.exec('execute_command', payload.toString())
```

### 数据流

1. **C++发送**: `{"command":"帮我打开boss直聘并登录","type":"browser"}`
2. **Node.js接收payload**: `{"command":"帮我打开boss直聘并登录","type":"browser"}`
3. **Node.js调用**: `newSocket.exec('execute_command', '{"command":"帮我打开boss直聘并登录","type":"browser"}')`
4. **message.ts接收**: `socket.on('execute_command', (data: string) => { ... })`
5. **最终处理**: `JSON.parse(data)` → `{command: "...", type: "..."}`

## C++端新方法

### sendExecuteCommand
```cpp
// 直接发送execute_command消息
client.sendExecuteCommand("browser", "帮我打开boss直聘并登录", callback);
```
发送内容：`{"command":"帮我打开boss直聘并登录","type":"browser"}`

### sendDirectMessage
```cpp
// 直接发送任意字符串消息
client.sendDirectMessage("{\"custom\":\"message\"}", callback);
```

## 优势

1. **简化格式**：去掉了不必要的协议包装层
2. **向后兼容**：Node.js端仍然支持原有格式
3. **灵活性**：可以发送任意格式的字符串消息
4. **调试友好**：直接的JSON字符串更容易调试

## 消息示例

### execute_command消息
**C++发送**：
```
长度: 0x00 0x00 0x00 0x3D (61字节)
类型: 0x30 0x30 ('0' '0')
JSON: {"command":"帮我打开boss直聘并登录","type":"browser"}
CRC:  0x12 0x34 0x56 0x78
```

**Node.js接收**：
```javascript
// 直接接收到JSON字符串
newSocket.exec('execute_command', '{"command":"帮我打开boss直聘并登录","type":"browser"}');
```

### 处理流程
1. C++发送原始JSON字符串
2. Node.js接收并解析协议
3. 检测到不是{event,data}格式
4. 直接作为execute_command事件处理
5. message.ts中的监听器接收字符串并JSON.parse 
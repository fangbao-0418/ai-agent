# 直接消息发送测试

## 当前实现状态

所有C++端的消息发送现在都使用直接JSON字符串，完全去掉了`{event, data}`包装。

## 发送方法对比

### 1. execute_command (on_btnOpenBrowser_clicked)
```cpp
m_tcpClient->sendExecuteCommand("browser", "帮我打开boss直聘并登录", callback);
```
**实际发送的payload**:
```json
{"command":"帮我打开boss直聘并登录","type":"browser"}
```

### 2. 普通消息 (on_btnSendMessage_clicked)
```cpp
m_tcpClient->sendDirectMessage(message, callback);
```
**实际发送的payload**: 用户输入的原始字符串

### 3. 计算请求 (on_btnCalculate_clicked)
```cpp
QJsonObject calcData;
calcData["a"] = a;
calcData["b"] = b;
calcData["operation"] = "add";
QString calcJson = QJsonDocument(calcData).toJson(QJsonDocument::Compact);
m_tcpClient->sendDirectMessage(calcJson, callback);
```
**实际发送的payload**:
```json
{"a":10,"b":20,"operation":"add"}
```

## 协议格式

所有消息都使用相同的二进制协议：
```
[4字节长度][2字节类型'00'][直接JSON字符串][4字节CRC]
```

**关键特点**:
- 没有`{"event":"...","data":"..."}`包装
- payload部分直接就是所需的JSON字符串
- 长度字段只计算JSON字符串的字节数
- 类型字段固定为ASCII字符'00' (0x30 0x30)

## 调试输出示例

当发送execute_command时会看到：
```
发送execute_command JSON: {"command":"帮我打开boss直聘并登录","type":"browser"}
发送原始数据: {"command":"帮我打开boss直聘并登录","type":"browser"}
长度头: 61 字节 (只计算原始数据)
```

当发送普通消息时会看到：
```
发送直接消息: {"test":"message"}
发送原始数据: {"test":"message"}
长度头: 17 字节 (只计算原始数据)
```

## 验证方法

1. 运行C++应用程序
2. 连接到Node.js服务器
3. 点击各种按钮发送消息
4. 查看控制台调试输出
5. 确认payload中没有event和data包装

## Node.js端期望

由于用户拒绝了Node.js端的修改，Node.js端仍然期望原有格式。但是通过这种直接发送方式，payload内容已经是纯净的JSON字符串，没有多余的嵌套结构。 
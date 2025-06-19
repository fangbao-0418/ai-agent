import * as net from 'net';
import * as dotenv from 'dotenv';
import AgentMessageServer from './message';
import { logger } from './utils/logger';

// 加载环境变量
dotenv.config();

// 创建TCP服务器
const server = net.createServer();

const HOST = '127.0.0.1';
const PORT = 8888;

function _calculateCRC32(data: Buffer) {
  // 实际应用中应使用专业的CRC32算法
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(data).digest();
  return hash.readUInt32BE(0);
}

// 当有新客户端连接时
server.on('connection', (socket: net.Socket) => {
  logger.info(`C++客户端已连接: ${socket.remoteAddress}:${socket.remotePort}`);
  let buffer: Buffer = Buffer.alloc(0);

  const newSocket: any = {
    listeners: {},
    emit: (event: string, data?: any) => {
      try {
        const payload = JSON.stringify({
          event: event,
          data: data,
        })
        const payloadBuf = Buffer.from(payload)
        
        const header = Buffer.alloc(4);
        header.writeUInt32BE(payloadBuf.length);
        const typeBuf = Buffer.from('00', 'ascii');
        const crcBuf = Buffer.alloc(4);
        const dataToCrc = Buffer.concat([typeBuf, payloadBuf]);
        const crc = _calculateCRC32(dataToCrc);
        crcBuf.writeUInt32BE(crc);
  
        const message = Buffer.concat([
          header,
          typeBuf,
          payloadBuf,
          crcBuf,
        ]);
        socket.write(message);
        // socket.write(JSON.stringify({
        //   event: "hide_window",
        // }));
        return;
      } catch (error) {
        console.error('处理消息出错:', error);
      }
    },
    on: (event: string, callback: (data: any) => any) => {
      newSocket.listeners[event] = callback;
    },
    exec: (event: string, data?: any) => {
      if (newSocket.listeners[event]) {
        newSocket.listeners[event](data);
      }
    }
  }
  
  const messageServer = new AgentMessageServer()
  messageServer.listen(newSocket)

  socket.on('data', async (data: Buffer) => {
    buffer = Buffer.concat([buffer, data])
    // console.log(data.toString());
    while (buffer.length >= 4) {
      const length = buffer.readUInt32BE(0);
      const fullMessageLength = 4 + 2 + length + 4; // 长度头+类型+数据+CRC
      if (buffer.length >= fullMessageLength) {
        const message = buffer.slice(4, 6 + length);
        const receivedCrc = buffer.readUInt32BE(6 + length);
        const calculatedCrc = _calculateCRC32(message);
        if (receivedCrc !== calculatedCrc) {
          // 如果CRC校验失败，则丢弃当前消息
          buffer = buffer.slice(fullMessageLength);
          continue;
        }
        // 解析消息内容
        const type = message.readUInt16BE(0);
        const payload = message.slice(2);
        logger.info(payload.toString(), "payload")
        const obj = JSON.parse(payload.toString())
        newSocket.exec(obj.event, obj.data)
        buffer = buffer.slice(fullMessageLength);
      } else {
        break; // 等待更多数据
      }
    };
    // newSocket.emit('execute_command', JSON.stringify({
    //   type: "browser",
    //   command: "帮我打开boss直聘并登录",
    // }))

    // newSocket.emit('stop_agent')
  })
  // 客户端断开连接
  socket.on('close', () => {
    logger.info('C++客户端已断开');
    newSocket.exec('disconnect')
  });
  
  // 连接错误处理
  socket.on('error', (err: Error) => {
    logger.error('连接错误:', err);
  });
});

// 服务器错误处理
server.on('error', (err: NodeJS.ErrnoException) => {
  logger.error('服务器错误:', err);
  if (err.code === 'EADDRINUSE') {
    logger.error(`端口 ${PORT} 已被占用，请确保没有其他服务正在使用该端口`);
    process.exit(0);
  }
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，准备关闭服务器...');
  server.close(() => {
    logger.info('TCP服务器已关闭，退出进程');
    process.exit(0);
  });
  
  // 如果5秒内服务器没有正常关闭，强制退出
  setTimeout(() => {
    logger.info('服务器关闭超时，强制退出');
    process.exit(0);
  }, 5000);
});

process.on('exit', (err) => {
  logger.error('node-exit', err);
});

process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', err);
});

process.on('unhandledRejection', (err) => {
  logger.error('unhandledRejection', err);
});

const start = () => {
  // 启动服务器
  server.listen(PORT, HOST, () => {
    logger.info(`Node.js TCP服务器启动成功，监听 ${HOST}:${PORT}`);
    logger.info('等待C++客户端连接...');
  });
}

export default { server, start }; 
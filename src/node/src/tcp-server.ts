import * as net from 'net';
import * as dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { getSystemPromptV1_5, getSystemPromptV1_5_Custom } from './prompts';
import { DefaultBrowserOperator, BrowserOperator, SearchEngine } from '@ui-tars/operator-browser';
import { LocalBrowser, BrowserType } from '@agent-infra/browser';
import { ConsoleLogger } from '@agent-infra/logger';
import { GUIAgent } from '@ui-tars/sdk';
import { NutJSElectronOperator } from './computer-use/operator';
import { logger } from './utils/logger';

// 加载环境变量
dotenv.config();

// 定义请求和响应的接口
interface BaseRequest {
  type: string;
  requestId: string;
}

interface CalculateRequest extends BaseRequest {
  type: 'calculate';
  a: number;
  b: number;
}

interface MessageRequest extends BaseRequest {
  type: 'message';
  content: string;
}

type Request = CalculateRequest | MessageRequest;

interface BaseResponse {
  type: string;
  requestId: string;
}

interface CalculateResponse extends BaseResponse {
  type: 'calculateResult';
  result: number;
}

interface MessageResponse extends BaseResponse {
  type: 'messageResult';
  content: string;
}

interface ErrorResponse extends BaseResponse {
  type: 'error';
  message: string;
}

type Response = CalculateResponse | MessageResponse | ErrorResponse;

// 创建TCP服务器
const server = net.createServer();
// const HOST = '127.0.0.1';
const HOST = 'localhost';
const PORT = 8888;

console.log('=== Node.js TCP服务器启动 ===');
console.log(`时间: ${new Date().toLocaleString()}`);
console.log(`进程ID: ${process.pid}`);
console.log(`版本: Node ${process.version}`);
console.log(`平台: ${process.platform}`);
console.log(`当前工作目录: ${process.cwd()}`);


async function runAgent (command: string) {
  const modelVersion: any = '1.5'
  const logger = new ConsoleLogger('[BrowserGUIAgent]');
  const operator = await DefaultBrowserOperator.getInstance(
    true,
    true,
    // lastStatus === StatusEnum.CALL_USER,
    false,
    SearchEngine.BAIDU,
  );
  // const operator = new NutJSElectronOperator();
  // const operator = new BrowserOperator({
  //   browser: new LocalBrowser({
  //     logger,
  //   }),
  //   browserType: 'chrome',
  //   logger,
  // });
  const guiAgent = new GUIAgent({
    model: {
      // baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      // apiKey: '40510637-b0b7-4106-a372-acf2983ad03c',
      // model: 'doubao-1.5-ui-tars-250328',
      baseURL: 'http://116.148.216.92:32513/v1',
      apiKey: 'EMPTY',
      model: 'UI-TARS-1.5-7B',
    },
    systemPrompt: getSystemPromptV1_5_Custom('zh', 'normal'),
    logger,
    operator: operator,
    onData: (e)  => {
      //
    },
    onError: (params: any) => {
      console.log('GUIAgent 错误:', params);
      if (params && params.error && params.error.message) {
        console.log('GUIAgent 错误:', params.error.message);
        // this.io.emit('agent_message', {
        //   message: `执行失败: ${params.error.message}`,
        //   status: 'error'
        // });
      }
      if (params && params.message && params.message.includes('context')) {
        // conror('检测到 context 相关错误');
      }
    },
    retry: {
      model: {
        maxRetries: 3,
      },
      screenshot: {
        maxRetries: 5,
      },
      execute: {
        maxRetries: 1,
      },
    },
    maxLoopCount: 200,
    loopIntervalInMs: 3000,
    uiTarsVersion: modelVersion,
  });
  await guiAgent.run(command);
}

// 当有新客户端连接时
server.on('connection', (socket: net.Socket) => {
  console.log(`C++客户端已连接: ${socket.remoteAddress}:${socket.remotePort}`);
  
  // 设置编码
  socket.setEncoding('utf8');
  
  // 接收客户端数据
  socket.on('data', async (data: Buffer) => {
    try {
      console.log(data, 'data')
      const obj = JSON.parse(data.toString());
      runAgent(obj.command)
      return;
    } catch (error) {
      // console.error('处理消息出错:', error);
      // try {
      //   const response: ErrorResponse = {
      //     type: 'error',
      //     message: '消息格式错误或处理失败',
      //     requestId: 'error'
      //   };
      //   socket.write(JSON.stringify(response));
      // } catch (e) {
      //   console.error('发送错误响应失败:', e);
      // }
    }
  });
  
  // 发送欢迎消息
  const welcomeMessage: MessageResponse = {
    type: 'messageResult',
    content: '欢迎连接到Node.js TCP服务器',
    requestId: 'server-welcome'
  };
  socket.emit(JSON.stringify(welcomeMessage));
  
  // 客户端断开连接
  socket.on('close', () => {
    console.log('C++客户端已断开');
  });
  
  // 连接错误处理
  socket.on('error', (err: Error) => {
    console.error('连接错误:', err);
  });
});

// 服务器错误处理
server.on('error', (err: NodeJS.ErrnoException) => {
  console.error('服务器错误:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，请确保没有其他服务正在使用该端口`);
    process.exit(1);
  }
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，准备关闭服务器...');
  server.close(() => {
    console.log('TCP服务器已关闭，退出进程');
    process.exit(0);
  });
  
  // 如果5秒内服务器没有正常关闭，强制退出
  setTimeout(() => {
    console.log('服务器关闭超时，强制退出');
    process.exit(1);
  }, 5000);
});

// 启动服务器
server.listen(PORT, HOST, () => {
  console.log(`Node.js TCP服务器启动成功，监听 ${HOST}:${PORT}`);
  console.log('等待C++客户端连接...');
});

export { server }; 
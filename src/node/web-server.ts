import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import * as dotenv from 'dotenv';
import { getSystemPromptV1_5, getSystemPromptV1_5_Custom } from './prompts';
import { DefaultBrowserOperator, BrowserOperator, SearchEngine } from '@ui-tars/operator-browser';
import { LocalBrowser, BrowserType } from '@agent-infra/browser';
import { ConsoleLogger } from '@agent-infra/logger';
import { GUIAgent } from '@ui-tars/sdk';
import { NutJSElectronOperator } from './computer-use/operator';
import { logger } from './utils/logger';
import AgentServer from './agent';
import AgentMessageServer from './message';

// 加载环境变量
dotenv.config();

class BrowserUseServer {
  private app: express.Application;
  private server: any;
  private io: Server;
  private isAgentRunning = false;
  private currentAction = '待机中';
  private progress = 0;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: false
      }
    });
    this.initializeRoutes();
    this.initializeSocketHandlers();
  }

  private initializeRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        agentStatus: {
          isRunning: this.isAgentRunning,
          currentAction: this.currentAction,
          progress: this.progress
        }
      });
    });
  }

  private initializeSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔗 客户端连接:', socket.id);
      const messageServer = new AgentMessageServer()
      messageServer.listen(socket)
    });
  }
  public start(port: number = 8888) {
    this.server.listen(port, () => {
      console.log(`🚀 Browser Use 服务器启动成功`);
      console.log(`🔌 Socket 端口: ${port}`);
      console.log(`🎯 环境检查:`);
      console.log(`   - Node.js: ${process.version}`);
      console.log(`   - 平台: ${process.platform}`);
    });
  }
}

// 防止进程意外退出
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

// 启动服务器
const server = new BrowserUseServer();
server.start();

export default BrowserUseServer; 
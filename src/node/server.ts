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

// 加载环境变量
dotenv.config();

class BrowserUseServer {
  private app: express.Application;
  private server: any;
  private io: Server;
  private guiAgent: any = null;
  private operator: any = null;
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

    // this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSocketHandlers();
    // this.initGuiAgent();
    // this.initializeBrowserOperator();
  }

  private handleData (params: any) {
    console.log(params);
  }

  private async runAgent (command: string) {
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
    this.operator = operator;
    this.guiAgent = new GUIAgent({
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
      onData: this.handleData,
      onError: (params: any) => {
        console.log('GUIAgent 错误:', params);
        if (params && params.error && params.error.message) {
          console.log('GUIAgent 错误:', params.error.message);
          this.io.emit('agent_message', {
            message: `执行失败: ${params.error.message}`,
            status: 'error'
          });
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
    await this.guiAgent.run(command);
  }

  private initializeMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../client/dist')));
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

    // 服务静态文件
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
  }

  private initializeSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔗 客户端连接:', socket.id);
      
      // 发送当前状态
      socket.emit('agent_status', {
        isRunning: this.isAgentRunning,
        currentAction: this.currentAction,
        progress: this.progress
      });

      // 处理执行命令
      socket.on('execute_command', async (data) => {
        const { command, autoMode } = JSON.parse(data);
        console.log('📝 收到指令:', command, '自动模式:', autoMode);
        
        try {
          await this.executeCommand(command, autoMode, socket);
        } catch (error) {
          console.error('执行指令失败:', error);
          socket.emit('agent_message', {
            message: `执行失败: ${error}`,
            status: 'error'
          });
        }
      });

      // 处理停止代理
      socket.on('stop_agent', () => {
        console.log('🛑 收到停止指令');
        this.stopAgent(socket);
      });

      socket.on('disconnect', () => {
        console.log('🔌 客户端断开连接:', socket.id);
      });
    });
  }

  private async initializeBrowserOperator() {
    try {
      console.log('🔧 初始化 BrowserOperator...');
      this.operator = DefaultBrowserOperator.getInstance(
        false,
        false,
        false,
        SearchEngine.GOOGLE,
      );
      console.log('✅ BrowserOperator 初始化成功');
    } catch (error) {
      console.error('❌ BrowserOperator 初始化失败:', error);
    }
  }

  private async executeCommand(command: string, autoMode: boolean, socket: any) {
    if (this.isAgentRunning) {
      socket.emit('agent_message', {
        message: '代理正在运行中，请等待当前任务完成',
        status: 'warning'
      });
      return;
    }

    this.isAgentRunning = true;
    this.currentAction = '初始化中...';
    this.progress = 0;

    // 广播状态更新
    this.io.emit('agent_status', {
      isRunning: this.isAgentRunning,
      currentAction: this.currentAction,
      progress: this.progress
    });

    try {
      // 初始化 GUIAgent
      this.currentAction = '创建 AI 代理...';
      this.progress = 10;
      this.updateProgress(socket);

      this.currentAction = '执行指令中...';
      this.progress = 30;
      this.updateProgress(socket);

      socket.emit('agent_message', {
        message: `开始执行: ${command}`,
        status: 'success'
      });

      this.runAgent(command)

      // 执行指令
      // if (this.guiAgent) {
      //   runAgent(command)
      //   // await this.guiAgent.run(command);
      // } else {
      //   socket.emit('agent_message', {
      //     message: '❌ 指令执行失败',
      //     status: 'false'
      //   });
      //   return;
      // }

      this.currentAction = '执行完成';
      this.progress = 100;
      this.updateProgress(socket);

      socket.emit('agent_message', {
        message: '✅ 指令执行完成',
        status: 'success'
      });

    } catch (error) {
      console.error('执行过程中出错:', error);
      socket.emit('agent_message', {
        message: `执行失败: ${error}`,
        status: 'error'
      });
    } finally {
      this.isAgentRunning = false;
      this.currentAction = '待机中';
      this.progress = 0;
      this.updateProgress(socket);
    }
  }

  private stopAgent(socket: any) {
    if (!this.isAgentRunning) {
      socket.emit('agent_message', {
        message: '当前没有运行中的代理',
        status: 'warning'
      });
      return;
    }

    this.isAgentRunning = false;
    this.currentAction = '已停止';
    this.progress = 0;

    socket.emit('agent_message', {
      message: '🛑 代理已停止',
      status: 'success'
    });

    this.updateProgress(socket);
  }

  private updateProgress(socket: any) {
    const status = {
      isRunning: this.isAgentRunning,
      currentAction: this.currentAction,
      progress: this.progress
    };

    // 发送给当前连接的客户端
    socket.emit('agent_status', status);
    
    // 广播给所有连接的客户端
    this.io.emit('agent_status', status);
    
    // 发送进度更新
    this.io.emit('agent_progress', {
      action: this.currentAction,
      progress: this.progress
    });
  }

  public start(port: number = 8888) {
    this.server.listen(port, () => {
      console.log(`🚀 Browser Use 服务器启动成功`);
      console.log(`📱 Web 界面: http://localhost:${port}`);
      console.log(`🔌 Socket 端口: ${port}`);
      console.log(`🎯 环境检查:`);
      console.log(`   - Node.js: ${process.version}`);
      console.log(`   - 平台: ${process.platform}`);
      console.log('');
      console.log('👆 请打开 http://localhost:3000 使用 React 客户端');
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
import { ConsoleLogger } from '@agent-infra/logger';
import { DefaultBrowserOperator, SearchEngine } from './browser-use/operator-browser';
import { GUIAgent } from './libs/sdk';
import { getSystemPromptV1_5_Custom } from './prompts';
import { LocalBrowser } from '@agent-infra/browser';
import globalData from './global';
import { createUniqueID } from './utils/helper';
import * as fs from 'fs';
import { logger } from './utils/logger';

export type AgentType = 'browser' | 'computer';

class AgentServer {
  private guiAgent!: GUIAgent<DefaultBrowserOperator>;

  onData?: (e: any) => void;
  onError?: (e: any) => void;
  constructor (options?: {
    onData?: (e: any) => void;
    onError?: (e: any) => void;
  }) {
    this.onData = options?.onData;
    this.onError = options?.onError;
  }

  // 确保有会话ID
  private ensureSessionId() {
    let sessionId = globalData.get('session-id');
    if (!sessionId) {
      sessionId = createUniqueID();
      globalData.set('session-id', sessionId);
      logger.info('Agent执行时生成会话ID:', sessionId);
      
      // 创建会话临时目录
      const tempDir = globalData.get('temp-download-dir');
      if (tempDir && !fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log('创建会话临时目录:', tempDir);
      }
    }
    return sessionId;
  }

  async run (command: string, type: AgentType = 'browser') {
    // 确保有会话ID
    this.ensureSessionId();
    
    const modelVersion: any = 'doubao-1.5-15B'
    const logger = new ConsoleLogger('[BrowserGUIAgent]');
    let isBrowserAlive = false;
    if (DefaultBrowserOperator.browser) {
      isBrowserAlive = await DefaultBrowserOperator.browser?.isBrowserAlive()
    }

    const operator = await DefaultBrowserOperator.getInstance(
      false,
      false,
      isBrowserAlive,
      SearchEngine.BAIDU,
    );

    if (isBrowserAlive) {
      //
    }
    // const operator = new NutJSElectronOperator();

    const guiAgent = new GUIAgent({
      model: {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        apiKey: '40510637-b0b7-4106-a372-acf2983ad03c',
        // model: 'doubao-1.5-ui-tars-250328',
        // doubao-1-5-ui-tars-250428
        model: 'doubao-1-5-ui-tars-250428',
        // baseURL: 'http://116.148.216.92:32513/v1',
        // apiKey: 'EMPTY',
        // model: 'UI-TARS-1.5-7B',
      },
      systemPrompt: getSystemPromptV1_5_Custom('zh', 'normal'),
      logger,
      operator: operator,
      onData: (e)  => {
        console.log(e, 'e')
        this.onData?.(e);
      },
      onError: (params: any) => {
        this.onError?.(params);
        // console.log('GUIAgent 错误:', params);
        // if (params && params.error && params.error.message) {
        //   console.log('GUIAgent 错误:', params.error.message);
        //   // this.io.emit('agent_message', {
        //   //   message: `执行失败: ${params.error.message}`,
        //   //   status: 'error'
        //   // });
        // }
        // if (params && params.message && params.message.includes('context')) {
        //   // conror('检测到 context 相关错误');
        // }
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
    this.guiAgent = guiAgent;
    try {
      this.socket()?.emit('hide_window');
      this.socket()?.emit('open_thought_window');
      await this.guiAgent.run(command);
    } catch (error) {
      logger.info(error);
    }
    this.socket()?.emit('open_window');
    this.socket()?.emit('close_thought_window');
  }

  pause () {
    this.guiAgent?.pause?.();
  }

  resume () {
    this.guiAgent?.resume?.();
  }

  stop () {
    this.guiAgent?.stop?.();
  }

  socket () {
    const socket = globalData.get('socket');
    return socket
  }
}

export default AgentServer;
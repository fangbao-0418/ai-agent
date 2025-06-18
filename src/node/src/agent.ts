import { ConsoleLogger } from '@agent-infra/logger';
import { DefaultBrowserOperator, SearchEngine } from './browser-use/operator-browser';
import { GUIAgent } from './libs/sdk';
import { getSystemPromptV1_5_Custom } from './prompts';
import { LocalBrowser } from '@agent-infra/browser';
import globalData from './global';
import { createUniqueID } from './utils/helper';
import * as fs from 'fs';
import { logger } from './utils/logger';
import BrowserWorkerManager from './worker/browser-worker-manager';

export type AgentType = 'browser' | 'computer';

class AgentServer {
  private browserWorkerManager: BrowserWorkerManager;

  onData?: (e: any) => void;
  onError?: (e: any) => void;
  constructor (options?: {
    onData?: (e: any) => void;
    onError?: (e: any) => void;
  }) {
    this.onData = options?.onData;
    this.onError = options?.onError;
    this.browserWorkerManager = BrowserWorkerManager.getInstance();
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
    const sessionId = this.ensureSessionId();
    
    try {
      const result = await this.browserWorkerManager.executeBrowserTask(
        {
          command,
          sessionId
        },
        this.onData,
        this.onError,
        this.handleWindowControl.bind(this)
      );

      if (!result.success) {
        throw new Error(result.error || 'Browser worker execution failed');
      }

      return result.data;
    } catch (error) {
      logger.error('Browser agent execution failed:', error);
      throw error;
    }
  }

  // 处理窗口控制
  private handleWindowControl(action: string) {
    const socket = this.socket();
    switch (action) {
      case 'hide_window':
        socket?.emit('hide_window');
        break;
      case 'open_window':
        socket?.emit('open_window');
        break;
      case 'open_thought_window':
        socket?.emit('open_thought_window');
        break;
      case 'close_thought_window':
        socket?.emit('close_thought_window');
        break;
    }
  }

  pause () {
    this.browserWorkerManager.pause();
  }

  resume () {
    this.browserWorkerManager.resume();
  }

  stop () {
    this.browserWorkerManager.stop();
  }

  // 获取当前状态
  getStatus() {
    return this.browserWorkerManager.getStatus();
  }

  socket () {
    const socket = globalData.get('socket');
    return socket
  }
}

export default AgentServer;
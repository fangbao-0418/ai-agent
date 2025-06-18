import { parentPort, workerData } from 'worker_threads';
import { ConsoleLogger } from '@agent-infra/logger';
import { DefaultBrowserOperator, SearchEngine } from '../browser-use/operator-browser';
import { GUIAgent } from '../libs/sdk';
import { getSystemPromptV1_5_Custom } from '../prompts';
import { LocalBrowser } from '@agent-infra/browser';
import globalData from '../global';
import { createUniqueID } from '../utils/helper';
import * as fs from 'fs';
import { logger } from '../utils/logger';

// 定义Worker数据接口
interface BrowserWorkerData {
  env?: any
  command: string;
  sessionId?: string;
  onData?: (e: any) => void;
  onError?: (e: any) => void;
  type?: 'pause' | 'resume' | 'stop';
}

// Worker状态管理
let workerState = {
  isPaused: false,
  isStopped: false,
  pausePromise: null as Promise<void> | null,
  resolvePause: null as (() => void) | null,
  guiAgent: null as GUIAgent<DefaultBrowserOperator> | null,
};

// 暂停worker
function pauseWorker() {
  console.log('📋 Browser Worker: 收到暂停信号');
  workerState.isPaused = true;
  workerState.pausePromise = new Promise((resolve) => {
    workerState.resolvePause = resolve;
  });
  // 暂停GUI Agent
  workerState.guiAgent?.pause?.();
}

// 恢复worker
function resumeWorker() {
  console.log('📋 Browser Worker: 收到恢复信号');
  if (workerState.resolvePause) {
    workerState.resolvePause();
    workerState.pausePromise = null;
    workerState.resolvePause = null;
  }
  workerState.isPaused = false;
  // 恢复GUI Agent
  workerState.guiAgent?.resume?.();
}

// 停止worker
function stopWorker() {
  console.log('📋 Browser Worker: 收到停止信号');
  workerState.isStopped = true;
  // 如果正在暂停中，先恢复再停止
  if (workerState.resolvePause) {
    workerState.resolvePause();
    workerState.pausePromise = null;
    workerState.resolvePause = null;
  }
  workerState.isPaused = false;
  // 停止GUI Agent
  workerState.guiAgent?.stop?.();
  try {
    DefaultBrowserOperator.destroyInstance;
  } catch (error) {
    //
  }
}

// 检查是否应该暂停
async function checkPause() {
  if (workerState.isStopped) {
    throw new Error('Browser Worker已被停止');
  }
  if (workerState.isPaused && workerState.pausePromise) {
    console.log('📋 Browser Worker: 等待恢复...');
    await workerState.pausePromise;
  }
}

// 确保有会话ID
function ensureSessionId(): string {
  let sessionId = globalData.get('session-id');
  if (!sessionId) {
    sessionId = createUniqueID();
    globalData.set('session-id', sessionId);
    logger.info('Browser Worker执行时生成会话ID:', sessionId);
    
    // 创建会话临时目录
    const tempDir = globalData.get('temp-download-dir');
    if (tempDir && !fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('创建会话临时目录:', tempDir);
    }
  }
  return sessionId;
}

// 浏览器Agent执行函数
async function runBrowserAgent(data: BrowserWorkerData): Promise<string> {
  try {
    // 确保有会话ID
    const sessionId = ensureSessionId();
    
    const modelVersion: any = 'doubao-1.5-15B';
    const logger = new ConsoleLogger('[BrowserGUIAgent]');
    let isBrowserAlive = false;
    
    if (DefaultBrowserOperator.browser) {
      isBrowserAlive = await DefaultBrowserOperator.browser?.isBrowserAlive();
    }

    const operator = await DefaultBrowserOperator.getInstance(
      false,
      false,
      isBrowserAlive,
      SearchEngine.BAIDU,
    );

    const guiAgent = new GUIAgent({
      model: {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        apiKey: '40510637-b0b7-4106-a372-acf2983ad03c',
        model: 'doubao-1.5-ui-tars-250328',
      },
      systemPrompt: getSystemPromptV1_5_Custom('zh', 'normal'),
      logger,
      operator: operator,
      onData: (e) => {
        // 发送数据到主线程
        parentPort?.postMessage({
          type: 'data',
          data: e
        });
      },
      onError: (params: any) => {
        // 发送错误到主线程
        parentPort?.postMessage({
          type: 'error',
          data: params
        });
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

    // 保存GUI Agent引用以便控制
    workerState.guiAgent = guiAgent;

    // 发送窗口控制消息
    parentPort?.postMessage({
      type: 'window_control',
      action: 'hide_window'
    });

    parentPort?.postMessage({
      type: 'window_control',
      action: 'open_thought_window'
    });

    // 执行命令
    await guiAgent.run(data.command);

    // 发送完成消息
    parentPort?.postMessage({
      type: 'complete',
      success: true,
      data: 'Browser agent execution completed successfully'
    });

    return 'Browser agent execution completed successfully';

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Browser agent execution failed:', error);
    
    // 发送错误消息
    parentPort?.postMessage({
      type: 'complete',
      success: false,
      error: errorMessage
    });

    throw error;
  } finally {
    // 发送窗口控制消息
    parentPort?.postMessage({
      type: 'window_control',
      action: 'open_window'
    });

    parentPort?.postMessage({
      type: 'window_control',
      action: 'close_thought_window'
    });

    // 清理资源
    workerState.guiAgent = null;
  }
}

// 主Worker逻辑
async function main() {
  try {
    const data = workerData as BrowserWorkerData;
    for (const key in data.env) {
      process.env[key] = data.env[key];
    }
    // 处理控制消息
    if (data.type === 'pause') {
      pauseWorker();
      return;
    } else if (data.type === 'resume') {
      resumeWorker();
      return;
    } else if (data.type === 'stop') {
      stopWorker();
      return;
    }

    // 执行浏览器Agent
    const result = await runBrowserAgent(data);
    
    // 发送成功结果
    parentPort?.postMessage({
      type: 'complete',
      success: true,
      data: result
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Browser Worker error:', error);
    
    // 发送错误结果
    parentPort?.postMessage({
      type: 'complete',
      success: false,
      error: errorMessage
    });
  }
}

// 监听来自主线程的消息
parentPort?.on('message', (message) => {
  if (message.type === 'pause') {
    pauseWorker();
  } else if (message.type === 'resume') {
    resumeWorker();
  } else if (message.type === 'stop') {
    stopWorker();
  }
});

// 启动Worker
main().catch((error) => {
  console.error('Browser Worker failed to start:', error);
  parentPort?.postMessage({
    type: 'complete',
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  });
});

import { Worker } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';

interface BrowserWorkerData {
  command: string;
  sessionId?: string;
}

interface BrowserWorkerResult {
  success: boolean;
  data?: string;
  error?: string;
}

class BrowserWorkerManager {
  private static instance: BrowserWorkerManager;
  private currentWorker: Worker | null = null;
  private isPaused = false;
  private isStopped = false;
  private onWindowControl?: (action: string) => void;

  private constructor() {
    logger.info('BrowserWorkerManager initialized');
  }

  public static getInstance(): BrowserWorkerManager {
    if (!BrowserWorkerManager.instance) {
      BrowserWorkerManager.instance = new BrowserWorkerManager();
    }
    return BrowserWorkerManager.instance;
  }

  // 重置状态
  private resetState() {
    this.isPaused = false;
    this.isStopped = false;
    this.currentWorker = null;
  }

  // 获取worker文件路径
  private getWorkerPath(): string {
    // const possiblePaths = [
    //   path.join(__dirname, 'run-browser.js'),
    //   path.join(__dirname, 'worker','run-browser.js'),
    // ];

    // for (const workerPath of possiblePaths) {
    //   if (fs.existsSync(workerPath)) {
    //     return workerPath;
    //   }
    // }
    if (process.env.NODE_ENV === 'development') {
      return path.join(__dirname, 'run-browser.js');
    }
    return path.join(__dirname, 'worker','run-browser.js');
  }

  // 执行浏览器任务
  public async executeBrowserTask(
    data: BrowserWorkerData,
    onData?: (e: any) => void,
    onError?: (e: any) => void,
    onWindowControl?: (action: string) => void
  ): Promise<BrowserWorkerResult> {
    return new Promise((resolve, reject) => {
      // 重置状态
      this.resetState();
      this.onWindowControl = onWindowControl;
      
      const workerPath = this.getWorkerPath();
      
      // 验证文件是否存在
      if (!fs.existsSync(workerPath)) {
        const errorMsg = `Browser worker file not found: ${workerPath}`;
        logger.error(errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      logger.info(`Starting browser worker: ${workerPath}`);

      const worker = new Worker(workerPath, {
        workerData: {
          ...(data || {}),
          env: {
            ...process.env,
            LOCALAPPDATA: process.env.LOCALAPPDATA,
            PROGRAMFILES: process.env.PROGRAMFILES,
            'PROGRAMFILES(X86)': process.env['PROGRAMFILES(X86)'],
          }
        },
      });
      
      this.currentWorker = worker;

      // 设置超时
      const timeoutMs = 300000; // 5分钟
      const timeout = setTimeout(() => {
        worker.terminate();
        this.resetState();
        reject(new Error(`Browser worker timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);

      // 监听worker消息
      worker.on('message', (message) => {
        switch (message.type) {
          case 'data':
            // 转发数据事件
            onData?.(message.data);
            break;
          
          case 'error':
            // 转发错误事件
            onError?.(message.data);
            break;
          
          case 'window_control':
            // 处理窗口控制
            logger.info(`Window control: ${message.action}`);
            this.onWindowControl?.(message.action);
            break;
          
          case 'complete':
            // 处理完成事件
            clearTimeout(timeout);
            worker.terminate();
            this.resetState();
            
            if (message.success) {
              logger.info('Browser worker completed successfully');
              resolve({
                success: true,
                data: message.data
              });
            } else {
              logger.error('Browser worker failed', message.error);
              resolve({
                success: false,
                error: message.error
              });
            }
            break;
        }
      });

      // 监听worker错误
      worker.on('error', (error) => {
        clearTimeout(timeout);
        worker.terminate();
        this.resetState();
        logger.error('Browser worker error', error);
        reject(error);
      });

      // 监听worker退出
      worker.on('exit', (code) => {
        clearTimeout(timeout);
        this.resetState();
        if (code !== 0) {
          logger.error(`Browser worker exited with code ${code}`);
          reject(new Error(`Browser worker exited with code ${code}`));
        }
      });
    });
  }

  // 暂停worker
  public pause(): void {
    if (this.currentWorker && !this.isPaused) {
      this.currentWorker.postMessage({ type: 'pause' });
      this.isPaused = true;
      logger.info('Browser worker paused');
    }
  }

  // 恢复worker
  public resume(): void {
    if (this.currentWorker && this.isPaused) {
      this.currentWorker.postMessage({ type: 'resume' });
      this.isPaused = false;
      logger.info('Browser worker resumed');
    }
  }

  // 停止worker
  public stop(): void {
    if (this.currentWorker) {
      this.currentWorker.postMessage({ type: 'stop' });
      this.currentWorker.terminate();
      this.resetState();
      logger.info('Browser worker stopped');
    }
  }

  // 获取当前状态
  public getStatus(): { isPaused: boolean; isStopped: boolean; hasWorker: boolean } {
    return {
      isPaused: this.isPaused,
      isStopped: this.isStopped,
      hasWorker: this.currentWorker !== null
    };
  }
}

export default BrowserWorkerManager; 
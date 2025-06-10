import { Worker } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';
import environmentManager, { Environment } from '../../config/environment';

class WorkerManager {
  private static instance: WorkerManager;
  private environment: Environment;
  private currentWorker: Worker | null = null; // 跟踪当前worker实例
  private isPaused = false;
  private isStopped = false;

  private constructor() {
    this.environment = environmentManager.getEnvironment();
    environmentManager.log(`WorkerManager initialized for ${this.environment} environment`);
  }

  public static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  // 获取worker脚本路径（写死地址，优先使用TypeScript编译结果）
  private getWorkerPath(): string {
    if (this.environment === 'development') {
      // 开发环境：优先使用TypeScript编译的worker.js，如果不存在则使用源文件
      // const compiledWorkerPath = path.resolve(process.cwd(), './libs/parse-profile/worker.js');
      // if (fs.existsSync(compiledWorkerPath)) {
      //   return compiledWorkerPath;
      // }
      // 回退到源文件
      return path.join(__dirname, 'worker.js');
    } else {
      // 生产环境：使用编译后的文件
      return path.join(__dirname, 'worker.js');
    }
  }

  // 执行Worker任务（非流式）
  public async executeTask(data: { downloadDir: string; sessionId: string; userPrompt?: string }): Promise<string> {
    return new Promise((resolve, reject) => {
      const workerPath = this.getWorkerPath();
      
      // 验证文件是否存在
      if (!fs.existsSync(workerPath)) {
        const errorMsg = `Worker file not found: ${workerPath}`;
        environmentManager.logError(errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      environmentManager.log(`Starting worker: ${workerPath}`);
      if (data.userPrompt) {
        environmentManager.log(`Using custom user prompt`);
      }

      const worker = new Worker(workerPath);

      // 使用环境管理器的超时设置
      const timeoutMs = environmentManager.getWorkerTimeout();
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error(`Worker task timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);

      worker.postMessage({
        ...data,
        enableStream: true
      });

      worker.on('message', (result) => {
        clearTimeout(timeout);
        worker.terminate();
        
        if (result.success) {
          environmentManager.log('Worker task completed successfully');
          resolve(result.data);
        } else {
          environmentManager.logError('Worker task failed', result.error);
          reject(new Error(result.error || 'Worker task failed'));
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        worker.terminate();
        environmentManager.logError('Worker error', error);
        reject(error);
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          environmentManager.logError(`Worker exited with code ${code}`);
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  // 执行Worker任务（流式）
  public async executeStreamTask(
    data: { downloadDir: string; sessionId: string; userPrompt?: string },
    onChunk: (chunk: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // 重置状态
      this.resetState();
      
      const workerPath = this.getWorkerPath();
      
      // 验证文件是否存在
      if (!fs.existsSync(workerPath)) {
        const errorMsg = `Worker file not found: ${workerPath}`;
        environmentManager.logError(errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      environmentManager.log(`Starting stream worker: ${workerPath}`);
      if (data.userPrompt) {
        environmentManager.log(`Using custom user prompt for stream`);
      }

      const worker = new Worker(workerPath);
      this.currentWorker = worker; // 保存当前worker实例

      // 使用环境管理器的超时设置
      const timeoutMs = environmentManager.getWorkerTimeout();
      const timeout = setTimeout(() => {
        worker.terminate();
        this.resetState();
        reject(new Error(`Worker stream task timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);

      worker.postMessage({
        ...data,
        enableStream: true
      });

      worker.on('message', (result) => {
        if (result.type === 'chunk') {
          // 处理流式数据块
          onChunk(result.data);
        } else if (result.type === 'complete') {
          // 流式处理完成
          clearTimeout(timeout);
          worker.terminate();
          this.resetState();
          
          if (result.success) {
            environmentManager.log('Worker stream task completed successfully');
            resolve(result.data);
          } else {
            environmentManager.logError('Worker stream task failed', result.error);
            reject(new Error(result.error || 'Worker stream task failed'));
          }
        } else if (result.success !== undefined) {
          // 兼容旧格式（非流式）
          clearTimeout(timeout);
          worker.terminate();
          this.resetState();
          
          if (result.success) {
            environmentManager.log('Worker task completed successfully');
            resolve(result.data);
          } else {
            environmentManager.logError('Worker task failed', result.error);
            reject(new Error(result.error || 'Worker task failed'));
          }
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        worker.terminate();
        this.resetState();
        environmentManager.logError('Worker stream error', error);
        reject(error);
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        this.resetState();
        if (code !== 0) {
          environmentManager.logError(`Worker exited with code ${code}`);
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  // 获取当前环境信息
  public getEnvironmentInfo(): { environment: Environment; workerPath: string; config: any } {
    return {
      environment: this.environment,
      workerPath: this.getWorkerPath(),
      config: environmentManager.getConfig()
    };
  }

  // 验证worker文件是否存在
  public validateWorkerFile(): boolean {
    const workerPath = this.getWorkerPath();
    const exists = fs.existsSync(workerPath);
    
    if (exists) {
      environmentManager.log(`Worker file validated: ${workerPath}`);
    } else {
      environmentManager.logError(`Worker file not found: ${workerPath}`);
    }
    
    return exists;
  }

  // 暂停当前worker
  public pause(): void {
    this.isPaused = true;
    if (this.currentWorker) {
      environmentManager.log('Pausing current worker...');
      // 发送暂停消息给worker
      this.currentWorker.postMessage({ type: 'pause' });
    }
  }

  // 恢复当前worker
  public resume(): void {
    this.isPaused = false;
    if (this.currentWorker) {
      environmentManager.log('Resuming current worker...');
      // 发送恢复消息给worker
      this.currentWorker.postMessage({ type: 'resume' });
    }
  }

  // 停止当前worker
  public stop(): void {
    this.isStopped = true;
    if (this.currentWorker) {
      environmentManager.log('Stopping current worker...');
      // 发送停止消息给worker
      this.currentWorker.postMessage({ type: 'stop' });
      // 强制终止worker
      setTimeout(() => {
        if (this.currentWorker) {
          this.currentWorker.terminate();
          this.currentWorker = null;
        }
      }, 1000); // 给worker 1秒时间优雅关闭
    }
  }

  // 重置状态
  private resetState(): void {
    this.isPaused = false;
    this.isStopped = false;
    this.currentWorker = null;
  }
}

export default WorkerManager; 
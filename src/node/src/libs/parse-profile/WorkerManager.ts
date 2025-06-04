import { Worker } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';
import environmentManager, { Environment } from '../../config/environment';

class WorkerManager {
  private static instance: WorkerManager;
  private environment: Environment;

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
      const compiledWorkerPath = path.resolve(process.cwd(), 'dist/libs/parse-profile/worker.js');
      if (fs.existsSync(compiledWorkerPath)) {
        return compiledWorkerPath;
      }
      // 回退到源文件
      return path.resolve(process.cwd(), 'src/libs/parse-profile/worker.ts');
    } else {
      // 生产环境：使用编译后的文件
      return path.resolve(process.cwd(), 'dist/libs/parse-profile/worker.js');
    }
  }

  // 执行Worker任务
  public async executeTask(data: { downloadDir: string; sessionId: string }): Promise<string> {
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

      const worker = new Worker(workerPath);

      // 使用环境管理器的超时设置
      const timeoutMs = environmentManager.getWorkerTimeout();
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error(`Worker task timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);

      worker.postMessage(data);

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
}

export default WorkerManager; 
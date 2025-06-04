import { Worker } from 'worker_threads';
import * as path from 'path';
import { ILogger } from '../utils/logger';
import { AppError, ErrorCode } from '../utils/errors';

export interface WorkerTask<T = any, R = any> {
  id: string;
  data: T;
  resolve: (value: R) => void;
  reject: (error: Error) => void;
  timeout?: number;
}

export interface WorkerPoolOptions {
  maxWorkers: number;
  workerScript: string;
  timeout: number;
  logger: ILogger;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks: Map<Worker, WorkerTask> = new Map();
  private options: WorkerPoolOptions;
  private isShuttingDown = false;

  constructor(options: WorkerPoolOptions) {
    this.options = options;
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.options.maxWorkers; i++) {
      this.createWorker();
    }
  }

  private createWorker(): Worker {
    const worker = new Worker(this.options.workerScript);
    
    worker.on('message', (result) => {
      this.handleWorkerMessage(worker, result);
    });

    worker.on('error', (error) => {
      this.handleWorkerError(worker, error);
    });

    worker.on('exit', (code) => {
      this.handleWorkerExit(worker, code);
    });

    this.workers.push(worker);
    this.availableWorkers.push(worker);
    
    this.options.logger.debug(`Worker created, total: ${this.workers.length}`);
    
    return worker;
  }

  private handleWorkerMessage(worker: Worker, result: any): void {
    const task = this.activeTasks.get(worker);
    if (!task) {
      this.options.logger.warn('Received message from worker without active task');
      return;
    }

    this.activeTasks.delete(worker);
    this.availableWorkers.push(worker);

    if (result.success) {
      task.resolve(result.data);
    } else {
      task.reject(new AppError({
        code: ErrorCode.WORKER_ERROR,
        message: result.error || 'Worker task failed',
      }));
    }

    // 处理下一个任务
    this.processNextTask();
  }

  private handleWorkerError(worker: Worker, error: Error): void {
    const task = this.activeTasks.get(worker);
    
    this.options.logger.error('Worker error:', { error: error.message });
    
    if (task) {
      this.activeTasks.delete(worker);
      task.reject(new AppError({
        code: ErrorCode.WORKER_ERROR,
        message: `Worker error: ${error.message}`,
        originalError: error,
      }));
    }

    // 移除错误的worker并创建新的
    this.removeWorker(worker);
    if (!this.isShuttingDown) {
      this.createWorker();
    }
  }

  private handleWorkerExit(worker: Worker, code: number): void {
    this.options.logger.info(`Worker exited with code ${code}`);
    
    const task = this.activeTasks.get(worker);
    if (task) {
      this.activeTasks.delete(worker);
      task.reject(new AppError({
        code: ErrorCode.WORKER_ERROR,
        message: `Worker exited unexpectedly with code ${code}`,
      }));
    }

    this.removeWorker(worker);
  }

  private removeWorker(worker: Worker): void {
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex !== -1) {
      this.workers.splice(workerIndex, 1);
    }

    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex !== -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }

    worker.terminate();
  }

  private processNextTask(): void {
    if (this.taskQueue.length === 0 || this.availableWorkers.length === 0) {
      return;
    }

    const task = this.taskQueue.shift()!;
    const worker = this.availableWorkers.shift()!;

    this.activeTasks.set(worker, task);

    // 设置任务超时
    const timeout = task.timeout || this.options.timeout;
    const timeoutId = setTimeout(() => {
      if (this.activeTasks.has(worker)) {
        this.activeTasks.delete(worker);
        this.removeWorker(worker);
        this.createWorker(); // 创建新的worker替换超时的
        
        task.reject(new AppError({
          code: ErrorCode.WORKER_TIMEOUT,
          message: `Worker task timed out after ${timeout}ms`,
        }));
      }
    }, timeout);

    // 清除超时定时器
    const originalResolve = task.resolve;
    const originalReject = task.reject;
    
    task.resolve = (value) => {
      clearTimeout(timeoutId);
      originalResolve(value);
    };
    
    task.reject = (error) => {
      clearTimeout(timeoutId);
      originalReject(error);
    };

    worker.postMessage(task.data);
  }

  public async execute<T, R>(data: T, timeout?: number): Promise<R> {
    if (this.isShuttingDown) {
      throw new AppError({
        code: ErrorCode.WORKER_ERROR,
        message: 'Worker pool is shutting down',
      });
    }

    return new Promise<R>((resolve, reject) => {
      const task: WorkerTask<T, R> = {
        id: `task_${Date.now()}_${Math.random()}`,
        data,
        resolve,
        reject,
        timeout,
      };

      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  public getStats() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
    };
  }

  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    this.options.logger.info('Shutting down worker pool...');

    // 等待所有活动任务完成（最多等待30秒）
    const maxWaitTime = 30000;
    const startTime = Date.now();
    
    while (this.activeTasks.size > 0 && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 终止所有worker
    const terminationPromises = this.workers.map(worker => {
      return worker.terminate();
    });

    await Promise.all(terminationPromises);
    
    this.workers = [];
    this.availableWorkers = [];
    this.activeTasks.clear();
    this.taskQueue = [];

    this.options.logger.info('Worker pool shutdown complete');
  }
}

// 单例Worker池管理器
export class WorkerPoolManager {
  private static instance: WorkerPoolManager;
  private pools: Map<string, WorkerPool> = new Map();

  private constructor() {}

  public static getInstance(): WorkerPoolManager {
    if (!WorkerPoolManager.instance) {
      WorkerPoolManager.instance = new WorkerPoolManager();
    }
    return WorkerPoolManager.instance;
  }

  public createPool(name: string, options: WorkerPoolOptions): WorkerPool {
    if (this.pools.has(name)) {
      throw new Error(`Worker pool '${name}' already exists`);
    }

    const pool = new WorkerPool(options);
    this.pools.set(name, pool);
    return pool;
  }

  public getPool(name: string): WorkerPool | undefined {
    return this.pools.get(name);
  }

  public async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.pools.values()).map(pool => pool.shutdown());
    await Promise.all(shutdownPromises);
    this.pools.clear();
  }
}

export default WorkerPool; 
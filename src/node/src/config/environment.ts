import { logger } from "@src/utils/logger";

export type Environment = 'development' | 'production';

export interface EnvironmentConfig {
  environment: Environment;
  isDevelopment: boolean;
  isProduction: boolean;
  workerTimeout: number;
  enableSourceMap: boolean;
  enableDebugLogs: boolean;
}

class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.detectEnvironment();
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  private detectEnvironment(): EnvironmentConfig {
    const nodeEnv = process.env.NODE_ENV as Environment;
    const rsbuildEnv = process.env.RSBUILD_ENV as Environment;
    
    // 优先级：NODE_ENV > RSBUILD_ENV > 自动检测
    let environment: Environment;
    
    if (nodeEnv && ['development', 'production', 'test'].includes(nodeEnv)) {
      environment = nodeEnv;
    } else if (rsbuildEnv && ['development', 'production', 'test'].includes(rsbuildEnv)) {
      environment = rsbuildEnv;
    } else {
      // 自动检测环境
      environment = this.autoDetectEnvironment();
    }

    const isDevelopment = environment === 'development';
    const isProduction = environment === 'production';

    return {
      environment,
      isDevelopment,
      isProduction,
      workerTimeout: isProduction ? 600000 : 300000, // 10分钟 vs 5分钟
      enableSourceMap: isDevelopment,
      enableDebugLogs: isDevelopment,
    };
  }

  private autoDetectEnvironment(): Environment {
    // 检查是否存在源代码文件（开发环境标志）
    const fs = require('fs');
    const path = require('path');
    
    const srcPath = path.resolve(process.cwd(), 'src');
    const distPath = path.resolve(process.cwd(), 'dist');
    
    if (fs.existsSync(srcPath) && !fs.existsSync(distPath)) {
      return 'development';
    }
    
    if (fs.existsSync(distPath)) {
      return 'production';
    }
    
    // // 检查是否在Jest测试环境中
    // if (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') {
    //   return 'test';
    // }
    
    // 默认为开发环境
    return 'development';
  }

  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  public getEnvironment(): Environment {
    return this.config.environment;
  }

  public isDevelopment(): boolean {
    return this.config.isDevelopment;
  }

  public isProduction(): boolean {
    return this.config.isProduction;
  }

  public getWorkerTimeout(): number {
    return this.config.workerTimeout;
  }

  public shouldEnableDebugLogs(): boolean {
    return this.config.enableDebugLogs;
  }

  public log(message: string, ...args: any[]): void {
    if (this.shouldEnableDebugLogs()) {
      console.log(`[${this.config.environment.toUpperCase()}] ${message}`, ...args);
    }
  }

  public logError(message: string, error?: any): void {
    logger.error(`[${this.config.environment.toUpperCase()}] ERROR: ${message}`, error);
  }

  public logWarning(message: string, ...args: any[]): void {
    if (this.shouldEnableDebugLogs()) {
      console.warn(`[${this.config.environment.toUpperCase()}] WARNING: ${message}`, ...args);
    }
  }
}

// 导出单例实例
export const environmentManager = EnvironmentManager.getInstance();
export default environmentManager; 
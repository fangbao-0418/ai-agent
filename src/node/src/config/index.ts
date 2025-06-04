import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

export interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  ai: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  paths: {
    nodeDir: string;
    downloadDir: string;
  };
  worker: {
    maxConcurrent: number;
    timeout: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableFileLogging: boolean;
  };
}

class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): AppConfig {
    return {
      server: {
        port: parseInt(process.env.PORT || '8888', 10),
        host: process.env.HOST || 'localhost',
      },
      ai: {
        apiKey: process.env.DEEPSEEK_API_KEY || '40510637-b0b7-4106-a372-acf2983ad03c',
        baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v3-250324',
      },
      paths: {
        nodeDir: process.env.NODE_DIR || path.join(process.cwd(), 'data'),
        downloadDir: process.env.DOWNLOAD_DIR || 'download',
      },
      worker: {
        maxConcurrent: parseInt(process.env.MAX_WORKERS || '2', 10),
        timeout: parseInt(process.env.WORKER_TIMEOUT || '300000', 10), // 5分钟
      },
      logging: {
        level: (process.env.LOG_LEVEL as any) || 'info',
        enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
      },
    };
  }

  private validateConfig(): void {
    if (!this.config.ai.apiKey) {
      throw new Error('AI API Key is required');
    }
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      throw new Error('Invalid port number');
    }
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  getAll(): AppConfig {
    return { ...this.config };
  }

  update<K extends keyof AppConfig>(key: K, value: Partial<AppConfig[K]>): void {
    this.config[key] = { ...this.config[key], ...value };
  }
}

export const configManager = new ConfigManager();
export default configManager; 
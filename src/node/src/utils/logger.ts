import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

class Logger implements ILogger {
  private logLevel: LogLevel;
  private enableFileLogging: boolean;
  private logDir: string;

  constructor(
    logLevel: LogLevel = 'info', 
    enableFileLogging: boolean = false,
    logDir: string = 'logs'
  ) {
    this.logLevel = logLevel;
    this.enableFileLogging = enableFileLogging;
    this.logDir = logDir;
    
    if (enableFileLogging) {
      this.ensureLogDir();
    }
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
  }

  private writeToFile(level: LogLevel, formattedMessage: string): void {
    if (!this.enableFileLogging) return;
    
    const today = new Date().toISOString().split('T')[0];
    const fileName = `${today}.log`;
    const filePath = path.join(this.logDir, fileName);
    
    fs.appendFile(filePath, formattedMessage + '\n', (err) => {
      if (err) console.error('Failed to write to log file:', err);
    });
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) return;
    
    const formattedMessage = this.formatMessage(level, message, ...args);
    
    // Console output
    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
    
    // File output
    this.writeToFile(level, formattedMessage);
  }

  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  // 创建子日志器（用于不同模块）
  createChild(prefix: string): ILogger {
    return {
      debug: (message: string, ...args: any[]) => this.debug(`[${prefix}] ${message}`, ...args),
      info: (message: string, ...args: any[]) => this.info(`[${prefix}] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => this.warn(`[${prefix}] ${message}`, ...args),
      error: (message: string, ...args: any[]) => this.error(`[${prefix}] ${message}`, ...args),
    };
  }
}

// 创建默认日志器实例
export const logger = new Logger();

// 导出类供其他模块使用
export { Logger };

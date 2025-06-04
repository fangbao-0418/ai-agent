import { ILogger } from './logger';

// 自定义错误类型
export enum ErrorCode {
  // 系统错误
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  
  // 会话错误
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // 文件处理错误
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_PARSE_ERROR = 'FILE_PARSE_ERROR',
  DIRECTORY_ERROR = 'DIRECTORY_ERROR',
  
  // AI调用错误
  AI_API_ERROR = 'AI_API_ERROR',
  AI_TIMEOUT = 'AI_TIMEOUT',
  AI_RATE_LIMIT = 'AI_RATE_LIMIT',
  
  // Worker错误
  WORKER_ERROR = 'WORKER_ERROR',
  WORKER_TIMEOUT = 'WORKER_TIMEOUT',
  
  // 网络错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp?: Date;
  stack?: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly originalError?: Error;
  public context?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'AppError';
    this.code = details.code;
    this.originalError = details.originalError;
    this.context = details.context;
    this.timestamp = details.timestamp || new Date();
    
    // 保持错误堆栈跟踪
    if (details.originalError?.stack) {
      this.stack = details.originalError.stack;
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// 错误处理器类
export class ErrorHandler {
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  // 处理错误
  handle(error: Error | AppError, context?: Record<string, any>): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else {
      // 将普通错误转换为AppError
      appError = this.convertToAppError(error);
    }

    // 添加上下文信息
    if (context) {
      appError.context = { ...appError.context, ...context };
    }

    // 记录错误
    this.logError(appError);

    return appError;
  }

  // 转换普通错误为AppError
  private convertToAppError(error: Error): AppError {
    let code = ErrorCode.SYSTEM_ERROR;
    
    // 根据错误信息判断错误类型
    if (error.message.includes('ENOENT') || error.message.includes('not found')) {
      code = ErrorCode.FILE_NOT_FOUND;
    } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
      code = ErrorCode.DIRECTORY_ERROR;
    } else if (error.message.includes('timeout')) {
      code = ErrorCode.AI_TIMEOUT;
    } else if (error.message.includes('network') || error.message.includes('connection')) {
      code = ErrorCode.NETWORK_ERROR;
    }

    return new AppError({
      code,
      message: error.message,
      originalError: error,
    });
  }

  // 记录错误
  private logError(error: AppError): void {
    const logData = {
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp,
    };

    switch (error.code) {
      case ErrorCode.AI_API_ERROR:
      case ErrorCode.WORKER_ERROR:
      case ErrorCode.SYSTEM_ERROR:
        this.logger.error('Critical error occurred', logData);
        break;
      case ErrorCode.FILE_NOT_FOUND:
      case ErrorCode.SESSION_NOT_FOUND:
        this.logger.warn('Resource not found', logData);
        break;
      default:
        this.logger.error('Unknown error occurred', logData);
    }
  }

  // 创建特定类型的错误
  static createFileError(message: string, filePath?: string): AppError {
    return new AppError({
      code: ErrorCode.FILE_NOT_FOUND,
      message,
      context: { filePath },
    });
  }

  static createSessionError(message: string, sessionId?: string): AppError {
    return new AppError({
      code: ErrorCode.SESSION_NOT_FOUND,
      message,
      context: { sessionId },
    });
  }

  static createAIError(message: string, apiResponse?: any): AppError {
    return new AppError({
      code: ErrorCode.AI_API_ERROR,
      message,
      context: { apiResponse },
    });
  }

  static createWorkerError(message: string, workerData?: any): AppError {
    return new AppError({
      code: ErrorCode.WORKER_ERROR,
      message,
      context: { workerData },
    });
  }
}

// 异步错误捕获装饰器
export function catchAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError({
        code: ErrorCode.SYSTEM_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
        originalError: error instanceof Error ? error : undefined,
      });
    }
  };
}

// 全局错误处理函数
export function setupGlobalErrorHandlers(logger: ILogger): void {
  const errorHandler = new ErrorHandler(logger);

  // 捕获未处理的Promise拒绝
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    errorHandler.handle(error, { type: 'unhandledRejection', promise });
  });

  // 捕获未捕获的异常
  process.on('uncaughtException', (error) => {
    errorHandler.handle(error, { type: 'uncaughtException' });
    // 通常需要退出进程
    process.exit(1);
  });
}

export default ErrorHandler; 
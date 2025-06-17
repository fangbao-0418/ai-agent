import globalData from '../global';
import { ChatCompletionTool } from 'openai/resources/index.mjs';
import { logger } from './logger';
import fs from 'fs';
import path from 'path';

export function checkDownloadFilesExist () {
  const downloadDir = globalData.get('temp-download-dir');
  try {
    const files = fs.readdirSync(downloadDir);
    const pdfFiles = files.filter((file: any) => file.toLowerCase().endsWith('.pdf'));
    logger.info('checkDownloadFilesExist:', downloadDir, pdfFiles);
    return pdfFiles.length > 0
  } catch (error) {
    return false;
  }
}

export function checkPageFilesExist () {
  const pageDir = globalData.get('temp-page-dir');
  try {
    const isExist = fs.existsSync(path.join(pageDir, globalData.get('session-id') + '.txt'));
    return isExist
  } catch (error) {
    return false;
  }
}

export function createUniqueID () {
  return new Date().getTime().toString() + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Extract tool name list from tool object to avoid redundant logging
 */
export function extractToolNames(tools: ChatCompletionTool[]): string[] {
  return tools.map((tool) => {
    if (tool.type === 'function' && tool.function?.name) {
      return tool.function.name;
    }
    return 'unknown_tool';
  });
}

// 清理旧的会话目录
export function cleanupOldSessionDirs() {
  try {
    const downloadDir = globalData.get('download-dir');
    if (fs.existsSync(downloadDir)) {
      const items = fs.readdirSync(downloadDir, { withFileTypes: true });
      // 查找所有目录（可能是旧的会话目录）
      const sessionDirs = items.filter(item => 
        item.isDirectory() && 
        // 简单的会话ID格式检查：数字+随机字符
        /^\d+[a-z0-9]+$/i.test(item.name)
      );
      if (sessionDirs.length > 0) {
        sessionDirs.forEach(dir => {
          const dirPath = path.join(downloadDir, dir.name);
          try {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`✓ 删除旧会话目录: ${dir.name}`);
          } catch (error) {
            console.error(`✗ 删除旧会话目录失败: ${dir.name} - ${(error as Error).message}`);
          }
        });
        
        logger.info('旧会话目录清理完成');
      }
    }
  } catch (error) {
    logger.error('清理旧会话目录时发生错误:', (error as Error).message);
  }

  try {
    const pageDir = globalData.get('temp-page-dir');
    fs.rmSync(pageDir, { recursive: true, force: true });
    console.log('清理旧会话目录:', pageDir);
  } catch (error) {
    logger.error('清理旧会话目录时发生错误:', (error as Error).message);
  }
}

type ExecuteStatus = 'start' | 'running' | 'pause' | 'success' | 'error' | 'end';

export function sendExecuteMessage(status: ExecuteStatus, query: string) {
  const socket = globalData.get('socket');
  socket.emit('agent_message', {
    type: 'execute',
    data: {
      status: status,
      query: query,
    },
  });
}
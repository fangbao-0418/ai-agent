import { SearchProvider, SearchSettings, ToolCall } from '@agent-infra/shared';
import { SearchClient, SearchResult } from '@agent-infra/search';
import { MCPToolResult } from '@src/types';
import { SettingStore } from '@src/utils/store/setting.js';
import { logger } from '@utils/logger';
import { maskSensitiveData } from '@utils/maskSensitiveData';
import AgentServer from '@src/agent';
import { checkPageFilesExist, cleanupOldSessionDirs } from '@src/utils/helper';
import parseProfiles, { parseProfilesStream } from '../parse-profile';
import WorkerManager from '../parse-profile/worker-manager'; // 导入WorkerManager
import emitter from '@src/utils/emitter'; // 导入全局emitter
const { jsonrepair } = require('jsonrepair');
import globalData from '@src/global';
import path from 'path';
import fs from 'fs';
import callDeepSeek from '@src/utils/ai-call/deepseek';

// 存储事件监听器的引用，用于后续销毁
let analysisEventListeners: { [key: string]: (...args: any[]) => void } = {};
let isAnalysisListening = false;

// 设置全局事件监听器
function setupAnalysisEventListeners() {
  if (isAnalysisListening) {
    return; // 避免重复设置监听器
  }
  
  console.log('🎧 Resume-analysis: 开始监听agent全局事件');
  isAnalysisListening = true;

  const workerManager = WorkerManager.getInstance();

  // 监听agent停止事件
  analysisEventListeners['stop'] = () => {
    console.log('🛑 Resume-analysis: 收到agent停止信号');
    // 停止文档解析流程
    workerManager.stop();
  };

  // 监听agent暂停事件
  analysisEventListeners['pause'] = () => {
    console.log('⏸️ Resume-analysis: 收到agent暂停信号');
    // 暂停文档解析流程
    workerManager.pause();
  };

  // 监听agent恢复事件
  analysisEventListeners['resume'] = () => {
    console.log('▶️ Resume-analysis: 收到agent恢复信号');
    // 恢复文档解析流程
    workerManager.resume();
  };

  // 监听agent完成事件
  analysisEventListeners['complete'] = () => {
    console.log('✅ Resume-analysis: Agent执行完成，销毁事件监听器');
    destroyAnalysisEventListeners();
  };

  // 监听agent错误事件
  analysisEventListeners['error'] = (error: any) => {
    console.log('❌ Resume-analysis: Agent执行出错，销毁事件监听器', error);
    destroyAnalysisEventListeners();
  };

  // 注册事件监听器
  emitter.on('agent:stop', analysisEventListeners['stop']);
  emitter.on('agent:pause', analysisEventListeners['pause']);
  emitter.on('agent:resume', analysisEventListeners['resume']);
  emitter.on('agent:complete', analysisEventListeners['complete']);
  emitter.on('agent:error', analysisEventListeners['error']);
}

// 销毁事件监听器
function destroyAnalysisEventListeners() {
  if (!isAnalysisListening) {
    return;
  }
  cleanupOldSessionDirs();
  console.log('🗑️ Resume-analysis: 销毁agent事件监听器');
  
  // 移除所有事件监听器
  emitter.off('agent:stop', analysisEventListeners['stop']);
  emitter.off('agent:pause', analysisEventListeners['pause']);
  emitter.off('agent:resume', analysisEventListeners['resume']);
  emitter.off('agent:complete', analysisEventListeners['complete']);
  emitter.off('agent:error', analysisEventListeners['error']);
  
  // 清空监听器引用
  analysisEventListeners = {};
  isAnalysisListening = false;
}

/**
 * FIXME: `MCPToolResult` missing explicit type here, we need to refine it later.
 */
export async function run(
  toolCall: ToolCall,
  settings?: SearchSettings,
): Promise<MCPToolResult> {
  // 设置事件监听器
  setupAnalysisEventListeners();
  
  // const currentSearchConfig: any = settings || SettingStore.get('search');
  const args = JSON.parse(jsonrepair(toolCall.function.arguments)) as {
    query: string;
    count?: number;
    stream?: boolean; // 新增：是否启用流式输出
  };
  const count = args?.count ?? 10;
  const enableStream = args?.stream ?? true; // 默认启用流式输出
  
  try {

    let results: SearchResult;
    let isError = false;
    const socket = globalData.get('socket');

    const streams = callDeepSeek(args.query)
    let content = ""
    for await (const chunk of streams) {
      content += chunk;
      socket.emit('agent_message', {
        data: {
          conclusion: chunk,
          status: "streaming"
        },
        type: 'streaming'
      });
    }
    socket.emit('agent_message', {
      data: {
        conclusion: content,
        status: "end"
      },
      type: 'streaming'
    });
   
    // 执行完成后销毁监听器
    destroyAnalysisEventListeners();
    logger.info('resume-analysis result', content);
    return [
      {
        isError: false,
        content: [content],
      },
    ];
  } catch (e) {
    const rawErrorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    logger.error('[Search] error: ' + rawErrorMessage);
    // 出错时也要销毁监听器
    destroyAnalysisEventListeners();
    return [
      {
        isError: false,
        content: [rawErrorMessage],
      },
    ];
  }
}

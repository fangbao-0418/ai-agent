import { SearchProvider, SearchSettings, ToolCall } from '@agent-infra/shared';
import { SearchClient, SearchResult } from '@agent-infra/search';
import { MCPToolResult } from '@src/types';
import { logger } from '@utils/logger';
import { checkPageFilesExist, cleanupOldSessionDirs, sendExecuteMessage } from '@src/utils/helper';
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


  // 监听agent停止事件
  analysisEventListeners['stop'] = () => {
    console.log('🛑 Resume-analysis: 收到agent停止信号');
    // 停止文档解析流程
  };

  // 监听agent暂停事件
  analysisEventListeners['pause'] = () => {
    console.log('⏸️ Resume-analysis: 收到agent暂停信号');
    // 暂停文档解析流程
  };

  // 监听agent恢复事件
  analysisEventListeners['resume'] = () => {
    console.log('▶️ Resume-analysis: 收到agent恢复信号');
    // 恢复文档解析流程
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

  try {

    let results: SearchResult;
    let isError = false;
    const socket = globalData.get('socket');
    let content = "";
    
    try {
      sendExecuteMessage('start', '开始执行');
      if (checkPageFilesExist()) {
        sendExecuteMessage('running', '正在执行');
        const pageContent = fs.readFileSync(path.join(globalData.get('temp-page-dir'), globalData.get('session-id') + '.txt'), 'utf-8');
        const propmt = `
        ${pageContent}
        一定不要对上面内容做任何回复、推理和分析，请根据以上内容和用户输入的提示词"${args.query}",推测用户意图，如果涉及浏览器相关操作动作请进行排除，输出结果要严格按照排除后的内容进行输出，不要输出限定词，不要输出任何解释
        `
        const streams = await callDeepSeek(propmt)
        let conclusion = ""
        for await (const chunk of streams) {
          conclusion += chunk;
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
            conclusion: conclusion,
            status: "end"
          },
          type: 'streaming'
        });
        content = "执行成功";
        sendExecuteMessage('end', '执行成功');
      }
    } catch (error) {
      isError = false;
      content = "执行结束";
      sendExecuteMessage('error', '执行失败');
    }
    
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
        content: ["执行结束"],
      },
    ];
  }
}

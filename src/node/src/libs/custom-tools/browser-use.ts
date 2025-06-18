import { SearchProvider, SearchSettings, ToolCall } from '@agent-infra/shared';
import { SearchClient, SearchResult } from '@agent-infra/search';
import { MCPToolResult } from '@src/types';
import { SettingStore } from '@src/utils/store/setting.js';
import { logger } from '@utils/logger';
import { maskSensitiveData } from '@utils/maskSensitiveData';
import AgentServer from '@src/agent';
import emitter from '@src/utils/emitter';
const { jsonrepair } = require('jsonrepair');
import globalData from '@src/global';
import { getSystemPromptV1_5_Custom } from '@src/prompts';
import { DefaultBrowserOperator } from '@src/browser-use/operator-browser';
import { checkPageFilesExist, sendExecuteMessage } from '@src/utils/helper';
import * as pageAnalysis from './page-analysis';
import fs from 'fs';
import path from 'path';
import callDeepSeek from '@src/utils/ai-call/deepseek';

// 存储事件监听器的引用，用于后续销毁
let agentEventListeners: { [key: string]: (...args: any[]) => void } = {};
let isListening = false;

/**
 * FIXME: `MCPToolResult` missing explicit type here, we need to refine it later.
 */
export async function search(
  toolCall: ToolCall,
  settings?: SearchSettings,
): Promise<MCPToolResult> {

  let results: SearchResult;
  const socket = globalData.get('socket');
  sendExecuteMessage('start', '开始执行');
  const agent = new AgentServer({
    onData: (e) => {
      sendExecuteMessage('running', '正在执行');
      // logger.info('agent_message', e);
      socket.emit('agent_message', e)
    },
    onError: (e) => {
      sendExecuteMessage('error', '执行失败');
      // logger.error('agent_error', e);
      socket.emit('agent_error', e)
    }
  });

  // 设置全局事件监听器
  function setupAgentEventListeners() {
    if (isListening) {
      return; // 避免重复设置监听器
    }
    
    console.log('🎧 Browser-use: 开始监听agent全局事件');
    isListening = true;

    // 监听agent停止事件
    agentEventListeners['stop'] = async () => {
      sendExecuteMessage('end', '执行已中止');
      await agent.stop();
    };

    // 监听agent暂停事件
    agentEventListeners['pause'] = () => {
      sendExecuteMessage('pause', '执行已暂停');
      agent.pause();
    };

    // 监听agent恢复事件
    agentEventListeners['resume'] = () => {
      agent.resume();
    };

    // 监听agent完成事件
    agentEventListeners['complete'] = () => {
      console.log('✅ Browser-use: Agent执行完成，销毁事件监听器');
      destroyAgentEventListeners();
    };

    // 监听agent错误事件
    agentEventListeners['error'] = (error: any) => {
      console.log('❌ Browser-use: Agent执行出错，销毁事件监听器', error);
      destroyAgentEventListeners();
    };

    emitter.on('agent:stop', agentEventListeners['stop']);
    emitter.on('agent:pause', agentEventListeners['pause']);
    emitter.on('agent:resume', agentEventListeners['resume']);
    emitter.on('agent:complete', agentEventListeners['complete']);
    emitter.on('agent:error', agentEventListeners['error']);
  }

  // 销毁事件监听器
  function destroyAgentEventListeners() {
    if (!isListening) {
      return;
    }
    
    console.log('🗑️ Browser-use: 销毁agent事件监听器');
    
    // 移除所有事件监听器
    emitter.off('agent:stop', agentEventListeners['stop']);
    emitter.off('agent:pause', agentEventListeners['pause']);
    emitter.off('agent:resume', agentEventListeners['resume']);
    emitter.off('agent:complete', agentEventListeners['complete']);
    emitter.off('agent:error', agentEventListeners['error']);
    
    // 清空监听器引用
    agentEventListeners = {};
    isListening = false;
  }

  // 设置事件监听器
  setupAgentEventListeners();
  
  // const currentSearchConfig: any = settings || SettingStore.get('search');
  const args = JSON.parse(jsonrepair(toolCall.function.arguments)) as {
    query: string;
    count?: number;
  };
  const count = args?.count ?? 10;
  try {
    logger.info(
      'Search provider: ',
      'browser-use',
      'Search query:',
      maskSensitiveData({ query: args.query, count: args.count }),
    );
    let isError = false;
    let content = "";
    try {
      await agent.run(args.query);
      if (!args.query.includes('下载') && !(args.query.includes('分析') || args.query.includes('简历') || args.query.includes('总结'))) {
        // sendExecuteMessage('end', '下载完成');
        if (checkPageFilesExist()) {
          const pageContent = fs.readFileSync(path.join(globalData.get('temp-page-dir'), globalData.get('session-id') + '.txt'), 'utf-8');
          const propmt = `
          ${pageContent}
          请根据以上内容和用户输入的提示词"${args.query}",推测用户意图，如果涉及浏览器相关操作动作请进行排除，输出结果要严格按照排除后的内容进行输出，不要输出限定词，不要输出任何解释
          `
          const streams = await callDeepSeek(propmt)
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
        }
      }
      content = "操作成功";
      sendExecuteMessage('end', '执行成功');
      try {
        agent.stop();
      } catch (e) {
        logger.info('❌ Browser-use: 销毁浏览器实例失败', e);
      }
    } catch (e: any) {
      isError = true;
      content = e?.message || "执行失败";
      sendExecuteMessage('error', '执行失败');
    }

    destroyAgentEventListeners();

    return [
      {
        isError: isError,
        content: [content],
      },
    ];
  } catch (e) {
    const rawErrorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    logger.error('[Search] error: ' + rawErrorMessage);
    sendExecuteMessage('error', '执行失败');
    return [
      {
        isError: true,
        content: [rawErrorMessage],
      },
    ];
  }
}

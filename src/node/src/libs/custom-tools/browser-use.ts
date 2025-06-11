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
  const agent = new AgentServer({
    onData: (e) => {
      socket.emit('agent_message', e)
    },
    onError: (e) => {
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
      await agent.stop();
    };

    // 监听agent暂停事件
    agentEventListeners['pause'] = () => {
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
    // logger.info(
    //   'Search provider: ',
    //   currentSearchConfig.provider,
    //   'Search query:',
    //   maskSensitiveData({ query: args.query, count: args.count }),
    // );
    let isError = false;
    let content = "继续";
    try {
      await agent.run(args.query);
      try {
        agent.stop();
      } catch (e) {
        console.log('❌ Browser-use: 销毁浏览器实例失败', e);
      }
    } catch (e: any) {
      isError = true;
      content = e?.message || "执行失败";
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
    return [
      {
        isError: true,
        content: [rawErrorMessage],
      },
    ];
  }
}

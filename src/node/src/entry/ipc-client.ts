import { 
  MCPServerName,
  Message,
  MessageData,
  ModelSettings,
} from "@src/libs/agent-infra/shared";
import { logger } from "@src/utils/logger";
import { maskSensitiveData } from "@src/utils/maskSensitiveData";
import { ChatCompletionTool } from 'openai/resources/index.mjs';
import { createLLM, LLMConfig } from '@src/libs/llm';
import { SettingStore } from "@src/utils/store/setting.js";
import { extractToolNames } from "@src/utils/helper";
import { getActiveMcpSettings } from "@src/libs/mcp/tools";
import { EventManager } from "./event-manager";
const EventEmitter = require('events');

/**
 * Get the current provider configuration based on settings
 */
function getLLMProviderConfig(settings: ModelSettings): LLMConfig {
  const { provider, model, apiKey, apiVersion, endpoint } = settings;
  return {
    configName: provider,
    model,
    apiKey,
    apiVersion,
    // TODO: baseURL || endpoint
    baseURL: endpoint,
  };
}

export const currentLLMConfigRef: {
  current: LLMConfig;
} = {
  current: getLLMProviderConfig(SettingStore.get('model') || {}),
};

class IPCClient {
  getFileSystemSettings () {
    const settings = SettingStore.get('fileSystem');
    logger.info(
      '[settingsRoute.getFileSystemSettings] result',
      maskSensitiveData(settings),
    );
    return settings;
  }
  listCustomTools (): any {
    return {}
  }
  listMcpTools (): any[] {
    return []
  }
  listTools () {
    return ['browser', 'filesystem', 'commands'];
  }

  getActiveMcpSettings () {
    return getActiveMcpSettings();
  }

  abortRequest (input: { requestId: string}) {
    logger.info('[llmRoute.abortRequest] requestId', input.requestId);
  }
  async askLLMTool (input: {
      messages: MessageData[];
      tools: ChatCompletionTool[];
      mcpServerKeys?: (MCPServerName | string)[];
      requestId: string;
    }) {
      // const input = '';
      try {
        logger.info('[llmRoute.askLLMTool] input', input);
        const messages = input.messages.map((msg) => new Message(msg));
        logger.info(
          '[llmRoute.askLLMTool] Current LLM Config',
          maskSensitiveData(currentLLMConfigRef.current),
        );
        logger.info(
          '[llmRoute.askLLMTool] Current Search Config',
          maskSensitiveData(SettingStore.get('search')),
        );
        const llm = createLLM(currentLLMConfigRef.current);
        logger.info(
          '[llmRoute.askLLMTool] tools',
          extractToolNames(input.tools),
        );
        const response = await llm.askTool({
          messages,
          tools: input.tools,
          mcpServerKeys: input.mcpServerKeys,
          requestId: input.requestId,
        });
        logger.info(
          '[llmRoute.askLLMTool] response',
          JSON.stringify(response, null, 2),
        );
        return response;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? `[llmRoute.askLLMTool] Failed to get tool response from LLM: ${error.message}`
            : JSON.stringify(error);
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    }

  askLLMTextStream (
    input: {
      messages: MessageData[];
      // tools: ChatCompletionTool[];
      // mcpServerKeys?: (MCPServerName | string)[];
      requestId: string;
    }
  ) {
    logger.info('[llmRoute.askLLMTextStream] input', input);
    const messages = input.messages.map((msg) => new Message(msg));
    const { requestId } = input;
    logger.info(
      '[llmRoute.askLLMTextStream] Current LLM Config',
      maskSensitiveData(currentLLMConfigRef.current),
    );
    const llm = createLLM(currentLLMConfigRef.current);

    (async () => {
      // const windows = BrowserWindow.getAllWindows();
      try {
        const stream = llm.askLLMTextStream({ messages, requestId });
        logger.info('[llmRoute.askLLMTextStream] stream', !!stream);

        // for await (const chunk of stream) {
        //   // if (!windows.length) {
        //   //   return;
        //   // }

        //   // windows.forEach((win) => {
        //   //   win.webContents.send(`llm:stream:${requestId}:data`, chunk);
        //   // });
        // }

        // windows.forEach((win) => {
        //   win.webContents.send(`llm:stream:${requestId}:end`);
        // });
      } catch (error) {
        // windows.forEach((win) => {
        //   win.webContents.send(`llm:stream:${requestId}:error`, error);
        // });
      }
    })();

    return requestId;
  }
}


class MyEmitter extends EventEmitter {}
const emitter = new MyEmitter();

export const onMainStreamEvent = (
  streamId: string,
  handlers: {
    onData: (chunk: string) => void;
    onError: (error: Error) => void;
    onEnd: () => void;
  },
) => {
  const dataListener = (data: string) => handlers.onData(data);
  const errorListener = (error: Error) => handlers.onError(error);
  const endListener = () => handlers.onEnd();

  emitter.on(`llm:stream:${streamId}:data`, dataListener);
  emitter.on(`llm:stream:${streamId}:error`, errorListener);
  emitter.on(`llm:stream:${streamId}:end`, endListener);

  return () => {
    emitter.off(`llm:stream:${streamId}:data`, dataListener);
    emitter.off(`llm:stream:${streamId}:error`, errorListener);
    emitter.off(`llm:stream:${streamId}:end`, endListener);
  };
};

export const ipcClient = new IPCClient();
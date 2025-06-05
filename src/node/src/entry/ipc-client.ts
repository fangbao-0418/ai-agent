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
import { SettingStore } from "@src/utils/store/setting";
import { extractToolNames } from "@src/utils/helper";

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
  listTools () {
    return ['browser', 'filesystem', 'commands'];
  }
  askLLMTool (input: {
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

  askLLMTextStream (options: any) {

  }
}


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

  // window.api.on(`llm:stream:${streamId}:data`, dataListener);
  // window.api.on(`llm:stream:${streamId}:error`, errorListener);
  // window.api.on(`llm:stream:${streamId}:end`, endListener);

  // return () => {
  //   window.api.off(`llm:stream:${streamId}:data`, dataListener);
  //   window.api.off(`llm:stream:${streamId}:error`, errorListener);
  //   window.api.off(`llm:stream:${streamId}:end`, endListener);
  // };
};

export const ipcClient = new IPCClient();
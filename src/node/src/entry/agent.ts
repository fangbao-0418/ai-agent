import { createLLM } from "@src/libs/llm";
import { LLMConfig } from "@src/libs/llm/interfaces/LLMProvider";
import {
  MCPServerName,
  Message,
  MessageData,
  ModelSettings,
} from '@agent-infra/shared';

const config: LLMConfig = {
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
};

async function main () {
  const llm = createLLM(config);

  const response = await llm.askTool({
    messages: [Message.userMessage('What model are you using now?')],
    requestId: 'test',
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_model_name',
          description: 'Get the name of the current model',
          parameters: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'The name of the model',
              },
            },
          },
        },
      },
    ],
  });

  console.log(response);

}

main()
import { ToolCall } from '@agent-infra/shared';
import { search } from './search';

export function executeCustomTool(toolCall: ToolCall) {
  if (toolCall.function.name === 'web_search') {
    return search(toolCall);
  }

  return null;
}

export function listCustomTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'browser_user',
        description: 'Open the browser and operate it.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search in the internet',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'computer_use',
        description: 'operate a computer',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'deepseek_use',
        description: 'For analysis',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'workflow',
        description: 'A workflow can be created.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
          },
          required: ['query'],
        },
      },
    },
  ] as const;
}

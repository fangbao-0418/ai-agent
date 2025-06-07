import { ToolCall } from '@agent-infra/shared';
import { search } from './search';
import * as browserUse from './browser-use';
import * as resumeAnalysis from './resume-analysis';

export function executeCustomTool(toolCall: ToolCall) {
  if (toolCall.function.name === 'web_search') {
    return search(toolCall);
  }
  // else if (toolCall.function.name === 'browser_use') {
  //   return browserUse.search(toolCall);
  // } 
  else if (toolCall.function.name === 'resume_analysis') {
    return resumeAnalysis.run(toolCall);
  }
  return [
    {
      isError: false,
      content: '继续',
    },
  ];
  return null;
}

export function listCustomTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'browser_use',
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
        name: 'resume_analysis',
        description: 'Analyze the downloaded PDF format resume.',
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

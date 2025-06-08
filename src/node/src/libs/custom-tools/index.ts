import { ToolCall } from '@agent-infra/shared';
import { search } from './search';
import * as browserUse from './browser-use';
import * as resumeAnalysis from './resume-analysis';

export function executeCustomTool(toolCall: ToolCall) {
  if (toolCall.function.name === 'web_search') {
    return search(toolCall);
  }
  else if (toolCall.function.name === 'browser_use') {
    return browserUse.search(toolCall);
  } 
  else if (toolCall.function.name === 'resume_analysis') {
    return resumeAnalysis.run(toolCall);
  }
  // return [
  //   {
  //     isError: false,
  //     content: '继续',
  //   },
  // ];
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
        description: 'Analyze, summarize, review, extract, evaluate, and comprehensively assess downloaded PDF format documents including resumes, reports, or any other files. This tool can perform document analysis, content summarization, information extraction, data compilation, and detailed evaluation. Use this when you need to analyze, summarize, review, assess, extract information from, or provide insights about any downloaded document files. 分析、总结、汇总、评估、提取已下载的PDF格式文档（包括简历、报告或其他文件）的内容和信息。',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Analysis requirements or custom prompt for document processing',
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

import { ConsoleLogger } from '@agent-infra/logger';
import { DefaultBrowserOperator, SearchEngine } from './browser-use/operator-browser';
import { GUIAgent } from './libs/sdk';
import { getSystemPromptV1_5_Custom } from './prompts';
import { LocalBrowser } from '@agent-infra/browser';

export type AgentType = 'browser' | 'computer';

class AgentServer {
  private guiAgent!: GUIAgent<DefaultBrowserOperator>;

  onData?: (e: any) => void;
  onError?: (e: any) => void;
  constructor (options?: {
    onData?: (e: any) => void;
    onError?: (e: any) => void;
  }) {
    this.onData = options?.onData;
    this.onError = options?.onError;
  }

  async run (command: string, type: AgentType = 'browser') {
    const modelVersion: any = 'doubao-1.5-15B'
    const logger = new ConsoleLogger('[BrowserGUIAgent]');
    let isBrowserAlive = false;
    if (DefaultBrowserOperator.browser) {
      isBrowserAlive = await DefaultBrowserOperator.browser?.isBrowserAlive()
    }

    const operator = await DefaultBrowserOperator.getInstance(
      false,
      false,
      isBrowserAlive,
      SearchEngine.BAIDU,
    );

    if (isBrowserAlive) {
      //
    }
    // const operator = new NutJSElectronOperator();

    const guiAgent = new GUIAgent({
      model: {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        apiKey: '40510637-b0b7-4106-a372-acf2983ad03c',
        model: 'doubao-1.5-ui-tars-250328',
        // baseURL: 'http://116.148.216.92:32513/v1',
        // apiKey: 'EMPTY',
        // model: 'UI-TARS-1.5-7B',
      },
      systemPrompt: getSystemPromptV1_5_Custom('zh', 'normal'),
      logger,
      operator: operator,
      onData: (e)  => {
        this.onData?.(e);
      },
      onError: (params: any) => {
        this.onError?.(params);
        // console.log('GUIAgent 错误:', params);
        // if (params && params.error && params.error.message) {
        //   console.log('GUIAgent 错误:', params.error.message);
        //   // this.io.emit('agent_message', {
        //   //   message: `执行失败: ${params.error.message}`,
        //   //   status: 'error'
        //   // });
        // }
        // if (params && params.message && params.message.includes('context')) {
        //   // conror('检测到 context 相关错误');
        // }
      },
      retry: {
        model: {
          maxRetries: 3,
        },
        screenshot: {
          maxRetries: 5,
        },
        execute: {
          maxRetries: 1,
        },
      },
      maxLoopCount: 200,
      loopIntervalInMs: 3000,
      uiTarsVersion: modelVersion,
    });
    this.guiAgent = guiAgent;
    try {
      await this.guiAgent.run(command);
    } catch (error) {
      console.log(error);
    }
  }

  pause () {
    this.guiAgent.pause();
  }

  resume () {
    this.guiAgent.resume();
  }

  stop () {
    this.guiAgent.stop();
  }

  socket () {
    //
  }
}

export default AgentServer;
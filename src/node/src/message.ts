import AgentServer, { AgentType } from './agent';
import { cleanupOldSessionDirs, createUniqueID } from './utils/helper';
import globalData from './global';
import * as fs from 'fs';
import { useAgentFlow } from './hooks/use-agent-flow';
import emitter from './utils/emitter'; // 导入全局emitter
import { logger } from './utils/logger';

class AgentMessageServer {

  private agent?: AgentServer;
  private agentFlowController: any = null; // 保存AgentFlow控制器

  private socket: any;

  constructor () {
    // // 初始化时生成会话ID
    // this.generateSessionId();
    
    // this.agent = new AgentServer({
    //   onData: (e) => {
    //     this.socket.emit('agent_message', e)
    //   },
    //   onError: (e) => {
    //     this.socket.emit('agent_error', e)
    //   }
    // });
  }

  initData() {
    globalData.set('download-number', 0)
  }

  // 生成会话ID
  private generateSessionId() {
    const sessionId = createUniqueID();

    this.initData()
    
    // 在创建新会话目录前，先清理其他会话目录
    cleanupOldSessionDirs();
    
    globalData.set('session-id', sessionId);
    console.log('生成会话ID:', sessionId);
    
    // 创建会话临时目录
    const tempDir = globalData.get('temp-download-dir');
    if (tempDir && !fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('创建会话临时目录:', tempDir);
    }
  }

  // 清除会话ID和临时文件
  private clearSession() {
    const sessionId = globalData.get('session-id');
    const tempDir = globalData.get('temp-download-dir');
    
    if (sessionId) {
      console.log('清除会话ID:', sessionId);
      
      // 删除临时目录及其内容
      if (tempDir && fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
          console.log('删除会话临时目录:', tempDir);
        } catch (error) {
          console.error('删除会话临时目录失败:', error);
        }
      }
      
      // 清除全局会话数据
      globalData.set('session-id', null);
    }
  }


  emitThoughtStart () {
    this.socket.emit('thought-start')
  }

  emitThoughtEnd () {
    this.socket.emit('thought-end')
  }

  async onExecuteCommand (data?: { command: string, type: AgentType }) {
    try {
      if (!data?.command) {
        return;
      }
      
      // 初始化时生成会话ID
      this.generateSessionId();
    
      this.emitThoughtStart();

      // 获取AgentFlow控制器
      this.agentFlowController = useAgentFlow();
      
      await this.agentFlowController.run(
        // '帮我浏览器打开boss直聘并登录后下载已沟通人选前三份简历并进行下载后分析',
        data?.command,
        []
      )
      // await this.agent.run(data.command, data.type)
    } catch (error) {
      //
    }
    this.emitThoughtEnd();
  }

  listen (socket: any) {
    this.socket = socket;
    globalData.set('socket', socket)
    this.socket.on('execute_command', async (data: string) => {
      try {
        this.onExecuteCommand(JSON.parse(data))
      } catch (error) {
        logger.error('execute_command error', error);
      }
    })

    // 心跳检测
    socket.on('node_detect', () => {
      this.socket.emit('heartbeat')
    })

    // 处理停止代理
    socket.on('stop_agent', () => {
      // 触发全局stop事件
      emitter.emit('agent:stop');
      
      // 优先使用AgentFlow的stop方法
      if (this.agentFlowController) {
        this.agentFlowController.stop();
      } else {
        this.agent?.stop?.();
      }
      // 停止时清除会话ID
      this.clearSession();
      this.socket.emit('agent_stopped');
    });

    // 处理暂停代理
    socket.on('pause_agent', () => {
      // 触发全局pause事件
      emitter.emit('agent:pause');
      
      // 优先使用AgentFlow的pause方法
      if (this.agentFlowController) {
        this.agentFlowController.pause();
      } else {
        this.agent?.pause();
      }
      this.socket.emit('agent_paused');
    });

    // 处理恢复代理
    socket.on('resume_agent', () => {
      // 触发全局resume事件
      emitter.emit('agent:resume');
      
      // 优先使用AgentFlow的resume方法
      if (this.agentFlowController) {
        this.agentFlowController.resume();
      } else {
        this.agent?.resume();
      }
      this.socket.emit('agent_resumed');
    });

    socket.on('disconnect', () => {
      // 优先使用AgentFlow的pause方法
      if (this.agentFlowController) {
        this.agentFlowController.pause();
      } else {
        this.agent?.pause();
      }
      // 断开连接时也清除会话
      this.clearSession();
      // console.log('🔌 客户端断开连接:', socket.id);
    });
  }

}

export default AgentMessageServer;
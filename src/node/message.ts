import AgentServer, { AgentType } from './agent';

class AgentMessageServer {

  private agent: AgentServer;

  private socket: any;

  constructor () {
    this.agent = new AgentServer({
      onData: (e) => {
        this.socket.emit('agent_message', JSON.stringify(e))
      },
      onError: (e) => {
        this.socket.emit('agent_error', JSON.stringify(e))
      }
    });
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
      this.emitThoughtStart();
      await this.agent.run(data.command, data.type)
      this.emitThoughtEnd();
    } catch (error) {
      //
    }
  }

  listen (socket: any) {
    this.socket = socket;
    this.socket.on('execute_command', async (data: string) => {
      
      this.onExecuteCommand(JSON.parse(data))
    })

    // 处理停止代理
    socket.on('stop_agent', () => {
      this.agent.stop();
    });

    // 处理暂停代理
    socket.on('pause_agent', () => {
      this.agent.pause();
    });

    // 处理暂停代理
    socket.on('resume_agent', () => {
      this.agent.resume();
    });

    socket.on('disconnect', () => {
      this.agent.pause();
      // console.log('🔌 客户端断开连接:', socket.id);
    });
  }

}

export default AgentMessageServer;
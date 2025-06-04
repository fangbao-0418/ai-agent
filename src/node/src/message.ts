import AgentServer, { AgentType } from './agent';
import parseProfiles from './libs/parse-profile';
import { checkDownloadFilesExist, createUniqueID } from './utils/helper';
import globalData from './global';
import * as fs from 'fs';
import { Worker } from 'worker_threads';
import * as path from 'path';

class AgentMessageServer {

  private agent: AgentServer;

  private socket: any;

  constructor () {
    // 初始化时生成会话ID
    this.generateSessionId();
    
    this.agent = new AgentServer({
      onData: (e) => {
        this.socket.emit('agent_message', e)
      },
      onError: (e) => {
        this.socket.emit('agent_error', e)
      }
    });
  }

  // 生成会话ID
  private generateSessionId() {
    const sessionId = createUniqueID();
    
    // 在创建新会话目录前，先清理其他会话目录
    this.cleanupOldSessionDirs();
    
    globalData.set('session-id', sessionId);
    console.log('生成会话ID:', sessionId);
    
    // 创建会话临时目录
    const tempDir = globalData.get('temp-download-dir');
    if (tempDir && !fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('创建会话临时目录:', tempDir);
    }
  }

  // 清理旧的会话目录
  private cleanupOldSessionDirs() {
    const baseDownloadDir = globalData.get('node-dir');
    if (!baseDownloadDir) return;
    
    const downloadDir = baseDownloadDir + '/download';
    if (!fs.existsSync(downloadDir)) return;
    
    try {
      const items = fs.readdirSync(downloadDir, { withFileTypes: true });
      
      // 查找所有目录（可能是旧的会话目录）
      const sessionDirs = items.filter(item => 
        item.isDirectory() && 
        // 简单的会话ID格式检查：数字+随机字符
        /^\d+[a-z0-9]+$/i.test(item.name)
      );
      
      if (sessionDirs.length > 0) {
        console.log(`发现 ${sessionDirs.length} 个旧会话目录，开始清理...`);
        
        sessionDirs.forEach(dir => {
          const dirPath = `${downloadDir}/${dir.name}`;
          try {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`✓ 删除旧会话目录: ${dir.name}`);
          } catch (error) {
            console.error(`✗ 删除旧会话目录失败: ${dir.name} - ${(error as Error).message}`);
          }
        });
        
        console.log('旧会话目录清理完成');
      }
    } catch (error) {
      console.error('清理旧会话目录时发生错误:', (error as Error).message);
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

  // 使用Worker执行简历解析
  private async executeParseProfilesInWorker(): Promise<string> {
    return parseProfiles();
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
      if (checkDownloadFilesExist()) {
        this.socket.emit('agent_message', {
          data: {
            conclusion: "开始解析简历文件",
            status: "running"
          }
        })
        
        // 使用Worker执行简历解析
        try {
          const result = await this.executeParseProfilesInWorker();
          this.socket.emit('agent_message', {
            data: {
              conclusion: result,
              status: "end"
            }
          });
        } catch (error) {
          console.error('Worker执行简历解析失败:', error);
          this.socket.emit('agent_message', {
            data: {
              conclusion: null,
              status: "end"
            }
          });
        }
      }
    } catch (error) {
      //
    }
  }

  listen (socket: any) {
    this.socket = socket;
    this.socket.on('execute_command', async (data: string) => {
      this.onExecuteCommand(JSON.parse(data))
    })

    // 心跳检测
    socket.on('node_detect', () => {
      this.socket.emit('heartbeat')
    })

    // 处理停止代理
    socket.on('stop_agent', () => {
      this.agent?.stop?.();
      // 停止时清除会话ID
      this.clearSession();
      this.socket.emit('agent_stopped');
    });

    // 处理暂停代理
    socket.on('pause_agent', () => {
      this.agent.pause();
      this.socket.emit('agent_paused');
    });

    // 处理恢复代理
    socket.on('resume_agent', () => {
      this.agent.resume();
      this.socket.emit('agent_resumed');
    });

    socket.on('disconnect', () => {
      this.agent.pause();
      // 断开连接时也清除会话
      this.clearSession();
      // console.log('🔌 客户端断开连接:', socket.id);
    });
  }

}

export default AgentMessageServer;
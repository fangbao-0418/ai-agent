import { io, Socket } from 'socket.io-client';

export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:8888', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('Socket 连接成功:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket 断开连接:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket 连接错误:', error);
    });
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket.on(event, callback);
  }

  emit(event: string, data?: any) {
    this.socket.emit(event, JSON.stringify(data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  get connected() {
    return this.socket.connected;
  }
} 
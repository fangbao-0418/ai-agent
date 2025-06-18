# Browser Worker Architecture

## 概述

Browser Worker 架构将浏览器 Agent 的执行从主线程移到独立的 worker 线程中，提供了更好的性能和稳定性。

## 文件结构

```
src/node/src/worker/
├── run-browser.ts          # 浏览器 worker 主文件
├── browser-worker-manager.ts # Worker 管理器
├── test-browser-worker.ts  # 测试文件
└── README.md              # 本文档
```

## 主要组件

### 1. run-browser.ts
浏览器 worker 的主文件，包含：
- GUI Agent 的初始化和执行
- Worker 状态管理（暂停/恢复/停止）
- 与主线程的消息通信
- 错误处理和资源清理

### 2. browser-worker-manager.ts
Worker 管理器，提供：
- Worker 实例的单例管理
- 任务执行接口
- 状态监控
- 控制接口（暂停/恢复/停止）

### 3. AgentServer 集成
修改后的 `agent.ts` 使用 BrowserWorkerManager 来：
- 执行浏览器任务
- 处理窗口控制消息
- 管理 worker 生命周期

## 使用方法

### 基本使用

```typescript
import AgentServer from './agent';

const agent = new AgentServer({
  onData: (data) => {
    console.log('Received data:', data);
  },
  onError: (error) => {
    console.error('Received error:', error);
  }
});

// 执行浏览器任务
await agent.run('打开百度首页');
```

### 控制 Worker

```typescript
// 暂停执行
agent.pause();

// 恢复执行
agent.resume();

// 停止执行
agent.stop();

// 获取状态
const status = agent.getStatus();
console.log('Worker status:', status);
```

## 消息类型

### Worker 到主线程的消息

1. **data**: 执行过程中的数据
   ```typescript
   { type: 'data', data: any }
   ```

2. **error**: 错误信息
   ```typescript
   { type: 'error', data: any }
   ```

3. **window_control**: 窗口控制
   ```typescript
   { type: 'window_control', action: string }
   ```

4. **complete**: 执行完成
   ```typescript
   { type: 'complete', success: boolean, data?: string, error?: string }
   ```

### 主线程到 Worker 的消息

1. **pause**: 暂停执行
   ```typescript
   { type: 'pause' }
   ```

2. **resume**: 恢复执行
   ```typescript
   { type: 'resume' }
   ```

3. **stop**: 停止执行
   ```typescript
   { type: 'stop' }
   ```

## 优势

1. **性能提升**: 浏览器操作在独立线程中执行，不阻塞主线程
2. **稳定性**: Worker 崩溃不会影响主进程
3. **可控制性**: 支持暂停、恢复、停止操作
4. **资源隔离**: Worker 有独立的内存空间
5. **错误隔离**: Worker 中的错误不会影响主进程

## 注意事项

1. **文件路径**: 确保 worker 文件在正确的位置
2. **超时设置**: 默认 5 分钟超时，可根据需要调整
3. **资源清理**: Worker 会自动清理资源，但建议手动调用 stop()
4. **错误处理**: 所有错误都会通过 onError 回调传递

## 测试

运行测试文件：

```bash
# 编译 TypeScript
npm run build

# 运行测试
node dist/worker/test-browser-worker.js
```

## 故障排除

### Worker 文件未找到
确保 `run-browser.js` 文件存在于以下路径之一：
- `src/worker/run-browser.js`
- `dist/worker/run-browser.js`

### Worker 超时
检查网络连接和任务复杂度，必要时增加超时时间。

### Worker 崩溃
查看日志文件，检查是否有内存泄漏或无限循环。 
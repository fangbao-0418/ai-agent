import BrowserWorkerManager from './browser-worker-manager';

async function testBrowserWorker() {
  console.log('🧪 Testing Browser Worker...');
  
  const manager = BrowserWorkerManager.getInstance();
  
  try {
    // 测试执行任务
    const result = await manager.executeBrowserTask(
      {
        command: '打开百度首页',
        sessionId: 'test-session-123'
      },
      (data) => {
        console.log('📊 Received data:', data);
      },
      (error) => {
        console.log('❌ Received error:', error);
      },
      (action) => {
        console.log('🪟 Window control:', action);
      }
    );
    
    console.log('✅ Test completed:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testBrowserWorker();
}

export { testBrowserWorker }; 
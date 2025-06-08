// 测试全局emitter功能
const emitter = require('./src/utils/emitter.js');

console.log('🧪 开始测试全局emitter...');

// 模拟browser-use的监听器
const testListeners = {};

// 设置监听器
testListeners.start = (data) => console.log('📥 收到start事件:', data);
testListeners.pause = () => console.log('📥 收到pause事件');
testListeners.resume = () => console.log('📥 收到resume事件');
testListeners.stop = () => console.log('📥 收到stop事件');
testListeners.complete = () => console.log('📥 收到complete事件');

// 注册监听器
emitter.on('agent:start', testListeners.start);
emitter.on('agent:pause', testListeners.pause);
emitter.on('agent:resume', testListeners.resume);
emitter.on('agent:stop', testListeners.stop);
emitter.on('agent:complete', testListeners.complete);

console.log('✅ 监听器已注册');

// 模拟事件触发
setTimeout(() => {
  console.log('\n🚀 触发start事件...');
  emitter.emit('agent:start', { command: 'test command', type: 'browser' });
}, 1000);

setTimeout(() => {
  console.log('\n⏸️ 触发pause事件...');
  emitter.emit('agent:pause');
}, 2000);

setTimeout(() => {
  console.log('\n▶️ 触发resume事件...');
  emitter.emit('agent:resume');
}, 3000);

setTimeout(() => {
  console.log('\n🛑 触发stop事件...');
  emitter.emit('agent:stop');
}, 4000);

setTimeout(() => {
  console.log('\n✅ 触发complete事件...');
  emitter.emit('agent:complete');
  
  // 移除监听器
  emitter.off('agent:start', testListeners.start);
  emitter.off('agent:pause', testListeners.pause);
  emitter.off('agent:resume', testListeners.resume);
  emitter.off('agent:stop', testListeners.stop);
  emitter.off('agent:complete', testListeners.complete);
  
  console.log('🗑️ 监听器已移除');
  console.log('�� 测试完成!');
}, 5000); 
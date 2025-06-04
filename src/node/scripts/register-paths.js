const { register } = require('tsconfig-paths');
const { readFileSync } = require('fs');
const path = require('path');

/**
 * 注册tsconfig路径别名到Node.js模块解析系统
 */
function registerPaths() {
  try {
    // 读取tsconfig.json
    const tsconfigPath = path.resolve(__dirname, '../tsconfig.json');
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
      const baseUrl = tsconfig.compilerOptions.baseUrl || './';
      const outDir = tsconfig.compilerOptions.outDir || './dist';
      
      // 注册路径映射
      const cleanup = register({
        baseUrl: path.resolve(__dirname, '..', baseUrl),
        paths: tsconfig.compilerOptions.paths,
        addMatchAll: false // 可选：是否添加通配符匹配
      });
      
      console.log('📍 路径别名已注册到Node.js模块解析系统');
      
      // 返回清理函数，可在需要时调用
      return cleanup;
    } else {
      console.warn('⚠️  tsconfig.json中未找到路径配置');
    }
  } catch (error) {
    console.error('❌ 注册路径别名失败:', error.message);
  }
}

// 如果直接运行此脚本，则立即注册
if (require.main === module) {
  registerPaths();
}

module.exports = { registerPaths }; 
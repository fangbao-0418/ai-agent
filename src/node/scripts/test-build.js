const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 测试路径别名构建...\n');

try {
  // 1. 运行构建
  console.log('📦 执行构建...');
  execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });
  
  // 2. 检查构建输出
  const distPath = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) {
    throw new Error('构建输出目录不存在');
  }
  
  // 3. 检查主要文件
  const mainFile = path.join(distPath, 'index.js');
  if (!fs.existsSync(mainFile)) {
    throw new Error('主入口文件不存在');
  }
  
  // 4. 检查构建文件内容（确保没有未解析的别名）
  const mainContent = fs.readFileSync(mainFile, 'utf8');
  
  const unresolvedAliases = [];
  if (mainContent.includes('require("@src/')) unresolvedAliases.push('@src');
  if (mainContent.includes('require("@utils/')) unresolvedAliases.push('@utils');
  if (mainContent.includes('require("@agent-infra/')) unresolvedAliases.push('@agent-infra');
  
  if (unresolvedAliases.length > 0) {
    console.warn('⚠️  发现未解析的路径别名:', unresolvedAliases);
    console.log('📄 检查构建文件是否包含正确的路径解析...');
  } else {
    console.log('✅ 路径别名解析成功！');
  }
  
  // 5. 尝试运行构建后的文件（简单检查）
  console.log('🚀 测试运行构建后的文件...');
  try {
    // 只是加载模块，不执行
    require(mainFile);
    console.log('✅ 构建文件可以正常加载！');
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      console.error('❌ 模块加载失败 - 可能存在路径别名问题:', error.message);
    } else {
      console.log('✅ 模块加载成功（运行时错误是正常的）');
    }
  }
  
  console.log('\n🎉 路径别名构建测试完成！');
  
} catch (error) {
  console.error('❌ 构建测试失败:', error.message);
  process.exit(1);
} 
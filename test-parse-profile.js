const { parseProfiles } = require('./src/node/src/libs/parse-profile/index.ts');

console.log('开始测试简历解析功能...');

parseProfiles()
  .then(() => {
    console.log('✅ 简历解析测试完成！');
  })
  .catch(error => {
    console.error('❌ 简历解析测试失败:', error.message);
  }); 
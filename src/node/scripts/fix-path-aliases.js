const fs = require('fs');
const path = require('path');

console.log('🔧 修复已编译文件中的路径别名...\n');

// 路径别名映射
const aliases = {
  '@src/': './src/',
  '@utils/': './utils/',
  '@agent-infra/': './libs/agent-infra/'
};

function fixPathAliases(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // 替换 require() 中的别名
  Object.entries(aliases).forEach(([alias, replacement]) => {
    const requireRegex = new RegExp(`require\\("${alias.replace('/', '\\/')}`, 'g');
    const fromRegex = new RegExp(`from "${alias.replace('/', '\\/')}`, 'g');
    const importRegex = new RegExp(`import\\("${alias.replace('/', '\\/')}`, 'g');
    
    if (content.includes(alias)) {
      content = content.replace(requireRegex, `require("${replacement}`);
      content = content.replace(fromRegex, `from "${replacement}`);
      content = content.replace(importRegex, `import("${replacement}`);
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

function findJSFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findJSFiles(fullPath));
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

try {
  const distPath = './dist';
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ dist 目录不存在，请先运行 tsc 编译');
    process.exit(1);
  }
  
  const jsFiles = findJSFiles(distPath);
  console.log(`📄 找到 ${jsFiles.length} 个 JavaScript 文件`);
  
  let fixedFiles = 0;
  
  for (const filePath of jsFiles) {
    if (fixPathAliases(filePath)) {
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`✅ 修复: ${relativePath}`);
      fixedFiles++;
    }
  }
  
  if (fixedFiles > 0) {
    console.log(`\n🎉 成功修复 ${fixedFiles} 个文件中的路径别名！`);
    
    // 验证修复结果
    console.log('\n🔍 验证修复结果...');
    let remainingAliases = 0;
    
    for (const filePath of jsFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      Object.keys(aliases).forEach(alias => {
        if (content.includes(alias)) {
          remainingAliases++;
        }
      });
    }
    
    if (remainingAliases === 0) {
      console.log('✅ 所有路径别名都已正确修复！');
    } else {
      console.warn(`⚠️  仍有 ${remainingAliases} 处路径别名未修复`);
    }
    
  } else {
    console.log('ℹ️  没有找到需要修复的路径别名');
  }
  
} catch (error) {
  console.error('❌ 修复失败:', error.message);
  process.exit(1);
} 
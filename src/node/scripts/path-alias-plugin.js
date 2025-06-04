const path = require('path');
const fs = require('fs');

/**
 * 尝试解析目录的索引文件
 * @param {string} dirPath - 目录路径
 * @returns {string|null} 找到的索引文件路径，如果没有找到返回null
 */
function resolveIndexFile(dirPath) {
  const indexFiles = ['index.ts', 'index.js', 'index.tsx', 'index.jsx'];
  
  for (const indexFile of indexFiles) {
    const fullPath = path.join(dirPath, indexFile);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  
  return null;
}

/**
 * 智能路径解析 - 处理文件和目录
 * @param {string} resolvedPath - 已解析的路径
 * @returns {string} 最终的文件路径
 */
function smartPathResolve(resolvedPath) {
  // 如果路径已经是文件且存在，直接返回
  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
    return resolvedPath;
  }
  
  // 尝试添加文件扩展名
  const extensions = ['.ts', '.js', '.tsx', '.jsx'];
  for (const ext of extensions) {
    const fileWithExt = resolvedPath + ext;
    if (fs.existsSync(fileWithExt)) {
      return fileWithExt;
    }
  }
  
  // 如果是目录，尝试查找索引文件
  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
    const indexFile = resolveIndexFile(resolvedPath);
    if (indexFile) {
      return indexFile;
    }
  }
  
  // 都没找到，返回原始路径（让esbuild处理错误）
  return resolvedPath;
}

/**
 * 创建路径别名解析插件
 * @param {string} tsconfigPath - tsconfig.json 文件路径
 * @returns {Object} esbuild 插件对象
 */
function createPathAliasPlugin(tsconfigPath = './tsconfig.json') {
  let aliases = {};
  
  try {
    // 读取 tsconfig.json 配置
    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
    const tsconfig = JSON.parse(tsconfigContent);
    
    if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
      const basePath = tsconfig.compilerOptions.baseUrl || './';
      const rootDir = tsconfig.compilerOptions.rootDir || './src';
      
      // 解析路径别名
      Object.entries(tsconfig.compilerOptions.paths).forEach(([alias, paths]) => {
        if (paths.length > 0) {
          // 移除通配符
          const cleanAlias = alias.replace('/*', '');
          const cleanPath = paths[0].replace('/*', '');
          
          // 计算实际路径
          const absolutePath = path.resolve(process.cwd(), basePath, cleanPath);
          aliases[cleanAlias] = absolutePath;
        }
      });
    }
  } catch (error) {
    console.warn('无法读取 tsconfig.json，使用默认路径别名配置:', error.message);
    
    // 默认配置
    aliases = {
      '@src': path.join(process.cwd(), 'src'),
      '@utils': path.join(process.cwd(), 'src/utils'),
      '@agent-infra': path.join(process.cwd(), 'src/libs/agent-infra')
    };
  }
  
  return {
    name: 'path-alias',
    setup(build) {
      // 为每个别名创建解析规则
      Object.entries(aliases).forEach(([alias, aliasPath]) => {
        const filter = new RegExp(`^${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
        
        build.onResolve({ filter }, args => {
          const relativePath = args.path.replace(alias + '/', '');
          const resolvedPath = path.join(aliasPath, relativePath);
          
          // 使用智能路径解析
          const finalPath = smartPathResolve(resolvedPath);
          
          return {
            path: finalPath
          };
        });
      });
      
      console.log('📍 路径别名配置:', aliases);
    }
  };
}

/**
 * 手动创建路径别名插件（不依赖 tsconfig.json）
 * @param {Object} aliasMap - 别名映射对象
 * @returns {Object} esbuild 插件对象
 */
function createManualPathAliasPlugin(aliasMap = {}) {
  const defaultAliases = {
    '@src': path.join(process.cwd(), 'src'),
    '@utils': path.join(process.cwd(), 'src/utils'),
    '@agent-infra': path.join(process.cwd(), 'src/libs/agent-infra')
  };
  
  const aliases = { ...defaultAliases, ...aliasMap };
  
  return {
    name: 'manual-path-alias',
    setup(build) {
      Object.entries(aliases).forEach(([alias, aliasPath]) => {
        const filter = new RegExp(`^${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
        
        build.onResolve({ filter }, args => {
          const relativePath = args.path.replace(alias + '/', '');
          const resolvedPath = path.join(aliasPath, relativePath);
          
          // 使用智能路径解析
          const finalPath = smartPathResolve(resolvedPath);
          
          return {
            path: finalPath
          };
        });
      });
      
      console.log('📍 手动路径别名配置:', aliases);
    }
  };
}

module.exports = {
  createPathAliasPlugin,
  createManualPathAliasPlugin
}; 
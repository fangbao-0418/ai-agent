# Worker 环境配置说明

## 🎯 概述

这个项目使用rsbuild将worker文件编译为单独的入口，通过环境变量区分开发环境和生产环境的worker文件路径。代码中直接写死地址，简单直接。

## 🛠️ 环境配置

### 支持的环境

- **development** - 开发环境
- **production** - 生产环境  
- **test** - 测试环境

### 环境检测优先级

1. `NODE_ENV` 环境变量
2. `RSBUILD_ENV` 环境变量
3. 自动检测（基于文件系统）

## 📁 Worker文件路径策略（写死地址）

### 开发环境 (`development`)
```typescript
// 直接使用源文件
path.resolve(process.cwd(), 'src/libs/parse-profile/worker.ts')
```

### 生产环境 (`production`)
```typescript
// 使用rsbuild编译后的文件
path.resolve(process.cwd(), 'dist/libs/parse-profile/worker.js')
```

## 🚀 使用方法

### 开发模式
```bash
# 开发环境运行（直接使用worker.ts源文件）
NODE_ENV=development npm run dev

# 开发环境构建（带watch）
npm run dev:build
```

### 生产构建
```bash
# 构建（编译worker.ts -> worker.js）
npm run build

# 生产环境运行
NODE_ENV=production npm start
```

### 测试
```bash
# 运行环境测试
npm run test:env

# 运行测试环境
NODE_ENV=test npm test
```

## 🔧 rsbuild配置

rsbuild将worker文件作为单独入口进行编译：

```typescript
// rsbuild.config.ts
export default defineConfig({
  source: {
    entry: {
      index: './src/index.ts',
      // worker作为单独入口
      'libs/parse-profile/worker': './src/libs/parse-profile/worker.ts',
    },
  },
  // ...
});
```

构建后的文件结构：
```
dist/
├── index.js                          # 主程序
└── libs/parse-profile/worker.js      # worker文件
```

## 📊 环境信息

### WorkerManager方法

```typescript
const workerManager = WorkerManager.getInstance();

// 获取环境信息
const info = workerManager.getEnvironmentInfo();
console.log(info.environment); // 'development' | 'production' | 'test'
console.log(info.workerPath);  // 实际的worker文件路径

// 验证worker文件
const isValid = workerManager.validateWorkerFile();
```

### EnvironmentManager方法

```typescript
import environmentManager from './src/config/environment';

// 环境检查
environmentManager.isDevelopment(); // boolean
environmentManager.isProduction();  // boolean
environmentManager.isTest();        // boolean

// 配置获取
environmentManager.getWorkerTimeout(); // number (ms)
environmentManager.shouldEnableDebugLogs(); // boolean

// 日志方法
environmentManager.log('Debug message');
environmentManager.logError('Error message', error);
environmentManager.logWarning('Warning message');
```

## 🧪 测试环境配置

运行环境测试以验证配置：

```bash
# 构建项目
npm run build

# 运行环境测试
npm run test:env
```

测试将验证：
- ✅ 环境检测是否正确
- ✅ Worker文件路径（写死地址）
- ✅ 文件系统中文件是否存在
- ✅ 超时和日志配置

## 🚨 故障排除

### Worker文件未找到

**开发环境**：
- 确保 `src/libs/parse-profile/worker.ts` 存在
- 路径：`src/libs/parse-profile/worker.ts`

**生产环境**：
- 确保运行了 `npm run build`
- 路径：`dist/libs/parse-profile/worker.js`

### 环境检测错误

```bash
# 手动设置环境变量
export NODE_ENV=production
npm start

# 或者直接在命令中指定
NODE_ENV=production npm start
```

### 构建问题

```bash
# 清理并重新构建
npm run clean
npm run build
```

## 📝 开发建议

1. **开发时**：直接运行 `npm run dev`，使用worker.ts源文件
2. **构建时**：运行 `npm run build`，worker被编译为独立文件
3. **部署时**：确保dist目录包含 `libs/parse-profile/worker.js`
4. **调试时**：开发环境自动启用详细日志

## ✨ 方案优势

- ✅ **简单直接**: 代码中写死路径，无复杂查找逻辑
- ✅ **rsbuild集成**: worker作为独立入口编译，无需copy
- ✅ **环境隔离**: dev用源文件，prod用编译文件
- ✅ **清晰明确**: 路径策略一目了然
- ✅ **易于维护**: 无复杂的路径解析代码

## 🔗 相关文件

- `src/config/environment.ts` - 环境管理器
- `src/libs/parse-profile/WorkerManager.ts` - Worker管理器（简化版）
- `src/libs/parse-profile/worker.ts` - Worker源文件
- `rsbuild.config.ts` - 构建配置（独立入口）
- `scripts/test-worker-environment.js` - 环境测试脚本 
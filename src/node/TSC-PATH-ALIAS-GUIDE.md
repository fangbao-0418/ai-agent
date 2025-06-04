# TypeScript 编译器(tsc) 路径别名处理指南

## 问题描述

TypeScript编译器(`tsc`)只负责类型检查和语言转换，但**不会转换路径别名**。这意味着编译后的JavaScript文件仍然包含原始的路径别名（如 `@src/`, `@utils/`），导致Node.js运行时无法找到模块。

## 解决方案对比

### 方案1: tsc-alias (推荐) ⭐

**优点:**
- 简单易用，无需修改代码
- 构建时转换，运行时性能最优
- 支持所有TypeScript路径映射语法

**使用方法:**

```bash
# 安装依赖
npm install --save-dev tsc-alias

# 编译并处理路径别名
npm run build:tsc  # 等同于: tsc && tsc-alias

# 监听模式
npm run build:tsc-watch
```

**配置文件:** `tsc-alias.config.json`
```json
{
  "resolveFullPaths": true,
  "verbose": false,
  "replacers": {
    "@src": "./src",
    "@utils": "./src/utils", 
    "@agent-infra": "./src/libs/agent-infra"
  },
  "outDir": "./dist"
}
```

### 方案2: tsconfig-paths (运行时解析)

**优点:**
- 无需构建时处理
- 支持动态路径解析
- 与原始代码保持一致

**缺点:**
- 运行时有轻微性能开销
- 需要在启动时注册

**使用方法:**

```bash
# 只编译，不处理别名
npm run build:tsc-only  # 等同于: tsc

# 运行时注册路径解析
npm run start:with-paths  # 等同于: node -r ./scripts/register-paths.js dist/index.js
```

## 当前项目配置

### 已配置的脚本命令

```json
{
  "scripts": {
    "build:tsc": "tsc && tsc-alias",              // 完整构建+路径处理
    "build:tsc-only": "tsc",                      // 仅TypeScript编译
    "build:tsc-watch": "tsc --watch & tsc-alias --watch",  // 监听模式
    "start:with-paths": "node -r ./scripts/register-paths.js dist/index.js",  // 运行时路径解析
    "test:tsc": "npm run build:tsc && node scripts/test-tsc-build.js",  // 测试构建时处理
    "test:tsc-runtime": "npm run build:tsc-only && node -r ./scripts/register-paths.js scripts/test-tsc-build.js"  // 测试运行时处理
  }
}
```

### 支持的路径别名

```typescript
// tsconfig.json 中定义的别名
{
  "compilerOptions": {
    "paths": {
      "@src/*": ["./src/*"],
      "@utils/*": ["./src/utils/*"], 
      "@agent-infra/*": ["./src/libs/agent-infra/*"]
    }
  }
}
```

### 使用示例

```typescript
// ✅ 源代码中使用别名
import { logger } from '@utils/logger';
import { ConsoleLogger } from '@agent-infra/logger';
import { AgentServer } from '@src/agent';

// 构建后的JavaScript文件
// 方案1 (tsc-alias): 自动转换为相对路径
import { logger } from './utils/logger';
import { ConsoleLogger } from './libs/agent-infra/logger';

// 方案2 (tsconfig-paths): 保持别名，运行时解析
import { logger } from '@utils/logger';  // 运行时动态解析
```

## 构建工作流

### 开发环境

```bash
# 使用esbuild (推荐，速度最快)
npm run build:watch

# 使用tsc + tsc-alias
npm run build:tsc-watch

# 使用ts-node (开发调试)
npm run dev
```

### 生产环境

```bash
# 方案1: 构建时处理别名 (推荐)
npm run build:tsc
npm start

# 方案2: 运行时处理别名
npm run build:tsc-only
npm run start:with-paths

# 方案3: 完整打包 (无需处理别名)
npm run build  # 使用esbuild打包
npm start
```

## 验证构建结果

### 测试脚本

```bash
# 测试构建时别名处理
npm run test:tsc

# 测试运行时别名处理  
npm run test:tsc-runtime

# 测试esbuild构建
npm run test:build
```

### 手动验证

```bash
# 检查编译后的文件是否还包含别名
grep -r "@src/" dist/
grep -r "@utils/" dist/
grep -r "@agent-infra/" dist/

# 如果使用tsc-alias，应该没有输出
# 如果使用tsconfig-paths，会有输出但运行时正常
```

## 故障排除

### 常见错误

1. **Module not found 错误**
   ```
   Error: Cannot find module '@src/something'
   ```
   
   **解决方案:**
   - 检查是否正确运行了 `tsc-alias`
   - 或者使用 `node -r ./scripts/register-paths.js` 启动

2. **tsc-alias 不工作**
   ```
   Path replacement failed
   ```
   
   **解决方案:**
   - 检查 `tsc-alias.config.json` 配置
   - 确保 `outDir` 路径正确
   - 验证 tsconfig.json 中的路径映射

3. **路径解析错误**
   ```
   Cannot resolve './src/src/something'
   ```
   
   **解决方案:**
   - 检查 tsconfig.json 中的 `baseUrl` 和 `rootDir`
   - 确保路径映射配置正确

### 调试步骤

1. **检查TypeScript编译**
   ```bash
   npx tsc --noEmit  # 只检查类型，不输出文件
   ```

2. **检查路径映射**
   ```bash
   npx tsc --showConfig  # 显示完整配置
   ```

3. **测试单个文件**
   ```bash
   node -r ./scripts/register-paths.js -e "console.log(require('@utils/logger'))"
   ```

## 性能对比

| 方案 | 构建时间 | 运行时性能 | 复杂度 |
|------|----------|------------|--------|
| esbuild + 插件 | 很快 ⚡ | 最优 ⭐⭐⭐ | 中等 |
| tsc + tsc-alias | 中等 | 最优 ⭐⭐⭐ | 简单 |
| tsc + tsconfig-paths | 快 | 良好 ⭐⭐ | 简单 |

## 最佳实践

### 1. 推荐工作流

```bash
# 开发阶段：使用esbuild (最快)
npm run build:watch

# 生产构建：使用tsc + tsc-alias (最兼容)
npm run build:tsc

# 应急方案：运行时解析 (最简单)
npm run build:tsc-only && npm run start:with-paths
```

### 2. CI/CD 配置

```yaml
# .github/workflows/build.yml
- name: Build TypeScript
  run: |
    npm run build:tsc
    npm run test:tsc
```

### 3. Docker 配置

```dockerfile
# 构建阶段
RUN npm run build:tsc

# 运行阶段
CMD ["npm", "start"]  # 使用处理后的文件
```

---

**总结**: 
- **开发**: 使用 esbuild 获得最快速度
- **生产**: 使用 tsc + tsc-alias 获得最好兼容性  
- **调试**: 使用 tsconfig-paths 获得最大灵活性 
# 路径别名处理指南

## 问题背景

TypeScript 的路径别名（Path Mapping）只在编译时有效，打包后 Node.js 运行时无法识别这些别名。这会导致运行时出现 "Cannot find module" 错误。

## 解决方案

### 1. 自动化路径别名解析

我们创建了自动化的 esbuild 插件来处理路径别名：

```javascript
// scripts/path-alias-plugin.js
const pathAliasPlugin = createPathAliasPlugin('./tsconfig.json');
```

### 2. 支持的路径别名

当前项目支持以下路径别名：

```typescript
// tsconfig.json
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

### 3. 使用示例

```typescript
// ✅ 正确使用
import { logger } from '@utils/logger';
import { ConsoleLogger } from '@agent-infra/logger';
import { AgentServer } from '@src/agent';

// ❌ 避免使用（运行时会出错）
import { logger } from '../../../utils/logger';
```

## 构建配置

### 主要构建文件

1. **build.mjs** - 使用 esbuild + 路径别名插件
2. **esbuild.config.js** - 备用构建配置
3. **scripts/path-alias-plugin.js** - 路径别名解析插件

### 构建命令

```bash
# 开发构建
npm run build

# 监听模式
npm run build:watch

# 测试构建
npm run test:build

# 清理构建文件
npm run clean
```

## 插件特性

### 自动解析 tsconfig.json

插件会自动读取 `tsconfig.json` 中的路径别名配置：

```javascript
const pathAliasPlugin = createPathAliasPlugin('./tsconfig.json');
```

### 手动配置支持

也可以手动指定路径别名：

```javascript
const pathAliasPlugin = createManualPathAliasPlugin({
  '@custom': path.join(process.cwd(), 'src/custom'),
  '@shared': path.join(process.cwd(), 'src/shared')
});
```

### 智能路径解析

- 自动处理相对路径和绝对路径
- 支持嵌套目录结构
- 兼容不同操作系统的路径分隔符

## 验证构建结果

### 运行测试

```bash
npm run test:build
```

测试脚本会检查：

1. ✅ 构建是否成功
2. ✅ 输出文件是否存在
3. ✅ 路径别名是否正确解析
4. ✅ 模块是否可以正常加载

### 手动检查

检查构建后的文件中是否还有未解析的别名：

```bash
# 检查构建文件
grep -r "@src/" dist/
grep -r "@utils/" dist/
grep -r "@agent-infra/" dist/
```

如果没有输出，说明所有别名都已正确解析。

## 故障排除

### 常见问题

1. **Module not found 错误**
   ```
   Error: Cannot find module '@src/something'
   ```
   
   **解决方案**: 确保路径别名插件已正确配置并包含在构建配置中。

2. **路径解析错误**
   ```
   Error: Cannot resolve module './src/src/something'
   ```
   
   **解决方案**: 检查 `tsconfig.json` 中的路径配置是否正确。

3. **构建失败**
   ```
   Build failed: Invalid path alias
   ```
   
   **解决方案**: 检查路径别名是否指向存在的目录。

### 调试步骤

1. **启用详细日志**:
   ```bash
   NODE_ENV=development npm run build
   ```

2. **检查插件输出**:
   构建时会显示路径别名配置：
   ```
   📍 路径别名配置: {
     '@src': '/path/to/project/src',
     '@utils': '/path/to/project/src/utils',
     '@agent-infra': '/path/to/project/src/libs/agent-infra'
   }
   ```

3. **验证文件结构**:
   ```bash
   tree src/ -d
   ```

## 最佳实践

### 1. 一致性

在整个项目中保持路径别名的一致使用：

```typescript
// ✅ 始终使用别名
import '@utils/logger';
import '@agent-infra/browser';

// ❌ 混合使用
import '../utils/logger';
import '@agent-infra/browser';
```

### 2. 明确的别名定义

使用清晰、语义明确的别名：

```typescript
// ✅ 清晰的别名
"@utils/*": ["./src/utils/*"]
"@components/*": ["./src/components/*"]

// ❌ 模糊的别名
"@u/*": ["./src/utils/*"]
"@c/*": ["./src/components/*"]
```

### 3. 定期测试

定期运行构建测试确保路径别名正常工作：

```bash
npm run test:build
```

## 扩展配置

### 添加新的路径别名

1. 更新 `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@src/*": ["./src/*"],
         "@utils/*": ["./src/utils/*"],
         "@agent-infra/*": ["./src/libs/agent-infra/*"],
         "@new-alias/*": ["./src/new-path/*"]
       }
     }
   }
   ```

2. 插件会自动识别新的别名配置

3. 重新构建项目:
   ```bash
   npm run build
   ```

### 自定义插件配置

如需更复杂的路径处理，可以修改 `scripts/path-alias-plugin.js`：

```javascript
function createCustomPathAliasPlugin() {
  return {
    name: 'custom-path-alias',
    setup(build) {
      // 自定义解析逻辑
      build.onResolve({ filter: /^@custom\// }, args => {
        // 自定义路径处理
        return { path: customResolvePath(args.path) };
      });
    }
  };
}
```

---

**注意**: 确保在修改路径别名配置后重新构建项目，并运行测试验证构建结果。 
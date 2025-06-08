# esbuild Windows 支持指南

## 🪟 概述

esbuild 可以为 Windows 环境优化代码编译，虽然它不能直接生成 Windows 可执行文件（需要配合 pkg），但可以针对 Windows 环境进行代码优化。

## 🔧 esbuild vs pkg 的区别

| 工具 | 作用 | 输出 | Windows 支持 |
|------|------|------|--------------|
| **esbuild** | 代码转换、打包、优化 | JavaScript 文件 | ✅ 平台特定优化 |
| **pkg** | 将 JS 打包为可执行文件 | 二进制可执行文件 | ✅ Windows .exe |

## 🚀 Windows 构建命令

### 1. 基础 esbuild 命令
```bash
# 普通构建
npm run build

# Windows 优化构建
npm run build:windows

# 使用环境变量
npm run build:win-env
```

### 2. 完整的 Windows 包构建
```bash
# 使用传统方式 (tsc + ncc + pkg)
npm run build-packages:win

# 使用 esbuild 优化 (推荐)
npm run build-packages:win-esbuild

# 构建所有平台 (使用 esbuild)
npm run build-packages:all-esbuild
```

## ⚙️ Windows 优化特性

### 1. 平台特定代码处理
```javascript
// 代码中可以使用这些预定义常量
if (__IS_WINDOWS__) {
  // Windows 特定逻辑
}

if (process.platform === 'win32') {
  // 跨平台兼容代码
}
```

### 2. 路径处理优化
- 自动处理 Windows 路径分隔符
- 正确解析 Windows 文件扩展名
- 优化模块解析策略

### 3. 构建时优化
```javascript
// build.mjs 中的 Windows 特定配置
const windowsConfig = {
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  define: {
    'process.platform': '"win32"',
    '__IS_WINDOWS__': 'true',
  },
  resolveExtensions: ['.ts', '.js', '.json', '.node'],
  mainFields: ['main', 'module'],
}
```

## 📊 性能对比

| 构建方式 | 速度 | 文件大小 | Windows 优化 |
|----------|------|----------|--------------|
| tsc + ncc | 慢 | 大 | ❌ |
| esbuild | 快 | 中等 | ✅ |
| esbuild (Windows) | 快 | 小 | ✅✅ |

## 🎯 最佳实践

### 1. 开发环境
```bash
# 快速开发构建
npm run build:watch

# Windows 环境开发
npm run build:windows
```

### 2. 生产环境
```bash
# Windows 生产构建
NODE_ENV=production npm run build-packages:win-esbuild

# 所有平台生产构建
NODE_ENV=production npm run build-packages:all-esbuild
```

### 3. CI/CD 配置
```yaml
# GitHub Actions 示例
- name: Build for Windows
  run: npm run build-packages:win-esbuild
  env:
    NODE_ENV: production
    TARGET_PLATFORM: win32
```

## 🔍 环境变量

| 变量 | 作用 | 示例 |
|------|------|------|
| `TARGET_PLATFORM` | 指定目标平台 | `win32`, `darwin`, `linux` |
| `USE_ESBUILD` | 强制使用 esbuild | `true`, `false` |
| `NODE_ENV` | 构建模式 | `production`, `development` |

## 🐛 故障排除

### 1. 路径问题
```bash
# Windows 路径分隔符问题
# ❌ 错误
import file from './path/to/file'

# ✅ 正确 (跨平台)
import file from path.join(__dirname, 'path', 'to', 'file')
```

### 2. 模块解析问题
```bash
# 检查构建输出
npm run build:windows -- --log-level=info

# 调试模式
DEBUG=* npm run build:windows
```

### 3. pkg 兼容性
```bash
# 确保使用正确的入口文件
pkg ./dist/index.js --targets node18-win-x64
```

## 📈 性能优化技巧

### 1. Tree Shaking
```javascript
// 仅导入需要的模块
import { specific } from 'library'
// 而不是
import * as library from 'library'
```

### 2. 代码分割
```javascript
// 使用动态导入
const module = await import('./windows-specific-module')
```

### 3. 外部依赖
```javascript
// 将大型依赖标记为外部
external: ['electron', 'robotjs']
```

## 🎉 总结

esbuild 为 Windows 环境提供了：
- ✅ 快速编译速度
- ✅ 更小的文件大小  
- ✅ 平台特定优化
- ✅ 更好的开发体验

配合 pkg 使用，可以创建高性能的 Windows 可执行文件。 
# 构建指南

本项目支持构建多个平台的可执行文件，包括 macOS、Windows x64 和 Windows ARM64。

## 📋 前置要求

- Node.js 18+
- npm 或 yarn
- pkg (通过 devDependencies 自动安装)

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 构建所有平台
```bash
npm run build-packages
```

### 3. 构建特定平台
```bash
# 构建 Windows x64
npm run build-packages:win

# 构建 Windows ARM64  
npm run build-packages:win-arm

# 构建 macOS ARM64
npm run build-packages:mac
```

## 📦 构建命令详解

### 基础构建命令
- `npm run build` - 使用 esbuild 快速构建开发版本
- `npm run build:tsc` - 使用 TypeScript 编译器构建
- `npm run build:tcp` - 使用 NCC 打包成单个文件

### 平台包构建
- `npm run build:win` - 仅构建 Windows x64 包
- `npm run build:win-arm` - 仅构建 Windows ARM64 包  
- `npm run build:mac` - 仅构建 macOS ARM64 包
- `npm run build:all-platforms` - 构建所有平台包

### 完整流程
- `npm run package:win` - 完整的 Windows x64 构建流程
- `npm run package:win-arm` - 完整的 Windows ARM64 构建流程
- `npm run package:mac` - 完整的 macOS 构建流程
- `npm run package:all` - 完整的所有平台构建流程

### 智能构建脚本
- `npm run build-packages` - 自动化构建所有平台
- `npm run build-packages:win` - 智能构建 Windows x64
- `npm run build-packages:win-arm` - 智能构建 Windows ARM64
- `npm run build-packages:mac` - 智能构建 macOS

## 📁 输出结构

构建完成后，可执行文件将位于 `dist3/` 目录：

```
dist3/
├── index.exe       # Windows x64 可执行文件
├── index-arm.exe   # Windows ARM64 可执行文件
└── index.app       # macOS ARM64 可执行文件
```

## 🔧 高级用法

### Windows 批处理文件
Windows 用户可以直接运行批处理文件：
```cmd
scripts\build-packages.bat
scripts\build-packages.bat win
```

### 自定义构建选项
你可以修改 `package.json` 中的 pkg 配置来添加更多平台或修改输出设置：

```json
{
  "pkg": {
    "targets": [
      "node18-macos-arm64",
      "node18-win-x64", 
      "node18-win-arm64",
      "node18-linux-x64"  // 添加 Linux 支持
    ]
  }
}
```

### 环境变量
- `NODE_ENV` - 设置为 `production` 可以构建优化版本
- `PKG_DEBUG` - 设置为 `1` 可以查看详细的 pkg 构建信息

## 🐛 故障排除

### 常见问题

1. **pkg 构建失败**
   - 确保已经运行了 `npm run build:tsc` 生成 TypeScript 编译文件
   - 检查 `dist2/index.js` 文件是否存在

2. **路径解析错误**
   - 确保所有依赖都正确安装
   - 运行 `npm run clean` 清理后重新构建

3. **Windows 构建在 macOS/Linux 上失败**
   - 这是正常的，跨平台构建需要对应的运行时
   - 建议在对应平台上进行构建，或使用 Docker

### 调试模式
```bash
# 启用详细日志
PKG_DEBUG=1 npm run build:win

# 保留临时文件
PKG_KEEP=1 npm run build:win
```

## 📝 构建流程说明

1. **TypeScript 编译** (`build:tsc`)
   - 将 TypeScript 代码编译为 JavaScript
   - 处理路径别名映射
   - 生成源码映射

2. **NCC 打包** (`build:tcp`)
   - 将编译后的代码和依赖打包成单个文件
   - 优化文件大小
   - 处理动态导入

3. **PKG 打包** (`build:win/mac`)
   - 将 JavaScript 代码打包成可执行文件
   - 包含 Node.js 运行时
   - 生成平台特定的二进制文件

## 🎯 最佳实践

1. **开发时使用** `npm run build:watch` 进行快速迭代
2. **测试时使用** `npm run package:prepare` 验证打包流程
3. **发布时使用** `npm run build-packages` 构建所有平台
4. **CI/CD 中分别构建各平台**以提高构建速度

## 📈 性能优化

- 使用 esbuild 进行快速开发构建
- NCC 优化依赖打包大小
- PKG 生成高性能的原生可执行文件
- 支持增量构建减少重复工作 
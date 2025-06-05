# 🚀 C++内置Node.js应用程序部署指南

本指南提供了多种部署方案，帮助您将C++内置Node.js应用程序打包并部署到不同的环境中。

## 📋 目录

- [快速开始](#快速开始)
- [本地构建](#本地构建)
- [Docker部署](#docker部署)
- [跨平台打包](#跨平台打包)
- [生产环境部署](#生产环境部署)
- [故障排除](#故障排除)

## 🚀 快速开始

### 方案1: 本地一键构建

```bash
# Linux/macOS
./build_integrated.sh --mode full

# Windows
build_integrated.bat --mode full
```

### 方案2: Docker快速部署

```bash
# 构建并启动
docker-compose up -d cppnode-app

# 访问应用
# GUI: VNC客户端连接 localhost:5900 (密码: cppnode123)
# API: http://localhost:3000
```

## 🔧 本地构建

### 系统要求

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential cmake \
    qt6-base-dev qt6-tools-dev \
    nodejs npm
```

**macOS:**
```bash
# 使用Homebrew
brew install qt6 cmake node npm

# 或使用MacPorts
sudo port install qt6 cmake nodejs18 npm8
```

**Windows:**
```powershell
# 使用Chocolatey
choco install qt6 cmake nodejs npm git

# 或手动安装:
# - Qt6: https://www.qt.io/download
# - CMake: https://cmake.org/download/
# - Node.js: https://nodejs.org/
```

### 构建步骤

1. **克隆项目**
```bash
git clone <your-repo>
cd cppnode
```

2. **构建Node.js后端**
```bash
cd src/node
npm install
npm run build
```

3. **构建C++前端**
```bash
cd ../cpp
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
```

4. **一键集成构建**
```bash
# 返回项目根目录
cd ../../..

# 执行集成构建
./build_integrated.sh --mode full --config Release
```

## 🐳 Docker部署

### 基础部署

```bash
# 构建镜像
docker build -f Dockerfile.embedded -t cppnode-app .

# 运行容器
docker run -d \
  --name cppnode-app \
  -p 3000:3000 \
  -p 5900:5900 \
  -v $(pwd)/data:/app/data \
  cppnode-app --mode gui --vnc
```

### 使用Docker Compose

**完整服务栈:**
```bash
# 启动完整应用
docker-compose up -d

# 启动特定profile
docker-compose --profile web up -d        # 包含Web界面
docker-compose --profile monitoring up -d # 包含监控
docker-compose --profile dev up -d        # 开发模式
```

**服务访问:**
- 主应用GUI: VNC `localhost:5900` (密码: `cppnode123`)
- API接口: `http://localhost:3000`
- Web管理界面: `http://localhost:8080` (如果启用)
- 监控界面: `http://localhost:9090` (如果启用)

### Docker环境配置

**环境变量:**
```bash
# 应用配置
NODE_DIR=/app/data
QT_QPA_PLATFORM=xcb
DISPLAY=:1

# 开发配置
NODE_ENV=development
DEBUG=1
```

**数据持久化:**
```bash
# 创建数据目录
mkdir -p ./data/app ./data/config ./data/logs

# 设置配置文件
cp config/app.json ./data/config/
```

## 📦 跨平台打包

### 打包模式

**完整打包 (full):**
- 包含所有依赖
- 可在目标系统独立运行
- 文件体积较大

```bash
./build_integrated.sh --mode full --platform linux-x64
./build_integrated.sh --mode full --platform macos-x64
./build_integrated.sh --mode full --platform win-x64
```

**便携版 (portable):**
- 依赖系统Node.js
- 文件体积小
- 需要目标系统预装Node.js

```bash
./build_integrated.sh --mode portable
```

**安装包 (installer):**
- 生成平台特定的安装程序
- 需要额外的打包工具

```bash
# Windows (需要NSIS)
./build_integrated.sh --mode installer --platform win-x64

# macOS (需要pkgbuild)
./build_integrated.sh --mode installer --platform macos-x64
```

### 输出结构

构建完成后，在 `release/` 目录下会生成：

```
release/
├── CppNodeApp/
│   ├── bin/                 # 可执行文件
│   │   └── CppNodeApp[.exe]
│   ├── resources/           # Node.js资源
│   │   └── index-*          # 打包后的Node.js程序
│   ├── data/               # 应用数据
│   │   ├── config/         # 配置文件
│   │   └── download/       # 下载目录
│   ├── start.sh/.bat       # 启动脚本
│   └── README.md           # 使用说明
└── CppNodeApp-*.tar.gz/.zip # 分发包
```

## 🌐 生产环境部署

### 系统服务部署

**Linux systemd服务:**

1. 创建服务文件 `/etc/systemd/system/cppnode.service`:
```ini
[Unit]
Description=CppNode Application
After=network.target

[Service]
Type=simple
User=cppnode
WorkingDirectory=/opt/cppnode
ExecStart=/opt/cppnode/bin/CppNodeApp --node-dir /opt/cppnode/data
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. 启用服务:
```bash
sudo systemctl enable cppnode
sudo systemctl start cppnode
sudo systemctl status cppnode
```

**Windows服务:**

使用NSSM或类似工具将应用注册为Windows服务：

```cmd
nssm install CppNodeApp "C:\CppNodeApp\bin\CppNodeApp.exe"
nssm set CppNodeApp Parameters "--node-dir C:\CppNodeApp\data"
nssm set CppNodeApp Start SERVICE_AUTO_START
nssm start CppNodeApp
```

### 负载均衡

**Nginx配置:**
```nginx
upstream cppnode_backend {
    server 127.0.0.1:3000;
    # 如果有多个实例
    # server 127.0.0.1:3001;
    # server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://cppnode_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 容器编排

**Kubernetes部署:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cppnode-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cppnode-app
  template:
    metadata:
      labels:
        app: cppnode-app
    spec:
      containers:
      - name: cppnode-app
        image: cppnode-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_DIR
          value: "/app/data"
        volumeMounts:
        - name: app-data
          mountPath: /app/data
      volumes:
      - name: app-data
        persistentVolumeClaim:
          claimName: cppnode-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: cppnode-service
spec:
  selector:
    app: cppnode-app
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## 🔍 监控和日志

### 应用监控

**健康检查端点:**
- `GET /health` - 应用状态
- `GET /metrics` - 性能指标

**日志配置:**
```json
{
  "logging": {
    "level": "info",
    "file": "/app/data/logs/app.log",
    "maxSize": "10MB",
    "maxFiles": 5
  }
}
```

**Prometheus监控:**
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'cppnode-app'
    static_configs:
      - targets: ['cppnode-app:3000']
    metrics_path: /metrics
    scrape_interval: 30s
```

## 🛠️ 故障排除

### 常见问题

**1. Qt库未找到**
```bash
# Linux
export LD_LIBRARY_PATH=/path/to/qt/lib:$LD_LIBRARY_PATH

# macOS
export DYLD_LIBRARY_PATH=/path/to/qt/lib:$DYLD_LIBRARY_PATH
```

**2. Node.js进程启动失败**
```bash
# 检查Node.js可执行文件权限
chmod +x resources/index-*

# 检查端口占用
netstat -tlnp | grep 3000
```

**3. GUI界面无法显示**
```bash
# 检查X11转发
export DISPLAY=:0
xhost +local:

# Docker环境中使用VNC
docker run -p 5900:5900 cppnode-app --mode gui --vnc
```

**4. 构建失败**
```bash
# 清理构建缓存
rm -rf build_release dist2 temp_node_binaries

# 重新构建
./build_integrated.sh --mode full
```

### 日志分析

**应用日志位置:**
- 本地部署: `./data/logs/app.log`
- Docker部署: `/app/data/logs/app.log`
- 系统服务: `journalctl -u cppnode -f`

**调试模式:**
```bash
# 启用详细日志
DEBUG=1 ./bin/CppNodeApp --verbose

# Docker调试
docker run -e DEBUG=1 cppnode-app --mode headless
```

## 📚 参考资料

- [Qt部署指南](https://doc.qt.io/qt-6/deployment.html)
- [Node.js pkg文档](https://github.com/vercel/pkg)
- [Docker最佳实践](https://docs.docker.com/develop/best-practices/)
- [CMAKE交叉编译](https://cmake.org/cmake/help/latest/manual/cmake-toolchains.7.html)

## 💡 最佳实践

1. **安全性**
   - 不要在镜像中硬编码密码
   - 使用非root用户运行
   - 定期更新基础镜像

2. **性能优化**
   - 使用多阶段构建减小镜像体积
   - 启用编译器优化 (`-O2`, `-O3`)
   - 合理配置内存和CPU限制

3. **维护性**
   - 版本化构建产物
   - 自动化CI/CD流程
   - 完善的文档和测试

---

## 📞 支持

如有问题，请查看：
- [问题追踪](./TROUBLESHOOTING.md)
- [FAQ](./FAQ.md)
- [贡献指南](./CONTRIBUTING.md) 
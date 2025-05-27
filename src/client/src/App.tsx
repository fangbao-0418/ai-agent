import React, { useState, useEffect, useRef } from 'react';
import {
  Layout,
  Card,
  Input,
  Button,
  List,
  Avatar,
  Typography,
  Space,
  Tag,
  Divider,
  Row,
  Col,
  Alert,
  Switch,
  Progress,
  Badge,
} from 'antd';
import {
  RobotOutlined,
  UserOutlined,
  SendOutlined,
  ClearOutlined,
  GlobalOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SettingOutlined,
  WifiOutlined,
  DisconnectOutlined,
  StopOutlined,
  CaretRightOutlined,
  LoadingOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { SocketService } from './services/socket';

const { Header, Content, Sider } = Layout;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

interface Message {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  status?: 'pending' | 'success' | 'error';
  screenshotBase64?: string
}

interface AgentStatus {
  isRunning: boolean;
  isConnected: boolean;
  currentAction: string;
  progress: number;
  isPaused?: boolean;
  isThinking?: boolean;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    isRunning: false,
    isConnected: false,
    currentAction: '待机中',
    progress: 0,
    isPaused: false,
    isThinking: false,
  });
  const [autoMode, setAutoMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketService = useRef<SocketService | null>(null);

  useEffect(() => {
    // 初始化 Socket 连接
    socketService.current = new SocketService();
    
    socketService.current.on('connect', () => {
      setAgentStatus(prev => ({ ...prev, isConnected: true }));
      addSystemMessage('已连接到服务器');
    });

    socketService.current.on('disconnect', () => {
      setAgentStatus(prev => ({ ...prev, isConnected: false, isRunning: false, isThinking: false }));
      addSystemMessage('与服务器断开连接');
    });

    socketService.current.on('agent_status', (status: any) => {
      setAgentStatus(prev => ({ ...prev, ...status }));
    });

    socketService.current.on('agent_message', (data: any) => {
      console.log(data, 'data')
      if (data?.data?.conversations) {
        data.data.conversations.forEach((e: any) => {
          if (e.from === 'gpt') {
            e?.predictionParsed?.map((e2: any) => {
              addMessage({
                id: Date.now().toString(),
                type: 'agent',
                content: e2.thought,
                timestamp: new Date(),
              });
            })
          } else {
            addMessage({
              id: Date.now().toString(),
              type: 'user',
              content: e.value,
              screenshotBase64: e.screenshotBase64,
              timestamp: new Date(),
            });
            addMessage({
              id: Date.now().toString(),
              type: 'agent',
              content: '正在寻找最佳解决方案...',
              timestamp: new Date(),
              status: 'pending',
            });
          }
         
        });
      }
      // addMessage({
      //   id: Date.now().toString(),
      //   type: 'agent',
      //   content: data.message,
      //   timestamp: new Date(),
      //   status: data.status || 'success',
      // });
    });

    socketService.current.on('agent_progress', (data: any) => {
      setAgentStatus(prev => ({ 
        ...prev, 
        currentAction: data.action,
        progress: data.progress 
      }));
    });

    // 监听暂停状态更新
    socketService.current.on('agent_paused', () => {
      setAgentStatus(prev => ({ ...prev, isPaused: true }));
    });

    // 监听恢复状态更新
    socketService.current.on('agent_resumed', () => {
      setAgentStatus(prev => ({ ...prev, isPaused: false }));
    });

    // 监听停止状态更新
    socketService.current.on('agent_stopped', () => {
      setAgentStatus(prev => ({ ...prev, isRunning: false, isPaused: false, isThinking: false }));
      // 移除思考中消息
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('thinking-')));
    });

    // 监听思考开始
    socketService.current.on('thought-start', () => {
      setAgentStatus(prev => ({ ...prev, isThinking: true }));
      // 添加思考中消息到列表
      const thinkingMessages = [
        '正在分析您的需求...',
        '思考中，请稍候...',
        '正在制定执行计划...',
        '分析页面结构中...',
        '正在寻找最佳解决方案...'
      ];
      const randomMessage = thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
      
      addMessage({
        id: `thinking-${Date.now()}`,
        type: 'agent',
        content: randomMessage,
        timestamp: new Date(),
        status: 'pending',
      });
    });

    // 监听思考结束
    socketService.current.on('thought-end', () => {
      setAgentStatus(prev => ({ ...prev, isThinking: false }));
      // 移除思考中消息
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('thinking-')));
    });

    return () => {
      socketService.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const addSystemMessage = (content: string) => {
    addMessage({
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: new Date(),
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInputValue('');
    setIsLoading(true);

    try {
      // 如果代理正在运行但被暂停，先停止它
      if (agentStatus.isRunning && agentStatus.isPaused) {
        socketService.current?.emit('stop_agent');
        setAgentStatus(prev => ({ ...prev, isRunning: false, isPaused: false }));
      }

      // 发送指令到 Node 服务
      socketService.current?.emit('execute_command', {
        command: inputValue,
        type: 'browser',
        autoMode,
      });

      // 更新状态为运行中
      setAgentStatus(prev => ({ ...prev, isRunning: true, isPaused: false }));
    } catch (error) {
      addMessage({
        id: Date.now().toString(),
        type: 'system',
        content: `错误: ${error}`,
        timestamp: new Date(),
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopAgent = () => {
    socketService.current?.emit('stop_agent');
    setAgentStatus(prev => ({ ...prev, isRunning: false, isPaused: false, isThinking: false }));
    // 移除思考中消息
    setMessages(prev => prev.filter(msg => !msg.id.startsWith('thinking-')));
    addSystemMessage('已停止代理运行');
  };

  const handlePauseAgent = () => {
    socketService.current?.emit('pause_agent');
    setAgentStatus(prev => ({ ...prev, isPaused: true }));
    addSystemMessage('已暂停代理运行');
  };

  const handleResumeAgent = () => {
    socketService.current?.emit('resume_agent');
    setAgentStatus(prev => ({ ...prev, isPaused: false }));
    addSystemMessage('已恢复代理运行');
  };

  const handleClearMessages = () => {
    setMessages([]);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'pending': return 'processing';
      default: return 'default';
    }
  };

  const getMessageIcon = (type: string, isThinking?: boolean) => {
    if (isThinking) {
      return <LoadingOutlined spin />;
    }
    switch (type) {
      case 'user': return <UserOutlined />;
      case 'agent': return <RobotOutlined />;
      default: return <SettingOutlined />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Space align="center">
          <GlobalOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            Browser Use - AI 代理控制台
          </Title>
        </Space>
        
        <Space>
          <Badge 
            status={agentStatus.isConnected ? 'success' : 'error'} 
            text={agentStatus.isConnected ? '已连接' : '未连接'}
          />
          {agentStatus.isConnected ? <WifiOutlined /> : <DisconnectOutlined />}
        </Space>
      </Header>

      <Layout>
        <Sider width={300} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <div style={{ padding: 16 }}>
            <Card size="small" title="代理状态" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>运行状态：</Text>
                  <Tag color={agentStatus.isRunning ? 
                    (agentStatus.isPaused ? 'warning' : 
                     agentStatus.isThinking ? 'processing' : 'success') : 'default'}>
                    {agentStatus.isRunning ? 
                      (agentStatus.isPaused ? '已暂停' : 
                       agentStatus.isThinking ? '思考中' : '运行中') : '空闲'}
                  </Tag>
                </div>
                
                <div>
                  <Text strong>当前操作：</Text>
                  <br />
                  <Text type="secondary">
                    {agentStatus.isThinking ? 
                      <Space>
                        <LoadingOutlined spin style={{ color: '#1890ff' }} />
                        正在思考分析中...
                      </Space> : 
                      agentStatus.currentAction
                    }
                  </Text>
                </div>

                {agentStatus.isRunning && (
                  <div>
                    <Text strong>进度：</Text>
                    <Progress 
                      percent={agentStatus.progress} 
                      size="small" 
                      status={agentStatus.progress === 100 ? 'success' : 'active'}
                    />
                  </div>
                )}
              </Space>
            </Card>

            <Card size="small" title="控制面板" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>自动模式：</Text>
                  <Switch 
                    checked={autoMode} 
                    onChange={setAutoMode}
                    checkedChildren="开"
                    unCheckedChildren="关"
                  />
                </div>

                {agentStatus.isRunning && !agentStatus.isPaused && (
                  <Button 
                    type="default"
                    icon={<PauseCircleOutlined />}
                    onClick={handlePauseAgent}
                    block
                    style={{ marginBottom: 8 }}
                  >
                    暂停代理
                  </Button>
                )}

                {agentStatus.isRunning && agentStatus.isPaused && (
                  <Button 
                    type="primary"
                    icon={<CaretRightOutlined />}
                    onClick={handleResumeAgent}
                    block
                    style={{ marginBottom: 8 }}
                  >
                    恢复代理
                  </Button>
                )}

                {agentStatus.isRunning && (
                  <Button 
                    danger 
                    icon={<StopOutlined />}
                    onClick={handleStopAgent}
                    block
                    style={{ marginBottom: 8 }}
                  >
                    停止代理
                  </Button>
                )}

                <Button 
                  icon={<ClearOutlined />}
                  onClick={handleClearMessages}
                  block
                >
                  清空消息
                </Button>
              </Space>
            </Card>

            <Card size="small" title="快速指令">
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Button 
                  size="small" 
                  block 
                  onClick={() => setInputValue('打开百度搜索')}
                >
                  打开百度
                </Button>
                <Button 
                  size="small" 
                  block 
                  onClick={() => setInputValue('帮我搜索最新的AI新闻')}
                >
                  搜索AI新闻
                </Button>
                <Button 
                  size="small" 
                  block 
                  onClick={() => setInputValue('打开GitHub，搜索React项目')}
                >
                  搜索GitHub
                </Button>
              </Space>
            </Card>
          </div>
        </Sider>

        <Content style={{ padding: 0, background: '#fff' }}>
          <div style={{ 
            height: 'calc(100vh - 64px)', 
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            {/* 消息列表区域 */}
            <div style={{ 
              flex: 1, 
              padding: '16px 24px', 
              overflowY: 'auto',
              background: '#fafafa',
            }}>
              {messages.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 0',
                  color: '#999',
                }}>
                  <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <Paragraph>
                    欢迎使用 Browser Use AI 代理！
                    <br />
                    请在下方输入您的指令，让 AI 代理帮您操作浏览器。
                  </Paragraph>
                </div>
              ) : (
                <List
                  dataSource={messages}
                  renderItem={(message, index) => {
                    if (message.type === 'agent' &&  index !== messages.length - 1 && message.status === 'pending') {
                      return null
                    }
                    return (
                      <List.Item
                        style={{
                          padding: '12px 0',
                          border: 'none',
                        }}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar 
                              icon={getMessageIcon(message.type, message.status === 'pending')} 
                              style={{
                                backgroundColor: message.type === 'user' ? '#1890ff' : 
                                                message.type === 'agent' ? '#52c41a' : '#faad14'
                              }}
                            />
                          }
                          title={
                            <Space>
                              <Text strong>
                                {message.type === 'user' ? '用户' : 
                                message.type === 'agent' ? 'AI 代理' : '系统'}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {message.timestamp.toLocaleTimeString()}
                              </Text>
                              {message.status && (
                                <Tag color={getStatusColor(message.status)}>
                                  {message.status}
                                </Tag>
                              )}
                            </Space>
                          }
                          description={
                            <div style={{ 
                              background: message.status === 'pending' ? 
                                'linear-gradient(45deg, #f0f9ff, #e0f2fe)' : '#fff', 
                              padding: 12, 
                              borderRadius: 8,
                              marginTop: 8,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                              border: message.status === 'pending' ? 
                                '1px dashed #1890ff' : 'none',
                              animation: message.status === 'pending' ? 
                                'pulse 2s infinite' : 'none',
                            }}>
                              {message.status === 'pending' ? (
                                <Space>
                                  <BulbOutlined style={{ color: '#1890ff' }} />
                                  <Text style={{ 
                                    fontStyle: 'italic', 
                                    color: '#1890ff',
                                    animation: 'fadeInOut 1.5s infinite'
                                  }}>
                                    {message.content}
                                  </Text>
                                </Space>
                              ) : message.content === '<image>' && message.screenshotBase64 ? (
                                <div style={{ textAlign: 'center' }}>
                                  <img 
                                    src={`data:image/png;base64,${message.screenshotBase64}`}
                                    alt="截图"
                                    style={{ 
                                      maxWidth: '100%', 
                                      maxHeight: '400px',
                                      borderRadius: 8,
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                      cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                      // 点击图片放大显示
                                      const img = e.target as HTMLImageElement;
                                      const newWindow = window.open('', '_blank');
                                      if (newWindow) {
                                        newWindow.document.write(`
                                          <html>
                                            <head><title>截图预览</title></head>
                                            <body style="margin:0;padding:20px;background:#f0f0f0;display:flex;justify-content:center;align-items:center;min-height:100vh;">
                                              <img src="${img.src}" style="max-width:100%;max-height:100%;box-shadow:0 4px 16px rgba(0,0,0,0.2);" />
                                            </body>
                                          </html>
                                        `);
                                      }
                                    }}
                                  />
                                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                                    点击图片查看大图
                                  </div>
                                </div>
                              ) : (
                                <Text>{message.content}</Text>
                              )}
                            </div>
                          }
                        />
                      </List.Item>
                    )
                  }}
                />
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div style={{ 
              padding: 16, 
              borderTop: '1px solid #f0f0f0',
              background: '#fff',
            }}>
              {!agentStatus.isConnected && (
                <Alert
                  message="未连接到服务器"
                  description="请确保 Node.js 服务正在运行"
                  type="warning"
                  style={{ marginBottom: 16 }}
                  showIcon
                />
              )}

              {agentStatus.isPaused && (
                <Alert
                  message="代理已暂停"
                  description="代理当前处于暂停状态，您可以在左侧控制面板恢复运行或发送新的指令"
                  type="info"
                  style={{ marginBottom: 16 }}
                  showIcon
                />
              )}
              
              <Row gutter={12}>
                <Col flex="auto">
                  <TextArea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={agentStatus.isPaused ? 
                      "代理已暂停，您可以发送新指令或在左侧恢复运行" : 
                      "请输入您想要 AI 代理执行的操作，例如：帮我打开百度搜索Python教程"}
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    onPressEnter={(e) => {
                      if (e.shiftKey) return;
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    disabled={!agentStatus.isConnected || isLoading}
                  />
                </Col>
                <Col>
                  <Button
                    type="primary"
                    icon={isLoading ? <PlayCircleOutlined spin /> : <SendOutlined />}
                    onClick={handleSendMessage}
                    loading={isLoading}
                    disabled={!agentStatus.isConnected || !inputValue.trim() || (agentStatus.isRunning && !agentStatus.isPaused)}
                    style={{ height: '100%' }}
                  >
                    发送
                  </Button>
                </Col>
              </Row>
              
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                {agentStatus.isPaused ? 
                  '提示：代理已暂停，发送新指令将重新开始执行' :
                  '提示：按 Enter 发送，Shift+Enter 换行'}
              </div>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App; 
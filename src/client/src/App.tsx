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
  FileTextOutlined,
  CheckCircleOutlined,
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
  status?: 'pending' | 'success' | 'error' | 'streaming';
  screenshotBase64?: string;
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
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null); // 跟踪当前流式传输的消息ID
  const streamingMessageIdRef = useRef<string | null>(null); // 使用ref来避免状态更新延迟
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketService = useRef<SocketService | null>(null);

  // 同步更新ref和state
  const setStreamingId = (id: string | null) => {
    streamingMessageIdRef.current = id;
    setStreamingMessageId(id);
  };

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
      console.log('📨 收到消息:', data, 'streamingId:', streamingMessageIdRef.current)
      
      // 处理简历解析相关的消息
      if (data?.data?.conclusion !== undefined) {
        if (data.data.status === 'running') {
          // 状态为 running 时：如果已有流式消息就更新，否则创建新的
          if (streamingMessageIdRef.current) {
            console.log('🔄 更新running消息:', streamingMessageIdRef.current);
            updateMessage(streamingMessageIdRef.current, {
              content: '开始解析文件',
              status: 'pending',
            });
          } else {
            console.log('🆕 创建running消息');
            const messageId = `parse-${Date.now()}`;
            addMessage({
              id: messageId,
              type: 'agent',
              content: '开始解析文件',
              timestamp: new Date(),
              status: 'pending',
            });
            setStreamingId(messageId);
          }
        } else if (data.data.status === 'streaming') {
          // 流式状态：如果没有流式消息ID就创建，有的话就更新
          if (streamingMessageIdRef.current) {
            console.log('🔄 更新streaming消息:', streamingMessageIdRef.current);
            // 更新现有消息内容
            updateMessage(streamingMessageIdRef.current, {
              content: data.data.conclusion,
              status: 'streaming',
            });
          } else {
            console.log('🆕 创建streaming消息');
            // 第一个streaming消息：创建新的流式消息
            const messageId = `stream-${Date.now()}`;
            addMessage({
              id: messageId,
              type: 'agent',
              content: data.data.conclusion,
              timestamp: new Date(),
              status: 'streaming',
            });
            setStreamingId(messageId);
          }
        } else if (data.data.status === 'end') {
          // 流式结束：更新最终状态
          if (streamingMessageIdRef.current) {
            console.log('✅ 完成streaming消息:', streamingMessageIdRef.current);
            updateMessage(streamingMessageIdRef.current, {
              content: data.data.conclusion || '文档解析完成',
              status: 'success',
            });
            setStreamingId(null); // 清除流式消息ID
          } else {
            console.log('🆕 创建end消息（非流式模式）');
            // 如果没有流式消息ID，说明是非流式模式，创建新消息
            addMessage({
              id: Date.now().toString(),
              type: 'agent',
              content: data.data.conclusion || '文档解析完成',
              timestamp: new Date(),
              status: 'success',
            });
          }
        } else if (data.data.status === 'error') {
          // 错误状态
          if (streamingMessageIdRef.current) {
            console.log('❌ 错误更新streaming消息:', streamingMessageIdRef.current);
            updateMessage(streamingMessageIdRef.current, {
              content: data.data.conclusion || '文档解析发生错误',
              status: 'error',
            });
            setStreamingId(null); // 清除流式消息ID
          } else {
            console.log('🆕 创建error消息');
            addMessage({
              id: Date.now().toString(),
              type: 'agent',
              content: data.data.conclusion || '文档解析发生错误',
              timestamp: new Date(),
              status: 'error',
            });
          }
        }
        return; // 处理完简历解析消息后直接返回
      }
      
      // 原有的对话消息处理逻辑
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
      // 清除流式消息ID
      setStreamingId(null);
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

  // 新增：更新已存在的消息
  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
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
    
    // 清理之前的流式消息ID，确保新请求从干净状态开始
    setStreamingId(null);

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
    // 清除流式消息ID
    setStreamingId(null);
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
    setStreamingId(null); // 清除流式消息ID
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'pending': return 'processing';
      case 'streaming': return 'cyan';
      default: return 'default';
    }
  };

  const getMessageIcon = (type: string, isThinking?: boolean, content?: string, status?: string) => {
    if (isThinking || status === 'pending') {
      return <LoadingOutlined spin />;
    }
    
    if (status === 'streaming') {
      return <LoadingOutlined spin style={{ color: '#1890ff' }} />;
    }
    
    // 检查是否是简历解析相关消息
    if (content?.includes('开始解析') || content?.includes('文档分析') || content?.includes('简历分析')) {
      return <FileTextOutlined style={{ color: '#1890ff' }} />;
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

            <Card size="small" title="使用提示">
              <Space direction="vertical" style={{ width: '100%', fontSize: 12 }}>
                <Text type="secondary">• 支持流式文档解析</Text>
                <Text type="secondary">• 自动检测简历和文档类型</Text>
                <Text type="secondary">• 实时显示解析进度</Text>
                <Text type="secondary">• 自定义分析提示词</Text>
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
                              icon={getMessageIcon(message.type, message.status === 'pending', message.content, message.status)} 
                              style={{
                                backgroundColor: message.type === 'user' ? '#1890ff' : 
                                                message.type === 'agent' ? 
                                                  (message.status === 'streaming' ? '#13c2c2' : '#52c41a') : '#faad14'
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
                                  {message.status === 'streaming' ? '实时传输中' : message.status}
                                </Tag>
                              )}
                            </Space>
                          }
                          description={
                            <div style={{ 
                              background: message.status === 'pending' ? 
                                'linear-gradient(45deg, #f0f9ff, #e0f2fe)' : 
                                message.status === 'streaming' ?
                                'linear-gradient(45deg, #e6fffb, #f0f9ff)' :
                                (message.content?.includes('开始解析') || message.content?.includes('文档分析') || message.content?.includes('简历分析')) ?
                                'linear-gradient(45deg, #f6ffed, #f0f9ff)' : '#fff', 
                              padding: 12, 
                              borderRadius: 8,
                              marginTop: 8,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                              border: message.status === 'pending' ? 
                                '1px dashed #1890ff' : 
                                message.status === 'streaming' ?
                                '1px dashed #13c2c2' :
                                (message.content?.includes('开始解析') || message.content?.includes('文档分析') || message.content?.includes('简历分析')) ?
                                '1px solid #52c41a' : 'none',
                              animation: (message.status === 'pending' || message.status === 'streaming') ? 
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
                              ) : message.status === 'streaming' ? (
                                <Space>
                                  <LoadingOutlined spin style={{ color: '#13c2c2' }} />
                                  <div style={{ 
                                    color: '#13c2c2',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                  }}>
                                    {message.content}
                                    <span style={{ 
                                      animation: 'blink 1s infinite',
                                      marginLeft: 2
                                    }}>|</span>
                                  </div>
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
                                <div>
                                  <Space>
                                    <FileTextOutlined style={{ color: '#52c41a' }} />
                                    <Text style={{ 
                                      color: message.status === 'success' ? '#52c41a' : '#333',
                                      fontWeight: message.content?.includes('开始解析') ? 'bold' : 'normal'
                                    }}>
                                      {message.content?.includes('开始解析') ? '🔍 ' : '📋 '}
                                      {message.content.length > 100 ? (
                                        <div style={{ 
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-word',
                                          maxHeight: '400px',
                                          overflowY: 'auto'
                                        }}>
                                          {message.content}
                                        </div>
                                      ) : message.content}
                                    </Text>
                                  </Space>
                                  {message.content?.includes('开始解析') && (
                                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                                      正在处理PDF文档文件，请稍候...
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          }
                        />
                      </List.Item>
                    );
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
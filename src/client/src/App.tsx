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
}

interface AgentStatus {
  isRunning: boolean;
  isConnected: boolean;
  currentAction: string;
  progress: number;
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
      setAgentStatus(prev => ({ ...prev, isConnected: false, isRunning: false }));
      addSystemMessage('与服务器断开连接');
    });

    socketService.current.on('agent_status', (status: any) => {
      setAgentStatus(prev => ({ ...prev, ...status }));
    });

    socketService.current.on('agent_message', (data: any) => {
      addMessage({
        id: Date.now().toString(),
        type: 'agent',
        content: data.message,
        timestamp: new Date(),
        status: data.status || 'success',
      });
    });

    socketService.current.on('agent_progress', (data: any) => {
      setAgentStatus(prev => ({ 
        ...prev, 
        currentAction: data.action,
        progress: data.progress 
      }));
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
      // 发送指令到 Node 服务
      socketService.current?.emit('execute_command', {
        command: inputValue,
        type: 'browser',
        autoMode,
      })
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
    setAgentStatus(prev => ({ ...prev, isRunning: false }));
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

  const getMessageIcon = (type: string) => {
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
                  <Tag color={agentStatus.isRunning ? 'success' : 'default'}>
                    {agentStatus.isRunning ? '运行中' : '空闲'}
                  </Tag>
                </div>
                
                <div>
                  <Text strong>当前操作：</Text>
                  <br />
                  <Text type="secondary">{agentStatus.currentAction}</Text>
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

                {agentStatus.isRunning && (
                  <Button 
                    danger 
                    icon={<PauseCircleOutlined />}
                    onClick={handleStopAgent}
                    block
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
                  renderItem={(message) => (
                    <List.Item
                      style={{
                        padding: '12px 0',
                        border: 'none',
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            icon={getMessageIcon(message.type)} 
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
                            background: '#fff', 
                            padding: 12, 
                            borderRadius: 8,
                            marginTop: 8,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                          }}>
                            <Text>{message.content}</Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
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
              
              <Row gutter={12}>
                <Col flex="auto">
                  <TextArea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="请输入您想要 AI 代理执行的操作，例如：帮我打开百度搜索Python教程"
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
                    disabled={!agentStatus.isConnected || !inputValue.trim()}
                    style={{ height: '100%' }}
                  >
                    发送
                  </Button>
                </Col>
              </Row>
              
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                提示：按 Enter 发送，Shift+Enter 换行
              </div>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App; 
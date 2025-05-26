#include <wx/wx.h>
#include <wx/socket.h>
#include <wx/statline.h>
#include <wx/textctrl.h>
#include <wx/spinctrl.h>
#include <wx/valnum.h>
#include <wx/process.h>
#include <wx/filename.h>
#include <wx/snglinst.h>
#include <wx/timer.h>
#include <wx/app.h>
#include <string>
#include <sstream>
#include <exception>
#include <chrono>

#ifdef __WXMSW__
#include <windows.h>
#include <tlhelp32.h>
#else
#include <signal.h>
#include <sys/types.h>
#include <unistd.h>
#endif

// 自定义事件ID
enum {
    ID_CONNECT = wxID_HIGHEST + 1,
    ID_SEND_MESSAGE,
    ID_CALCULATE,
    ID_SOCKET,
    ID_DAEMON_TIMER
};

// 进程监视器类
class NodeProcessMonitor : public wxProcess
{
public:
    NodeProcessMonitor(wxEvtHandler* parent, int id) : wxProcess(parent, id), m_id(id)
    {
        Redirect(); // 重定向Node.js进程的输出
    }
    
    virtual void OnTerminate(int pid, int status) override;
    
private:
    int m_id; // 存储ID
};

// 主应用程序类
class NodeComApp : public wxApp {
public:
    virtual bool OnInit();
    virtual int OnExit();
    
private:
    long m_nodePid; // Node.js进程的PID
    NodeProcessMonitor* m_processMonitor;
};

// 主窗口类前向声明
class MainFrame;

// 守护进程配置结构
struct DaemonConfig {
    int maxRestarts = 5;           // 最大重启次数
    int restartDelayMs = 2000;     // 重启延迟(毫秒)
    int checkIntervalMs = 5000;    // 检查间隔(毫秒)
    bool autoRestart = true;       // 是否自动重启
};

// 主窗口类
class MainFrame : public wxFrame {
public:
    MainFrame(const wxString& title);
    virtual ~MainFrame();

    // 处理Node.js进程终止事件
    void OnNodeProcessTerminated(wxProcessEvent& event);
    
    // 暴露停止Node.js服务的方法，使其可被外部调用
    void StopNodeServer();
    
    // 日志记录函数
    void LogMessage(const wxString& message);
    
    // 连接到服务器
    void Connect();
    
    // 启动Node.js服务器
    bool StartNodeServer();
    
    // 守护进程相关方法
    void StartDaemon();
    void StopDaemon();
    void OnDaemonTimer(wxTimerEvent& event);
    bool IsNodeProcessRunning();
    void RestartNodeProcess();

private:
    // UI元素
    wxStaticText *m_statusLabel;
    wxButton *m_connectBtn;
    wxTextCtrl *m_messageInput;
    wxButton *m_sendMessageBtn;
    wxStaticText *m_messageResult;
    wxSpinCtrl *m_number1;
    wxSpinCtrl *m_number2;
    wxButton *m_calculateBtn;
    wxStaticText *m_calculateResult;
    wxTextCtrl *m_logCtrl;
    wxTextCtrl *m_nodeOutputCtrl;  // 显示Node.js输出
    
    // 守护进程UI元素
    wxStaticText *m_daemonStatus;
    wxButton *m_daemonBtn;
    wxStaticText *m_restartCount;

    // 网络相关
    wxSocketClient *m_socket;
    bool m_connected;
    
    // Node.js进程相关
    long m_nodePid;
    NodeProcessMonitor* m_processMonitor;
    
    // 守护进程相关
    wxTimer* m_daemonTimer;
    DaemonConfig m_daemonConfig;
    int m_currentRestarts;
    std::chrono::steady_clock::time_point m_lastRestartTime;
    bool m_daemonActive;
    
    // 网络方法
    void Disconnect();
    void SendMessage(const wxString& message);
    void SendCalculateRequest(int a, int b);
    
    // 进程管理方法
    void CheckNodeOutput();
    
    // 事件处理函数
    void OnConnect(wxCommandEvent& event);
    void OnSendMessage(wxCommandEvent& event);
    void OnCalculate(wxCommandEvent& event);
    void OnSocketEvent(wxSocketEvent& event);
    void OnDaemonToggle(wxCommandEvent& event);
    void UpdateStatus();
    void UpdateDaemonStatus();
    void OnIdle(wxIdleEvent& event);

    wxDECLARE_EVENT_TABLE();
};

// 实现事件表
wxBEGIN_EVENT_TABLE(MainFrame, wxFrame)
    EVT_BUTTON(ID_CONNECT, MainFrame::OnConnect)
    EVT_BUTTON(ID_SEND_MESSAGE, MainFrame::OnSendMessage)
    EVT_BUTTON(ID_CALCULATE, MainFrame::OnCalculate)
    EVT_SOCKET(ID_SOCKET, MainFrame::OnSocketEvent)
    EVT_TIMER(ID_DAEMON_TIMER, MainFrame::OnDaemonTimer)
    EVT_BUTTON(wxID_ANY, MainFrame::OnDaemonToggle)
    EVT_IDLE(MainFrame::OnIdle)
    EVT_END_PROCESS(wxID_ANY, MainFrame::OnNodeProcessTerminated)
wxEND_EVENT_TABLE()

wxIMPLEMENT_APP(NodeComApp);

// 进程终止处理
void NodeProcessMonitor::OnTerminate(int pid, int status)
{
    // 将事件传递到父窗口
    try {
        wxProcessEvent event(m_id, pid, status);
        if (wxTheApp && wxTheApp->GetTopWindow() && wxTheApp->GetTopWindow()->GetEventHandler()) {
            wxTheApp->GetTopWindow()->GetEventHandler()->ProcessEvent(event);
        }
    } catch (...) {
        // 捕获所有异常，防止崩溃
        wxLogError("处理进程终止事件时发生异常");
    }
    
    delete this;
}

// 应用程序初始化
bool NodeComApp::OnInit() {
    // 初始化wxWidgets网络功能
    wxSocketBase::Initialize();

    // 创建主窗口
    MainFrame *frame = new MainFrame("C++与Node.js通信 - 守护进程版");
    frame->Show(true);
    
    return true;
}

// 应用程序退出
int NodeComApp::OnExit() {
    // 尝试杀死可能残留的Node.js进程
    if (wxTheApp && wxTheApp->GetTopWindow()) {
        MainFrame* frame = dynamic_cast<MainFrame*>(wxTheApp->GetTopWindow());
        if (frame) {
            frame->StopDaemon();
            frame->StopNodeServer();
        }
    }
    
    return wxApp::OnExit();
}

// 主窗口构造函数
MainFrame::MainFrame(const wxString& title)
    : wxFrame(NULL, wxID_ANY, title, wxDefaultPosition, wxSize(800, 800)),
      m_connected(false),
      m_nodePid(0),
      m_socket(nullptr),
      m_processMonitor(nullptr),
      m_daemonTimer(nullptr),
      m_currentRestarts(0),
      m_daemonActive(false)
{
    // 创建主面板和垂直布局
    wxPanel *panel = new wxPanel(this, wxID_ANY);
    wxBoxSizer *mainSizer = new wxBoxSizer(wxVERTICAL);

    // 守护进程控制区域
    wxStaticBox *daemonBox = new wxStaticBox(panel, wxID_ANY, "Node.js进程守护");
    wxStaticBoxSizer *daemonSizer = new wxStaticBoxSizer(daemonBox, wxVERTICAL);
    
    wxBoxSizer *daemonControlSizer = new wxBoxSizer(wxHORIZONTAL);
    m_daemonStatus = new wxStaticText(panel, wxID_ANY, "守护进程: 未启动");
    m_daemonBtn = new wxButton(panel, wxID_ANY, "启动守护");
    m_restartCount = new wxStaticText(panel, wxID_ANY, "重启次数: 0/5");
    
    daemonControlSizer->Add(m_daemonStatus, 0, wxALL | wxALIGN_CENTER_VERTICAL, 5);
    daemonControlSizer->AddStretchSpacer();
    daemonControlSizer->Add(m_restartCount, 0, wxALL | wxALIGN_CENTER_VERTICAL, 5);
    daemonControlSizer->Add(m_daemonBtn, 0, wxALL, 5);
    
    daemonSizer->Add(daemonControlSizer, 0, wxEXPAND);

    // 连接区域
    wxStaticBox *connectionBox = new wxStaticBox(panel, wxID_ANY, "服务器连接");
    wxStaticBoxSizer *connectionSizer = new wxStaticBoxSizer(connectionBox, wxHORIZONTAL);
    
    wxStaticText *stateLabel = new wxStaticText(panel, wxID_ANY, "状态: ");
    m_statusLabel = new wxStaticText(panel, wxID_ANY, "未连接");
    m_connectBtn = new wxButton(panel, ID_CONNECT, "连接服务器");

    connectionSizer->Add(stateLabel, 0, wxALL | wxALIGN_CENTER_VERTICAL, 5);
    connectionSizer->Add(m_statusLabel, 0, wxALL | wxALIGN_CENTER_VERTICAL, 5);
    connectionSizer->AddStretchSpacer();
    connectionSizer->Add(m_connectBtn, 0, wxALL, 5);

    // 消息发送区域
    wxStaticBox *messageBox = new wxStaticBox(panel, wxID_ANY, "发送消息到Node.js");
    wxStaticBoxSizer *messageSizer = new wxStaticBoxSizer(messageBox, wxVERTICAL);
    
    wxBoxSizer *inputSizer = new wxBoxSizer(wxHORIZONTAL);
    m_messageInput = new wxTextCtrl(panel, wxID_ANY, wxEmptyString);
    m_sendMessageBtn = new wxButton(panel, ID_SEND_MESSAGE, "发送消息");
    
    inputSizer->Add(m_messageInput, 1, wxALL | wxEXPAND, 5);
    inputSizer->Add(m_sendMessageBtn, 0, wxALL, 5);
    
    m_messageResult = new wxStaticText(panel, wxID_ANY, wxEmptyString);
    
    messageSizer->Add(inputSizer, 0, wxEXPAND);
    messageSizer->Add(m_messageResult, 0, wxALL | wxEXPAND, 5);

    // 计算请求区域
    wxStaticBox *calcBox = new wxStaticBox(panel, wxID_ANY, "调用Node.js计算");
    wxStaticBoxSizer *calcSizer = new wxStaticBoxSizer(calcBox, wxVERTICAL);
    
    wxBoxSizer *calcInputSizer = new wxBoxSizer(wxHORIZONTAL);
    m_number1 = new wxSpinCtrl(panel, wxID_ANY, "10", wxDefaultPosition, wxDefaultSize, 
                               wxSP_ARROW_KEYS, -100, 1000, 10);
    wxStaticText *plusLabel = new wxStaticText(panel, wxID_ANY, " + ");
    m_number2 = new wxSpinCtrl(panel, wxID_ANY, "20", wxDefaultPosition, wxDefaultSize, 
                               wxSP_ARROW_KEYS, -100, 1000, 20);
    m_calculateBtn = new wxButton(panel, ID_CALCULATE, "计算");
    
    calcInputSizer->Add(m_number1, 0, wxALL | wxALIGN_CENTER_VERTICAL, 5);
    calcInputSizer->Add(plusLabel, 0, wxALL | wxALIGN_CENTER_VERTICAL, 5);
    calcInputSizer->Add(m_number2, 0, wxALL | wxALIGN_CENTER_VERTICAL, 5);
    calcInputSizer->Add(m_calculateBtn, 0, wxALL, 5);
    
    m_calculateResult = new wxStaticText(panel, wxID_ANY, wxEmptyString);
    
    calcSizer->Add(calcInputSizer, 0, wxEXPAND);
    calcSizer->Add(m_calculateResult, 0, wxALL | wxEXPAND, 5);

    // Node.js输出区域
    wxStaticBox *nodeOutputBox = new wxStaticBox(panel, wxID_ANY, "Node.js服务输出");
    wxStaticBoxSizer *nodeOutputSizer = new wxStaticBoxSizer(nodeOutputBox, wxVERTICAL);
    
    m_nodeOutputCtrl = new wxTextCtrl(panel, wxID_ANY, wxEmptyString,
                                     wxDefaultPosition, wxDefaultSize,
                                     wxTE_MULTILINE | wxTE_READONLY | wxTE_RICH2);
    
    nodeOutputSizer->Add(m_nodeOutputCtrl, 1, wxALL | wxEXPAND, 5);

    // 日志区域
    wxStaticBox *logBox = new wxStaticBox(panel, wxID_ANY, "通信日志");
    wxStaticBoxSizer *logSizer = new wxStaticBoxSizer(logBox, wxVERTICAL);
    
    m_logCtrl = new wxTextCtrl(panel, wxID_ANY, wxEmptyString, 
                              wxDefaultPosition, wxDefaultSize,
                              wxTE_MULTILINE | wxTE_READONLY | wxTE_AUTO_URL);
    
    logSizer->Add(m_logCtrl, 1, wxALL | wxEXPAND, 5);

    // 添加所有区域到主布局
    mainSizer->Add(daemonSizer, 0, wxALL | wxEXPAND, 10);
    mainSizer->Add(connectionSizer, 0, wxALL | wxEXPAND, 10);
    mainSizer->Add(messageSizer, 0, wxALL | wxEXPAND, 10);
    mainSizer->Add(calcSizer, 0, wxALL | wxEXPAND, 10);
    
    // 创建一个水平分割器，左侧放Node.js输出，右侧放通信日志
    wxBoxSizer* bottomSizer = new wxBoxSizer(wxHORIZONTAL);
    bottomSizer->Add(nodeOutputSizer, 1, wxEXPAND | wxRIGHT, 5);
    bottomSizer->Add(logSizer, 1, wxEXPAND | wxLEFT, 5);
    
    mainSizer->Add(bottomSizer, 1, wxALL | wxEXPAND, 10);

    panel->SetSizer(mainSizer);
    mainSizer->Fit(this);
    mainSizer->SetSizeHints(this);

    try {
        // 创建socket
        m_socket = new wxSocketClient();
        m_socket->SetEventHandler(*this, ID_SOCKET);
        m_socket->SetNotify(wxSOCKET_CONNECTION_FLAG | wxSOCKET_INPUT_FLAG | 
                        wxSOCKET_LOST_FLAG);
        m_socket->Notify(true);
        
        // 初始化守护进程定时器
        m_daemonTimer = new wxTimer(this, ID_DAEMON_TIMER);
        
        LogMessage("应用程序已启动，守护进程功能已就绪");
        
        // 初始化UI状态
        UpdateStatus();
        UpdateDaemonStatus();
        
        // 设置初始焦点
        m_daemonBtn->SetFocus();
        
        // 居中显示窗口
        Centre();
        
    } catch (const std::exception& e) {
        LogMessage(wxString::Format("初始化错误: %s", e.what()));
        wxMessageBox(wxString::Format("初始化错误: %s", e.what()), "错误", wxICON_ERROR);
    } catch (...) {
        LogMessage("初始化过程中发生未知异常");
        wxMessageBox("初始化过程中发生未知异常", "错误", wxICON_ERROR);
    }
}

MainFrame::~MainFrame()
{
    // 停止守护进程
    try {
        StopDaemon();
    } catch (...) {
        // 忽略清理过程中的错误
    }
    
    // 断开socket连接
    try {
        if (m_socket && m_socket->IsConnected()) {
            LogMessage("应用程序关闭时断开连接");
            m_socket->Close();
        }
        delete m_socket;
        m_socket = nullptr;
    } catch (...) {
        // 忽略清理过程中的错误
    }
    
    // 关闭Node.js服务
    try {
        StopNodeServer();
    } catch (...) {
        // 忽略清理过程中的错误
    }
    
    // 清理定时器
    if (m_daemonTimer) {
        delete m_daemonTimer;
        m_daemonTimer = nullptr;
    }
}

bool MainFrame::StartNodeServer()
{
    LogMessage("正在启动Node.js服务...");
    
    try {
        // 确保没有现有的进程在运行
        StopNodeServer();
        
        // 获取当前工作目录和脚本路径
        wxString currentDir = wxFileName::GetCwd();
        wxString scriptPath = currentDir + "/dist2/server.js";
        
        // 检查脚本文件是否存在
        if (!wxFileExists(scriptPath)) {
            LogMessage("错误: Node.js脚本文件不存在: " + scriptPath);
            return false;
        }
        
        LogMessage("找到脚本文件: " + scriptPath);
        
        // 使用最简单的方式运行Node.js
        wxString command = wxString("node \"") + scriptPath + "\"";
        
#ifdef __WXMSW__ // Windows
        // Windows - 使用异步执行
        STARTUPINFO si;
        PROCESS_INFORMATION pi;
        ZeroMemory(&si, sizeof(si));
        si.cb = sizeof(si);
        ZeroMemory(&pi, sizeof(pi));
        
        if (!CreateProcess(NULL, (LPWSTR)command.wc_str(), NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
            LogMessage("创建进程失败");
            return false;
        }
        
        m_nodePid = pi.dwProcessId;
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
#else // macOS 和 Linux
        // 使用wxExecute异步执行，获取实际PID
        m_nodePid = wxExecute(command, wxEXEC_ASYNC);
        if (m_nodePid <= 0) {
            LogMessage("启动Node.js进程失败");
            return false;
        }
#endif
        
        LogMessage(wxString::Format("Node.js服务已启动，PID: %ld", m_nodePid));
        wxSleep(1); // 简单等待1秒让服务启动
        
        return true;
    } catch (const std::exception& e) {
        LogMessage(wxString::Format("启动Node.js服务失败: %s", e.what()));
        return false;
    } catch (...) {
        LogMessage("启动Node.js服务时发生未知异常");
        return false;
    }
}

void MainFrame::StopNodeServer()
{
    try {
        if (m_nodePid <= 0) {
            LogMessage("没有Node.js服务在运行");
            return;
        }
        
        LogMessage(wxString::Format("正在停止Node.js服务 (PID: %ld)...", m_nodePid));
        
#ifdef __WXMSW__ // Windows
        // 在Windows上使用TerminateProcess
        HANDLE process = OpenProcess(PROCESS_TERMINATE, FALSE, m_nodePid);
        if (process != NULL) {
            TerminateProcess(process, 0);
            CloseHandle(process);
            LogMessage("Node.js进程已终止");
        } else {
            LogMessage("无法打开Node.js进程进行终止");
        }
#else // macOS 和 Linux
        // 在Unix系统上使用kill信号
        if (kill(m_nodePid, SIGTERM) == 0) {
            LogMessage("已发送终止信号到Node.js进程");
            wxSleep(1); // 等待优雅关闭
            
            // 如果进程还在运行，使用SIGKILL强制终止
            if (kill(m_nodePid, 0) == 0) {
                kill(m_nodePid, SIGKILL);
                LogMessage("已强制终止Node.js进程");
            }
        } else {
            LogMessage("Node.js进程可能已经不存在");
        }
#endif
        
        m_nodePid = 0;
        LogMessage("Node.js服务已停止");
    } catch (const std::exception& e) {
        LogMessage(wxString::Format("停止Node.js服务时发生错误: %s", e.what()));
    } catch (...) {
        LogMessage("停止Node.js服务时发生未知错误");
    }
}

void MainFrame::OnNodeProcessTerminated(wxProcessEvent& event)
{
    int pid = event.GetPid();
    int status = event.GetExitCode();
    
    LogMessage(wxString::Format("Node.js服务已终止 (PID: %d, 状态: %d)", (int)pid, (int)status));
    
    if (pid == m_nodePid) {
        m_nodePid = 0;
        
        // 如果守护进程在运行，它会自动重启
        if (m_daemonActive) {
            LogMessage("守护进程检测到进程终止，将自动重启");
        }
    }
}

void MainFrame::CheckNodeOutput()
{
    // 简化版本，不进行输出检查
}

void MainFrame::OnIdle(wxIdleEvent& event)
{
    // 简化版本，减少空闲处理
    event.RequestMore();
}

void MainFrame::UpdateStatus() {
    if (m_connected) {
        m_statusLabel->SetLabel("已连接");
        m_connectBtn->SetLabel("断开连接");
        m_messageInput->Enable(true);
        m_sendMessageBtn->Enable(true);
        m_number1->Enable(true);
        m_number2->Enable(true);
        m_calculateBtn->Enable(true);
    } else {
        m_statusLabel->SetLabel("未连接");
        m_connectBtn->SetLabel("连接服务器");
        m_messageInput->Enable(false);
        m_sendMessageBtn->Enable(false);
        m_number1->Enable(false);
        m_number2->Enable(false);
        m_calculateBtn->Enable(false);
        
        // 清空结果
        m_messageResult->SetLabel(wxEmptyString);
        m_calculateResult->SetLabel(wxEmptyString);
    }
}

void MainFrame::LogMessage(const wxString& message) {
    wxDateTime now = wxDateTime::Now();
    wxString timestamp = now.Format("[%Y-%m-%d %H:%M:%S] ");
    m_logCtrl->AppendText(timestamp + message + "\n");
}

void MainFrame::Connect() {
    LogMessage("正在连接到服务器...");
    
    if (m_socket == nullptr) {
        m_socket = new wxSocketClient();
        m_socket->SetEventHandler(*this, ID_SOCKET);
        m_socket->SetNotify(wxSOCKET_CONNECTION_FLAG | wxSOCKET_INPUT_FLAG | wxSOCKET_LOST_FLAG);
        m_socket->Notify(true);
    }
    
    // 如果守护进程没有运行且没有Node.js进程，启动守护进程
    if (!m_daemonActive && m_nodePid <= 0) {
        LogMessage("启动守护进程以确保Node.js服务可用");
        StartDaemon();
        wxSleep(3); // 给守护进程启动的时间
    }
    
    // 如果已经连接，先断开
    if (m_socket->IsConnected()) {
        m_socket->Close();
    }
    
    // 连接到服务器
    wxIPV4address addr;
    addr.Hostname("localhost");
    addr.Service(8888);
    
    m_socket->Connect(addr, false);
    LogMessage("连接请求已发送，等待响应...");
}

void MainFrame::Disconnect() {
    if (m_socket && m_socket->IsConnected()) {
        m_socket->Close();
    }
    m_connected = false;
    UpdateStatus();
    LogMessage("已断开与服务器的连接");
}

void MainFrame::SendMessage(const wxString& message) {
    if (!m_connected) {
        wxMessageBox("未连接到服务器", "错误", wxICON_ERROR);
        return;
    }
    
    // 构建JSON请求
    std::ostringstream oss;
    oss << "{\"type\":\"message\",\"content\":\"" << message.ToStdString() 
        << "\",\"requestId\":\"" << wxDateTime::Now().GetTicks() << "\"}";
    std::string jsonRequest = oss.str();
    
    LogMessage("发送请求: " + jsonRequest);
    
    // 发送数据
    m_socket->Write(jsonRequest.c_str(), jsonRequest.length());
    if (m_socket->Error()) {
        LogMessage("发送失败");
    }
}

void MainFrame::SendCalculateRequest(int a, int b) {
    if (!m_connected) {
        wxMessageBox("未连接到服务器", "错误", wxICON_ERROR);
        return;
    }
    
    // 构建JSON请求
    std::ostringstream oss;
    oss << "{\"type\":\"calculate\",\"a\":" << a << ",\"b\":" << b 
        << ",\"requestId\":\"" << wxDateTime::Now().GetTicks() << "\"}";
    std::string jsonRequest = oss.str();
    
    LogMessage("发送请求: " + jsonRequest);
    
    // 发送数据
    m_socket->Write(jsonRequest.c_str(), jsonRequest.length());
    if (m_socket->Error()) {
        LogMessage("发送失败");
    }
}

void MainFrame::OnConnect(wxCommandEvent& event) {
    if (!m_connected) {
        Connect();
    } else {
        Disconnect();
    }
}

void MainFrame::OnSendMessage(wxCommandEvent& event) {
    wxString message = m_messageInput->GetValue().Trim();
    if (message.IsEmpty()) {
        wxMessageBox("请输入消息内容", "错误", wxICON_WARNING);
        return;
    }
    
    SendMessage(message);
}

void MainFrame::OnCalculate(wxCommandEvent& event) {
    int a = m_number1->GetValue();
    int b = m_number2->GetValue();
    
    SendCalculateRequest(a, b);
}

void MainFrame::OnSocketEvent(wxSocketEvent& event) {
    switch(event.GetSocketEvent()) {
        case wxSOCKET_CONNECTION: {
            m_connected = true;
            UpdateStatus();
            LogMessage("已连接到服务器");
            break;
        }
        
        case wxSOCKET_INPUT: {
            // 读取数据
            char buffer[4096] = {0};
            m_socket->Read(buffer, sizeof(buffer) - 1);
            
            if (!m_socket->Error()) {
                wxString response(buffer, wxConvUTF8);
                LogMessage("收到响应: " + response);
                
                // 解析JSON响应 (简单解析，实际应用中应该使用JSON库)
                try {
                    if (response.Contains("\"type\":\"messageResult\"")) {
                        wxString content;
                        size_t start = response.find("\"content\":\"") + 11;
                        size_t end = response.find("\"", start);
                        if (start != wxString::npos && end != wxString::npos && end > start) {
                            content = response.substr(start, end - start);
                            m_messageResult->SetLabel("响应: " + content);
                        }
                    } else if (response.Contains("\"type\":\"calculateResult\"")) {
                        int result = 0;
                        size_t start = response.find("\"result\":") + 9;
                        size_t end = response.find(",", start);
                        if (end == wxString::npos) end = response.find("}", start);
                        if (start != wxString::npos && end != wxString::npos && end > start) {
                            wxString resultStr = response.substr(start, end - start);
                            long val;
                            if (resultStr.ToLong(&val)) {
                                result = (int)val;
                                int a = m_number1->GetValue();
                                int b = m_number2->GetValue();
                                m_calculateResult->SetLabel(wxString::Format("计算结果: %d + %d = %d", (int)a, (int)b, (int)result));
                            }
                        }
                    } else if (response.Contains("\"type\":\"error\"")) {
                        wxString message;
                        size_t start = response.find("\"message\":\"") + 11;
                        size_t end = response.find("\"", start);
                        if (start != wxString::npos && end != wxString::npos && end > start) {
                            message = response.substr(start, end - start);
                            LogMessage("服务器错误: " + message);
                        }
                    }
                } catch (...) {
                    LogMessage("解析服务器响应时发生错误");
                }
            } else {
                LogMessage("读取数据时发生错误");
            }
            break;
        }
        
        case wxSOCKET_LOST: {
            m_connected = false;
            UpdateStatus();
            LogMessage("连接已断开");
            break;
        }
        
        default:
            break;
    }
}

// 守护进程方法实现
void MainFrame::StartDaemon()
{
    if (m_daemonActive) {
        LogMessage("守护进程已经在运行");
        return;
    }
    
    LogMessage("启动Node.js进程守护");
    m_daemonActive = true;
    m_currentRestarts = 0;
    
    // 首次启动Node.js服务
    if (!StartNodeServer()) {
        LogMessage("初始启动Node.js服务失败，守护进程将继续尝试重启");
    }
    
    // 启动定时器
    m_daemonTimer->Start(m_daemonConfig.checkIntervalMs);
    
    UpdateDaemonStatus();
    LogMessage(wxString::Format("守护进程已启动，检查间隔: %d秒", m_daemonConfig.checkIntervalMs / 1000));
}

void MainFrame::StopDaemon()
{
    if (!m_daemonActive) {
        return;
    }
    
    LogMessage("停止Node.js进程守护");
    m_daemonActive = false;
    
    if (m_daemonTimer && m_daemonTimer->IsRunning()) {
        m_daemonTimer->Stop();
    }
    
    StopNodeServer();
    UpdateDaemonStatus();
}

void MainFrame::OnDaemonTimer(wxTimerEvent& event)
{
    if (!m_daemonActive) {
        return;
    }
    
    // 检查Node.js进程是否还在运行
    if (!IsNodeProcessRunning()) {
        LogMessage("检测到Node.js进程已停止");
        
        if (m_currentRestarts < m_daemonConfig.maxRestarts) {
            // 检查是否需要延迟重启
            auto now = std::chrono::steady_clock::now();
            auto timeSinceLastRestart = std::chrono::duration_cast<std::chrono::milliseconds>(
                now - m_lastRestartTime).count();
            
            if (timeSinceLastRestart >= m_daemonConfig.restartDelayMs) {
                RestartNodeProcess();
            } else {
                LogMessage(wxString::Format("等待重启延迟 (%d毫秒)...", 
                    m_daemonConfig.restartDelayMs - (int)timeSinceLastRestart));
            }
        } else {
            LogMessage(wxString::Format("已达到最大重启次数 (%d)，停止自动重启", m_daemonConfig.maxRestarts));
            StopDaemon();
        }
    }
    
    UpdateDaemonStatus();
}

bool MainFrame::IsNodeProcessRunning()
{
    if (m_nodePid <= 0) {
        return false;
    }
    
#ifdef __WXMSW__ // Windows
    HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, m_nodePid);
    if (process == NULL) {
        return false;
    }
    
    DWORD exitCode;
    BOOL result = GetExitCodeProcess(process, &exitCode);
    CloseHandle(process);
    
    return result && exitCode == STILL_ACTIVE;
#else // macOS 和 Linux
    // 使用kill(pid, 0)检查进程是否存在
    return kill(m_nodePid, 0) == 0;
#endif
}

void MainFrame::RestartNodeProcess()
{
    LogMessage(wxString::Format("尝试重启Node.js进程 (第%d次)", m_currentRestarts + 1));
    
    // 先确保停止旧进程
    StopNodeServer();
    wxSleep(1);
    
    // 尝试启动新进程
    if (StartNodeServer()) {
        m_currentRestarts++;
        m_lastRestartTime = std::chrono::steady_clock::now();
        LogMessage(wxString::Format("Node.js进程重启成功 (总计重启%d次)", m_currentRestarts));
        
        // 重置重试计数器如果重启成功
        // 在一定时间后重置计数器，允许长期运行
        CallAfter([this]() {
            // 30秒后重置计数器 - 使用定时器而不是阻塞线程
            wxTimer* resetTimer = new wxTimer();
            resetTimer->Bind(wxEVT_TIMER, [this, resetTimer](wxTimerEvent&) {
                if (IsNodeProcessRunning()) {
                    // m_currentRestarts = 0; // 可选：重置计数器
                    LogMessage("Node.js进程运行稳定，守护进程继续监控");
                }
                delete resetTimer;
            });
            resetTimer->StartOnce(30000); // 30秒
        });
    } else {
        LogMessage("Node.js进程重启失败");
    }
}

void MainFrame::OnDaemonToggle(wxCommandEvent& event)
{
    if (event.GetEventObject() == m_daemonBtn) {
        if (m_daemonActive) {
            StopDaemon();
        } else {
            StartDaemon();
        }
    } else {
        event.Skip();
    }
}

void MainFrame::UpdateDaemonStatus()
{
    if (m_daemonActive) {
        m_daemonStatus->SetLabel("守护进程: 运行中");
        m_daemonBtn->SetLabel("停止守护");
    } else {
        m_daemonStatus->SetLabel("守护进程: 未启动");
        m_daemonBtn->SetLabel("启动守护");
    }
    
    m_restartCount->SetLabel(wxString::Format("重启次数: %d/%d", 
        m_currentRestarts, m_daemonConfig.maxRestarts));
} 
import axios from 'axios';

const DEEPSEEK_API_KEY = '40510637-b0b7-4106-a372-acf2983ad03c'; // 替换为实际Key
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'; // 确认实际API地址

async function *callDeepSeek(prompt: string) {
  try {
    const response = await axios.post(API_URL, {
      model: "deepseek-v3-250324", // 指定模型
      messages: [
        { role: "user", content: prompt }
      ],
      stream: true,
      // temperature: 0.7, // 控制生成随机性
      // max_tokens: 2000
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: 'stream' // 关键：指定响应类型为流
    });

    // 处理流式响应
    const stream = response.data;
    let buffer = '';
    
    for await (const chunk of stream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留不完整的行
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            return; // 流结束
          }
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            // 解析失败，跳过这行
            continue;
          }
        }
      }
    }
  } catch (error: any) {
    console.error('API调用失败:', error.response?.data || error?.message);
    throw error;
  }
}

// 兼容性：提供非流式版本
export async function callDeepSeekSync(prompt: string): Promise<string> {
  try {
    const response = await axios.post(API_URL, {
      model: "deepseek-v3-250324",
      messages: [
        { role: "user", content: prompt }
      ],
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error('API调用失败:', error.response?.data || error?.message);
    throw error;
  }
}

export default callDeepSeek;
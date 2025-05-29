const axios = require('axios');

const DEEPSEEK_API_KEY = '40510637-b0b7-4106-a372-acf2983ad03c'; // 替换为实际Key
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'; // 确认实际API地址

async function callDeepSeek(prompt: string) {
  try {
    const response = await axios.post(API_URL, {
      model: "deepseek-v3-250324", // 指定模型
      messages: [
        { role: "user", content: prompt }
      ],
      // temperature: 0.7, // 控制生成随机性
      // max_tokens: 2000
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
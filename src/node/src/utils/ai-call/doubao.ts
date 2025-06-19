import axios from 'axios';

const DEEPSEEK_API_KEY = '40510637-b0b7-4106-a372-acf2983ad03c'; // 替换为实际Key
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'; // 确认实际API地址

export async function *callDoubao(input: {
  prompt?: string, imageUrl: string
}) {
  try {
    const response = await axios.post(API_URL, {
      model: "doubao-1-5-thinking-vision-pro-250428", // 指定模型
      messages: [
        {
          "content": [
            {
              "text": "图片完整内容?",
              "type": "text"
            },
            {
              "image_url": {
                // "url": "https://ark-project.tos-cn-beijing.ivolces.com/images/view.jpeg"
                "url": input.imageUrl
                // url: 'iVBORw0KGgoAAAANSUhEUgAACwkAAAWMCAYAAADf9SuYAAwpCElEQVR4AezhUXbc2KEA2UaA6vmP7332MHpd5YmXJC1VlS1AVQeGkcnE3v7//t8aA/7vBgUjGMH/Dfh+gxswghtwGzAGjKBgBAnFT8VPjShZZUBMa2EPizUKKmtGEPMW9hqsUVHZYjwtmVfxqpbYtCzyqIpdjIdVsSVji8qsii3GoVS+qoXjqGxRNimHKSimGU9LQM5THEbZZuySzBKQmFWxh8ppkj3eYpNymIgjqWwx5sVzk1UKyipjlzEG80TlWS1xOUPsEBDTFGTaglz+OQN5TQpy+ccCY5Ny+ZXBYRSUwxinKuYZz8pA5qlsqdhSsUXlKG+IPCblcQXEpoqj3GQXlVkC8riUacqxBpsqjqJyJmVTsUq2KZcVb4PTFE9rAWSdsqk4TQTEGpUtC/KoKh6VgMisimclIMdZFjlLcTlEQKxRUVljPK2KLSpbFl6XcRp…D8m7I0gTg3YkvZUrbGYKkJxbGByJqyFT/YUT6W8ccBA/nnUj6WnJtAcuwV39aXXCPHBAbfk4Gcm7zJsRGPKS5RzsUlAnKuBjvKJco/UyDnSu41+FSDPeUS5THFbQqKLeVYcckYrAWyVtxscKq4lbI1uE/xKOUS5TYC8owCJrdRtsbgksFaQfEY5WMplxTHBOQ5yrHi+woG9ykepSwVv6QsGR+ruJVyrPglZUlAuc2cbI04loDcRrmNgbGlLBVbxSXKlnIs9oqtV1yibClLBcUx5TbFZcrSEGRtTn5bY8ip4lZyn+KS4pIfP3hMseXkkjm5lfKZArmP8rGKWylbL1kq/jikPKa4REFZGrFVLAUkxwTkjzsUW3If5aMpS8XWiNsUlyl//I3h4FMVW8pWsSTwio9VbBmPmZMtZevF4FRAsqX8m/IX5S8NcPAmClNQyIEDvgAFXi8QcKDgDxgD/jcWeKmo10t/WgAAAABJRU5ErkJggg=='
              },
              "type": "image_url"
            }
          ],
          "role": "user"
        }
      ],
      // stream: true,
      // temperature: 0.7, // 控制生成随机性
      // max_tokens: 2000
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      // responseType: 'stream' // 关键：指定响应类型为流
    });

    // 处理流式响应
    const stream = response.data;
    let buffer = '';
    
    // for await (const chunk of stream) {
    //   buffer += chunk.toString();
    //   const lines = buffer.split('\n');
    //   buffer = lines.pop() || ''; // 保留不完整的行
      
    //   for (const line of lines) {
    //     if (line.trim() === '') continue;
    //     if (line.startsWith('data: ')) {
    //       const data = line.slice(6).trim();
    //       if (data === '[DONE]') {
    //         return; // 流结束
    //       }
          
    //       try {
    //         const parsed = JSON.parse(data);
    //         const content = parsed.choices?.[0]?.delta?.content;
    //         if (content) {
    //           yield content;
    //         }
    //       } catch (e) {
    //         // 解析失败，跳过这行
    //         continue;
    //       }
    //     }
    //   }
    // }
  } catch (error: any) {
    console.error('API调用失败:', error.response?.data || error?.message);
    throw error;
  }
}
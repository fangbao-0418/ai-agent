import { parentPort, workerData } from 'worker_threads';
import callDeepSeek from "../../utils/ai-call/deepseek";
import * as fs from 'fs';
import * as path from 'path';
const pdf = require('pdf-parse/lib/pdf-parse.js');

// 定义简历信息接口
interface ResumeInfo {
  fileName: string;
  content: string;
  extractedAt: Date;
}

// 定义Worker数据接口
interface WorkerData {
  downloadDir: string;
  sessionId: string;
}

// PDF文本提取函数
async function extractPdfText(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`PDF解析失败 [${filePath}]: ${(error as Error).message}`);
  }
}

// 读取downloads目录下的所有简历文件
async function readAllResumes(downloadsPath: string): Promise<ResumeInfo[]> {
  if (!downloadsPath) {
    throw new Error('下载目录未配置');
  }
  
  try {
    const files = fs.readdirSync(downloadsPath);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    console.log(`发现 ${pdfFiles.length} 份PDF简历文件`);
    
    if (pdfFiles.length === 0) {
      console.log(`提示：请将PDF简历文件放置到 ${downloadsPath} 目录下`);
      return [];
    }
    
    const resumes: ResumeInfo[] = [];
    
    for (const file of pdfFiles) {
      const filePath = path.join(downloadsPath, file);
      try {
        console.log(`正在解析: ${file}`);
        const content = await extractPdfText(filePath);
        
        resumes.push({
          fileName: file,
          content: content.trim(),
          extractedAt: new Date()
        });
        
        console.log(`✓ 成功解析: ${file} (${content.length} 字符)`);
      } catch (error) {
        console.error(`✗ 解析失败: ${file} - ${(error as Error).message}`);
      }
    }
    
    return resumes;
  } catch (error) {
    throw new Error(`读取简历目录失败: ${(error as Error).message}`);
  }
}

// 组装分析prompt
function buildAnalysisPrompt(resumes: ResumeInfo[]): string {
  const resumeTexts = resumes.map((resume, index) => {
    return `
=== 简历 ${index + 1}: ${resume.fileName} ===
${resume.content}
============================================
`;
  }).join('\n');

  const prompt = `
你是一名专业的HR和人力资源分析师。请仔细分析以下${resumes.length}份简历，并提供详细的评估报告。

${resumeTexts}

请按照以下格式分析每份简历：

## 简历分析报告

### 整体概览
- 候选人总数：${resumes.length}人
- 分析完成时间：${new Date().toLocaleString('zh-CN')}

### 个人简历详细分析

请对每份简历进行如下维度的分析：

**1. 基本信息提取**
- 姓名：
- 联系方式：
- 工作年限：
- 期望职位：
- 优势
- 劣势


**4. 核心竞争力**
- 专业技能：
- 项目经验：
- 特殊优势：

**5. 综合评分**
- 技术能力：（1-10分）
- 工作经验：（1-10分）
- 学习能力：（1-10分）
- 综合评分：（1-10分）

### 候选人排序推荐

请根据综合评估对候选人进行排序，并说明推荐理由：

1. **最推荐候选人**：
   - 姓名：
   - 推荐理由：
   - 适合职位：

2. **次选候选人**：
   - 姓名：
   - 推荐理由：
   - 适合职位：

3. **第三选择**：
   - 姓名：
   - 推荐理由：
   - 适合职位：

### 招聘建议

**面试重点关注问题：**
- 针对每位候选人需要重点了解的问题

**薪资参考范围：**
- 根据候选人背景给出合理的薪资建议

**注意事项：**
- 需要特别关注或验证的信息

请提供专业、客观、详细的分析，确保评估的准确性和实用性。
`;

  return prompt;
}

// 删除会话文件
function clearSessionFiles(downloadsPath: string, sessionId: string): void {
  if (sessionId && downloadsPath && fs.existsSync(downloadsPath)) {
    try {
      const files = fs.readdirSync(downloadsPath);
      console.log(`清理会话 ${sessionId} 中的 ${files.length} 个文件`);
      
      files.forEach(file => {
        const filePath = path.join(downloadsPath, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`✓ 删除文件: ${file}`);
        } catch (error) {
          console.error(`✗ 删除文件失败: ${file} - ${(error as Error).message}`);
        }
      });
      
      console.log('会话文件清理完成');
    } catch (error) {
      console.error('清理会话文件时发生错误:', (error as Error).message);
    }
  }
}

// 主要的简历解析函数
async function parseProfilesWorker(data: WorkerData): Promise<string> {
  try {
    console.log('Worker开始解析简历文件...');
    
    // 1. 读取所有简历
    const resumes = await readAllResumes(data.downloadDir);
    
    if (resumes.length === 0) {
      throw new Error('未找到任何简历文件，请确保目录下有PDF简历文件');
    }
    
    console.log(`成功读取 ${resumes.length} 份简历，开始AI分析...`);
    
    // 2. 组装prompt
    const analysisPrompt = buildAnalysisPrompt(resumes);
    
    // 3. 调用DeepSeek进行分析
    console.log('正在调用AI进行简历分析...');
    const analysisResult = await callDeepSeek(analysisPrompt);
    
    // 4. 清理会话文件
    clearSessionFiles(data.downloadDir, data.sessionId);
    
    return analysisResult;
  } catch (error) {
    console.error('简历解析过程中发生错误:', (error as Error).message);
    // 即使出错也要清理会话文件
    clearSessionFiles(data.downloadDir, data.sessionId);
    throw error;
  }
}

// Worker主逻辑
if (parentPort) {
  parentPort.on('message', async (data: WorkerData) => {
    try {
      const result = await parseProfilesWorker(data);
      parentPort!.postMessage({ success: true, data: result });
    } catch (error) {
      parentPort!.postMessage({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  });
}

export default parseProfilesWorker; 
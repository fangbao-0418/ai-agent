import { parentPort, workerData } from 'worker_threads';
import callDeepSeek, { callDeepSeekSync } from "../../utils/ai-call/deepseek";
import * as fs from 'fs';
import * as path from 'path';
import globalData from '../../global';
const pdf = require('pdf-parse/lib/pdf-parse.js');

/**
 * 智能文档分析Worker
 * 
 * 功能说明：
 * 1. 根据用户提示词判断分析类型（简历分析 vs 自定义分析）
 * 2. 简历分析：使用预设的HR分析模板进行专业简历分析
 * 3. 自定义分析：使用用户提供的提示词进行个性化分析
 * 
 * 判断逻辑：
 * - 如果用户提示词包含简历相关关键词：使用简历分析模板
 * - 如果用户提示词为空或包含其他内容：使用自定义分析
 * - 如果没有提示词：默认使用简历分析模板
 */

// 定义文档信息接口
interface DocumentInfo {
  fileName: string;
  content: string;
  extractedAt: Date;
}

// 定义Worker数据接口
interface WorkerData {
  downloadDir: string;
  sessionId: string;
  userPrompt?: string; // 用户自定义提示词
  enableStream?: boolean; // 是否启用流式输出
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

// 判断用户提示词是否为简历分析需求
function isResumeAnalysisRequest(userPrompt?: string): boolean {
  if (!userPrompt) {
    // 没有提示词时，默认认为是简历分析
    return true;
  }
  
  const resumeKeywords = [
    // 中文简历相关关键词
    '简历', '求职', '候选人', '应聘', 'HR', '人力资源', '招聘', '面试',
    '技能', '经验', '学历', '工作经历', '项目经验', '能力评估',
    '薪资', '职位', '岗位', '人才', '员工', '雇员',
    // 英文简历相关关键词
    'resume', 'cv', 'candidate', 'applicant', 'hiring', 'recruitment',
    'interview', 'experience', 'skills', 'qualification', 'employment',
    'job', 'position', 'talent', 'employee', 'hire'
  ];
  
  const promptLower = userPrompt.toLowerCase();
  return resumeKeywords.some(keyword => 
    promptLower.includes(keyword.toLowerCase())
  );
}

// 读取downloads目录下的所有PDF文件
async function readAllDocuments(downloadsPath: string): Promise<DocumentInfo[]> {
  if (!downloadsPath) {
    throw new Error('下载目录未配置');
  }
  
  try {
    const files = fs.readdirSync(downloadsPath);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    console.log(`发现 ${pdfFiles.length} 份PDF文档文件`);
    
    if (pdfFiles.length === 0) {
      console.log(`提示：请将PDF文档文件放置到 ${downloadsPath} 目录下`);
      return [];
    }
    
    const documents: DocumentInfo[] = [];
    
    for (const file of pdfFiles) {
      const filePath = path.join(downloadsPath, file);
      try {
        console.log(`正在解析: ${file}`);
        const content = await extractPdfText(filePath);
        
        documents.push({
          fileName: file,
          content: content.trim(),
          extractedAt: new Date()
        });
        
        console.log(`✓ 成功解析: ${file} (${content.length} 字符)`);
      } catch (error) {
        console.error(`✗ 解析失败: ${file} - ${(error as Error).message}`);
      }
    }
    
    return documents;
  } catch (error) {
    throw new Error(`读取文档目录失败: ${(error as Error).message}`);
  }
}

// 组装简历分析prompt
function buildResumeAnalysisPrompt(documents: DocumentInfo[]): string {
  const resumeTexts = documents.map((doc, index) => {
    return `
=== 简历 ${index + 1}: ${doc.fileName} ===
${doc.content}
============================================
`;
  }).join('\n');

  const prompt = `
你是一名专业的HR和人力资源分析师。请仔细分析以下${documents.length}份简历，并提供详细的评估报告。

${resumeTexts}

请按照以下格式分析每份简历：

## 简历分析报告

### 整体概览
- 候选人总数：${documents.length}人
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

// 组装用户自定义分析prompt
function buildCustomAnalysisPrompt(documents: DocumentInfo[], userPrompt: string): string {
  const documentTexts = documents.map((doc, index) => {
    return `
=== 文档 ${index + 1}: ${doc.fileName} ===
${doc.content}
============================================
`;
  }).join('\n');

  const prompt = `
${userPrompt}

以下是需要分析的文档内容：

${documentTexts}

请根据上述要求对这些文档进行分析。
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

// 流式文档解析函数
async function *parseDocumentsWorkerStream(data: WorkerData) {
  try {
    console.log('Worker开始流式解析文档文件...');
    
    // 1. 读取所有文档
    const documents = await readAllDocuments(data.downloadDir);
    
    if (documents.length === 0) {
      throw new Error('未找到任何文档文件，请确保目录下有PDF文档文件');
    }
    
    console.log(`成功读取 ${documents.length} 份文档，开始AI流式分析...`);
    
    // 2. 根据用户提示词判断分析类型
    const isResumeAnalysis = isResumeAnalysisRequest(data.userPrompt);
    let analysisPrompt: string;
    
    if (isResumeAnalysis) {
      console.log('根据提示词判断为简历分析需求，使用专业简历分析模板');
      analysisPrompt = buildResumeAnalysisPrompt(documents);
    } else {
      console.log('根据提示词判断为自定义分析需求，使用用户提示词');
      analysisPrompt = buildCustomAnalysisPrompt(documents, data.userPrompt || '请总结这些文档的主要内容，并提取关键信息。');
    }
    
    // 3. 调用DeepSeek进行流式分析
    console.log('正在调用AI进行流式文档分析...');
    for await (const chunk of callDeepSeek(analysisPrompt)) {
      yield chunk;
    }
    
    // 4. 清理会话文件
    // clearSessionFiles(data.downloadDir, data.sessionId);
    
  } catch (error) {
    console.error('流式文档解析过程中发生错误:', (error as Error).message);
    clearSessionFiles(data.downloadDir, data.sessionId);
    throw error;
  }
}

// 主要的文档解析函数（非流式）
async function parseDocumentsWorker(data: WorkerData): Promise<string> {
  try {
    console.log('Worker开始解析文档文件...');
    
    // 1. 读取所有文档
    const documents = await readAllDocuments(data.downloadDir);
    
    if (documents.length === 0) {
      throw new Error('未找到任何文档文件，请确保目录下有PDF文档文件');
    }
    
    console.log(`成功读取 ${documents.length} 份文档，开始AI分析...`);
    
    // 2. 根据用户提示词判断分析类型
    const isResumeAnalysis = isResumeAnalysisRequest(data.userPrompt);
    let analysisPrompt: string;
    
    if (isResumeAnalysis) {
      console.log('根据提示词判断为简历分析需求，使用专业简历分析模板');
      analysisPrompt = buildResumeAnalysisPrompt(documents);
    } else {
      console.log('根据提示词判断为自定义分析需求，使用用户提示词');
      analysisPrompt = buildCustomAnalysisPrompt(documents, data.userPrompt || '请总结这些文档的主要内容，并提取关键信息。');
    }
    
    // 3. 调用DeepSeek进行分析
    console.log('正在调用AI进行文档分析...');
    const analysisResult = await callDeepSeekSync(analysisPrompt);
    
    // 4. 清理会话文件
    clearSessionFiles(data.downloadDir, data.sessionId);
    
    return analysisResult;
  } catch (error) {
    console.error('文档解析过程中发生错误:', (error as Error).message);
    clearSessionFiles(data.downloadDir, data.sessionId);
    throw error;
  }
}

// Worker主逻辑
if (parentPort) {
  parentPort.on('message', async (data: WorkerData) => {
    try {
      if (data.enableStream) {
        // 流式处理
        let fullContent = '';
        for await (const chunk of parseDocumentsWorkerStream(data)) {
          fullContent += chunk;
          // 发送流式数据到主线程
          parentPort!.postMessage({ 
            type: 'chunk', 
            data: chunk 
          });
        }
        // 发送完成信号
        parentPort!.postMessage({ 
          type: 'complete', 
          success: true, 
          data: fullContent 
        });
      } else {
        // 非流式处理
        const result = await parseDocumentsWorker(data);
        parentPort!.postMessage({ 
          success: true, 
          data: result 
        });
      }
    } catch (error) {
      parentPort!.postMessage({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  });
}

export default parseDocumentsWorker; 
import callDeepSeek from "../../utils/ai-call/deepseek";
import * as fs from 'fs';
import * as path from 'path';

const pdf = require('pdf-parse');

// 定义简历信息接口
interface ResumeInfo {
  fileName: string;
  content: string;
  extractedAt: Date;
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
async function readAllResumes(): Promise<ResumeInfo[]> {
  const downloadsPath = path.join(process.cwd(), 'file', 'downloads');
  
  try {
    const files = fs.readdirSync(downloadsPath);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    console.log(`发现 ${pdfFiles.length} 份PDF简历文件`);
    
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

// 主要的简历解析函数
export async function parseProfiles(): Promise<void> {
  try {
    console.log('开始解析简历文件...');
    
    // 1. 读取所有简历
    const resumes = await readAllResumes();
    
    if (resumes.length === 0) {
      console.log('未找到任何简历文件，请确保file/downloads目录下有PDF简历文件');
      return;
    }
    
    console.log(`成功读取 ${resumes.length} 份简历，开始AI分析...`);
    
    // 2. 组装prompt
    const analysisPrompt = buildAnalysisPrompt(resumes);
    
    // 3. 调用DeepSeek进行分析
    console.log('正在调用AI进行简历分析...');
    const analysisResult = await callDeepSeek(analysisPrompt);
    
    // 4. 输出结果
    console.log('\n' + '='.repeat(80));
    console.log('简历分析结果');
    console.log('='.repeat(80));
    console.log(analysisResult);
    console.log('='.repeat(80));
    
    // 5. 保存分析结果到文件
    const outputPath = path.join(process.cwd(), 'file', 'resume-analysis-result.txt');
    const outputContent = `简历分析报告\n生成时间: ${new Date().toLocaleString('zh-CN')}\n\n${analysisResult}`;
    
    fs.writeFileSync(outputPath, outputContent, 'utf8');
    console.log(`\n分析结果已保存到: ${outputPath}`);
    
  } catch (error) {
    console.error('简历解析过程中发生错误:', (error as Error).message);
    throw error;
  }
}

// 如果直接运行此文件，则执行解析
if (require.main === module) {
  parseProfiles()
    .then(() => {
      console.log('简历解析完成！');
      process.exit(0);
    })
    .catch(err => {
      console.error('简历解析失败:', err);
      process.exit(1);
    });
}
parseProfiles();
export default parseProfiles; 
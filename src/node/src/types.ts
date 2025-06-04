import { CompatibilityCallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

export type MCPToolResult = z.infer<typeof CompatibilityCallToolResultSchema>[];

export enum VLMProviderV2 {
  ui_tars_1_0 = 'Hugging Face for UI-TARS-1.0',
  ui_tars_1_5 = 'Hugging Face for UI-TARS-1.5',
  doubao_1_5 = 'VolcEngine Ark for Doubao-1.5-UI-TARS',
  doubao_1_5_vl = 'VolcEngine Ark for Doubao-1.5-thinking-vision-pro',
}

export enum SearchEngineForSettings {
  GOOGLE = 'google',
  BAIDU = 'baidu',
  BING = 'bing',
}

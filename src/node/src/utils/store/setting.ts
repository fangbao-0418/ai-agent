import { z } from 'zod';
import { SearchEngineForSettings, VLMProviderV2 } from '@src/types';
import { AppSettings } from '@agent-infra/shared';

const PresetSourceSchema = z.object({
  type: z.enum(['local', 'remote']),
  url: z.string().url().optional(),
  autoUpdate: z.boolean().optional(),
  lastUpdated: z.number().optional(),
});

export const PresetSchema = z.object({
  // Required fields
  vlmProvider: z.nativeEnum(VLMProviderV2).optional(),
  vlmBaseUrl: z.string().url(),
  vlmApiKey: z.string().min(1),
  vlmModelName: z.string().min(1),

  // Optional fields
  language: z.enum(['zh', 'en']).optional(),
  screenshotScale: z.number().min(0.1).max(1).optional(),
  maxLoopCount: z.number().min(25).max(200).optional(),
  loopIntervalInMs: z.number().min(0).max(3000).optional(),
  operator: z.enum(['nutjs', 'browser']).optional(),
  searchEngineForBrowser: z.nativeEnum(SearchEngineForSettings).optional(),
  reportStorageBaseUrl: z.string().url().optional(),
  utioBaseUrl: z.string().url().optional(),
  presetSource: PresetSourceSchema.optional(),
});

export type LocalStore = z.infer<typeof PresetSchema>;

export class SettingStore {
  public static getInstance(): any {
    return {}
  }

  public static get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return SettingStore.getInstance().get(key);
  }

  static set(key: string, value: string) {
    //
  }
  mcpServers: any[] = [];
}

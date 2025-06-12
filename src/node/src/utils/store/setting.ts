import { z } from 'zod';
import { SearchEngineForSettings, VLMProviderV2 } from '@src/types';
import { AppSettings } from '@agent-infra/shared';
import { logger } from '../logger';
const Conf = require('conf').default;

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
  model: z.object({
    provider: z.string(),
    model: z.string(),
    apiKey: z.string(),
    apiVersion: z.string(),
    baseURL: z.string(),
  }),
});

export type LocalStore = z.infer<typeof PresetSchema>;

export const DEFAULT_SETTING: LocalStore = {
  language: 'en',
  vlmProvider: VLMProviderV2.doubao_1_5,
  vlmBaseUrl: '',
  vlmApiKey: '',
  vlmModelName: '',
  maxLoopCount: 100,
  loopIntervalInMs: 1000,
  searchEngineForBrowser: SearchEngineForSettings.GOOGLE,
  operator: 'browser',
  reportStorageBaseUrl: '',
  utioBaseUrl: '',
  model: {
    provider: 'openai',
    model: 'deepseek',
    apiKey: '',
    apiVersion: '',
    baseURL: '',
  },
};

export class SettingStore {
  
  private static instance: any;

  public static getInstance() {
    // const config = new Conf({projectName: 'foo'});
    if (!SettingStore.instance) {
      SettingStore.instance = new Conf({
        projectName: 'ui_tars.setting',
        defaults: DEFAULT_SETTING,
      });
      SettingStore.instance.onDidAnyChange((newValue: any, oldValue: any) => {
        logger.info(
          `SettingStore: ${JSON.stringify(oldValue)} changed to ${JSON.stringify(newValue)}`,
        );
        // Notify that value updated
        // BrowserWindow.getAllWindows().forEach((win) => {
        //   win.webContents.send('setting-updated', newValue);
        // });
      });
    }
    return SettingStore.instance;
  }

  public static get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return SettingStore.getInstance().get(key);
  }

  static set(key: string, value: string) {
    SettingStore.getInstance().set(key, value);
  }
  mcpServers: any[] = [];
}

import { defineConfig } from 'vitepress';
import { configDe } from './config/configDe';
import { configEnUs } from './config/configEnUs';
import { configEs } from './config/configEs';
import { configFr } from './config/configFr';
import { configHi } from './config/configHi';
import { configId } from './config/configId';
import { configIt } from './config/configIt';
import { configJa } from './config/configJa';
import { configKo } from './config/configKo';
import { configPtBr } from './config/configPtBr';
import { configRu } from './config/configRu';
import { configShard } from './config/configShard';
import { configVi } from './config/configVi';
import { configZhCn } from './config/configZhCn';
import { configZhTw } from './config/configZhTw';

export default defineConfig({
  ...configShard,
  locales: {
    root: { label: 'English', ...configEnUs },
    'zh-cn': { label: '简体中文', ...configZhCn },
    'zh-tw': { label: '繁體中文', ...configZhTw },
    ja: { label: '日本語', ...configJa },
    es: { label: 'Español', ...configEs },
    'pt-br': { label: 'Português', ...configPtBr },
    ko: { label: '한국어', ...configKo },
    de: { label: 'Deutsch', ...configDe },
    fr: { label: 'Français', ...configFr },
    it: { label: 'Italiano', ...configIt },
    hi: { label: 'हिन्दी', ...configHi },
    id: { label: 'Indonesia', ...configId },
    vi: { label: 'Tiếng Việt', ...configVi },
    ru: { label: 'Русский', ...configRu },
  },
});

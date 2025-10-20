import { defineConfig } from 'vitepress';
import { configDe } from './config/configDe';
import { configEnUs } from './config/configEnUs';
import { configEs } from './config/configEs';
import { configFr } from './config/configFr';
import { configHi } from './config/configHi';
import { configId } from './config/configId';
import { configJa } from './config/configJa';
import { configKo } from './config/configKo';
import { configPtBr } from './config/configPtBr';
import { configShard } from './config/configShard';
import { configVi } from './config/configVi';
import { configZhCn } from './config/configZhCn';
import { configZhTw } from './config/configZhTw';

export default defineConfig({
  ...configShard,
  locales: {
    root: { label: 'English (United States)', ...configEnUs },
    'zh-cn': { label: '简体中文 (中国)', ...configZhCn },
    'zh-tw': { label: '繁體中文 (中國台灣)', ...configZhTw },
    ja: { label: '日本語 (日本)', ...configJa },
    es: { label: 'Español (España)', ...configEs },
    'pt-br': { label: 'Português (Brasil)', ...configPtBr },
    ko: { label: '한국어 (대한민국)', ...configKo },
    de: { label: 'Deutsch (Deutschland)', ...configDe },
    fr: { label: 'Français (France)', ...configFr },
    hi: { label: 'हिन्दी (भारत)', ...configHi },
    id: { label: 'Indonesia (Indonesia)', ...configId },
    vi: { label: 'Tiếng Việt (Việt Nam)', ...configVi },
  },
});

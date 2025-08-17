import { computed, reactive } from 'vue';
import { parseUrlParameters } from '../utils/urlParams';

export interface PackOptions {
  format: 'xml' | 'markdown' | 'plain';
  removeComments: boolean;
  removeEmptyLines: boolean;
  showLineNumbers: boolean;
  fileSummary: boolean;
  directoryStructure: boolean;
  includePatterns: string;
  ignorePatterns: string;
  outputParsable: boolean;
  compress: boolean;
}

const DEFAULT_PACK_OPTIONS: PackOptions = {
  format: 'xml',
  removeComments: false,
  removeEmptyLines: false,
  showLineNumbers: false,
  fileSummary: true,
  directoryStructure: true,
  includePatterns: '',
  ignorePatterns: '',
  outputParsable: false,
  compress: false,
};

export function usePackOptions() {
  // Initialize with URL parameters if available
  const urlParams = parseUrlParameters();
  const initialOptions = { ...DEFAULT_PACK_OPTIONS };

  // Apply URL parameters to initial options
  for (const key of Object.keys(initialOptions) as Array<keyof PackOptions>) {
    if (key in urlParams && urlParams[key] !== undefined) {
      // Debug: Log URL parameter application
      console.debug(`[URL Params] Setting ${key}:`, urlParams[key], '(was:', initialOptions[key], ')');
      // Type-safe assignment: only assign if the key is a valid PackOptions key
      initialOptions[key] = urlParams[key] as PackOptions[typeof key];
    }
  }

  const packOptions = reactive<PackOptions>(initialOptions);

  const getPackRequestOptions = computed(() => ({
    removeComments: packOptions.removeComments,
    removeEmptyLines: packOptions.removeEmptyLines,
    showLineNumbers: packOptions.showLineNumbers,
    fileSummary: packOptions.fileSummary,
    directoryStructure: packOptions.directoryStructure,
    includePatterns: packOptions.includePatterns ? packOptions.includePatterns.trim() : undefined,
    ignorePatterns: packOptions.ignorePatterns ? packOptions.ignorePatterns.trim() : undefined,
    outputParsable: packOptions.outputParsable,
    compress: packOptions.compress,
  }));

  function updateOption<K extends keyof PackOptions>(key: K, value: PackOptions[K]) {
    packOptions[key] = value;
  }

  function resetOptions() {
    Object.assign(packOptions, DEFAULT_PACK_OPTIONS);
  }

  return {
    packOptions,
    getPackRequestOptions,
    updateOption,
    resetOptions,
    DEFAULT_PACK_OPTIONS,
  };
}

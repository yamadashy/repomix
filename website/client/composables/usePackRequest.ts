import { computed, ref } from 'vue';
import type { PackResult } from '../components/api/client';
import { handlePackRequest } from '../components/utils/requestHandlers';
import { isValidRemoteValue } from '../components/utils/validation';
import { parseUrlParameters } from '../utils/urlParams';
import { usePackOptions } from './usePackOptions';

export type InputMode = 'url' | 'file' | 'folder';

export function usePackRequest() {
  const packOptionsComposable = usePackOptions();
  const { packOptions, getPackRequestOptions, resetOptions, DEFAULT_PACK_OPTIONS } = packOptionsComposable;

  // Initialize with URL parameters if available
  const urlParams = parseUrlParameters();

  // Input states
  const inputUrl = ref(urlParams.repo || '');
  const inputRepositoryUrl = ref('');
  const mode = ref<InputMode>('url');
  const uploadedFile = ref<File | null>(null);

  // Request states
  const loading = ref(false);
  const error = ref<string | null>(null);
  const result = ref<PackResult | null>(null);
  const hasExecuted = ref(false);

  // Request controller for cancellation
  let requestController: AbortController | null = null;
  const TIMEOUT_MS = 30_000;

  // Computed validation
  const isSubmitValid = computed(() => {
    switch (mode.value) {
      case 'url':
        return !!inputUrl.value && isValidRemoteValue(inputUrl.value.trim());
      case 'file':
      case 'folder':
        return !!uploadedFile.value;
      default:
        return false;
    }
  });

  function setMode(newMode: InputMode) {
    mode.value = newMode;
  }

  function handleFileUpload(file: File) {
    uploadedFile.value = file;
  }

  function resetRequest() {
    error.value = null;
    result.value = null;
    hasExecuted.value = false;
  }

  async function submitRequest() {
    if (!isSubmitValid.value) return;

    // Cancel any pending request
    if (requestController) {
      requestController.abort();
    }
    requestController = new AbortController();

    loading.value = true;
    error.value = null;
    result.value = null;
    hasExecuted.value = true;
    inputRepositoryUrl.value = inputUrl.value;

    const timeoutId = setTimeout(() => {
      if (requestController) {
        requestController.abort('Request timed out');
      }
    }, TIMEOUT_MS);

    try {
      await handlePackRequest(
        mode.value === 'url' ? inputUrl.value : '',
        packOptions.format,
        getPackRequestOptions.value,
        {
          onSuccess: (response) => {
            result.value = response;
          },
          onError: (errorMessage) => {
            error.value = errorMessage;
          },
          signal: requestController.signal,
          file: mode.value === 'file' || mode.value === 'folder' ? uploadedFile.value || undefined : undefined,
        },
      );
    } finally {
      clearTimeout(timeoutId);
      loading.value = false;
      requestController = null;
    }
  }

  function cancelRequest() {
    if (requestController) {
      requestController.abort();
      requestController = null;
    }
    loading.value = false;
  }

  return {
    // Pack options (re-exported for convenience)
    ...packOptionsComposable,

    // Input states
    inputUrl,
    inputRepositoryUrl,
    mode,
    uploadedFile,

    // Request states
    loading,
    error,
    result,
    hasExecuted,

    // Computed
    isSubmitValid,

    // Actions
    setMode,
    handleFileUpload,
    resetRequest,
    submitRequest,
    cancelRequest,

    // Pack option actions
    resetOptions,
    DEFAULT_PACK_OPTIONS,
  };
}

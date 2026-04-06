import { computed, onMounted, ref } from 'vue';
import type { FileInfo, PackProgressStage, PackResult } from '../components/api/client';
import { handlePackRequest } from '../components/utils/requestHandlers';
import { isValidRemoteValue } from '../components/utils/validation';
import { parseUrlParameters } from '../utils/urlParams';
import { usePackOptions } from './usePackOptions';

export type InputMode = 'url' | 'file' | 'folder';

export function usePackRequest() {
  const packOptionsComposable = usePackOptions();
  const { packOptions, getPackRequestOptions, resetOptions, applyUrlParameters, DEFAULT_PACK_OPTIONS } =
    packOptionsComposable;

  // Input states
  const inputUrl = ref('');
  const inputRepositoryUrl = ref('');
  const mode = ref<InputMode>('url');
  const uploadedFile = ref<File | null>(null);

  // Request states
  const loading = ref(false);
  const error = ref<string | null>(null);
  const errorType = ref<'error' | 'warning'>('error');
  const result = ref<PackResult | null>(null);
  const hasExecuted = ref(false);
  const progressStage = ref<PackProgressStage | null>(null);

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
    errorType.value = 'error';
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
    errorType.value = 'error';
    result.value = null;
    hasExecuted.value = true;
    progressStage.value = null;
    inputRepositoryUrl.value = inputUrl.value;

    // Set up automatic timeout
    // Use .bind() to avoid capturing the surrounding scope in the closure
    const timeoutId = setTimeout(requestController.abort.bind(requestController, 'timeout'), TIMEOUT_MS);

    try {
      await handlePackRequest(
        mode.value === 'url' ? inputUrl.value : '',
        packOptions.format,
        getPackRequestOptions.value,
        {
          onSuccess: (response) => {
            console.log('[pack] onSuccess called, metadata:', response.metadata?.repository, 'files:', response.metadata?.summary?.totalFiles);
            result.value = response;
            console.log('[pack] result.value set');
          },
          onError: (errorMessage) => {
            console.log('[pack] onError called:', errorMessage);
            error.value = errorMessage;
          },
          onAbort: (message) => {
            error.value = message;
            errorType.value = 'warning';
          },
          onProgress: (stage) => {
            progressStage.value = stage;
          },
          signal: requestController.signal,
          file: mode.value === 'file' || mode.value === 'folder' ? uploadedFile.value || undefined : undefined,
        },
      );
    } finally {
      clearTimeout(timeoutId);
      loading.value = false;
      requestController = null;
      console.log('[pack] finally: loading=false, result=', !!result.value, 'error=', error.value);
    }
  }

  async function repackWithSelectedFiles(selectedFiles: FileInfo[]) {
    if (!result.value || selectedFiles.length === 0) return;

    // Generate include patterns from selected files
    const selectedPaths = selectedFiles.map((file) => file.path);
    const includePatterns = selectedPaths.join(',');

    // Temporarily update pack options with include patterns
    const originalIncludePatterns = packOptions.includePatterns;
    const originalIgnorePatterns = packOptions.ignorePatterns;

    packOptions.includePatterns = includePatterns;
    packOptions.ignorePatterns = ''; // Clear ignore patterns to ensure selected files are included

    try {
      // Use the same loading state as normal pack processing
      await submitRequest();

      // Update file selection state in the new result
      if (result.value?.metadata?.allFiles) {
        for (const file of result.value.metadata.allFiles) {
          file.selected = selectedPaths.includes(file.path);
        }
      }
    } finally {
      // Restore original pack options
      packOptions.includePatterns = originalIncludePatterns;
      packOptions.ignorePatterns = originalIgnorePatterns;
    }
  }

  function cancelRequest() {
    if (requestController) {
      requestController.abort('cancel');
      requestController = null;
    }
    loading.value = false;
  }

  // Apply URL parameters after component mounts
  // This must be done here (not during setup) because during SSR/hydration,
  // browser globals like `window.location.search` are not available.
  // Accessing them before mounting would cause errors in SSR environments.
  onMounted(() => {
    const urlParams = parseUrlParameters();

    // Apply pack options from URL parameters
    applyUrlParameters(urlParams);

    // Apply repo URL from URL parameters
    if (urlParams.repo) {
      inputUrl.value = urlParams.repo;
    }
  });

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
    errorType,
    result,
    hasExecuted,
    progressStage,

    // Computed
    isSubmitValid,

    // Actions
    setMode,
    handleFileUpload,
    resetRequest,
    submitRequest,
    repackWithSelectedFiles,
    cancelRequest,

    // Pack option actions
    resetOptions,
    DEFAULT_PACK_OPTIONS,
  };
}

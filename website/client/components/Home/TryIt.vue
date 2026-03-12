<template>
  <div class="container">
    <form class="try-it-container" @submit.prevent="handleSubmit($event)">
      <div class="input-row">
        <div class="tab-container">
          <button
            type="button"
            :class="{ active: mode === 'url' }"
            @click="setMode('url')"
          >
            <Link2 size="20" class="icon" />
          </button>
          <button
            type="button"
            :class="{ active: mode === 'folder' }"
            @click="setMode('folder')"
          >
            <FolderOpen size="20" class="icon" />
          </button>
          <button
            type="button"
            :class="{ active: mode === 'file' }"
            @click="setMode('file')"
          >
            <FolderArchive size="20" class="icon" />
          </button>
        </div>

        <div class="input-field">
          <TryItFileUpload
            v-if="mode === 'file'"
            @upload="handleFileUpload"
            :loading="loading"
            :show-button="false"
          />
          <TryItFolderUpload
            v-else-if="mode === 'folder'"
            @upload="handleFileUpload"
            :loading="loading"
            :show-button="false"
          />
          <TryItUrlInput
            v-else
            v-model:url="inputUrl"
            :loading="loading"
            @keydown="handleKeydown"
            @submit="handleSubmit"
            :show-button="false"
          />
        </div>

        <div class="pack-button-wrapper">
          <PackButton
            :loading="loading"
            :isValid="isSubmitValid"
            @cancel="handleCancel"
          />
          <div
            v-if="shouldShowReset"
            class="tooltip-container"
          >
            <button
              class="reset-button"
              @click="handleReset"
              type="button"
            >
              <RotateCcw :size="20" />
            </button>
            <div class="tooltip-content">
              Reset all options to default values
              <div class="tooltip-arrow"></div>
            </div>
          </div>
        </div>
      </div>

      <TryItPackOptions
        v-model:format="packOptions.format"
        v-model:include-patterns="packOptions.includePatterns"
        v-model:ignore-patterns="packOptions.ignorePatterns"
        v-model:file-summary="packOptions.fileSummary"
        v-model:directory-structure="packOptions.directoryStructure"
        v-model:remove-comments="packOptions.removeComments"
        v-model:remove-empty-lines="packOptions.removeEmptyLines"
        v-model:show-line-numbers="packOptions.showLineNumbers"
        v-model:output-parsable="packOptions.outputParsable"
        v-model:compress="packOptions.compress"

      />

      <div v-if="hasExecuted">
        <TryItResult
          :result="result"
          :loading="loading"
          :error="error"
          :error-type="errorType"
          :repository-url="inputRepositoryUrl"
          :pack-options="packOptions"
          @repack="handleRepack"
        />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { FolderArchive, FolderOpen, Link2, RotateCcw } from 'lucide-vue-next';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { usePackRequest } from '../../composables/usePackRequest';
import { hasNonDefaultValues, parseUrlParameters, updateUrlParameters } from '../../utils/urlParams';
import type { FileInfo } from '../api/client';
import { isValidRemoteValue } from '../utils/validation';
import PackButton from './PackButton.vue';
import TryItFileUpload from './TryItFileUpload.vue';
import TryItFolderUpload from './TryItFolderUpload.vue';
import TryItPackOptions from './TryItPackOptions.vue';
import TryItResult from './TryItResult.vue';
import TryItUrlInput from './TryItUrlInput.vue';

// Use composables for state management
const {
  // Pack options
  packOptions,
  DEFAULT_PACK_OPTIONS,

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

  // Computed
  isSubmitValid,

  // Actions
  setMode,
  handleFileUpload,
  submitRequest,
  repackWithSelectedFiles,
  resetOptions,
  cancelRequest,
} = usePackRequest();

// Check if reset button should be shown
const shouldShowReset = computed(() => {
  // Use utility function to check for non-default values
  return hasNonDefaultValues(
    inputUrl.value,
    packOptions as unknown as Record<string, unknown>,
    DEFAULT_PACK_OPTIONS as unknown as Record<string, unknown>,
  );
});

// Function to update URL parameters based on current state
function updateUrlFromCurrentState() {
  const urlParamsToUpdate: Record<string, unknown> = {};

  // Add repository URL if it exists and is valid
  if (inputUrl.value && isValidRemoteValue(inputUrl.value.trim())) {
    urlParamsToUpdate.repo = inputUrl.value.trim();
  }

  // Only add pack options that differ from defaults
  for (const [key, value] of Object.entries(packOptions)) {
    const defaultValue = DEFAULT_PACK_OPTIONS[key as keyof typeof DEFAULT_PACK_OPTIONS];
    if (value !== defaultValue) {
      // For string values, also check if they're not empty
      if (typeof value === 'string' && value.trim() === '' && defaultValue === '') {
        continue; // Skip empty strings that match default empty strings
      }

      urlParamsToUpdate[key] = value;
    }
  }

  updateUrlParameters(urlParamsToUpdate);
}

async function handleSubmit(event?: SubmitEvent) {
  // Prevent form submission when already loading
  if (loading.value) {
    event?.preventDefault();
    return;
  }

  // Prevent accidental form submissions from unintended buttons
  if (event?.submitter && !isSubmitValid.value) {
    const submitter = event.submitter as HTMLElement;
    if (!submitter.matches('.pack-button, [type="submit"]')) {
      return; // Ignore submission from non-pack buttons when form is invalid
    }
  }

  // Only proceed if form is valid
  if (!isSubmitValid.value) {
    return;
  }

  await submitRequest();
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && mode.value === 'url' && isSubmitValid.value && !loading.value) {
    handleSubmit();
  }
}

function handleReset() {
  resetOptions();
  inputUrl.value = '';

  // Clear URL parameters
  updateUrlParameters({});
}

function handleRepack(selectedFiles: FileInfo[]) {
  repackWithSelectedFiles(selectedFiles);
}

function handleCancel() {
  cancelRequest();
}

// Watch for changes in packOptions and inputUrl to update URL in real-time
watch(
  [packOptions, inputUrl],
  () => {
    updateUrlFromCurrentState();
  },
  { deep: true },
);

// Handle URL parameters when component mounts
onMounted(() => {
  const urlParams = parseUrlParameters();

  // If repository parameter exists and is valid, trigger packing automatically
  if (urlParams.repo && isValidRemoteValue(urlParams.repo.trim())) {
    // Use nextTick to ensure all reactive values are properly initialized
    nextTick(async () => {
      try {
        await handleSubmit();
      } catch (error) {
        console.error('Auto-execution failed:', error);
      }
    });
  }
});
</script>

<style scoped>
.container {
  padding: 0 20px;
  margin: 0 auto;
  max-width: 960px;
}

.try-it-container {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  padding: 24px;
}

.input-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  margin-bottom: 24px;
  align-items: start;
}

.tab-container {
  display: flex;
  flex-direction: row;
  width: 240px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--vp-c-border);
}

.tab-container button {
  flex: 1;
  height: 48px;
  padding: 0 16px;
  background: var(--vp-c-bg);
  cursor: pointer;
  font-size: 16px;
  white-space: nowrap;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.tab-container button:not(:first-child)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 25%;
  height: 50%;
  width: 1px;
  background-color: var(--vp-c-border);
}

.tab-container button:first-child {
  border-radius: 8px 0 0 8px;
}

.tab-container button:last-child {
  border-radius: 0 8px 8px 0;
}

.tab-container button.active {
  background: var(--vp-c-brand-1);
  color: white;
}

.tab-container button.active::before {
  display: none;
}

.tab-container button.active + button::before {
  display: none;
}

.tab-container button .icon {
  color: var(--vp-c-text-1);
}

.tab-container button.active .icon {
  color: white;
}

.input-field {
  align-self: start;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.pack-button-wrapper {
  display: flex;
  align-items: stretch;
  align-self: start;
  flex-shrink: 0;
  gap: 8px;
}

.reset-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  background: white;
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.reset-button:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);

}

/* Responsive adjustments */
@media (max-width: 768px) {
  .input-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .tab-container {
    width: 100%;
  }

  .pack-button-wrapper {
    width: 100%;
    gap: 8px;
  }
}
.tooltip-container {
  position: relative;
  display: inline-block;
}

.tooltip-content {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #333;
  color: white;
  font-size: 0.875rem;
  white-space: nowrap;
  border-radius: 4px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
  z-index: 10;
}

.tooltip-container:hover .tooltip-content {
  opacity: 1;
  visibility: visible;
}

.tooltip-arrow {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 8px;
  border-style: solid;
  border-color: #333 transparent transparent transparent;
}

</style>

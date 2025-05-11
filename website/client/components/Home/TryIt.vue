<template>
  <div class="container">
    <form class="try-it-container" @submit.prevent="handleSubmit">
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
          />
        </div>
      </div>

      <TryItPackOptions
        v-model:format="inputFormat"
        v-model:include-patterns="inputIncludePatterns"
        v-model:ignore-patterns="inputIgnorePatterns"
        v-model:file-summary="inputFileSummary"
        v-model:directory-structure="inputDirectoryStructure"
        v-model:files="inputFiles"
        v-model:remove-comments="inputRemoveComments"
        v-model:remove-empty-lines="inputRemoveEmptyLines"
        v-model:show-line-numbers="inputShowLineNumbers"
        v-model:output-parsable="inputOutputParsable"
        v-model:compress="inputCompress"
      />

      <div v-if="hasExecuted">
        <TryItResult
          :result="result"
          :loading="loading"
          :error="error"
          :repository-url="inputRepositoryUrl"
        />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { FolderArchive, FolderOpen, Link2 } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import type { PackResult } from '../api/client';
import { handlePackRequest } from '../utils/requestHandlers';
import { isValidRemoteValue } from '../utils/validation';
import PackButton from './PackButton.vue';
import TryItFileUpload from './TryItFileUpload.vue';
import TryItFolderUpload from './TryItFolderUpload.vue';
import TryItPackOptions from './TryItPackOptions.vue';
import TryItResult from './TryItResult.vue';
import TryItUrlInput from './TryItUrlInput.vue';

// Form input states
const inputUrl = ref('');
const inputFormat = ref<'xml' | 'markdown' | 'plain'>('xml');
const inputRemoveComments = ref(false);
const inputRemoveEmptyLines = ref(false);
const inputShowLineNumbers = ref(false);
const inputFileSummary = ref(true);
const inputDirectoryStructure = ref(true);
const inputIncludePatterns = ref('');
const inputFiles = ref(false);
const inputIgnorePatterns = ref('');
const inputOutputParsable = ref(false);
const inputRepositoryUrl = ref('');
const inputCompress = ref(false);

// Processing states
const loading = ref(false);
const error = ref<string | null>(null);
const result = ref<PackResult | null>(null);
const hasExecuted = ref(false);
const mode = ref<'url' | 'file' | 'folder'>('url');
const uploadedFile = ref<File | null>(null);

// Compute if the current mode's input is valid for submission
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

// Explicitly set the mode and handle related state changes
function setMode(newMode: 'url' | 'file' | 'folder') {
  mode.value = newMode;
}

const TIMEOUT_MS = 30_000;
let requestController: AbortController | null = null;

async function handleSubmit() {
  // Check if current mode has valid input
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
      throw new Error('Request timed out');
    }
  }, TIMEOUT_MS);

  await handlePackRequest(
    mode.value === 'url' ? inputUrl.value : '',
    inputFormat.value,
    {
      removeComments: inputRemoveComments.value,
      removeEmptyLines: inputRemoveEmptyLines.value,
      showLineNumbers: inputShowLineNumbers.value,
      fileSummary: inputFileSummary.value,
      directoryStructure: inputDirectoryStructure.value,
      includePatterns: inputIncludePatterns.value ? inputIncludePatterns.value.trim() : undefined,
      files: inputFiles.value,
      ignorePatterns: inputIgnorePatterns.value ? inputIgnorePatterns.value.trim() : undefined,
      outputParsable: inputOutputParsable.value,
      compress: inputCompress.value,
    },
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

  clearTimeout(timeoutId);

  loading.value = false;
  requestController = null;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && mode.value === 'url' && isSubmitValid.value && !loading.value) {
    handleSubmit();
  }
}

function handleFileUpload(file: File) {
  uploadedFile.value = file;
}
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
  }
}
</style>

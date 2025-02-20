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
            URL Input
          </button>
          <button
            type="button"
            :class="{ active: mode === 'file' }"
            @click="setMode('file')"
          >
            File Upload
          </button>
        </div>

        <div class="input-field">
          <TryItFileUpload
            v-if="mode === 'file'"
            @upload="handleFileUpload"
            :loading="loading"
            :show-button="false"
          />
          <TryItUrlInput
            v-else
            v-model:url="url"
            :loading="loading"
            @keydown="handleKeydown"
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
        v-model:format="format"
        v-model:include-patterns="includePatterns"
        v-model:ignore-patterns="ignorePatterns"
        v-model:file-summary="fileSummary"
        v-model:directory-structure="directoryStructure"
        v-model:remove-comments="removeComments"
        v-model:remove-empty-lines="removeEmptyLines"
        v-model:show-line-numbers="showLineNumbers"
        v-model:output-parsable="outputParsable"
      />

      <div v-if="hasExecuted">
        <TryItResultViewer
          :result="result"
          :loading="loading"
          :error="error"
        />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PackButton from './PackButton.vue';
import TryItFileUpload from './TryItFileUpload.vue';
import TryItPackOptions from './TryItPackOptions.vue';
import TryItResultViewer from './TryItResultViewer.vue';
import TryItUrlInput from './TryItUrlInput.vue';
import type { PackResult } from './api/client';
import { handlePackRequest } from './utils/requestHandlers';
import { isValidRemoteValue } from './utils/validation';

// Form input states
const url = ref('');
const format = ref<'xml' | 'markdown' | 'plain'>('xml');
const removeComments = ref(false);
const removeEmptyLines = ref(false);
const showLineNumbers = ref(false);
const fileSummary = ref(true);
const directoryStructure = ref(true);
const includePatterns = ref('');
const ignorePatterns = ref('');
const outputParsable = ref(false);

// Processing states
const loading = ref(false);
const error = ref<string | null>(null);
const result = ref<PackResult | null>(null);
const hasExecuted = ref(false);
const mode = ref<'url' | 'file'>('url');
const uploadedFile = ref<File | null>(null);

// Compute if the current mode's input is valid for submission
const isSubmitValid = computed(() => {
  switch (mode.value) {
    case 'url':
      return !!url.value && isValidRemoteValue(url.value.trim());
    case 'file':
      return !!uploadedFile.value;
    default:
      return false;
  }
});

// Explicitly set the mode and handle related state changes
function setMode(newMode: 'url' | 'file') {
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

  const timeoutId = setTimeout(() => {
    if (requestController) {
      requestController.abort('Request timed out');
      throw new Error('Request timed out');
    }
  }, TIMEOUT_MS);

  await handlePackRequest(
    mode.value === 'url' ? url.value : '',
    format.value,
    {
      removeComments: removeComments.value,
      removeEmptyLines: removeEmptyLines.value,
      showLineNumbers: showLineNumbers.value,
      fileSummary: fileSummary.value,
      directoryStructure: directoryStructure.value,
      includePatterns: includePatterns.value ? includePatterns.value.trim() : undefined,
      ignorePatterns: ignorePatterns.value ? ignorePatterns.value.trim() : undefined,
      outputParsable: outputParsable.value,
    },
    {
      onSuccess: (response) => {
        result.value = response;
      },
      onError: (errorMessage) => {
        error.value = errorMessage;
      },
      signal: requestController.signal,
      file: mode.value === 'file' ? uploadedFile.value || undefined : undefined,
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
  grid-template-columns: auto 1fr auto;
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
  background: white;
  cursor: pointer;
  font-size: 16px;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-container button:first-child {
  border-radius: 8px 0 0 8px;
  border-right: none;
}

.tab-container button:last-child {
  border-radius: 0 8px 8px 0;
}

.tab-container button.active {
  background: var(--vp-c-brand-1);
  color: white;
}

.input-field {
  align-self: start;
}

.pack-button-wrapper {
  display: flex;
  align-items: stretch;
  align-self: start;
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

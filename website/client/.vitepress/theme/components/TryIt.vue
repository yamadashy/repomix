<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import ResultViewer from './ResultViewer.vue';
import { packRepository, validateGitHubUrl } from './api/client';
import type { PackResult } from './api/client';
import { AnalyticsAction, analyticsUtils } from './utils/analytics';

// Form input states
const url = ref('');
const format = ref<'xml' | 'markdown' | 'plain'>('xml');
const removeComments = ref(false);
const removeEmptyLines = ref(false);
const showLineNumbers = ref(false);
const fileSummary = ref(true);
const directoryStructure = ref(true);
const ignorePatterns = ref('');

// Processing states
const loading = ref(false);
const error = ref<string | null>(null);
const result = ref<PackResult | null>(null);
const hasExecuted = ref(false);

// URL validation
const isValidUrl = computed(() => {
  if (!url.value) return false;
  return validateGitHubUrl(url.value.trim());
});

const ignorePatternList = computed(() => {
  if (!ignorePatterns.value) return [];
  return ignorePatterns.value
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean);
});

const TIMEOUT_MS = 30000;
let currentRequest: AbortController | null = null;

async function handleSubmit() {
  if (!isValidUrl.value) return;

  // Cancel any pending request
  if (currentRequest) {
    currentRequest.abort();
  }
  currentRequest = new AbortController();

  loading.value = true;
  error.value = null;
  result.value = null;
  hasExecuted.value = true;

  const processedUrl = url.value.trim();

  // Track pack start
  analyticsUtils.trackPackStart(processedUrl);

  try {
    const timeoutId = setTimeout(() => {
      if (currentRequest) {
        currentRequest.abort();
        throw new Error('Request timed out');
      }
    }, TIMEOUT_MS);

    const response = await packRepository({
      url: processedUrl,
      format: format.value,
      options: {
        removeComments: removeComments.value,
        removeEmptyLines: removeEmptyLines.value,
        showLineNumbers: showLineNumbers.value,
        fileSummary: fileSummary.value,
        directoryStructure: directoryStructure.value,
        ignorePatterns: ignorePatterns.value ? ignorePatterns.value.trim() : undefined,
      },
      signal: currentRequest.signal,
    });

    clearTimeout(timeoutId);

    // Set result
    result.value = {
      content: response.content,
      format: response.format,
      metadata: {
        repository: response.metadata.repository,
        timestamp: response.metadata.timestamp,
        summary: response.metadata.summary,
        topFiles: response.metadata.topFiles,
      },
    };

    // Track successful pack
    if (response.metadata.summary) {
      analyticsUtils.trackPackSuccess(
        processedUrl,
        response.metadata.summary.totalFiles,
        response.metadata.summary.totalCharacters,
      );
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    if (errorMessage === 'AbortError') {
      error.value = 'Request was cancelled';
      return;
    }
    error.value = errorMessage;
    analyticsUtils.trackPackError(processedUrl, errorMessage);
    console.error('Error processing repository:', err);
  } finally {
    loading.value = false;
    currentRequest = null;
  }
}

// Event handlers with analytics
function handleFormatChange(newFormat: 'xml' | 'markdown' | 'plain') {
  format.value = newFormat;
  analyticsUtils.trackFormatChange(newFormat);
}

function handleRemoveCommentsToggle(enabled: boolean) {
  removeComments.value = enabled;
  analyticsUtils.trackOptionToggle(AnalyticsAction.TOGGLE_REMOVE_COMMENTS, enabled);
}

function handleRemoveEmptyLinesToggle(enabled: boolean) {
  removeEmptyLines.value = enabled;
  analyticsUtils.trackOptionToggle(AnalyticsAction.TOGGLE_REMOVE_EMPTY_LINES, enabled);
}

function handleShowLineNumbersToggle(enabled: boolean) {
  showLineNumbers.value = enabled;
  analyticsUtils.trackOptionToggle(AnalyticsAction.TOGGLE_LINE_NUMBERS, enabled);
}

function handleFileSummaryToggle(enabled: boolean) {
  fileSummary.value = enabled;
  analyticsUtils.trackOptionToggle(AnalyticsAction.TOGGLE_FILE_SUMMARY, enabled);
}

function handleDirectoryStructureToggle(enabled: boolean) {
  directoryStructure.value = enabled;
  analyticsUtils.trackOptionToggle(AnalyticsAction.TOGGLE_DIRECTORY_STRUCTURE, enabled);
}

function handleIgnorePatternsUpdate(patterns: string) {
  ignorePatterns.value = patterns;
  analyticsUtils.trackIgnorePatternsUpdate(patterns);
}

// Handle URL input and form submission
function handleUrlInput(event: Event) {
  const input = event.target as HTMLInputElement;
  url.value = input.value;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && isValidUrl.value && !loading.value) {
    handleSubmit();
  }
}
</script>

<template>
  <div class="container">
    <form
        class="try-it-container"
        @submit.prevent="handleSubmit"
    >
      <div class="input-group">
        <div class="url-input-container">
          <input
              :value="url"
              @input="handleUrlInput"
              @keydown="handleKeydown"
              type="text"
              placeholder="GitHub repository URL (e.g., yamadashy/repomix)"
              class="repository-input"
              :class="{ 'invalid': url && !isValidUrl }"
              aria-label="GitHub repository URL"
          />
          <button
              type="submit"
              class="pack-button"
              :disabled="!isValidUrl || loading"
              aria-label="Pack repository"
          >
            {{ loading ? 'Processing...' : 'Pack' }}
            <svg v-if="!loading"
                 class="pack-button-icon"
                 width="20"
                 height="20"
                 viewBox="96.259 93.171 300 300"
            >
              <g transform="matrix(1.160932, 0, 0, 1.160932, 97.635941, 94.725143)">
                <path
                    fill="currentColor"
                    d="M 128.03 -1.486 L 21.879 65.349 L 21.848 190.25 L 127.979 256.927 L 234.2 190.27 L 234.197 65.463 L 128.03 -1.486 Z M 208.832 70.323 L 127.984 121.129 L 47.173 70.323 L 128.144 19.57 L 208.832 70.323 Z M 39.669 86.367 L 119.188 136.415 L 119.255 230.529 L 39.637 180.386 L 39.669 86.367 Z M 136.896 230.506 L 136.887 136.575 L 216.469 86.192 L 216.417 180.46 L 136.896 230.506 Z M 136.622 230.849"
                />
              </g>
            </svg>
          </button>
        </div>

        <div v-if="url && !isValidUrl" class="url-warning">
          <AlertTriangle class="warning-icon" size="16" />
          <span>Please enter a valid GitHub repository URL (e.g., yamadashy/repomix)</span>
        </div>
      </div>

      <div class="options-container">
        <div class="left-column">
          <div class="option-section">
            <p class="option-label">Output Format</p>
            <div class="format-buttons">
              <button
                  class="format-button"
                  :class="{ active: format === 'xml' }"
                  @click="handleFormatChange('xml')"
                  type="button"
              >
                XML
              </button>
              <button
                  class="format-button"
                  :class="{ active: format === 'markdown' }"
                  @click="handleFormatChange('markdown')"
                  type="button"
              >
                Markdown
              </button>
              <button
                  class="format-button"
                  :class="{ active: format === 'plain' }"
                  @click="handleFormatChange('plain')"
                  type="button"
              >
                Plain
              </button>
            </div>
          </div>

          <div class="option-section">
            <p class="option-label">Ignore Patterns</p>
            <input
                v-model="ignorePatterns"
                @input="handleIgnorePatternsUpdate($event.target.value)"
                type="text"
                class="repository-input"
                placeholder="Comma-separated patterns to ignore. e.g., **/*.test.ts,README.md"
                aria-label="Ignore patterns"
            />
          </div>
        </div>

        <div class="right-column">
          <div class="option-section">
            <p class="option-label">Output Options</p>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input
                    v-model="fileSummary"
                    @change="handleFileSummaryToggle($event.target.checked)"
                    type="checkbox"
                    class="checkbox-input"
                />
                <span>Include File Summary</span>
              </label>
              <label class="checkbox-label">
                <input
                    v-model="directoryStructure"
                    @change="handleDirectoryStructureToggle($event.target.checked)"
                    type="checkbox"
                    class="checkbox-input"
                />
                <span>Include Directory Structure</span>
              </label>
              <label class="checkbox-label">
                <input
                    v-model="removeComments"
                    @change="handleRemoveCommentsToggle($event.target.checked)"
                    type="checkbox"
                    class="checkbox-input"
                />
                <span>Remove Comments</span>
              </label>
              <label class="checkbox-label">
                <input
                    v-model="removeEmptyLines"
                    @change="handleRemoveEmptyLinesToggle($event.target.checked)"
                    type="checkbox"
                    class="checkbox-input"
                />
                <span>Remove Empty Lines</span>
              </label>
              <label class="checkbox-label">
                <input
                    v-model="showLineNumbers"
                    @change="handleShowLineNumbersToggle($event.target.checked)"
                    type="checkbox"
                    class="checkbox-input"
                />
                <span>Show Line Numbers</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div v-if="hasExecuted">
        <ResultViewer
            :result="result"
            :loading="loading"
            :error="error"
        />
      </div>
    </form>
  </div>
</template>

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

.url-input-container {
  display: flex;
  gap: 12px;
}

.repository-input {
  flex: 1;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition: border-color 0.2s;
}

.repository-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.repository-input.invalid {
  border-color: var(--vp-c-danger-1);
}

.url-warning {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--vp-c-warning-1);
  font-size: 14px;
}

.warning-icon {
  flex-shrink: 0;
  color: var(--vp-c-warning-1);
}

.pack-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pack-button:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}

.pack-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pack-button-icon {
  font-size: 20px;
  line-height: 1;
}

.input-group {
  margin-bottom: 24px;
}

.options-container {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: 24px;
  margin-bottom: 24px;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.option-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-label {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  color: var(--vp-c-text-2);
}

.format-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.format-button {
  padding: 8px 16px;
  font-size: 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.format-button:hover {
  border-color: var(--vp-c-brand-1);
}

.format-button.active {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: white;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--vp-c-text-1);
}

.checkbox-input {
  width: 16px;
  height: 16px;
  accent-color: var(--vp-c-brand-1);
}

@media (max-width: 640px) {
  .url-input-container {
    flex-direction: column;
  }

  .options-container {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .left-column,
  .right-column {
    gap: 24px;
  }
}
</style>

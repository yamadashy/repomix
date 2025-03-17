<script setup lang="ts">
import ace, { type Ace } from 'ace-builds';
import themeTomorrowUrl from 'ace-builds/src-noconflict/theme-tomorrow?url';
import themeTomorrowNightUrl from 'ace-builds/src-noconflict/theme-tomorrow_night?url';
import { BarChart2, Coffee, Copy, Download, GitFork, PackageSearch } from 'lucide-vue-next';
import { useData } from 'vitepress';
import { computed, ref, watch } from 'vue';
import { VAceEditor } from 'vue3-ace-editor';
import type { PackResult } from '../api/client';
import { copyToClipboard, downloadResult, formatTimestamp, getEditorOptions } from '../utils/resultViewer';

ace.config.setModuleUrl('ace/theme/tomorrow', themeTomorrowUrl);
ace.config.setModuleUrl('ace/theme/tomorrow_night', themeTomorrowNightUrl);

const lightTheme = 'tomorrow';
const darkTheme = 'tomorrow_night';

const props = defineProps<{
  result: PackResult;
}>();

const copied = ref(false);
const { isDark } = useData();
const editorInstance = ref<Ace.Editor | null>(null);

const editorOptions = computed(() => ({
  ...getEditorOptions(),
  theme: isDark.value ? `ace/theme/${darkTheme}` : `ace/theme/${lightTheme}`,
}));

watch(isDark, (newIsDark) => {
  if (editorInstance.value) {
    editorInstance.value.setTheme(newIsDark ? `ace/theme/${darkTheme}` : `ace/theme/${lightTheme}`);
  }
});

const formattedTimestamp = computed(() => {
  return formatTimestamp(props.result.metadata.timestamp);
});

const handleCopy = async (event: Event) => {
  event.preventDefault();
  event.stopPropagation();

  const success = await copyToClipboard(props.result.content, props.result.format);
  if (success) {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
};

const handleDownload = (event: Event) => {
  event.preventDefault();
  event.stopPropagation();
  downloadResult(props.result.content, props.result.format, props.result);
};

const handleEditorMount = (editor: Ace.Editor) => {
  editorInstance.value = editor;
};
</script>

<template>
  <div class="content-wrapper">
    <div class="metadata-panel">
      <div class="metadata-section">
        <h3><GitFork :size="16" class="section-icon" /> Repository Info</h3>
        <dl>
          <dt>Repository</dt>
          <dd>{{ result.metadata.repository }}</dd>
          <dt>Generated At</dt>
          <dd>{{ formattedTimestamp }}</dd>
          <dt>Format</dt>
          <dd>{{ result.format }}</dd>
        </dl>
      </div>

      <div class="metadata-section">
        <h3><PackageSearch :size="16" class="section-icon" /> Pack Summary</h3>
        <dl v-if="result.metadata.summary">
          <dt>Total Files</dt>
          <dd>{{ result.metadata.summary.totalFiles.toLocaleString() }} <span class="unit">files</span></dd>
          <dt>Total Size</dt>
          <dd>{{ result.metadata.summary.totalCharacters.toLocaleString() }} <span class="unit">chars</span></dd>
          <dt>Total Tokens</dt>
          <dd>{{ result.metadata.summary.totalTokens.toLocaleString() }} <span class="unit">tokens</span></dd>
        </dl>
      </div>

      <div class="metadata-section" v-if="result.metadata.topFiles">
        <h3><BarChart2 :size="16" class="section-icon" /> Top {{ result.metadata.topFiles.length }} Files</h3>
        <ol class="top-files-list">
          <li v-for="file in result.metadata.topFiles" :key="file.path">
            <div class="file-path">{{ file.path }}</div>
            <div class="file-stats">
              {{ file.charCount.toLocaleString() }} <span class="unit">chars</span> <span class="separator-unit">|</span> {{ file.tokenCount.toLocaleString() }} <span class="unit">tokens</span> <span class="separator-unit">|</span> {{ ((file.tokenCount / result.metadata.summary.totalTokens) * 100).toFixed(1) }}<span class="unit">%</span>
            </div>
          </li>
        </ol>
      </div>
    </div>

    <div class="output-panel">
      <div class="output-actions">
        <button
          class="action-button"
          @click="handleCopy"
          :class="{ copied }"
        >
          <Copy :size="16" />
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
        <button
          class="action-button"
          @click="handleDownload"
        >
          <Download :size="16" />
          Download
        </button>
      </div>
      <div class="editor-container">
        <VAceEditor
          v-model:value="result.content"
          :lang="'text'"
          :style="{ height: '100%', width: '100%' }"
          :options="editorOptions"
          @mount="handleEditorMount"
        />
      </div>
    </div>
    <div class="support-notice">
      <div class="support-message">
        <a href="https://ko-fi.com/yamadashy" target="_blank" rel="noopener noreferrer" class="support-link">
          <Coffee :size="14" class="support-icon" />
          This tool is independently developed. Your support helps maintain and improve it. Thank you!
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content-wrapper {
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: 500px auto;
}

.metadata-panel {
  padding: 16px;
  border-right: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
  overflow-y: auto;
}

.metadata-section {
  margin-bottom: 24px;
}

.metadata-section:last-child {
  margin-bottom: 0;
}

.metadata-section h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-icon {
  color: var(--vp-c-text-2);
}

dl {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  font-size: 13px;
}

dt {
  color: var(--vp-c-text-2);
  font-weight: 500;
}

dd {
  margin: 0;
  color: var(--vp-c-text-1);
  text-transform: lowercase;
}

.unit {
  color: var(--vp-c-text-2);
  margin-left: 0.3em;
}

.separator-unit {
  color: var(--vp-c-text-3);
  margin: 0 0.5em;
}

.top-files-list {
  margin: 0;
  padding: 0 0 0 0;
  font-size: 13px;
}

.top-files-list li {
  margin-bottom: 8px;
  border-left: 2px solid var(--vp-c-divider);
  padding-left: 8px;
}

.file-path {
  color: var(--vp-c-text-1);
  margin-bottom: 2px;
  word-break: break-all;
}

.file-stats {
  font-size: 12px;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
}

.output-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 500px;
  background: var(--vp-c-bg);
  overflow: hidden;
}

.output-actions {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-border);
  flex-shrink: 0;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  border-color: var(--vp-c-brand-1);
}

.action-button.copied {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.editor-container {
  height: 100%;
  width: 100%;
  font-family: var(--vp-font-family-mono);
}

.support-notice {
  grid-column: 1 / -1;
  padding: 8px;
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-border);
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-height: 45px;
}

.support-message {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-3);
  font-size: 12px;
  width: 100%;
}

.support-icon {
  flex-shrink: 0;
  transition: color 0.3s ease;
}

.support-link {
  text-decoration: none;
  font-weight: normal;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.support-link:hover {
  color: var(--vp-c-brand-1);
}

.support-link:hover .support-icon {
  color: var(--vp-c-brand-1);
}

@media (max-width: 768px) {
  .content-wrapper {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(500px, auto) auto;
    height: auto;
  }

  .metadata-panel {
    border-right: none;
    border-bottom: 1px solid var(--vp-c-border);
  }

  .output-panel {
    height: 500px;
  }

  .support-notice {
    padding: 16px;
  }

  .support-message {
    max-width: 100%;
  }
}
</style>

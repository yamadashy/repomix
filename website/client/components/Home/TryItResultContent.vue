<script setup lang="ts">
import ace, { type Ace } from 'ace-builds';
import themeTomorrowUrl from 'ace-builds/src-noconflict/theme-tomorrow?url';
import themeTomorrowNightUrl from 'ace-builds/src-noconflict/theme-tomorrow_night?url';
import { BarChart2, Copy, Download, GitFork, PackageSearch, Share } from 'lucide-vue-next';
import { useData } from 'vitepress';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { VAceEditor } from 'vue3-ace-editor';
import type { PackResult } from '../api/client';
import {
  canShareFiles,
  copyToClipboard,
  downloadResult,
  formatTimestamp,
  getEditorOptions,
  shareResult,
} from '../utils/resultViewer';
import SupportMessage from './SupportMessage.vue';

ace.config.setModuleUrl('ace/theme/tomorrow', themeTomorrowUrl);
ace.config.setModuleUrl('ace/theme/tomorrow_night', themeTomorrowNightUrl);

const lightTheme = 'tomorrow';
const darkTheme = 'tomorrow_night';

const props = defineProps<{
  result: PackResult;
}>();

const copied = ref(false);
const shared = ref(false);
const canShare = ref(canShareFiles());
const { isDark } = useData();
const editorInstance = ref<Ace.Editor | null>(null);
const isMobile = ref(false);
const tooltipContainer = ref<HTMLElement | null>(null);
const tooltipContent = ref<HTMLElement | null>(null);

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

const handleShare = async (event: Event) => {
  event.preventDefault();
  event.stopPropagation();

  // Only allow sharing on mobile devices with Web Share API support
  if (!isMobile.value || !canShare.value) {
    console.log('Share is only available on mobile devices');
    return;
  }

  const success = await shareResult(props.result.content, props.result.format, props.result);
  if (success) {
    shared.value = true;
    setTimeout(() => {
      shared.value = false;
    }, 2000);
  } else {
    console.log('Share was cancelled or failed');
  }
};

const handleEditorMount = (editor: Ace.Editor) => {
  editorInstance.value = editor;
};

const updateTooltipPosition = () => {
  if (!tooltipContainer.value || !tooltipContent.value || isMobile.value) return;

  const containerRect = tooltipContainer.value.getBoundingClientRect();
  const tooltipEl = tooltipContent.value;

  // Position above the button with proper spacing for the arrow (like existing tooltips)
  tooltipEl.style.top = `${containerRect.top - 46}px`;
  tooltipEl.style.left = `${containerRect.left + containerRect.width / 2}px`;

  // Show tooltip (override CSS hover states)
  tooltipEl.style.opacity = '1';
  tooltipEl.style.visibility = 'visible';
};

const hideTooltip = () => {
  if (tooltipContent.value) {
    tooltipContent.value.style.opacity = '0';
    tooltipContent.value.style.visibility = 'hidden';
  }
};

const handleResize = () => {
  isMobile.value = window.innerWidth <= 768;
};

const handleScroll = () => {
  // Hide tooltip on scroll to prevent detachment from button
  if (tooltipContent.value) {
    tooltipContent.value.style.opacity = '0';
    tooltipContent.value.style.visibility = 'hidden';
  }
};

onMounted(() => {
  isMobile.value = window.innerWidth <= 768;
  window.addEventListener('resize', handleResize);
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('scroll', handleScroll);
});
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
          <dt>Total Tokens</dt>
          <dd>{{ result.metadata.summary.totalTokens.toLocaleString() }} <span class="unit">tokens</span></dd>
          <dt>Total Size</dt>
          <dd>{{ result.metadata.summary.totalCharacters.toLocaleString() }} <span class="unit">chars</span></dd>
        </dl>
      </div>

      <div class="metadata-section" v-if="result.metadata.topFiles">
        <h3><BarChart2 :size="16" class="section-icon" /> Top {{ result.metadata.topFiles.length }} Files</h3>
        <ol class="top-files-list">
          <li v-for="file in result.metadata.topFiles" :key="file.path">
            <div class="file-path">{{ file.path }}</div>
            <div class="file-stats">
              {{ file.tokenCount.toLocaleString() }} <span class="unit">tokens</span> <span class="separator-unit">|</span> {{ file.charCount.toLocaleString() }} <span class="unit">chars</span> <span class="separator-unit">|</span> {{ ((file.tokenCount / result.metadata.summary.totalTokens) * 100).toFixed(1) }}<span class="unit">%</span>
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
        <div v-if="canShare" class="mobile-only" style="flex-basis: 100%"></div>
        <div v-if="canShare" class="tooltip-container" ref="tooltipContainer" @mouseenter="updateTooltipPosition" @mouseleave="hideTooltip">
          <button
            class="action-button"
            @click="handleShare"
            :class="{ shared }"
            :disabled="!isMobile"
            aria-label="Share output via mobile apps"
          >
            <Share :size="16" />
            {{ shared ? 'Shared!' : 'Open with your app' }}
          </button>
          <div class="tooltip-content desktop-only" ref="tooltipContent">
            Only available on mobile devices
            <div class="tooltip-arrow"></div>
          </div>
        </div>
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
    <div class="support-wrapper">
      <SupportMessage />
    </div>
  </div>
</template>

<style scoped>
.content-wrapper {
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: 445px auto;
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
  flex-wrap: wrap;
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

.action-button.shared {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.editor-container {
  height: 100%;
  width: 100%;
  font-family: var(--vp-font-family-mono);
}

.support-wrapper {
  grid-column: 1 / -1;
}

.mobile-only {
  display: none;
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
    max-height: 400px;
    overflow-y: auto;
  }

  .output-panel {
    height: 500px;
  }

  .mobile-only {
    display: inline-flex;
  }
}

.tooltip-container {
  position: relative;
  display: inline-block;
}

.tooltip-content {
  position: fixed;
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
  z-index: 9999;
  pointer-events: none;
  text-align: left;
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

.tooltip-container:hover .tooltip-content {
  opacity: 1;
  visibility: visible;
}

.desktop-only {
  display: block;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none;
  }
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button:disabled:hover {
  opacity: 0.5;
}

/* Dark mode support for tooltip */
html.dark .tooltip-content {
  background: #333;
  color: #ffffff;
}

html.dark .tooltip-arrow {
  border-color: #333 transparent transparent transparent;
}
</style>

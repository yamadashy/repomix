<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue';
import type { PackOptions } from '../../composables/usePackOptions';
import type { TabType } from '../../types/ui';
import type { DisplayProgressStage, FileInfo, PackResult } from '../api/client';
import SupportMessage from './SupportMessage.vue';
import TryItFileSelection from './TryItFileSelection.vue';
import TryItLoading from './TryItLoading.vue';
import TryItResultErrorContent from './TryItResultErrorContent.vue';

// Defer loading the Ace-editor-based result view (vue3-ace-editor + ace-builds
// total ~480 KB) until a pack result actually needs to render. `delay: 200`
// avoids a loading flicker on fast networks; `timeout: 10000` surfaces stalled
// chunk fetches instead of leaving the panel blank indefinitely.
const TryItResultContent = defineAsyncComponent({
  loader: () => import('./TryItResultContent.vue'),
  loadingComponent: TryItLoading,
  delay: 200,
  timeout: 10000,
});

interface Props {
  result?: PackResult | null;
  loading?: boolean;
  error?: string | null;
  errorType?: 'error' | 'warning';
  repositoryUrl?: string;
  packOptions?: PackOptions;
  progressStage?: DisplayProgressStage | null;
  progressMessage?: string | null;
}

interface Emits {
  (e: 'repack', selectedFiles: FileInfo[]): void;
  (e: 'repack-completed'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Tab management
const activeTab = ref<TabType>('result');

const hasFileSelection = computed(() => props.result?.metadata?.allFiles && props.result.metadata.allFiles.length > 0);

const handleTabClick = (tab: TabType) => {
  activeTab.value = tab;
};

const handleRepack = (selectedFiles: FileInfo[]) => {
  // Only proceed if we have selected files
  if (!selectedFiles || selectedFiles.length === 0) {
    return;
  }

  // Switch to result tab immediately when re-pack starts
  activeTab.value = 'result';

  emit('repack', selectedFiles);
};
</script>

<template>
  <div class="result-viewer">
    <template v-if="loading && !result">
      <TryItLoading :stage="progressStage" :message="progressMessage" />
      <SupportMessage />
    </template>
    <TryItResultErrorContent
      v-else-if="error"
      :message="error"
      :error-type="errorType"
      :repository-url="repositoryUrl"
      :pack-options="packOptions"
    />
    <div v-else-if="result" class="result-content">
      <!-- Tab Navigation -->
      <div v-if="hasFileSelection" class="tab-navigation" role="tablist" aria-label="Pack result view">
        <button
          id="tab-result"
          type="button"
          role="tab"
          aria-controls="tabpanel-result"
          :aria-selected="activeTab === 'result'"
          class="tab-button"
          :class="{ active: activeTab === 'result' }"
          @click="handleTabClick('result')"
        >
          Result
        </button>
        <button
          id="tab-files"
          type="button"
          role="tab"
          aria-controls="tabpanel-files"
          :aria-selected="activeTab === 'files'"
          class="tab-button"
          :class="{ active: activeTab === 'files' }"
          @click="handleTabClick('files')"
        >
          File Selection
        </button>
      </div>

      <!-- Tab Content -->
      <div
        id="tabpanel-result"
        role="tabpanel"
        aria-labelledby="tab-result"
        v-show="activeTab === 'result' || !hasFileSelection"
      >
        <TryItResultContent :result="result" :pack-options="packOptions" />
      </div>
      <div
        id="tabpanel-files"
        role="tabpanel"
        aria-labelledby="tab-files"
        v-show="activeTab === 'files' && hasFileSelection"
      >
        <TryItFileSelection
          v-if="hasFileSelection"
          :all-files="result.metadata!.allFiles!"
          :loading="loading"
          @repack="handleRepack"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-viewer {
  margin-top: 24px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  overflow: hidden;
}

.result-content {
  display: flex;
  flex-direction: column;
}

.tab-navigation {
  display: flex;
  border-bottom: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
}

.tab-button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.tab-button:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.tab-button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: -2px;
}

.tab-button.active {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
}

</style>

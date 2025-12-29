<script setup lang="ts">
import { computed, ref } from 'vue';
import type { TabType } from '../../types/ui';
import type { FileInfo, PackResult } from '../api/client';
import SupportMessage from './SupportMessage.vue';
import TryItFileSelection from './TryItFileSelection.vue';
import TryItLoading from './TryItLoading.vue';
import TryItResultContent from './TryItResultContent.vue';
import TryItResultErrorContent from './TryItResultErrorContent.vue';

interface Props {
  result?: PackResult | null;
  loading?: boolean;
  error?: string | null;
  errorType?: 'error' | 'warning';
  repositoryUrl?: string;
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
      <TryItLoading />
      <SupportMessage />
    </template>
    <TryItResultErrorContent
      v-else-if="error"
      :message="error"
      :error-type="errorType"
      :repository-url="repositoryUrl"
    />
    <div v-else-if="result" class="result-content">
      <!-- Tab Navigation -->
      <div v-if="hasFileSelection" class="tab-navigation">
        <button 
          type="button"
          class="tab-button"
          :class="{ active: activeTab === 'result' }"
          @click="handleTabClick('result')"
        >
          Result
        </button>
        <button 
          type="button"
          class="tab-button"
          :class="{ active: activeTab === 'files' }"
          @click="handleTabClick('files')"
        >
          File Selection
        </button>
      </div>

      <!-- Tab Content -->
      <div v-show="activeTab === 'result' || !hasFileSelection">
        <TryItResultContent :result="result" />
      </div>
      <div v-show="activeTab === 'files' && hasFileSelection">
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

.tab-button.active {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
}

</style>

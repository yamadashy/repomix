<template>
  <div class="file-selection-container">
    <div class="file-selection-header">
      <h3 class="file-selection-title">
        <FileText :size="16" class="title-icon" />
        File Selection
      </h3>
      <div class="file-selection-actions">
        <button
          type="button"
          class="action-btn select-all"
          @click="selectAll"
          :disabled="!hasFiles"
          aria-label="Select all files"
        >
          Select All
        </button>
        <button
          type="button"
          class="action-btn deselect-all"
          @click="deselectAll"
          :disabled="!hasFiles"
          aria-label="Deselect all files"
        >
          Deselect All
        </button>
        <button
          type="button"
          class="action-btn repack"
          @click="handleRepack"
          :disabled="!hasSelectedFiles || loading"
          :aria-label="loading ? 'Re-packing selected files' : `Re-pack ${selectedFiles.length} selected files`"
        >
          {{ loading ? 'Re-packing...' : 'Re-pack Selected' }}
          <PackIcon v-if="!loading" :size="14" />
        </button>
      </div>
    </div>

    <div class="file-selection-stats">
      <span class="stat-item">
        {{ selectedFiles.length }} of {{ allFiles.length }} files selected
      </span>
      <span class="stat-separator">|</span>
      <span class="stat-item">
        {{ selectedChars.toLocaleString() }} chars
        ({{ totalChars > 0 ? ((selectedChars / totalChars) * 100).toFixed(1) : '0.0' }}%)
      </span>
    </div>

    <div class="file-list-container">
      <div class="file-list-scroll">
        <table class="file-table" aria-label="File selection table">
          <thead>
            <tr>
              <th class="checkbox-column">
                <input
                  type="checkbox"
                  :checked="selectedFiles.length === allFiles.length && allFiles.length > 0"
                  :indeterminate="selectedFiles.length > 0 && selectedFiles.length < allFiles.length"
                  @change="($event.target as HTMLInputElement).checked ? selectAll() : deselectAll()"
                  class="header-checkbox"
                  aria-label="Select or deselect all files"
                />
              </th>
              <th class="file-path-column">File Path</th>
              <th class="chars-column">Chars</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="file in sortedFiles"
              :key="file.path"
              class="file-row"
              :class="{ 'file-row-selected': file.selected }"
              @click="toggleFileSelection(file, $event)"
            >
              <td class="checkbox-cell">
                <input
                  type="checkbox"
                  v-model="file.selected"
                  class="file-checkbox"
                  :aria-label="`Select file ${file.path}`"
                />
              </td>
              <td class="file-path-cell">
                <span class="file-path">{{ file.path }}</span>
              </td>
              <td class="chars-cell">
                <span class="file-chars">{{ file.charCount.toLocaleString() }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>


    <FileSelectionWarning
      v-if="selectedFiles.length > FILE_SELECTION_WARNING_THRESHOLD"
      :threshold="FILE_SELECTION_WARNING_THRESHOLD"
    />
  </div>
</template>

<script setup lang="ts">
import { FileText } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { FILE_SELECTION_WARNING_THRESHOLD } from '../../constants/fileSelection';
import type { FileInfo } from '../api/client';
import FileSelectionWarning from './FileSelectionWarning.vue';
import PackIcon from './PackIcon.vue';

interface Props {
  allFiles: FileInfo[];
  loading?: boolean;
}

type Emits = (e: 'repack', selectedFiles: FileInfo[]) => void;

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<Emits>();

// Local reactive state to avoid mutating props directly (Vue one-way data flow)
const localFiles = ref<FileInfo[]>([]);

// Sync props.allFiles to localFiles with deep copying to maintain reactivity
watch(
  () => props.allFiles,
  (newFiles) => {
    // Deep clone to avoid mutating props - fallback to JSON method for compatibility
    try {
      localFiles.value = structuredClone(newFiles || []);
    } catch {
      localFiles.value = JSON.parse(JSON.stringify(newFiles || []));
    }
  },
  { immediate: true },
);

const hasFiles = computed(() => localFiles.value.length > 0);

const selectedFiles = computed(() => localFiles.value.filter((file) => file.selected));

const hasSelectedFiles = computed(() => selectedFiles.value.length > 0);

const totalChars = computed(() => localFiles.value.reduce((sum, file) => sum + file.charCount, 0));

const selectedChars = computed(() => selectedFiles.value.reduce((sum, file) => sum + file.charCount, 0));

const sortedFiles = computed(() => [...localFiles.value].sort((a, b) => b.charCount - a.charCount));

const selectAll = () => {
  for (const file of localFiles.value) {
    file.selected = true;
  }
};

const deselectAll = () => {
  for (const file of localFiles.value) {
    file.selected = false;
  }
};

const handleRepack = () => {
  if (hasSelectedFiles.value) {
    emit('repack', selectedFiles.value);
  }
};

const toggleFileSelection = (file: FileInfo, event?: Event) => {
  // Prevent double-toggling when clicking directly on checkbox
  if (event?.target && (event.target as HTMLInputElement).type === 'checkbox') {
    return;
  }

  file.selected = !file.selected;
};
</script>

<style scoped>
.file-selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
  border-radius: 8px 8px 0 0;
}

.file-selection-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: var(--vp-c-text-2);
}

.file-selection-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
}

.action-btn.repack {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.action-btn.repack:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-selection-stats {
  padding: 12px 16px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-border);
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.stat-item {
  color: var(--vp-c-text-1);
}

.stat-separator {
  margin: 0 8px;
  color: var(--vp-c-text-3);
}

.file-list-container {
  max-height: 300px;
  overflow-y: auto;
  background: var(--vp-c-bg);
}

.file-list-scroll {
  padding: 0;
}

.file-table {
  width: 100%;
  border-collapse: collapse;
}

.file-table th {
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-border);
  padding: 8px 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  position: sticky;
  top: 0;
}

.checkbox-column {
  width: 40px;
  text-align: center;
}

.file-path-column {
  width: 70%;
}

.file-table .chars-column {
  width: 30%;
  text-align: left;
  padding-right: 2rem;
}

.file-row {
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.file-row:hover {
  background: var(--vp-c-bg-soft);
}

.file-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--vp-c-border-soft);
}

.checkbox-cell {
  text-align: center;
}

.file-path-cell {
  max-width: 0;
  width: 100%;
}

.file-path {
  font-size: 13px;
  color: var(--vp-c-text-1);
  word-break: break-all;
  font-family: var(--vp-font-family-mono);
}

.file-table .chars-cell {
  text-align: left;
  padding-right: 2rem;
}

.file-chars {
  font-size: 12px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

.header-checkbox {
  cursor: pointer;
}

.file-checkbox {
  cursor: pointer;
}


@media (max-width: 768px) {
  .file-selection-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .file-selection-actions {
    justify-content: space-between;
  }

  .action-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>

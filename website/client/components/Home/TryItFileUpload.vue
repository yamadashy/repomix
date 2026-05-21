<script setup lang="ts">
import { AlertTriangle, FolderArchive } from 'lucide-vue-next';
import { useFileUpload } from '../../composables/useFileUpload';
import { useZipProcessor } from '../../composables/useZipProcessor';
import PackButton from './PackButton.vue';

const props = defineProps<{
  loading: boolean;
  showButton?: boolean;
}>();

const emit = defineEmits<{
  upload: [file: File];
  cancel: [];
}>();

const { validateZipFile } = useZipProcessor();

const {
  fileInput,
  dragActive,
  selectedItem: selectedFile,
  errorMessage,
  hasError,
  isValid,
  inputAttributes,
  handleFileSelect,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  triggerFileInput,
  clearSelection,
} = useFileUpload({
  mode: 'file',
  placeholder: 'Drop your ZIP file here or click to browse (max 10MB)',
  icon: 'file',
  options: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    acceptedTypes: ['.zip'],
    accept: '.zip',
    validateFile: validateZipFile,
  },
});

async function onFileSelect(files: FileList | null) {
  const result = await handleFileSelect(files);
  if (result.success && result.result) {
    emit('upload', result.result);
  }
}

async function onDrop(event: DragEvent) {
  const result = await handleDrop(event);
  if (result.success && result.result) {
    emit('upload', result.result);
  }
}

function clearFile() {
  clearSelection();
}
</script>

<template>
  <div class="upload-wrapper">
    <div
      class="upload-container"
      :class="{ 'drag-active': dragActive, 'has-error': hasError }"
      role="button"
      tabindex="0"
      aria-label="Upload ZIP file"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="onDrop"
      @click="triggerFileInput"
      @keydown.enter.self.prevent="triggerFileInput"
      @keydown.space.self.prevent="triggerFileInput"
    >
      <input
        ref="fileInput"
        v-bind="inputAttributes"
        class="hidden-input"
        @change="(e) => onFileSelect((e.target as HTMLInputElement).files)"
      />
      <div class="upload-content">
        <div class="upload-icon">
          <AlertTriangle v-if="hasError" class="icon-error" size="20" />
          <FolderArchive v-else class="icon-folder" size="20" />
        </div>
        <div class="upload-text">
          <p v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </p>
          <p v-else-if="selectedFile" class="selected-file">
            Selected: {{ selectedFile }}
            <button
              type="button"
              class="clear-button"
              aria-label="Clear selected file"
              @click.stop="clearFile"
            >×</button>
          </p>
          <template v-else>
            <p>Drop your ZIP file here or click to browse (max 10MB)</p>
          </template>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showButton" class="pack-button-container">
    <PackButton
      :loading="loading"
      :isValid="isValid"
      @cancel="$emit('cancel')"
    />
  </div>
</template>

<style scoped>
.upload-wrapper {
  width: 100%;
}

.upload-container {
  border: 2px dashed var(--vp-c-border);
  border-radius: 8px;
  padding: 0 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 50px;
  display: flex;
  align-items: center;
  background: var(--vp-c-bg);
  user-select: none;
}

.upload-container:hover {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-soft);
}

.upload-container:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.drag-active {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-soft);
}

.has-error {
  border-color: var(--vp-c-danger-1);
}

.hidden-input {
  display: none;
}

.upload-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  width: 100%;
  pointer-events: none; /* Allow clicks to pass through to container */
}

.upload-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-folder {
  color: var(--vp-c-text-1);
}

.icon-error {
  color: var(--vp-c-danger-1);
}

.upload-text {
  flex: 1;
  font-size: 14px;
}

.upload-text p {
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.error-message {
  color: var(--vp-c-danger-1);
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.clear-button {
  background: none;
  border: none;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 1.2em;
  padding: 0 4px;
  line-height: 1;
  flex-shrink: 0;
  pointer-events: auto; /* Re-enable pointer events for button */
}

.clear-button:hover {
  color: var(--vp-c-text-1);
}

.pack-button-container {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

@media (max-width: 640px) {
  .upload-text p {
    font-size: 13px;
  }
}
</style>

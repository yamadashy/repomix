<script setup lang="ts">
import { ref, computed } from 'vue';
import PackButton from './PackButton.vue';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const emit = defineEmits<{
  (e: 'upload', file: File): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const dragActive = ref(false);
const selectedFile = ref<File | null>(null);
const errorMessage = ref<string | null>(null);
const loading = ref(false);
const isValidUrl = ref(false);

function validateFile(file: File): boolean {
  errorMessage.value = null;

  if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
    errorMessage.value = 'Please upload a ZIP file';
    return false;
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    errorMessage.value = `File size (${sizeMB}MB) exceeds the 10MB limit`;
    return false;
  }

  return true;
}

function handleFileSelect(files: FileList | null) {
  if (!files || files.length === 0) return;

  const file = files[0];
  if (validateFile(file)) {
    selectedFile.value = file;
    emit('upload', file);
  } else {
    selectedFile.value = null;
  }
}

</script>

<template>
  <div class="upload-wrapper">
    <div class="upload-container"
      :class="{ 'drag-active': dragActive, 'has-error': errorMessage }"
      @dragover.prevent="dragActive = true"
      @dragleave="dragActive = false"
      @drop.prevent="handleFileSelect($event.dataTransfer?.files || null)"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".zip"
        class="hidden-input"
        @change="(e) => handleFileSelect((e.target as HTMLInputElement).files)"
      />
      <div class="upload-content" @click="fileInput?.click()">
        <div class="upload-icon">
          <span v-if="errorMessage">⚠️</span>
          <span v-else>📁</span>
        </div>
        <div class="upload-text">
          <p v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </p>
          <p v-else-if="selectedFile" class="selected-file">
            Selected: {{ selectedFile.name }}
            <button class="clear-button" @click.stop="selectedFile = null">×</button>
          </p>
          <template v-else>
            <p>Drop your ZIP file here</p>
            <p class="upload-hint">or click to browse (max 10MB)</p>
          </template>
        </div>
      </div>
    </div>
  </div>
  <div class="pack-button-container">
      <PackButton
        :loading="loading"
        :isValid="!!selectedFile"
      />
  </div>
</template>

<style scoped>
.upload-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-container {
  border: 2px dashed var(--vp-c-border);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-grow: 1;
}

.upload-container:hover {
  border-color: var(--vp-c-brand);
}

.drag-active {
  border-color: var(--vp-c-brand);
  background-color: var(--vp-c-bg-soft);
}

.has-error {
  border-color: var(--vp-c-danger);
}

.hidden-input {
  display: none;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-icon {
  font-size: 2rem;
}

.upload-text {
  text-align: center;
}

.upload-hint {
  color: var(--vp-c-text-2);
  font-size: 0.9em;
}

.error-message {
  color: var(--vp-c-danger);
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-button {
  background: none;
  border: none;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 1.2em;
  padding: 0 4px;
  line-height: 1;
}

.clear-button:hover {
  color: var(--vp-c-text-1);
}

.pack-button-container {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 16px;
  margin-bottom: 16px;
}
</style>

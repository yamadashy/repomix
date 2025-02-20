<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next';
import { computed } from 'vue';
import PackButton from './PackButton.vue';
import { isValidRemoteValue } from './utils/validation.js';

const props = defineProps<{
  url: string;
  loading: boolean;
  showButton?: boolean;
}>();

const emit = defineEmits<{
  'update:url': [value: string];
  submit: [];
  keydown: [event: KeyboardEvent];
}>();

const isValidUrl = computed(() => {
  if (!props.url) return false;
  return isValidRemoteValue(props.url.trim());
});

function handleUrlInput(event: Event) {
  const input = event.target as HTMLInputElement;
  emit('update:url', input.value);
}

function handleKeydown(event: KeyboardEvent) {
  emit('keydown', event);
}
</script>

<template>
  <div class="input-group">
    <div class="url-input-container">
      <input
        :value="url"
        @input="handleUrlInput"
        @keydown="handleKeydown"
        type="text"
        placeholder="GitHub repository URL or user/repo (e.g., yamadashy/repomix)"
        class="repository-input"
        :class="{ 'invalid': url && !isValidUrl }"
        aria-label="GitHub repository URL"
      />
    </div>

    <div v-if="url && !isValidUrl" class="url-warning">
      <AlertTriangle class="warning-icon" size="16" />
      <span>Please enter a valid GitHub repository URL (e.g., yamadashy/repomix)</span>
    </div>
    <div v-if="showButton" class="pack-button-container">
      <PackButton :isValid="isValidUrl" :loading="loading"/>
    </div>
  </div>
</template>

<style scoped>
.input-group {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.url-input-container {
  flex: 1;
  position: relative;
  height: 100%;
}

.repository-input {
  width: 100%;
  height: 50px;
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

.pack-button-container {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  width: 100%;
}
</style>

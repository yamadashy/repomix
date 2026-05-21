<template>
  <button
    class="pack-button"
    :class="{ 'pack-button--loading': loading }"
    :disabled="!isValid && !loading"
    :aria-label="loading ? 'Cancel processing' : 'Pack repository'"
    :type="loading ? 'button' : 'submit'"
    @click="handleClick"
  >
    <span class="pack-button__text pack-button__text--normal">
      {{ loading ? 'Processing...' : 'Pack' }}
    </span>
    <span class="pack-button__text pack-button__text--hover">
      {{ loading ? 'Cancel' : 'Pack' }}
    </span>
    <PackIcon v-if="!loading" :size="20" />
  </button>
</template>

<script setup lang="ts">
import PackIcon from './PackIcon.vue';

const props = defineProps<{
  loading?: boolean;
  isValid?: boolean;
}>();

const emit = defineEmits<(e: 'cancel') => void>();

function handleClick(event: MouseEvent) {
  // type=button while loading prevents form submission, so any click
  // (mouse or keyboard) safely signals cancel.
  if (props.loading) {
    event.preventDefault();
    event.stopPropagation();
    emit('cancel');
  }
}
</script>

<style scoped>
.pack-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  height: 50px;
  width: 100%;
  font-size: 16px;
  font-weight: 500;
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.pack-button:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}

.pack-button--loading:hover {
  background: var(--vp-c-danger-1);
}

.pack-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pack-button__text {
  transition: opacity 0.2s ease;
}

.pack-button__text--hover {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.pack-button--loading:hover .pack-button__text--normal {
  opacity: 0;
}

.pack-button--loading:hover .pack-button__text--hover {
  opacity: 1;
}

.pack-button-icon {
  font-size: 20px;
  line-height: 1;
}

@media (max-width: 768px) {
  .pack-button {
    width: 100%;
  }
}
</style>

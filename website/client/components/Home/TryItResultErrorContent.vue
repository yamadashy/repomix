<script setup lang="ts">
import { AlertCircle, AlertTriangle, Copy } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import type { PackOptions } from '../../composables/usePackOptions';
import { generateCliCommand } from '../utils/cliCommand';

const props = defineProps<{
  message: string;
  repositoryUrl?: string;
  errorType?: 'error' | 'warning';
  packOptions?: PackOptions;
}>();

const copied = ref(false);
const commandWithRepo = computed(() => {
  if (!props.repositoryUrl) {
    return 'npx repomix --remote <repository-url>';
  }
  return generateCliCommand(props.repositoryUrl, props.packOptions);
});

const copyCommand = async (event: Event) => {
  event.preventDefault();
  event.stopPropagation();
  await navigator.clipboard.writeText(commandWithRepo.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
};
</script>

<template>
  <div :class="errorType === 'warning' ? 'warning' : 'error'">
    <div class="content">
      <AlertCircle v-if="errorType === 'warning'" :size="32" class="warning-icon" />
      <AlertTriangle v-else :size="32" class="error-icon" />
      <p :class="errorType === 'warning' ? 'warning-message' : 'error-message'">{{ message }}</p>
      <div class="suggestion">
        <p>Try using the command line tool instead:</p>
        <div class="command-block">
          <code>{{ commandWithRepo }}</code>
          <button class="copy-button" @click="copyCommand" :class="{ copied }">
            <Copy :size="14" />
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        <p class="guide-link">
          See <a href="#using-the-cli-tool">Using the CLI Tool</a> for more details.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error,
.warning {
  padding: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.content {
  max-width: 700px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.error-icon {
  color: var(--vp-c-danger-1);
  margin-bottom: 16px;
}

.warning-icon {
  color: var(--vp-c-warning-1);
  margin-bottom: 16px;
}

.error-message {
  color: var(--vp-c-danger-1);
  font-size: 1.1em;
  margin: 0 0 24px;
  white-space: pre-wrap;
}

.warning-message {
  color: var(--vp-c-warning-1);
  font-size: 1.1em;
  margin: 0 0 24px;
  white-space: pre-wrap;
}

.suggestion {
  background: var(--vp-c-bg-soft);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-border);
  width: 100%;
}

.suggestion p {
  margin: 0 0 12px;
  color: var(--vp-c-text-2);
}

.command-block {
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-family: var(--vp-font-family-mono);
}

code {
  color: var(--vp-c-text-1);
}

.copy-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.copy-button.copied {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.guide-link a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 500;
}

.guide-link a:hover {
  text-decoration: underline;
}
</style>

<script setup lang="ts">
import { Star } from 'lucide-vue-next';
import { computed, ref } from 'vue';

const messages = [
  // {
  //   type: 'sponsor',
  //   link: 'https://github.com/sponsors/yamadashy',
  //   icon: HeartHandshake,
  //   linkText: 'Become a sponsor',
  //   suffix: ' to support Repomix development',
  //   color: '#b04386',
  // },
  {
    type: 'star',
    link: 'https://github.com/yamadashy/repomix',
    icon: Star,
    linkText: 'Star this project',
    suffix: ' if you find it useful!',
    color: '#f1c40f',
  },
];

const currentMessageIndex = ref(Math.floor(Math.random() * messages.length));
const supportMessage = computed(() => messages[currentMessageIndex.value]);
</script>

<template>
  <div class="support-banner">
    <a :href="supportMessage.link" target="_blank" rel="noopener noreferrer" class="support-link">
      <component :is="supportMessage.icon" :size="14" class="support-icon" />
      <span class="link-text">{{ supportMessage.linkText }}</span>{{ supportMessage.suffix }}
    </a>
  </div>
</template>

<style scoped>
.support-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(255, 140, 0, 0.05) 0%, var(--vp-c-bg-soft) 100%);
  border-top: 1px solid var(--vp-c-border);
}

.support-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s ease;
}

.support-link:hover {
  color: var(--vp-c-text-1);
}

.support-icon {
  flex-shrink: 0;
  color: v-bind('supportMessage.color');
}

.link-text {
  text-decoration: underline;
  text-decoration-color: var(--vp-c-text-3);
  transition: text-decoration-color 0.2s ease;
}

.support-link:hover .link-text {
  text-decoration-color: var(--vp-c-text-1);
}
</style>

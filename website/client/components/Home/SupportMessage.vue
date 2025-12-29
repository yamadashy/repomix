<script setup lang="ts">
import { HeartHandshake, Star } from 'lucide-vue-next';
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
  <div class="support-notice">
    <div class="support-message">
      <a :href="supportMessage.link" target="_blank" rel="noopener noreferrer" class="support-link">
        <component :is="supportMessage.icon" :size="14" class="support-icon" />
        <span class="link-text">{{ supportMessage.linkText }}</span>{{ supportMessage.suffix }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.support-notice {
  padding: 8px;
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-border);
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-height: 45px;
}

.support-message {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-2);
  font-size: 12px;
  width: 100%;
}

.support-icon {
  flex-shrink: 0;
  transition: color 0.3s ease;
  color: v-bind('supportMessage.color');
}

.support-link {
  text-decoration: none;
  font-weight: normal;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.support-link:hover {
  color: var(--vp-c-brand-1);
}

.link-text {
  text-decoration: underline;
  text-decoration-color: var(--vp-c-text-3);
  transition: text-decoration-color 0.3s ease;
}

.support-link:hover .link-text {
  text-decoration-color: var(--vp-c-brand-1);
}

@media (max-width: 768px) {
  .support-notice {
    padding: 16px;
  }

  .support-message {
    max-width: 100%;
  }
}
</style>

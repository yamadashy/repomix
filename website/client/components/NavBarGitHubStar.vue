<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const isDesktop = ref(false);
let mediaQuery: MediaQueryList | null = null;

const updateMatch = (e: MediaQueryListEvent | MediaQueryList) => {
  isDesktop.value = e.matches;
};

onMounted(() => {
  mediaQuery = window.matchMedia('(min-width: 960px)');
  updateMatch(mediaQuery);
  mediaQuery.addEventListener('change', updateMatch);
});

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', updateMatch);
});
</script>

<template>
  <div v-if="isDesktop" class="nav-github-star">
    <iframe
      title="Star yamadashy/repomix on GitHub"
      src="https://unpkg.com/github-buttons@2.29.1/dist/buttons.html#href=https%3A%2F%2Fgithub.com%2Fyamadashy%2Frepomix&data-text=Star&data-size=large&data-show-count=true&data-color-scheme=no-preference%3A+light%3B+light%3A+light%3B+dark%3A+dark%3B"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      scrolling="no"
      class="github-star-button"
    />
  </div>
</template>

<style scoped>
.nav-github-star {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--vp-nav-height);
  padding: 0 12px;
}

.github-star-button {
  width: 130px;
  height: 28px;
  border: none;
  color-scheme: light dark;
}
</style>

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
  <!-- The wrapper is always rendered (hidden below 960px via CSS) so the navbar
       reserves the button's width before the client-side mount inserts the
       iframe; gating the wrapper itself with v-if shifts the navbar (CLS). -->
  <div class="nav-github-star">
    <iframe
      v-if="isDesktop"
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
  display: none;
}

/* Match the JS breakpoint (min-width: 960px) that gates the iframe. */
@media (min-width: 960px) {
  .nav-github-star {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    height: var(--vp-nav-height);
    /* 130px iframe + 12px padding on each side */
    width: 154px;
    padding: 0 12px;
  }
}

.github-star-button {
  width: 130px;
  height: 28px;
  border: none;
  color-scheme: light dark;
}
</style>

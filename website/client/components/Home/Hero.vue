<script setup>
import { useData } from 'vitepress';

const { site } = useData();
</script>

<template>
  <section class="hero">
    <h1 class="hero-title">
      {{ site.title }}
    </h1>
    <p class="hero-description">
      Pack your codebase into <span class="hero-description__accent">AI-friendly</span> formats
    </p>
  </section>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 20px 20px;
  max-width: 960px;
  margin: 0 auto;
}

.hero-title {
  font-size: 64px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 24px;
  background: -webkit-linear-gradient(0deg, #f97316 30%, #ffb25c);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-description {
  font-size: 32px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 16px;
  color: var(--vp-c-text-1);
}

.hero-description__accent {
  color: var(--vp-c-brand-1);
}

.hero-tagline {
  font-size: 18px;
  color: var(--vp-c-text-2);
  margin: 0;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 48px;
  }

  .hero-description {
    font-size: 24px;
  }

  .hero-tagline {
    font-size: 16px;
  }
}
</style>

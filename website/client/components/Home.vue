<script setup>
import Hero from './Home/Hero.vue';
import TryIt from './Home/TryIt.vue';
</script>

<!-- Use <main> so the home page exposes a main landmark (VitePress home layout omits one). -->
<template>
  <main class="home">
    <Hero />
    <TryIt />
  </main>
</template>

<style scoped>
.home {
  padding-bottom: 60px;
}
</style>

<script setup lang="ts">
import type { VideoId } from '../constants/videos';

defineProps<{
  videoId: VideoId | string;
  start?: number;
}>();
</script>

<template>
  <div class="full-width-youtube-video">
    <iframe
      width="560"
      height="315"
      :src="`https://www.youtube-nocookie.com/embed/${videoId}${start ? `?start=${start}` : ''}`"
      title="YouTube video player"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>
  </div>
</template>

<style scoped>
.full-width-youtube-video {
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
}

.full-width-youtube-video iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0.5rem;
}
</style>

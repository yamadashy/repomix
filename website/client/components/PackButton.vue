<template>
  <button
    class="pack-button"
    :disabled="!isValid || loading"
    aria-label="Pack repository"
    type="submit"
  >
    {{ loading ? 'Processing...' : 'Pack' }}
    <svg v-if="!loading"
         class="pack-button-icon"
         width="20"
         height="20"
         viewBox="96.259 93.171 300 300"
    >
      <g transform="matrix(1.160932, 0, 0, 1.160932, 97.635941, 94.725143)">
        <path
          fill="currentColor"
          d="M 128.03 -1.486 L 21.879 65.349 L 21.848 190.25 L 127.979 256.927 L 234.2 190.27 L 234.197 65.463 L 128.03 -1.486 Z M 208.832 70.323 L 127.984 121.129 L 47.173 70.323 L 128.144 19.57 L 208.832 70.323 Z M 39.669 86.367 L 119.188 136.415 L 119.255 230.529 L 39.637 180.386 L 39.669 86.367 Z M 136.896 230.506 L 136.887 136.575 L 216.469 86.192 L 216.417 180.46 L 136.896 230.506 Z M 136.622 230.849"
        />
      </g>
    </svg>
  </button>
</template>

<script setup>
defineProps({
  loading: Boolean,
  isValid: Boolean,
});
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

}

.pack-button:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}

.pack-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

<template>
  <div class="loading">
    <div class="loading-header">
      <div class="spinner"></div>
      <p>Processing repository...</p>
    </div>
    <div class="sponsor-section">
      <p class="sponsor-header">Special thanks to:</p>
      <a href="https://go.warp.dev/repomix" target="_blank" rel="noopener noreferrer">
        <img alt="Warp sponsorship" width="400" src="https://raw.githubusercontent.com/warpdotdev/brand-assets/main/Github/Sponsor/Warp-Github-LG-01.png">
      </a>
      <p class="sponsor-title">
        <a href="https://go.warp.dev/repomix" target="_blank" rel="noopener noreferrer">
          Warp, built for coding with multiple AI agents
        </a>
      </p>
      <p class="sponsor-subtitle">
        <a href="https://go.warp.dev/repomix" target="_blank" rel="noopener noreferrer">
          Available for MacOS, Linux, & Windows
        </a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.loading {
  padding: 24px;
  text-align: center;
}

.loading-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.loading-header p {
  margin: 0;
}

.spinner {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: 2px solid var(--vp-c-brand-1);
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

.sponsor-section {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sponsor-section p {
  margin: 8px 0;
}

.sponsor-section .sponsor-header {
  font-size: 0.9em;
}

.sponsor-section img {
  max-width: 100%;
  height: auto;
  margin: 12px 0;
}

.sponsor-section .sponsor-title {
  font-weight: bold;
  font-size: 1.1em;
  color: var(--vp-c-brand-1);
  text-decoration: underline;
}

.sponsor-section .sponsor-subtitle {
  font-size: 0.9em;
  color: var(--vp-c-brand-1);
  text-decoration: underline;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

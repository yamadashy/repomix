<template>
  <div class="nav-github-star">
    <iframe
      src="https://unpkg.com/github-buttons@2.29.1/dist/buttons.html#href=https%3A%2F%2Fgithub.com%2Fyamadashy%2Frepomix&data-text=Star&data-size=large&data-show-count=true&data-color-scheme=no-preference%3A+light%3B+light%3A+light%3B+dark%3A+dark%3B"
      allowtransparency="true"
      scrolling="no"
      frameborder="0"
      class="github-star-button"
    />
  </div>
</template>

<style scoped>
.nav-github-star {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 2px;
}

.github-star-button {
  width: 140px;
  height: 28px;
  border: none;
  color-scheme: light dark;
  margin-left: 16px;
}
</style>

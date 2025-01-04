declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // biome-ignore lint lint/suspicious/noExplicitAny: Vue component
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

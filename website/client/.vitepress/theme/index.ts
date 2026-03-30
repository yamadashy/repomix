import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';
import Home from '../../components/Home.vue';
import HomeBadges from '../../components/HomeBadges.vue';
import NavBarGitHubStar from '../../components/NavBarGitHubStar.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'home-hero-after': () => h(Home),
      'home-features-after': () => h(HomeBadges),
      'nav-bar-content-after': () => h(NavBarGitHubStar),
    });
  },
} satisfies Theme;

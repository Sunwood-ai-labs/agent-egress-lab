import { defineConfig } from 'vitepress'

const repo = 'https://github.com/Sunwood-ai-labs/agent-egress-lab'

export default defineConfig({
  title: 'Agent Egress Lab',
  description: 'Reproducible default-deny egress and offline E2E security lab',
  base: '/agent-egress-lab/',
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: 'https://sunwood-ai-labs.github.io/agent-egress-lab/' },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/agent-egress-lab/icon.svg' }],
    ['meta', { property: 'og:image', content: 'https://sunwood-ai-labs.github.io/agent-egress-lab/release-header-v0.1.0.svg' }]
  ],
  locales: {
    root: { label: 'English', lang: 'en' },
    ja: { label: '日本語', lang: 'ja', link: '/ja/' }
  },
  themeConfig: {
    logo: '/icon.svg',
    socialLinks: [{ icon: 'github', link: repo }],
    search: { provider: 'local' },
    locales: {
      root: {
        label: 'English',
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Security', link: '/guide/security-model' },
          { text: 'v0.1.0', link: '/releases/v0.1.0' }
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Getting started', link: '/guide/getting-started' },
              { text: 'Security model', link: '/guide/security-model' },
              { text: 'Offline Playwright E2E', link: '/guide/offline-e2e' },
              { text: 'Read-only research gateway', link: '/guide/readonly-fetch' }
            ]
          },
          {
            text: 'Release',
            items: [
              { text: 'v0.1.0 notes', link: '/releases/v0.1.0' },
              { text: 'v0.1.0 walkthrough', link: '/guide/articles/v0.1.0-walkthrough' }
            ]
          }
        ],
        editLink: { pattern: `${repo}/edit/main/docs/:path`, text: 'Edit this page on GitHub' },
        footer: { message: 'Educational security lab — not a production security boundary.', copyright: 'MIT License · Sunwood AI Labs' },
        outline: { label: 'On this page' },
        lastUpdated: { text: 'Last updated' },
        docFooter: { prev: 'Previous', next: 'Next' }
      },
      ja: {
        label: '日本語',
        nav: [
          { text: 'ガイド', link: '/ja/guide/getting-started' },
          { text: 'セキュリティ', link: '/ja/guide/security-model' },
          { text: 'v0.1.0', link: '/ja/releases/v0.1.0' }
        ],
        sidebar: [
          {
            text: 'ガイド',
            items: [
              { text: 'はじめに', link: '/ja/guide/getting-started' },
              { text: 'セキュリティモデル', link: '/ja/guide/security-model' },
              { text: 'Offline Playwright E2E', link: '/ja/guide/offline-e2e' },
              { text: '読み取り専用Research Gateway', link: '/ja/guide/readonly-fetch' }
            ]
          },
          {
            text: 'リリース',
            items: [
              { text: 'v0.1.0 リリースノート', link: '/ja/releases/v0.1.0' },
              { text: 'v0.1.0 ウォークスルー', link: '/ja/guide/articles/v0.1.0-walkthrough' }
            ]
          }
        ],
        editLink: { pattern: `${repo}/edit/main/docs/:path`, text: 'GitHubで編集する' },
        footer: { message: '教育・検証用セキュリティラボ — 本番向け境界ではありません。', copyright: 'MIT License · Sunwood AI Labs' },
        outline: { label: '目次' },
        lastUpdated: { text: '最終更新' },
        docFooter: { prev: '前へ', next: '次へ' }
      }
    }
  }
})

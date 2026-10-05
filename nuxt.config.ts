export default defineNuxtConfig({
  compatibilityDate: '2025-10-03',
  ssr: true,
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts'
  },
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: '',
    storageKey: 'companion-chat-color'
  },
  app: {
    head: {
      title: '星语陪伴 — AI 情感陪伴',
      htmlAttrs: { lang: 'zh-CN', class: 'dark' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#1a0614' },
        { name: 'description', content: '年轻单身群体的 AI 情感陪伴对话。月费 ￥9.90，无限畅聊。' }
      ]
    }
  },
  ui: {
    icons: ['heroicons']
  },
  runtimeConfig: {
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    openrouterModel: process.env.OPENROUTER_MODEL || 'qwen/qwen3.8-27b:free',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3002/api/auth/google/callback',
    googleHttpsProxy: process.env.GOOGLE_HTTPS_PROXY || process.env.HTTPS_PROXY || '',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
    zpayPid: process.env.ZPAY_PID || '',
    zpayKey: process.env.ZPAY_KEY || '',
    zpayType: process.env.ZPAY_TYPE || 'alipay',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || ''
    }
  }
})

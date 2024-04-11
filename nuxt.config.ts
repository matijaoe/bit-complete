// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@unocss/nuxt',
  ],
  devtools: { enabled: true },
  unocss: {
    theme: {
      fontFamily: {
        mono: 'Space Mono, sans-serif',
      },
    }
  }
})

// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Desktiny contributors
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import App from './App.vue'
import { router } from './router'
import { setDateFormatter } from '@dx/web-shared/api.ts'
import { formatDate, formatDateTime, startPreferences } from './ui/preferences'
import { loadAppearance } from './ui/appearance'
import '@dx/web-shared/style.css'
import './style.css'
import './collab.css'
import './shell.css'
import './ai/ai.css'
import './refine.css'

// Personal settings (theme, text size, motion…) go on <html> before anything renders.
startPreferences()
// Every list's dates follow the person's date/time format (reactive: they read the live settings).
setDateFormatter((value, withTime) => (withTime ? formatDateTime(value, undefined, value) : formatDate(value, undefined, value)))
const app = createApp(App)
app.use(createPinia())
app.use(VueQueryPlugin, {
  queryClient: new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 20_000, refetchOnWindowFocus: true },
    },
  }),
})
app.use(router)
// The sector pack's look first, so nobody sees the stock colours flash; it gives up quickly.
void loadAppearance().finally(() => app.mount('#app'))

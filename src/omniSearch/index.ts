import 'source-map-support/register'

import { createApp } from 'vue'

import App from '@/omniSearch/App.vue'
import '@/omniSearch/index.scss'
import useMessageTunnel from '@/omniSearch/useMessageTunnel'

const $app = document.getElementById('app')!

createApp(App).provide('$app', $app).provide('$msg', useMessageTunnel()).mount($app)

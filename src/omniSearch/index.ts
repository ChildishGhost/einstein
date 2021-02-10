import App from '@/omniSearch/App.vue'
import '@/omniSearch/index.scss'
import useMessageChannel from '@/omniSearch/useMessageChannel'
import { createApp } from 'vue'

const $app = document.getElementById('app')

createApp(App).provide('$app', $app).provide('$msg', useMessageChannel()).mount($app)

import { createApp } from 'vue'
import '@/omniSearch/index.scss'
import App from '@/omniSearch/App.vue'
import useMessageChannel from '@/omniSearch/useMessageChannel'

const $app = document.getElementById('app')

createApp(App)
	.provide('$app', $app)
	.provide('$msg', useMessageChannel())
	.mount($app)

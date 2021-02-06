import { createApp } from 'vue'
import '@/omniSearch/index.scss'
import App from '@/omniSearch/App.vue'

const $app = document.getElementById('app')

createApp(App)
	.provide('$app', $app)
	.mount($app)

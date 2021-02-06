import { createApp } from 'vue'
import '@/renderer/index.scss'
import App from '@/renderer/App.vue'

const $app = document.getElementById('app')

createApp(App)
	.provide('$app', $app)
	.mount($app)

<template>
<div :class="style.container">
	<aside :class="style.icon">
		<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAHCklEQVR4Xu2be0zTVxTHjxN5GAfoViVGZBAF42RsiG9BGkLEII6MiCEjgk7nA2wQBNrSUoulFBAliK/pVJSFCLI0GCKGEFBQpyCu8xFgpD5AJuICZu9Nt+Ue2lpKXxel7S94/4H23t+93/P5nXvu/fWe3zgY42XcGLcf3gJ46wFjnMCbnAJvsi9zbst/5jQy1Wakot8BgPEAYKfoelI+wc5+tamBRqP+5YuXl33dWWEA8AIAXgLAv7Tj0AIgRjveffzsV9qBLNH+0xWLXTo7O39TwTBrSHMBkHYOd7r7/lD3+tEMllkDWKrRD919mqHmzWA5AcBfAGBympgDgLSZeLurF++6n/s0S9k0onEUXb14na/7tHcBgHiDUQimAJB6J8XDJ6Qj+MTDbUSiLH3RrYdPcEg/D7dJAPC7MQimANh/f7+HuBL4e043aMf7LBa4Tp5sUTsH+vvhWd8rt9cdvPV+D371sed0BwD425A4YwBI3Xutyu6+AK8Zw66f5e1tUYNNDdbZ0TGsSYuyG/jJiZ41cvkjQyuEMQAONzsf/Ul6XTBr5pDObc14tThdCM2dxG6A+bNmOqqC4jBIxgC4Nnc86F/k/QEjjDcE4XrHA1jg/cEUABjQFwsMASAbHbcbbcrHi+d4MRrAd21KWDjHyx0ASFAYtlEyBGB87bWb8kkuzquXzZ1tFEB7ezvW+/j4mJqmFqnXnQZX7v2IC+GSD2fb6dsgGQJgf+V2O0b/QN9XhrGmTgUXV9chhsTHxwOPx9N8Z20QzwcGoO/pU42extuDN2iZr4/e1cAQAIdGxT0MgCv85mo6Mxb8EhISgMPhYNszZ86ARCKxyB3XN4i2F1xS3MMmgX5z9QZCQwAcL7XewW0v23+eWQDUjWxhSmgDqG+9g9JW+M8j22O8qdrFIID6FgUCCAnwMwtAc3MzODs7Y9ugoCDo7R3cklqjaAOoa1GgBHaAHx2AuhutCCB0ob9RAE1NTcBiDT4Y9fT0AJvNtobNQ8bUBlB7oxXrQhb6TwQAzcOc+gKDHlB7rQUbr1wSYBSALbi8LnFtABevtWB16JIAKgBOF5uuk4cIWLV8kVlTwOq3XUuANoALTdexZuXyRXQALjReRQDhgUsZDaC68SrqXxW4lA5AdUMjAogIDnwtAOopos9DRmvPoO0B5xsacejw4EA6AFV1DQggMiT4tQBYY2poA5DXNaCENSHBdADktfUI4LPQV1HdVp8CjQXBb2vrsToylE0HoLKmFgGsDQtltAdU1NSi/qiwUDoAFdU1CGBdOPnVebAw0QPOVteg9rXhYXQAzlZVI4CYNeGMBlBWVY36160JpwNQJj+PAD6PjGA0gG/k51F/TGQEHYDSSjkCWB8VyWgApyvlqD82KpIOwOnySgQQHx3FaACnyitR//roKDoAp8rKEcDGmGhGAzhRVo7642Oi6QB8XVqGADbHxjAawLHSMtT/RWwMHYDjJaUI4Mu4WEYD+KqkFPVvioulAuB45GQJPg5v3xDHaACHTpag/q0b4ugAHDp+AgEkbtrIaADFx0+g/u2bNtIBKD56DAFwtmxmNICio8dQf+KWzXQAig4fQQBJ27YyGkDh4SOon7NtKx2AwuKDCCA5MYHRAPYVH0T9SYkJdAD2FR1AALs4OxgNYG/RAdSfzNlBB2Dv/kIEkLYzidEA8vYXov5dO5PoAOQVFCAAbkoKowHICgpQf1pKCt25gCwvHwHw01IZDUCal4/6uWmpVAAcpDIZHiMJuFwNAH2Ho5pKG/lH93BUIpOhMj6XSwXAni8UVk10clqZyecPMc3WfxXSPR7PkkpRv4DPpzodJmfpnuI9kg6xUMBoAKI9EhAJBXMAQAkA/+g6qrEMkem7xeKuLJGI0QAyxWLYLRJ5AEA3TYYIATMlUyR6RqyXiMWMgKDr/gLVzcsSi8np7c80OULEYBI0ZgszhYrsrD3DQpytxQJ9aXIZmUKoKK9gt7W1kQPCYSfDxChjWWKYKJUhyHhMGuZIsg3GeVtMlOQJMlBvtiSbJDn+NJI8QbUXePL5/Lvkg0wVUW1kxTMog6tauaRSKUlvua9Kl9Xb3lSqLKknaR9ePB4XMw1ycwbXVVst6bzBfUtOjmy+KvI/f51cYdIXmQouAOCRnp52S214fm6eTTFITU/T6MnNzSNpLQ9VyZFGX6Iw5QHqTgkEknk9zc7Ozi05eedlm7JeJebcucoIpVJJkoZJujhJ7zf5Bom5ANQBc4JqSpDUcDI1nFJ3pZDjV7JxskrJ31sQpIrwxNX7AeAXVXa4yZclTK0Chgwi0IjBBAbZXtqr/iffk1dqLFHI+0HEQPKuEEmFJ0md5C/5bJbhapE0HmAMyJvoZyTg1MZSGa09kLWEj8TYUbnmLYBRwcqgTse8B/wPKiN2X/BogMwAAAAASUVORK5CYII=" />
	</aside>
	<main :class="style.main">
		<h1 :class="style.title">
			123
		</h1>
		<div :class="style.description">
			234
		</div>
	</main>
</div>
</template>

<script lang="ts">
import { defineComponent, useCssModule } from "vue"

export default defineComponent({
	setup: () => ({
		style: useCssModule(),
	}),
})
</script>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 4px 8px;

	&.hover, &:hover {
		background-color: rgba(255, 255, 255, 0.3);
	}
}

.icon {
	display: flex;
	width: 48px;
	height: 48px;
	align-items: center;
	justify-content: center;
	margin-inline-end: 8px;
}

.title {
	margin: 0;
	font-size: 20pt;
	color: #eee;
}

.description {
	font-size: 16pt;
	color: #999;
}
</style>

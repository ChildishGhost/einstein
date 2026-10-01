#!/usr/bin/env -S deno run --no-prompt --allow-env=CONTAINER_ENGINE --allow-run
// Builds the patched gpui-native addon and its installable packages for the host architecture (RFC-0008/R15).
// CONTAINER_ENGINE overrides the engine, e.g. `host-spawn podman` inside a toolbox.
const [command, ...engineArgs] = (Deno.env.get('CONTAINER_ENGINE') ?? 'podman').trim().split(/\s+/)

const { code } = await new Deno.Command(command, {
	args: [
		...engineArgs,
		'build',
		'-f',
		'native/gpui-native/Containerfile',
		'--build-arg',
		`TARGETS=${Deno.build.arch}-unknown-linux-gnu`,
		'--output',
		'type=local,dest=native/gpui-native/dist',
		'native/gpui-native',
	],
	stdin: 'inherit',
	stdout: 'inherit',
	stderr: 'inherit',
}).output()

Deno.exit(code)

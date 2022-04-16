export type SpawnOptions = {
	cwd?: string
	env?: Record<string, string>
}

export type spawnFn = (command: string, options?: SpawnOptions) => void
export declare const spawn: spawnFn

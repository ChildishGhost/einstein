export type SpawnOptions = {
	cwd?: string
	env?: Record<string, string>
	argv?: ReadonlyArray<string>
}

export type spawnFn = (command: string, options?: SpawnOptions) => void
export declare const spawn: spawnFn

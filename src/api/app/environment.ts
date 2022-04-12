export interface IEnvironment {
	readonly platform: 'linux' | 'macos' | 'other'
	readonly homedir: string
}

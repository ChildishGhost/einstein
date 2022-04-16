export interface IEnvironment {
	readonly platform: 'linux' | 'macos' | 'windows' | 'other'
	readonly homedir: string
}

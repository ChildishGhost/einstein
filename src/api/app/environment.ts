export type EnvironmentPlatform = 'linux' | 'macos' | 'windows' | 'other'

export interface IEnvironment {
	readonly platform: EnvironmentPlatform
	readonly homedir: string
}

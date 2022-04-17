import type { CommentArray } from 'comment-json'

type BasicTypes = number | string | boolean

export type ConfigDefinition = {
	[key: string]: undefined | BasicTypes | BasicTypes[] | ConfigDefinition | ConfigDefinition[]
}

type Array2CommentArray<Def extends ConfigDefinition> = {
	[key in keyof Def]: Def[key] extends undefined ?
		undefined :
		Def[key] extends BasicTypes ?
			Def[key] :
		Def[key] extends BasicTypes[] ?
			CommentArray<Def[key][number]> :
		Def[key] extends ConfigDefinition ?
			Array2CommentArray<Def[key]> :
		Def[key] extends ConfigDefinition[] ?
			CommentArray<Array2CommentArray<Def[key][number]>> :
		never
}

export type Configuration<Def extends ConfigDefinition> = Array2CommentArray<Def>

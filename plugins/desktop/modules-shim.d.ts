declare module 'file-icon' {
	type Options = {
		size?: number
	}

	type Identifier = string | number

	function buffer(identifier: Identifier, options?: Options): Promise<Buffer>
	function buffer(identifier: Identifier[], options?: Options): Promise<Buffer[]>
	function file(identifier: Identifier, options?: Options): Promise<void>
	function file(identifier: Identifier[], options?: Options): Promise<void>

	export { buffer, file }
}

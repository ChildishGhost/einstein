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

// TODO(davy): use more secure plugin loader instead of loading with raw-require function
// eslint-disable-next-line camelcase, no-underscore-dangle
declare let __non_webpack_require__: NodeRequire

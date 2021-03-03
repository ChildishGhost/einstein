/* eslint-disable import/prefer-default-export */
declare module 'file-icon' {
	type Options = {
		size?: number
	}

	type Identifier = string | number

	function fileIconToBuffer(identifier: Identifier, options?: Options): Promise<Buffer>
	function fileIconToBuffer(identifier: Identifier[], options?: Options): Promise<Buffer[]>

	export {
		fileIconToBuffer,
	}
}

// TODO(davy): use more secure plugin loader instead of loading with raw-require function
// eslint-disable-next-line camelcase, no-underscore-dangle
declare let __non_webpack_require__: NodeRequire

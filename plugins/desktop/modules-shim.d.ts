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

/* eslint-disable import/prefer-default-export */

const createMemoizer = (target: any, key: string, descriptor: PropertyDescriptor) => {
	const memoizeKey = `$memoized$:${key}`

	if (typeof descriptor.get !== 'function') {
		throw new Error('Only support getter')
	}

	const fn: Function = descriptor.get

	// eslint-disable-next-line no-param-reassign, func-names
	descriptor.get = function () {
		if (!Object.prototype.hasOwnProperty.call(this, memoizeKey)) {
			Object.defineProperty(this, memoizeKey, {
				configurable: true,
				enumerable: false,
				writable: true,
				value: fn!.apply(this),
			})
		}

		return this[memoizeKey]
	}
}

export function memoize(target: any, key: string, descriptor: any) {
	return createMemoizer(target, key, descriptor)
}

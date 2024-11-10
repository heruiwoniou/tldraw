import { T } from '@tldraw/validate'

/** @public */
export type TLStrokeColorType = string

/** @public */
export const strokeColorValidator = T.string.check((n) => {
	if (n.length !== 7 || !n.startsWith('#')) {
		throw new T.ValidationError('Stroke color must be a hex color string')
	}
})

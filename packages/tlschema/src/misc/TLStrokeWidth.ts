import { T } from '@tldraw/validate'

/** @public */
export type TLStrokeWidthType = number

/** @public */
export const strokeWidthValidator = T.number.check((n) => {
	if (n < 0.25 || n > 100) {
		throw new T.ValidationError('stroke width must be between 0.25 and 200')
	}
})

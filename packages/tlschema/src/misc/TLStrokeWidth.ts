import { T } from '@tldraw/validate'

/** @public */
export type TLStrokeWidthType = number

/** @public */
export const strokeWidthValidator = T.number.check((n) => {
	if (n < 1 || n > 200) {
		throw new T.ValidationError('Opacity must be between 1 and 200')
	}
})

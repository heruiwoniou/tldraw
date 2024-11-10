import { TLDrawShape } from '@tldraw/editor'
import { STROKE_SIZES } from '../shared/default-shape-constants'

export const getStrokeWidth = (shape: TLDrawShape) => {
	return shape.props.strokeWidth ?? STROKE_SIZES[shape.props.size]
}

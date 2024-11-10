import {
	DefaultStylePanel,
	DefaultStylePanelContent,
	Tldraw,
	useEditor,
	useRelevantStyles,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// [6]
function CustomStylePanel() {
	const editor = useEditor()
	const styles = useRelevantStyles()
	const strokeWidth = useValue('strokeWidth', () => editor.getSharedStrokeWidth(), [editor])

	const stroke = useValue('stroke', () => editor.getSharedStrokeColor(), [editor])

	const isDraw = editor.getSelectedShapes().some((shape) => shape.type === 'draw')
	const isDrawing = editor.isIn('draw')

	if (!styles) return null

	return (
		<DefaultStylePanel>
			<DefaultStylePanelContent styles={styles} />
			{(isDraw || isDrawing) && (
				<>
					<input
						type="range"
						min={1}
						max={200}
						value={strokeWidth.type === 'shared' ? strokeWidth.value : 1}
						onChange={(e) => {
							editor.run(() => {
								if (editor.isIn('select')) {
									editor.setStrokeWidthForSelectedDrawShapes(+e.currentTarget.value)
								}
								editor.setStrokeWidthForNextDrawShapes(+e.currentTarget.value)
								editor.updateInstanceState({ isChangingStyle: true })
							})
						}}
					/>
					<input
						type="color"
						value={stroke.type === 'shared' ? stroke.value : '#000000'}
						onChange={(e) => {
							editor.run(() => {
								if (editor.isIn('select')) {
									editor.setStrokeColorForSelectedDrawShapes(e.currentTarget.value)
								}
								editor.setStrokeColorForNextDrawShapes(e.currentTarget.value)
								editor.updateInstanceState({ isChangingStyle: true })
							})
						}}
					/>
				</>
			)}
		</DefaultStylePanel>
	)
}

export default function ShapeWithTldrawStylesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={{
					StylePanel: CustomStylePanel,
				}}
			/>
		</div>
	)
}

/* 

This file shows a custom shape that uses a user-created styles 

For more on custom shapes, see our Custom Shape example.

[1]
In this example, our custom shape will use a new style called "rating".
We'll need to create the style so that we can pass it to the shape's props.

[2]
Here's we extract the type of the style's values. We use it below when
we define the shape's props.

[3]
We pass the style to the shape's props.

[4]
Since this property uses one a style, whatever value we put here in the
shape's default props will be overwritten by the editor's current value 
for that style, which will either be the default value or the most 
recent value the user has set. This is special behavior just for styles.

[5]
We can use the styles in the component just like any other prop.

[6]
Here we create a custom style panel that includes the default style panel
and also a dropdown for the rating style. We use the useRelevantStyles hook
to get the styles of the user's selected shapes, and the useEditor hook to
set the style for the selected shapes. For more on customizing the style
panel, see our custom style panel example.

[7]
We pass the custom shape util and custom components in as props.

[8]
And for this example, we create two shapes: the first does not specify a
rating, so it will use the editor's current style value (in this example,
this will be the style's default value of 4). The second specifies a 
rating of 5, so it will use that value.
*/

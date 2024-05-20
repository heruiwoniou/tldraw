import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { optimize } from 'svgo'
import {
	readFileIfExists,
	readJsonIfExists,
	REPO_ROOT,
	writeCodeFile,
	writeFile,
	writeJsonFile,
	writeStringFile,
} from './lib/file'
import { nicelog } from './lib/nicelog'

// We'll need to copy the assets into these folders
const PUBLIC_FOLDER_PATHS = [join(REPO_ROOT, 'packages', 'assets')]

const FONT_MAPPING: Record<string, string> = {
	'IBMPlexMono-Medium': 'monospace',
	'IBMPlexSerif-Medium': 'serif',
	'IBMPlexSans-Medium': 'sansSerif',
	'Shantell_Sans-Tldrawish': 'draw',
}

const ASSETS_FOLDER_PATH = join(REPO_ROOT, 'assets')

const collectedAssetUrls: {
	fonts: Record<string, string>
	icons: Record<string, string>
	translations: Record<string, string>
	embedIcons: Record<string, string>
} = {
	fonts: {},
	icons: {},
	translations: {},
	embedIcons: {},
}

// 1. ICONS

async function copyIcons() {
	// Get a list of all icons
	const icons = readdirSync(join(ASSETS_FOLDER_PATH, 'icons', 'icon')).filter((icon) =>
		icon.endsWith('.svg')
	)

	// Write list of names into icon-names.json (just the name, not extension)
	const iconNames = icons.map((name) => name.replace('.svg', ''))

	const sourceFolderPath = join(ASSETS_FOLDER_PATH, 'icons', 'icon')

	// Create the optimized SVGs
	const optimizedSvgs = icons.map((icon) => {
		const iconPath = join(sourceFolderPath, icon)
		const content = readFileSync(iconPath, 'utf8')
		const svg = optimize(content, { path: iconPath })
		return { fileName: icon, data: svg.data }
	})

	// Optimize all of the svg icons and write them into the new folders
	for (const folderPath of PUBLIC_FOLDER_PATHS) {
		const publicIconsRootFolderPath = join(folderPath, 'icons')
		const pulicIconsFolderPath = join(publicIconsRootFolderPath, 'icon')

		if (existsSync(publicIconsRootFolderPath)) {
			rmSync(publicIconsRootFolderPath, { recursive: true })
		}

		// Create the folders
		mkdirSync(publicIconsRootFolderPath, { recursive: true })
		mkdirSync(pulicIconsFolderPath, { recursive: true })

		// Copy each optimized icons into the new folder
		for (const { fileName, data } of optimizedSvgs) {
			await writeStringFile(join(pulicIconsFolderPath, fileName), data)
		}

		// Write the JSON file containing all of the names of the icons
		await writeJsonFile(join(pulicIconsFolderPath, 'icon-names.json'), iconNames)
	}

	// Get the names of all of the svg icons and create a TypeScript file of valid icon names
	const iconTypeFile = `
		/** @public */
		export type TLUiIconType = 
			${icons.map((icon) => JSON.stringify(icon.replace('.svg', ''))).join(' | ')}

		/** @public */
		export const iconTypes = [
			${icons.map((icon) => JSON.stringify(icon.replace('.svg', ''))).join(', ')}
		] as const`

	await writeCodeFile(
		'scripts/refresh-assets.ts',
		'typescript',
		join(REPO_ROOT, 'packages', 'tldraw', 'src', 'lib', 'ui', 'icon-types.ts'),
		iconTypeFile
	)

	// add to the asset declaration file
	for (const icon of icons) {
		const name = icon.replace('.svg', '')
		collectedAssetUrls.icons[name] = `icons/icon/${icon}`
	}
}

// 2. EMBED-ICONS

async function copyEmbedIcons() {
	const folderName = 'embed-icons'
	const extension = '.png'

	const sourceFolderPath = join(ASSETS_FOLDER_PATH, folderName)
	const itemsToCopy = readdirSync(sourceFolderPath).filter((icon) => icon.endsWith(extension))

	for (const publicFolderPath of PUBLIC_FOLDER_PATHS) {
		const destinationFolderPath = join(publicFolderPath, folderName)

		// Delete the folder if it exists
		if (existsSync(destinationFolderPath)) {
			rmSync(destinationFolderPath, { recursive: true })
		}

		// Make the new folder
		mkdirSync(destinationFolderPath, { recursive: true })

		// Copy all items into the new folder
		for (const item of itemsToCopy) {
			await writeFile(join(destinationFolderPath, item), readFileSync(join(sourceFolderPath, item)))
		}
	}

	// add to the asset declaration file
	for (const item of itemsToCopy) {
		const name = item.replace(extension, '')
		collectedAssetUrls.embedIcons[name] = `${folderName}/${item}`
	}
}

// 3. FONTS

async function copyFonts() {
	const folderName = 'fonts'
	const extension = '.woff2'

	const sourceFolderPath = join(ASSETS_FOLDER_PATH, folderName)
	const itemsToCopy = readdirSync(sourceFolderPath).filter((icon) => icon.endsWith(extension))

	for (const publicFolderPath of PUBLIC_FOLDER_PATHS) {
		const destinationFolderPath = join(publicFolderPath, folderName)

		// Delete the folder if it exists
		if (existsSync(destinationFolderPath)) {
			rmSync(destinationFolderPath, { recursive: true })
		}

		// Make the new folder
		mkdirSync(destinationFolderPath)

		// Copy all items into the new folder
		for (const item of itemsToCopy) {
			await writeFile(join(destinationFolderPath, item), readFileSync(join(sourceFolderPath, item)))
		}
	}

	// add to the asset declaration file
	for (const item of itemsToCopy) {
		const itemWithoutExtension = item.replace(extension, '')
		const name = FONT_MAPPING[itemWithoutExtension]
		if (!name) {
			nicelog('Font mapping not found for', itemWithoutExtension)
			process.exit(1)
		}
		collectedAssetUrls.fonts[name] = `${folderName}/${item}`
	}
}

// 3. TRANSLATIONS

async function copyTranslations() {
	const folderName = 'translations'
	const extension = '.json'

	const sourceFolderPath = join(ASSETS_FOLDER_PATH, folderName)
	const itemsToCopy = readdirSync(sourceFolderPath).filter((item) => item.endsWith(extension))

	for (const publicFolderPath of PUBLIC_FOLDER_PATHS) {
		const destinationFolderPath = join(publicFolderPath, folderName)

		// Delete the folder if it exists
		if (existsSync(destinationFolderPath)) {
			rmSync(destinationFolderPath, { recursive: true })
		}

		// Make the new folder
		mkdirSync(destinationFolderPath)

		// Copy all items into the new folder
		for (const item of itemsToCopy) {
			await writeFile(join(destinationFolderPath, item), readFileSync(join(sourceFolderPath, item)))
		}
	}

	// Create hardcoded files
	const uiPath = join(
		REPO_ROOT,
		'packages',
		'tldraw',
		'src',
		'lib',
		'ui',
		'hooks',
		'useTranslation'
	)

	// languages.ts

	const languagesSource = await readJsonIfExists(join(sourceFolderPath, 'languages.json'))!
	type Language = { label: string; locale: string }
	const languagesFile = `
		/** @public */
		export const LANGUAGES = ${JSON.stringify(
			languagesSource.sort((a: Language, b: Language) => a.label.localeCompare(b.label, 'en'))
		)} as const
	`
	const schemaPath = join(REPO_ROOT, 'packages', 'tlschema', 'src', 'translations')
	const schemaLanguagesFilePath = join(schemaPath, 'languages.ts')
	await writeCodeFile(
		'scripts/refresh-assets.ts',
		'typescript',
		schemaLanguagesFilePath,
		languagesFile
	)

	// main.ts

	const defaultTranslation = await readJsonIfExists(join(sourceFolderPath, 'main.json'))!
	const defaultTranslationFilePath = join(uiPath, 'defaultTranslation.ts')
	const defaultTranslationFile = `
		/** @internal */
		export const DEFAULT_TRANSLATION = ${JSON.stringify(defaultTranslation)}
	`
	await writeCodeFile(
		'scripts/refresh-assets.ts',
		'typescript',
		defaultTranslationFilePath,
		defaultTranslationFile
	)

	// translationKeys.ts

	const translationKeys = Object.keys(defaultTranslation).map((key) => `'${key}'`)
	const translationKeysFilePath = join(uiPath, 'TLUiTranslationKey.ts')
	const translationKeysFile = `
		/** @public */
		export type TLUiTranslationKey = ${translationKeys.join(' | ')}
	`
	await writeCodeFile(
		'scripts/refresh-assets.ts',
		'typescript',
		translationKeysFilePath,
		translationKeysFile
	)

	// add to the asset declaration file
	for (const item of itemsToCopy) {
		const name = item.replace(extension, '')
		collectedAssetUrls.translations[name] = `${folderName}/${item}`
	}
}

// 4. ASSET DECLARATION FILES
async function writeUrlBasedAssetDeclarationFile() {
	const codeFilePath = join(REPO_ROOT, 'packages', 'assets', 'urls.js')
	const codeFile = `
		// eslint-disable-next-line @typescript-eslint/triple-slash-reference
		/// <reference path="./modules.d.ts" />
		import { formatAssetUrl } from './utils.js'

		/**
		 * @param {AssetUrlOptions} [opts]
		 * @public
		 */
		export function getAssetUrlsByMetaUrl(opts) {
			return {
				${Object.entries(collectedAssetUrls)
					.flatMap(([type, assets]) => [
						`${type}: {`,
						...Object.entries(assets).map(
							([name, href]) =>
								`${JSON.stringify(name)}: formatAssetUrl(new URL(${JSON.stringify(
									'./' + href
								)}, import.meta.url).href, opts),`
						),
						'},',
					])
					.join('\n')}
			}
		}
	`

	await writeCodeFile('scripts/refresh-assets.ts', 'javascript', codeFilePath, codeFile)
}

async function writeImportBasedAssetDeclarationFile(
	importSuffix: string,
	fileName: string
): Promise<void> {
	let imports = `
		// eslint-disable-next-line @typescript-eslint/triple-slash-reference
		/// <reference path="./modules.d.ts" />
		import { formatAssetUrl } from './utils.js'

	`

	let declarations = `
		/**
		 * @param {AssetUrlOptions} [opts]
		 * @public
		 */
		export function getAssetUrlsByImport(opts) {
			return {
	`

	for (const [type, assets] of Object.entries(collectedAssetUrls)) {
		declarations += `${type}: {\n`
		for (const [name, href] of Object.entries(assets)) {
			const variableName = `${type}_${name}`
				.replace(/[^a-zA-Z0-9_]/g, '_')
				.replace(/_+/g, '_')
				.replace(/_(.)/g, (_, letter) => letter.toUpperCase())
			imports += `import ${variableName} from ${JSON.stringify('./' + href + importSuffix)};\n`
			declarations += `${JSON.stringify(name)}: formatAssetUrl(${variableName}, opts),\n`
		}
		declarations += '},\n'
	}

	declarations += `
			}
		}
	`

	const codeFilePath = join(REPO_ROOT, 'packages', 'assets', fileName)
	await writeCodeFile(
		'scripts/refresh-assets.ts',
		'javascript',
		codeFilePath,
		imports + declarations
	)
}

async function writeSelfHostedAssetDeclarationFile(): Promise<void> {
	const codeFilePath = join(REPO_ROOT, 'packages', 'assets', 'selfHosted.js')
	const codeFile = `
		// eslint-disable-next-line @typescript-eslint/triple-slash-reference
		/// <reference path="./modules.d.ts" />
		import { formatAssetUrl } from './utils.js'

		/**
		 * @param {AssetUrlOptions} [opts]
		 * @public
		 */
		export function getAssetUrls(opts) {
			return {
				${Object.entries(collectedAssetUrls)
					.flatMap(([type, assets]) => [
						`${type}: {`,
						...Object.entries(assets).map(
							([name, href]) =>
								`${JSON.stringify(name)}: formatAssetUrl(${JSON.stringify('./' + href)}, opts),`
						),
						'},',
					])
					.join('\n')}
			}
		}
	`

	await writeCodeFile('scripts/refresh-assets.ts', 'javascript', codeFilePath, codeFile)
}

async function writeAssetDeclarationDTSFile() {
	let dts = `
		export type AssetUrl = string | { src: string }
		export type AssetUrlOptions = { baseUrl?: string } | ((assetUrl: string) => string)
		export type AssetUrls = {
	`

	for (const [type, assets] of Object.entries(collectedAssetUrls)) {
		dts += `${type}: {\n`
		for (const name of Object.keys(assets)) {
			dts += `${JSON.stringify(name)}: string,\n`
		}
		dts += '},\n'
	}

	dts += `
		}
	`

	const assetDeclarationFilePath = join(REPO_ROOT, 'packages', 'assets', 'types.d.ts')
	await writeCodeFile('scripts/refresh-assets.ts', 'typescript', assetDeclarationFilePath, dts)
}

async function copyVersionToDotCom() {
	const packageJson = await readJsonIfExists(join(REPO_ROOT, 'packages', 'tldraw', 'package.json'))
	const packageVersion = packageJson.version

	const file = `export const version = '${packageVersion}'`
	await writeCodeFile(
		'scripts/refresh-assets.ts',
		'typescript',
		join(REPO_ROOT, 'apps', 'dotcom', 'version.ts'),
		file
	)
	await writeCodeFile(
		'scripts/refresh-assets.ts',
		'typescript',
		join(REPO_ROOT, 'packages', 'editor', 'src', 'version.ts'),
		file
	)
	await writeCodeFile(
		'scripts/refresh-assets.ts',
		'typescript',
		join(REPO_ROOT, 'packages', 'tldraw', 'src', 'lib', 'ui', 'version.ts'),
		file
	)
}

async function writeConstantSetters() {
	const AUTO_TAG_START = '/* ==== BEGIN AUTO-GENERATED SETTERS ==== */'
	const AUTO_TAG_END = '/* ==== END AUTO-GENERATED SETTERS ==== */'

	const constantFiles = [
		{
			fileName: join(REPO_ROOT, 'packages', 'tldraw', 'src', 'lib', 'settings.ts'),
			defaultSettingsName: '_DEFAULT_TLDRAW_SETTINGS',
			getFunctionName: '_getTldrawSettings',
			updateFunctionName: '_updateTldrawSettings',
			shouldExport: false,
		},
		{
			fileName: join(REPO_ROOT, 'packages', 'editor', 'src', 'lib', 'settings.ts'),
			defaultSettingsName: 'DEFAULT_EDITOR_SETTINGS',
			getFunctionName: 'getEditorSettings',
			updateFunctionName: 'updateEditorSettings',
			shouldExport: true,
		},
	]

	for (const {
		fileName,
		defaultSettingsName,
		getFunctionName,
		updateFunctionName,
		shouldExport,
	} of constantFiles) {
		const content = await readFileIfExists(fileName)
		if (!content) throw new Error(`File not found: ${fileName}`)

		const lines = content.split('\n')
		const tagLineStartIndex = lines.findIndex((line) => line.includes(AUTO_TAG_START))
		if (tagLineStartIndex === -1) throw new Error(`No ${AUTO_TAG_START} found in ${fileName}`)
		const tagLineEndIndex = lines.findIndex((line) => line.includes(AUTO_TAG_END))
		if (tagLineEndIndex === -1) throw new Error(`No ${AUTO_TAG_END} found in ${fileName}`)

		const relevantLines = lines.slice(0, tagLineStartIndex).concat(lines.slice(tagLineEndIndex + 1))

		const foundConstants = relevantLines
			.filter((line) => line.startsWith('export let '))
			.map((line) => {
				const match = /^export let (\w+) = (.+)$/.exec(line)
				if (!match) throw new Error(`Invalid constant line: ${line}`)
				return match[1]
			})

		const autoGeneratedLines = [
			AUTO_TAG_START,
			'// This section is auto-generated by scripts/refresh-assets.ts.',
			'// If you edit it manually, your changes will get overwritten.',
			'// To regenerate this section, run `yarn refresh-assets`',
			'',

			shouldExport ? '/** @public */ export' : '',
			`const ${defaultSettingsName} = {`,
			...foundConstants.map((c) => `${c},`),
			'} as const',
			'',

			shouldExport ? '/** @public */ export' : '',
			`function ${getFunctionName}() {`,
			`return {`,
			...foundConstants.map((c) => `${c},`),
			'}',
			'}',

			shouldExport ? '/** @public */ export' : '',
			`function ${updateFunctionName}(`,
			'	settings: {',
			...foundConstants.map((c) => `${c}?: typeof ${c},`),
			'}',
			') {',
			...foundConstants.map((c) => `if (settings.${c} !== undefined) { ${c} = settings.${c} }`),
			'}',
			AUTO_TAG_END,
		]

		const newContent = [
			...lines.slice(0, tagLineStartIndex),
			...autoGeneratedLines,
			...lines.slice(tagLineEndIndex + 1),
		].join('\n')

		await writeCodeFile('scripts/refresh-assets.ts', 'typescript', fileName, newContent, {
			skipWarning: true,
		})
	}
}

// --- RUN
async function main() {
	nicelog('Copying icons...')
	await copyIcons()
	nicelog('Copying embed icons...')
	await copyEmbedIcons()
	nicelog('Copying fonts...')
	await copyFonts()
	nicelog('Copying translations...')
	await copyTranslations()
	nicelog('Writing asset declaration file...')
	await writeAssetDeclarationDTSFile()
	await writeUrlBasedAssetDeclarationFile()
	await writeImportBasedAssetDeclarationFile('', 'imports.js')
	await writeImportBasedAssetDeclarationFile('?url', 'imports.vite.js')
	await writeSelfHostedAssetDeclarationFile()
	nicelog('Copying version to dotcom...')
	await copyVersionToDotCom()
	nicelog('Writing constants setters...')
	await writeConstantSetters()
	nicelog('Done!')
}

main()

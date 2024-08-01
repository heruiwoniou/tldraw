import { EmbedDefinition, EmbedDefinitionOverride } from '@tldraw/tlschema'
import { ReactNode, createContext, useContext } from 'react'

const EmbedDefinitionsContext = createContext<
	null | readonly (EmbedDefinition | EmbedDefinitionOverride)[]
>(null)

interface EmbedDefinitionsProviderProps {
	embeds: readonly (EmbedDefinition | EmbedDefinitionOverride)[]
	children: ReactNode
}

export function EmbedDefinitionsProvider({ embeds, children }: EmbedDefinitionsProviderProps) {
	return (
		<EmbedDefinitionsContext.Provider value={embeds}>{children}</EmbedDefinitionsContext.Provider>
	)
}

/** @public */
export function useEmbedDefinitions() {
	const embeds = useContext(EmbedDefinitionsContext)
	if (!embeds) {
		throw new Error('useEmbedDefinitions must be used inside of <EmbedDefinitionsProvider />')
	}
	return embeds
}

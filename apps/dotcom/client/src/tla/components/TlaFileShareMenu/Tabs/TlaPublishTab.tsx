import { useAuth } from '@clerk/clerk-react'
import { TldrawAppFile } from '@tldraw/dotcom-shared'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useEditor, useToasts } from 'tldraw'
import { F, FormattedRelativeTime, defineMessages, useIntl } from '../../../app/i18n'
import { useApp } from '../../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { copyTextToClipboard } from '../../../utils/copy'
import { getShareablePublishUrl } from '../../../utils/urls'
import { TlaButton } from '../../TlaButton/TlaButton'
import { TlaSwitch } from '../../TlaSwitch/TlaSwitch'
import { TlaTabsPage } from '../../TlaTabs/TlaTabs'
import {
	TlaMenuControl,
	TlaMenuControlGroup,
	TlaMenuControlInfoTooltip,
	TlaMenuControlLabel,
	TlaMenuDetail,
	TlaMenuSection,
} from '../../tla-menu/tla-menu'
import { TlaShareMenuCopyButton } from '../file-share-menu-primitives'

const messages = defineMessages({
	publishChangesError: { defaultMessage: 'Could not publish changes' },
	publishFileError: { defaultMessage: 'Could not publish file' },
	deleteError: { defaultMessage: 'Could not delete' },
})

export function TlaPublishTab({ file }: { file: TldrawAppFile }) {
	const { fileSlug } = useParams()
	const editor = useEditor()
	const app = useApp()
	const { addToast } = useToasts()
	const intl = useIntl()
	const { publishedSlug, published } = file
	const isOwner = app.isFileOwner(file.id)
	const auth = useAuth()
	const trackEvent = useTldrawAppUiEvents()
	const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success'>('idle')

	const publish = useCallback(
		async (isPublishingChanges: boolean) => {
			if (!editor) throw Error('no editor')
			if (!fileSlug) throw Error('no file slug')
			if (!isOwner) throw Error('not owner')
			const token = await auth.getToken()
			if (!token) throw Error('no token')

			const startTime = Date.now()

			if (isPublishingChanges) {
				setUploadState('uploading')
			}

			const result = await app.publishFile(file.id, token)

			if (result.ok) {
				const elapsed = Date.now() - startTime
				// uploading should always take at least 1 second
				if (elapsed < 1000) {
					await new Promise((r) => setTimeout(r, 1000 - elapsed))
				}

				// Show the check and then hide it again after 2s
				if (isPublishingChanges) {
					setUploadState('success')
					editor.timers.setTimeout(() => {
						setUploadState('idle')
					}, 2000)
				}
			} else {
				if (isPublishingChanges) {
					setUploadState('idle')
				}

				const publishChangesErrorMsg = intl.formatMessage(messages.publishChangesError)
				const publishFileErrorMsg = intl.formatMessage(messages.publishFileError)
				addToast({
					title: isPublishingChanges ? publishChangesErrorMsg : publishFileErrorMsg,
					severity: 'error',
				})
			}
			trackEvent('publish-file', { result, source: 'file-share-menu' })
		},
		[editor, fileSlug, isOwner, auth, intl, app, addToast, file.id, trackEvent]
	)

	const unpublish = useCallback(async () => {
		if (!isOwner) throw Error('not owner')

		const token = await auth.getToken()
		if (!token) throw Error('no token')

		const result = await app.unpublishFile(file.id, token)

		if (result.ok) {
			// noop, all good
		} else {
			// show error toast
			const deleteErrorMsg = intl.formatMessage(messages.deleteError)
			addToast({
				title: deleteErrorMsg,
				severity: 'error',
			})
		}
		trackEvent('unpublish-file', { result, source: 'file-share-menu' })
	}, [addToast, app, auth, intl, file.id, isOwner, trackEvent])

	const publishShareUrl = publishedSlug ? getShareablePublishUrl(publishedSlug) : null

	const secondsSince = Math.min(0, Math.floor((Date.now() - file.lastPublished) / 1000))
	const learnMoreUrl = 'https://tldraw.notion.site/Publishing-1283e4c324c08059a1a1d9ba9833ddc9'
	return (
		<TlaTabsPage id="publish">
			<TlaMenuSection>
				<TlaMenuControlGroup>
					{isOwner && (
						<TlaMenuControl>
							<TlaMenuControlLabel>
								<F defaultMessage="Publish this project" />
							</TlaMenuControlLabel>
							<TlaMenuControlInfoTooltip
								onClick={() =>
									trackEvent('open-url', { url: learnMoreUrl, source: 'file-share-menu' })
								}
								href={learnMoreUrl}
							>
								<F defaultMessage="Learn more about publishing." />
							</TlaMenuControlInfoTooltip>
							<TlaSwitch
								checked={published}
								onChange={() => (published ? unpublish() : publish(false))}
							/>
						</TlaMenuControl>
					)}
				</TlaMenuControlGroup>
				{published && (
					<>
						{publishShareUrl && <TlaCopyPublishLinkButton url={publishShareUrl} />}
						{isOwner && (
							<TlaButton
								iconRight={uploadState === 'success' ? 'check' : 'update'}
								isLoading={uploadState === 'uploading'}
								variant="secondary"
								onClick={() => publish(true)}
							>
								<F defaultMessage="Publish changes" />
							</TlaButton>
						)}
						{/* todo: make this data actually true based on file.lastPublished */}
						<TlaMenuDetail>
							<F
								defaultMessage="Last published <date></date>"
								description="This is used to show the last time the file was published. An example is 'Last published 5 minutes ago'."
								values={{
									date: () => (
										<FormattedRelativeTime
											value={secondsSince}
											numeric="auto"
											updateIntervalInSeconds={15}
										/>
									),
								}}
							/>
						</TlaMenuDetail>
					</>
				)}
				{/* {published && publishShareUrl && <QrCode url={publishShareUrl} />} */}
			</TlaMenuSection>
		</TlaTabsPage>
	)
}

export function TlaCopyPublishLinkButton({ url }: { url: string }) {
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()

	const handleCopyPublishLink = useCallback(() => {
		if (!url) return
		copyTextToClipboard(editor.createDeepLink({ url }).toString())
		trackEvent('copy-publish-link', { source: 'file-share-menu' })
	}, [url, editor, trackEvent])

	return (
		<TlaShareMenuCopyButton onClick={handleCopyPublishLink}>
			<F defaultMessage="Copy link" />
		</TlaShareMenuCopyButton>
	)
}

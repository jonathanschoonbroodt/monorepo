import { createMessageBundleSlotAdapter } from "../createMessageBundleSlotAdapter.js"
import { createImport } from "./import.js"
import { endpoint } from "comlink-node/worker"
import { populateLevel } from "./populateLintLevel.js"
import { resolveModules } from "../resolveModules2.js"
import createSlotStorage from "../../persistence/slotfiles/createSlotStorage.js"
import * as Comlink from "comlink"
import type { NodeishFilesystem } from "@lix-js/fs"
import type { Message, MessageBundle } from "../types/message-bundle.js"
import type { ProjectSettings2 } from "../types/project-settings.js"
import type { NodeishFilesystemSubset } from "@inlang/plugin"
import type { LintConfig, LintReport } from "../types/lint.js"

import _debug from "debug"
import { devModuleImport } from "../dev-modules/import.js"
const debug = _debug("sdk-v2:lint-report-worker")

const lintConfigs: LintConfig[] = [
	{
		id: "1234",
		ruleId: "messageBundleLintRule.inlang.emptyPattern",
		messageId: undefined,
		bundleId: undefined,
		variantId: undefined,
		level: "error",
	},
]

export async function createLinter(
	projectPath: string,
	settings: ProjectSettings2,
	fs: Pick<NodeishFilesystemSubset, "readFile" | "readdir" | "mkdir">
) {
	debug("creating linter")
	const _import = devModuleImport
	//const _import = createImport(projectPath, fs)

	const resolvedModules = await resolveModules({
		settings,
		_import,
	})

	const customApi = resolvedModules.resolvedPluginApi.customApi
	console.info("worker-resolvedModules", resolvedModules)
	console.info("worker-customApi", customApi)

	const translator:
		| {
				translate: (args: {
					messageBundle: MessageBundle
					sourceLanguageTag: string
					targetLanguageTags: string
				}) => any
		  }
		| undefined = resolvedModules.resolvedPluginApi.customApi["app.app.machineTranslate"]

	return Comlink.proxy({
		lint: async (settings: ProjectSettings2): Promise<LintReport[]> => {
			// TODO dedbulicate path config
			const messageBundlesPath = projectPath + "/messagebundles/"
			const messagesPath = projectPath + "/messages/"

			const bundleStorage = createSlotStorage<MessageBundle>(
				"bundle-storage-linter",
				16 * 16 * 16 * 16,
				3
			)
			await bundleStorage.connect(fs as NodeishFilesystem, messageBundlesPath, false)

			const messageStorage = createSlotStorage<Message>(
				"message-storage-linter",
				16 * 16 * 16 * 16,
				3
			)
			await messageStorage.connect(fs as NodeishFilesystem, messagesPath, false)

			const rxDbAdapter = createMessageBundleSlotAdapter(bundleStorage, messageStorage, () => {})

			const messageBundles = await rxDbAdapter.getAllMessageBundles()

			const reports: LintReport[] = []
			const promises: Promise<any>[] = []

			for (const messageBundle of messageBundles as MessageBundle[]) {
				for (const lintRule of resolvedModules.messageBundleLintRules) {
					const promise = lintRule.run({
						messageBundle: messageBundle,
						settings,
						report: (report) => {
							const reportWithRule = { ...report, ruleId: lintRule.id }
							const fullReport = populateLevel(reportWithRule, lintConfigs)
							reports.push(fullReport)
						},
					})
					promises.push(promise as Promise<any>)
				}
			}

			await Promise.all(promises)

			console.info("lint reports worker", reports)
			return reports
		},

		fix: async (report: LintReport) => {
			// get the affected message-bundle
			const messageBundlesPath = projectPath + "/messagebundles/"
			const messagesPath = projectPath + "/messages/"

			const bundleStorage = createSlotStorage<MessageBundle>(
				"bundle-storage-linter",
				16 * 16 * 16 * 16,
				3
			)
			await bundleStorage.connect(fs as NodeishFilesystem, messageBundlesPath, false)

			const messageStorage = createSlotStorage<Message>(
				"message-storage-linter",
				16 * 16 * 16 * 16,
				3
			)
			await messageStorage.connect(fs as NodeishFilesystem, messagesPath, false)
			const rxDbAdapter = createMessageBundleSlotAdapter(bundleStorage, messageStorage, () => {})
			const messageBundles = await rxDbAdapter.getAllMessageBundles()

			const messageBundle = messageBundles.find((bundle) => bundle.id === report.messageBundleId)
			if (!messageBundle) throw new Error(`messageBundle ${report.messageBundleId} not found`)

			const translated = await translator?.translate({
				messageBundle,
				sourceLanguageTag: settings.baseLocale,
				targetLanguageTags: report.locale,
			})

			return translated
		},
	})
}

Comlink.expose(createLinter, endpoint)

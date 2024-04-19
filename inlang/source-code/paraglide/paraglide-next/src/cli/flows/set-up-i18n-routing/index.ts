import { Repository } from "@lix-js/client"
import { CliStep } from "../../utils"
import { Logger } from "@inlang/paraglide-js/internal"

const FileExtensions = [".tsx", ".ts", ".jsx", ".js"]

export const SetUpI18nRoutingFlow: CliStep<
	{
		repo: Repository
		logger: Logger
		/**
		 * An absolute path to the src/ directory
		 */
		srcRoot: string
	},
	unknown
> = async (ctx) => {
	await walk(ctx.repo, ctx.srcRoot, async (path) => {
		if (!FileExtensions.some((ext) => path.endsWith(ext))) return
		//read the file content
		const content = await ctx.repo.nodeishFs.readFile(path, { encoding: "utf-8" })

		//replace imports of 'import L from "next/link"' with 'import { Link as L } from "@/lib/i18n"'
		const newContent = replaceNextNavigationImports(replaceNextLinkImports(content))
		if (newContent === content) return
		console.info(`${path}`, newContent)
	})

	return ctx
}

function replaceNextLinkImports(content: string): string {
	const regex = /import\s+(?<identifier>\S+)\s+from\s*("|')next\/link("|')/g
	const match = regex.exec(content)
	if (!match) return content
	const { identifier } = match.groups as { identifier: string }

	const replacementImport =
		identifier === "Link"
			? `import { Link } from "@/lib/i18n"`
			: `import { Link as ${identifier} } from "@/lib/i18n"`

	return content.replace(match[0], replacementImport)
}

function replaceNextNavigationImports(content: string) {
	//the next/navigation imports will be replaced with the ones from @/lib/i18n
	const IDENTIFIERS_TO_REPLACE = ["usePathname", "useRouter", "redirect", "permanentRedirect"]

	const regex = /import\s+{(?<identifiersString>[^}]*)}\s+from\s*("|')next\/navigation("|')/g

	const match = regex.exec(content)
	if (!match) return content
	const { identifiersString } = match.groups as { identifiersString: string }

	const identifiers = identifiersString
		.split(",")
		.map((id) => id.trim())
		.filter(Boolean)

	const replacedIdentifiers = identifiers.filter((id) => IDENTIFIERS_TO_REPLACE.includes(id))
	const notReplacedIdentifiers = identifiers.filter((id) => !IDENTIFIERS_TO_REPLACE.includes(id))
	if (replacedIdentifiers.length === 0) return content

	let replacementImport = `import { ${replacedIdentifiers.join(", ")} } from "@/lib/i18n"`
	if (notReplacedIdentifiers.length > 0) {
		replacementImport +=
			"\n" + `import { ${notReplacedIdentifiers.join(", ")} } from "next/navigation"`
	}
	return content.replace(match[0], replacementImport)
}

async function walk(repo: Repository, path: string, fileCallback: (path: string) => Promise<void>) {
	const files = await repo.nodeishFs.readdir(path)
	const promises = files.map(async (file) => {
		const filePath = path + "/" + file
		const stat = await repo.nodeishFs.stat(filePath)
		if (stat.isDirectory()) {
			await walk(repo, filePath, fileCallback)
		} else {
			await fileCallback(filePath)
		}
	})
	await Promise.all(promises)
}

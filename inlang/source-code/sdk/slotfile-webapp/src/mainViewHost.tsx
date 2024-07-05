import React, { KeyboardEventHandler, useEffect, useState } from "react"
import { openProject } from "./storage/db-messagebundle.js"
import { pluralBundle } from "../../src/v2/mocks/index.js"
import { randomHumanId } from "../../src/storage/human-id/human-readable-id.js"
import { createMessage, createMessageBundle } from "../../src/v2/helper.js"
import { MessageBundleList } from "./messageBundleListReact.js"
import { MessageBundle, getFs } from "../../dist/v2/index.js"
import { SettingsView } from "./settingsView.js"
import { createNodeishMemoryFs } from "@lix-js/fs"
import { IFrame } from "./iFrame.js"

const fs = createNodeishMemoryFs()

export function MainViewHost() {
	const [githubToken, setGithubToken] = useState<string>(localStorage.ghToken)

	const onGithubTokenChange = (el: any) => {
		const ghToken = el.target.value
		localStorage.ghToken = ghToken
		setGithubToken(ghToken)
		setCurrentProject(undefined)
	}

	const params = new URLSearchParams(window.location.search)
	const repo = params.get("repo") ?? localStorage.repo ?? ""

	const [repoUrl, setRepoUrl] = useState<string>(repo)

	const onRepoUrlChange = (el: any) => {
		const repoUrl = el.target.value
		setRepoConfigs(repoUrl)
		setCurrentProject(undefined)
	}

	const setRepoConfigs = (repoUrl: string) => {
		const url = new URL(window.location as any)
		const params = new URLSearchParams(url.search)
		params.set("repo", repoUrl)
		url.search = params.toString()
		window.history.pushState({}, "", url)
		setRepoUrl(repoUrl)
		localStorage.repo = repoUrl
	}

	const [inlangProjectPath, setInlangProjectPath] = useState<string>(
		params.get("inlangProjectPath") ?? localStorage.inpangProjectPath ?? ""
	)

	const onInlangRepoPathChange = (el: any) => {
		const projpath = el.target.value
		setInlangProjectPathConfigs(projpath)
		setCurrentProject(undefined)
	}

	const setInlangProjectPathConfigs = (projectPath: string) => {
		const url = new URL(window.location as any)
		const params = new URLSearchParams(url.search)
		params.set("inpangProjectPath", projectPath)
		url.search = params.toString()
		window.history.pushState({}, "", url)
		setInlangProjectPath(projectPath)
		localStorage.inpangProjectPath = projectPath
	}

	const [loadingProjectState, setLoadingProjectState] = useState<string>("")
	const [currentProject, setCurrentProject] = useState<
		Awaited<ReturnType<typeof openProject>> | undefined
	>(undefined)

	useEffect(() => {
		if (githubToken && repoUrl && inlangProjectPath) {
			doLoadProject()
		}
	}, [])
	const doLoadProject = async () => {
		setLoadingProjectState("Loading")
		try {
			const loadedProject = await openProject(fs, githubToken, repoUrl, inlangProjectPath)
			setInlangProjectPathConfigs(inlangProjectPath)
			setRepoConfigs(repoUrl)
			setCurrentProject(loadedProject)
		} catch (e) {
			setLoadingProjectState((e as any).message)
			return
		}

		setLoadingProjectState("")
	}

	const [gitActive, setGitActive] = useState(false)
	const pull = async (project: Awaited<ReturnType<typeof openProject>>) => {
		setGitActive(true)
		await project.pullChangesAndReloadSlots()
		setGitActive(false)
		// 	await s.pullChangesAndReloadSlots()
		// 	document.querySelector<HTMLButtonElement>("#pull")!.disabled = false
	}

	const push = async (project: Awaited<ReturnType<typeof openProject>>) => {
		setGitActive(true)
		await project.pushChangesAndReloadSlots()
		setGitActive(false)
		// 	await s.pullChangesAndReloadSlots()
		// 	document.querySelector<HTMLButtonElement>("#pull")!.disabled = false
	}

	const commit = async (project: Awaited<ReturnType<typeof openProject>>) => {
		setGitActive(true)
		await project.commitChanges()
		setGitActive(false)
		// 	await s.pullChangesAndReloadSlots()
		// 	document.querySelector<HTMLButtonElement>("#pull")!.disabled = false
	}

	return (
		<div>
			<h3>{"Fink 2"}</h3>
			<div>
				GitHub token:{" "}
				<input
					type="password"
					id="ghtoken"
					name="ghtoken"
					defaultValue={githubToken}
					onKeyUp={onGithubTokenChange}
					style={{ marginRight: 10 }}
				/>
				Github repo:{" "}
				<input
					type="text"
					id="repourl"
					name="repourl"
					defaultValue={repoUrl}
					onKeyUp={onRepoUrlChange}
					style={{ marginRight: 10 }}
				/>
				Inlang Project Path:{" "}
				<input
					type="text"
					id="inlangProjectPath"
					name="repourl"
					defaultValue={inlangProjectPath}
					onKeyUp={onInlangRepoPathChange}
					style={{ marginRight: 10 }}
				/>
				<button id="btnAdd1" onClick={doLoadProject} disabled={loadingProjectState === "Loading"}>
					(Re) Load Project
				</button>
				{loadingProjectState}
				{currentProject && inlangProjectPath && (
					<>
						<IFrame src={"/?inlangProjectPath=" + inlangProjectPath} withFs={fs} />
						{/* <IFrame src={"/?inlangProjectPath=" + inlangProjectPath} withFs={fs} /> */}
					</>
				)}
			</div>
		</div>
	)
}
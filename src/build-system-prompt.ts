import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import type { BuildSystemPromptOptions, Skill } from "@earendil-works/pi-coding-agent"

let _piPkgDir: string | undefined

function getPiPackageDir(): string {
	if (!_piPkgDir) {
		const req = createRequire(import.meta.url)
		_piPkgDir = dirname(req.resolve("@earendil-works/pi-coding-agent/package.json"))
	}
	return _piPkgDir
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;")
}

function formatSkills(skills: Skill[]): string {
	const visible = skills.filter((s) => !s.disableModelInvocation)
	if (visible.length === 0) return ""

	const lines = [
		"\n\nThe following skills provide specialized instructions for specific tasks.",
		"Use the read tool to load a skill's file when the task matches its description.",
		"When a skill file references a relative path, resolve it against the skill directory (parent of SKILL.md / dirname of the path) and use that absolute path in tool commands.",
		"",
		"<available_skills>",
	]

	for (const skill of visible) {
		lines.push("  <skill>")
		lines.push(`    <name>${escapeXml(skill.name)}</name>`)
		lines.push(`    <description>${escapeXml(skill.description)}</description>`)
		lines.push(`    <location>${escapeXml(skill.filePath)}</location>`)
		lines.push("  </skill>")
	}

	lines.push("</available_skills>")
	return lines.join("\n")
}

function formatContextFiles(files: Array<{ path: string; content: string }>): string {
	if (files.length === 0) return ""

	let section = "\n\n<project_context>\n\n"
	section += "Project-specific instructions and guidelines:\n\n"
	for (const { path, content } of files) {
		section += `<project_instructions path="${path}">\n${content}\n</project_instructions>\n\n`
	}
	section += "</project_context>\n"
	return section
}

function buildToolsList(tools: string[], snippets: Record<string, string>): string {
	const visible = tools.filter((name) => !!snippets[name])
	if (visible.length === 0) return "(none)"
	return visible.map((name) => `- ${name}: ${snippets[name]}`).join("\n")
}

function buildGuidelines(tools: string[], promptGuidelines?: string[]): string {
	const guidelines: string[] = []
	const seen = new Set<string>()

	const add = (g: string): void => {
		if (seen.has(g)) return
		seen.add(g)
		guidelines.push(g)
	}

	if (tools.includes("bash") && !tools.includes("grep") && !tools.includes("find") && !tools.includes("ls")) {
		add("Use bash for file operations like ls, rg, find")
	}

	for (const g of promptGuidelines ?? []) {
		const trimmed = g.trim()
		if (trimmed.length > 0) add(trimmed)
	}

	add("Be concise in your responses")
	add("Show file paths clearly when working with files")

	return guidelines.map((g) => `- ${g}`).join("\n")
}

// ---------------------------------------------------------------------------
// Main build function
//
// This is a faithful port of Pi's default system prompt construction.
// Edit the template string below to customize. The dynamic sections
// (tools, guidelines, context files, skills, cwd) are computed from
// the same live inputs Pi uses, so they stay current across turns.
// ---------------------------------------------------------------------------

export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
	const {
		customPrompt,
		selectedTools,
		toolSnippets,
		promptGuidelines,
		appendSystemPrompt,
		cwd,
		contextFiles: providedContextFiles,
		skills: providedSkills,
	} = options

	const promptCwd = cwd.replace(/\\/g, "/")
	const appendSection = appendSystemPrompt ? `\n\n${appendSystemPrompt}` : ""
	const contextFiles = providedContextFiles ?? []
	const skills = providedSkills ?? []

	// When SYSTEM.md or --system-prompt is active, use it as the base.
	if (customPrompt) {
		let prompt = customPrompt
		if (appendSection) prompt += appendSection
		prompt += formatContextFiles(contextFiles)
		const hasRead = !selectedTools || selectedTools.includes("read")
		if (hasRead && skills.length > 0) prompt += formatSkills(skills)
		prompt += `\nCurrent working directory: ${promptCwd}`
		return prompt
	}

	const tools = selectedTools || ["read", "bash", "edit", "write"]
	const toolsList = buildToolsList(tools, toolSnippets ?? {})
	const guidelines = buildGuidelines(tools, promptGuidelines)
	const hasRead = tools.includes("read")

	const readmePath = resolve(join(getPiPackageDir(), "README.md"))
	const docsPath = resolve(join(getPiPackageDir(), "docs"))
	const examplesPath = resolve(join(getPiPackageDir(), "examples"))

	// ====================== EDIT BELOW THIS LINE ======================

	let prompt = `You are an expert coding assistant operating inside pi, a coding agent harness. You help users by reading files, executing commands, editing code, and writing new files.

Available tools:
${toolsList}

In addition to the tools above, you may have access to other custom tools depending on the project.

Guidelines:
${guidelines}

Pi documentation (read only when the user asks about pi itself, its SDK, extensions, themes, skills, or TUI):
- Main documentation: ${readmePath}
- Additional docs: ${docsPath}
- Examples: ${examplesPath} (extensions, custom tools, SDK)
- When reading pi docs or examples, resolve docs/... under Additional docs and examples/... under Examples, not the current working directory
- When asked about: extensions (docs/extensions.md, examples/extensions/), themes (docs/themes.md), skills (docs/skills.md), prompt templates (docs/prompt-templates.md), TUI components (docs/tui.md), keybindings (docs/keybindings.md), SDK integrations (docs/sdk.md), custom providers (docs/custom-provider.md), adding models (docs/models.md), pi packages (docs/packages.md), environment variables (docs/environment-variables.md)
- When working on pi topics, read the docs and examples, and follow .md cross-references before implementing
- Always read pi .md files completely and follow links to related docs (e.g., tui.md for TUI API details)`

	// ====================== EDIT ABOVE THIS LINE ======================

	if (appendSection) prompt += appendSection
	prompt += formatContextFiles(contextFiles)
	if (hasRead && skills.length > 0) prompt += formatSkills(skills)
	prompt += `\nCurrent working directory: ${promptCwd}`

	return prompt
}

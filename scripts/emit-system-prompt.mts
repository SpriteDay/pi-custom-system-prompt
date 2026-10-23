import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
    createBashToolDefinition,
    createEditToolDefinition,
    createReadToolDefinition,
    createWriteToolDefinition,
    type BuildSystemPromptOptions,
} from "@earendil-works/pi-coding-agent"
import { buildSystemPrompt } from "../src/build-system-prompt.ts"

const repoRoot = fileURLToPath(new URL("../", import.meta.url))
const outputFlagIndex = process.argv.indexOf("--output")
const outputArgument =
    outputFlagIndex === -1 ? undefined : process.argv[outputFlagIndex + 1]

if (outputFlagIndex !== -1 && !outputArgument) {
    throw new Error("--output requires a file path")
}

const outputPath = resolve(
    repoRoot,
    outputArgument ?? ".test-output/system-prompt.txt",
)
const tools = [
    createReadToolDefinition(repoRoot),
    createBashToolDefinition(repoRoot),
    createEditToolDefinition(repoRoot),
    createWriteToolDefinition(repoRoot),
]
const options: BuildSystemPromptOptions = {
    cwd: repoRoot.replace(/\/$/, ""),
    selectedTools: tools.map((tool) => tool.name),
    toolSnippets: Object.fromEntries(
        tools.flatMap((tool) =>
            tool.promptSnippet ? [[tool.name, tool.promptSnippet]] : [],
        ),
    ),
    promptGuidelines: tools.flatMap((tool) => tool.promptGuidelines ?? []),
}
const prompt = buildSystemPrompt(options)

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${prompt}\n`, "utf8")
process.stdout.write(`System prompt written to ${outputPath}\n`)

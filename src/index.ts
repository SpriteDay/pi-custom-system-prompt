import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { buildSystemPrompt } from "./build-system-prompt.ts"

export default function (pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event) => {
		const prompt = buildSystemPrompt(event.systemPromptOptions)
		return { systemPrompt: prompt }
	})
}

# pi-system-prompt

A [Pi](https://github.com/earendil-works/pi) extension template that gives you full TypeScript control over the system prompt.

Pi's built-in customization options (`SYSTEM.md`, `APPEND_SYSTEM.md`) are static text files. This extension replaces that with a programmatic approach — you get the same dynamic inputs Pi uses internally (active tools, skills, context files, guidelines, cwd) and compose the prompt however you want in TypeScript.

## Why

- **`SYSTEM.md`** replaces the entire prompt but you lose dynamic sections (tools list, skills, context files)
- **`APPEND_SYSTEM.md`** only appends — you can't remove or restructure anything
- **This extension** rebuilds the prompt from scratch using Pi's own live inputs, so you can rewrite the template, add conditionals, remove sections, inject computed content — whatever you need

## How it works

The extension registers a `before_agent_start` handler. Pi passes `event.systemPromptOptions` containing all the structured data it would normally use to build the prompt. The extension runs its own `buildSystemPrompt()` with those inputs and returns the result, replacing Pi's version.

Out of the box, it produces the exact same prompt as stock Pi — a no-op. You fork this repo and edit `src/build-system-prompt.ts` to make it yours.

## Usage

1. Fork/clone this repo
2. Edit the template in `src/build-system-prompt.ts` (look for the `EDIT BELOW/ABOVE` markers)
3. Install into Pi:
```bash
pi install /path/to/your/clone
```
Or for a quick test without installing:
```bash
pi -e /path/to/your/clone
```

After making changes, run `/reload` in Pi to pick them up.

## Example

```typescript
// In buildSystemPrompt(), replace the template string:

let prompt = `You are a senior security auditor specializing in Solidity smart contracts.
Your primary focus is identifying vulnerabilities, gas optimization issues,
and deviations from best practices.

Available tools:
${toolsList}

Guidelines:
${guidelines}
- Always check for reentrancy, access control, and integer overflow
- Reference specific line numbers when reporting findings
- Classify severity as Critical / High / Medium / Low / Informational`
```
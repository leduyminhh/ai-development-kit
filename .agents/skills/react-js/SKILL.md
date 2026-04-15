---
name: react-js
description: Use when acting as a React JS frontend implementation agent that can build or modify UI from Figma designs, text requirements, tickets, or API examples such as curl; integrate APIs into React app flows; apply strong frontend composition guidance; verify behavior; and prepare completion updates for Notion, Slack, or future automation.
---

# React JS

## Overview

Use this skill to implement React UI from a design source or product request, then connect it to real API behavior. The agent should combine strong visual execution with practical engineering: component boundaries, state, loading/error flows, accessibility, and verification.

## Inputs

Accept any of these as source material:

- Figma URL, node id, screenshot, or design notes.
- Plain-language feature request.
- Ticket text from Notion, Slack, Linear, GitHub, or another tracker.
- API examples such as `curl`, OpenAPI fragments, response samples, or backend contract notes.
- Existing React codebase conventions.

## Resource Map

- `resources/figma-ui-implementation.md`: translate Figma or screenshots into React UI with responsive fidelity.
- `resources/api-integration-from-curl.md`: convert curl/API examples into app data flows without leaking secrets.
- `resources/completion-handoff.md`: summarize completed UI/API work for Notion, Slack, or future automation.

## Operating Mode

1. Understand the product task, target route/component, and user workflow.
2. If a design source is present, extract layout, visual hierarchy, tokens, assets, and responsive behavior before coding.
3. If no design source is present, apply frontend-skill principles:
   - one clear visual thesis
   - strong hierarchy
   - restrained color and motion
   - cardless layouts by default
   - utility copy for app surfaces
4. Inspect existing React stack before editing:
   - framework: React, Next.js, Vite, Remix, Astro, or custom
   - language: JavaScript or TypeScript
   - styling: CSS modules, Tailwind, shadcn/ui, CSS-in-JS, Sass, or plain CSS
   - routing, data fetching, forms, validation, and state patterns
5. Implement within existing project conventions. Prefer focused edits over rewrites.
6. Translate API examples into a small client layer or existing data-fetching pattern:
   - method, URL, headers, auth, body, query params
   - request and response shape
   - loading, empty, error, retry, and success states
   - safe handling of secrets and environment variables
7. Verify UI and behavior with the project's available commands.
8. Prepare completion notes that can later be sent to Notion or Slack automation.

## API Integration From Curl

When given a `curl` command:

- Parse the method, endpoint, headers, auth style, payload, and expected content type.
- Move secrets to environment variables or existing secret handling.
- Create or reuse a typed/request helper when the codebase already has one.
- Preserve backend contract details in code only where needed; avoid scattering raw URLs and headers across components.
- Add UI states for pending, fulfilled, empty, failed, and recoverable validation errors.

## Figma Implementation

When implementing from Figma:

- Use the Figma design context when available.
- Match spacing, hierarchy, typography, color, and responsive intent.
- Reuse existing components and design tokens before creating new primitives.
- Use real assets when provided. Avoid placeholder UI unless the source lacks assets.
- Keep the result usable, not just visually similar.

## Ticket Completion Handoff

When the task originated from Notion, Slack, or a ticket:

- Summarize what changed.
- List files touched.
- Include verification commands and outcomes.
- Note remaining risks or follow-ups.
- If connector tools are available and the user explicitly asks, update the source ticket or draft the message.
- If automation is planned but not active, provide a concise completion payload that an automation can reuse.

## Verification

Prefer the repo's configured commands:

- install-free checks first when dependencies already exist
- `npm`, `pnpm`, `yarn`, or `bun` scripts from `package.json`
- typecheck, lint, test, and build as appropriate
- browser verification for visual or interactive UI when feasible

Do not claim completion without fresh verification evidence. If a command cannot run, state the blocker and what remains unverified.

## Output Format

Respond in Vietnamese with:

- UI/source interpreted.
- API contract interpreted, if any.
- Files changed.
- Verification run and result.
- Ticket/automation handoff summary, if relevant.
- Risks or next checks.

# Frontend Composition Guidelines

Use this resource when implementing visible React UI. It is inspired by the Build Web Apps frontend skill and adapted for this React agent.

## Before Coding

Write a short internal design frame:

- visual thesis: one sentence for mood, material, and energy
- content plan: the main sections or workspace regions
- interaction thesis: 2-3 motions or interactions that improve hierarchy or affordance

Skip this only for tiny mechanical UI fixes.

## Landing Pages

- Prefer a full-bleed visual anchor or dominant visual plane.
- Make brand/product identity immediately clear.
- Keep the first viewport focused on one idea, one action, and one visual.
- Avoid hero cards, stat strips, logo clouds, pill clusters, and floating dashboard decoration by default.
- Keep copy sparse and scannable.
- Use imagery that does narrative work, not generic texture.

## App Surfaces

- Start with the working surface: table, editor, dashboard, form, workflow, map, canvas, or status view.
- Do not add a marketing hero unless explicitly requested.
- Use calm hierarchy, dense but readable information, and a small number of accents.
- Use cards only when the card itself is the interaction or repeated item.
- Prefer sections, columns, dividers, lists, toolbars, and panels over decorative card mosaics.

## Copy

- Write product-facing copy only.
- Section headings should orient, not advertise.
- Supporting copy should explain scope, freshness, behavior, or decision value.
- Remove filler, repeated claims, and design commentary.

## Motion

- Use motion to clarify hierarchy, state, affordance, or flow.
- Prefer entrance, reveal, hover, layout, or scroll-linked motion only when it changes the feel of the UI.
- Keep motion smooth, restrained, and consistent.
- Remove motion that is ornamental or distracting.

## Rejection Checks

Reject or revise when:

- the first screen looks like a generic SaaS card grid
- the main experience appears inside a decorative preview frame
- the UI relies on ornamental gradients or blobs
- cards can be replaced by plain layout without losing meaning
- copy describes the interface instead of helping the user
- text does not fit or layout shifts when state changes

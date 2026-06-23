# Figma UI Implementation

Use this resource when building React UI from Figma, screenshots, or detailed visual requirements.

## Read The Source

- Identify the target frame, node, or screenshot region.
- Extract layout hierarchy, spacing, typography, color, states, and assets.
- Map components to existing code before creating new ones.
- Identify responsive behavior for mobile, tablet, and desktop.

## Implementation Rules

- Build the usable screen or component, not a decorative preview.
- Keep the primary experience visible immediately for app/tool workflows.
- Use existing tokens, components, and CSS patterns first.
- Avoid cards by default; use structure, spacing, and typography before chrome.
- Keep text stable and readable across breakpoints.
- Add keyboard and focus behavior for interactive elements.

## Visual Verification

- Run the local app when feasible.
- Check desktop and mobile viewport behavior.
- Confirm assets render and interactive states do not shift layout.
- Note any Figma ambiguity instead of inventing unsupported behavior.

## Output

Return:

- design source interpreted
- components/routes changed
- responsive notes
- verification run
- remaining visual gaps

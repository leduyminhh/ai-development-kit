---
name: incident-response
description: Use when triaging, mitigating, or reviewing a production incident, including detection signals, severity classification, mitigation, communication, and postmortem.
---

# Incident Response

## Overview

Use this skill to drive a production incident from detection to resolution and
learning: classify severity, stabilize the system, communicate status, and
capture a blameless postmortem with concrete follow-ups.

## When to Use

Use this skill when a service is degraded or down, when an alert fires and needs
triage, or when an incident is over and needs a postmortem. Use it for
observability questions about which signals to watch and how to escalate.

## Core Process

1. Establish the facts: what is failing, since when, blast radius, and the
   observable signals (errors, latency, saturation, traffic).
2. Classify severity and assign an incident lead and a communications owner.
3. Stabilize first: mitigate or roll back to restore service before root-causing.
4. Communicate status on a predictable cadence to the affected stakeholders.
5. After recovery, run a blameless postmortem with a timeline, root cause,
   contributing factors, and owned, dated action items.

## Severity Guide

- **SEV1** — broad outage or data loss; all-hands, immediate mitigation.
- **SEV2** — major feature degraded for many users; urgent, focused response.
- **SEV3** — limited or single-tenant impact with a known workaround.

## Signals to Watch

- The four golden signals: latency, traffic, errors, saturation.
- Recent deploys, config changes, and dependency health as first suspects.
- Error budget burn rate to decide whether to freeze releases.

## Red Flags

- Root-causing before the system is stabilized.
- No single incident lead, or no status cadence to stakeholders.
- Postmortem assigns blame instead of system-level fixes.
- Action items have no owner or no due date.

## Verification

- Confirm the mitigation actually restored the affected signals.
- Confirm monitoring would detect a recurrence.
- Confirm every postmortem action item has an owner and a date.
- Report residual risk and any follow-up incident needed.

## Output Format

- Incident summary, severity, and timeline.
- Mitigation taken and current status.
- Root cause and contributing factors.
- Owned, dated action items.

## Notes

- Prefer reversible mitigation (rollback, feature flag) over speculative fixes.
- Return user-facing results in Vietnamese.

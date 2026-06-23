# Migration Guide: v1.0 → v1.1

## Overview

v1.1.0 standardizes naming conventions across all plugins. This guide helps you migrate from old skill, command, and workflow names.

## Renamed Skills

| Old Name | New Name | Plugin | Reason |
|----------|----------|--------|--------|
| `java-analyze` | `java-implement` | application | Verb-noun pattern: matches action (implement) not observation (analyze) |
| `python-backend-engineer` | `python-implement` | application | Consistency with Java; -implement is the action suffix |
| `react-code-generate` | `react-implement` | application | Alignment with backend implementation naming |

**Update in your Required Skills sections:**

```markdown
## Required Skills

<!-- Before -->
- java-analyze
- python-backend-engineer
- react-code-generate

<!-- After -->
- java-implement
- python-implement
- react-implement
```

## Renamed Commands

| Old Name | New Name | Plugin | Reason |
|----------|----------|--------|--------|
| `migration-plan` | `plan-migration` | data | Verb-noun order: plan-migration matches imperative (verb first) |
| `deployment-plan` | `plan-deployment` | platform | Consistency with data plugin pattern |

**Update in your workflows:**

```yaml
# Before
- uses: data/migration-plan
- uses: platform/deployment-plan

# After
- uses: data/plan-migration
- uses: platform/plan-deployment
```

**Update in your Required Skills:**

```markdown
# Before
- migration-plan
- deployment-plan

# After
- plan-migration
- plan-deployment
```

## Renamed Workflows

| Old Name | New Name | Plugin | Reason |
|----------|----------|--------|--------|
| `fullstack-feature` | `feature-delivery-pipeline` | application | Descriptive: shows full pipeline (architecture → backend → frontend → integrate → review → test) |

**Update references:**

```yaml
# Before
- workflow: fullstack-feature

# After
- workflow: feature-delivery-pipeline
```

## Removed Skills

7 phase-specific feature-* skills have been consolidated:

| Skill | Reason | Alternative |
|-------|--------|-------------|
| `feature-deliver` | Orchestrator; not an impl skill | Use Required Skills of delegate commands |
| `feature-plan` | Planning phase | Include planning in command description |
| `feature-implement` | Generic; use stack-specific instead | Use java-implement, python-implement, or react-implement |
| `feature-integrate` | Integration phase | Use api-contract-design, code-shared-design |
| `feature-review` | Generic review | Use stack-specific skills (java-implement, etc.) |
| `feature-test` | Generic testing | Use test-automation-validate, test-qa-review |
| `feature-fix` | Generic fixing | Use stack-specific impl skills |

**Commands that consumed these skills have been updated to use actual implementation skills.**

## Breaking Changes

### If you have custom commands referencing old skills:

**Example: Old command with phase-specific skills**

```markdown
## Required Skills

- feature-implement
- feature-review
- feature-test
```

**Update to:**

```markdown
## Required Skills

- java-implement
- python-implement
- react-implement
- test-automation-validate
- test-qa-review
```

### If you have custom workflows:

Workflows using old skills will fail validation. Update step `uses:` field:

```yaml
# Before
steps:
  - id: implement
    uses: application/feature-implement
    
  - id: review
    uses: application/feature-review

# After
steps:
  - id: implement-java
    uses: application/java-implement
    
  - id: implement-python
    uses: application/python-implement
    
  - id: review
    uses: quality/test-qa-review
```

## Dependency Changes

The `application` plugin now requires 4 plugins (previously 1 required + 3 optional):

```yaml
# Before
dependencies:
  required: [architecture]
  optional: [quality, security, data]

# After
dependencies:
  required: [architecture, quality, security, data]
  optional: []
```

This reflects that commands like `deliver-feature`, `review-backend`, `test-feature` directly use skills from these plugins.

## Validation

Run `aie validate` to check your custom content:

```bash
aie validate
# Output: Validated 7 plugins for 4 providers.
```

If you see errors about unknown skills, check:
1. Skill name capitalization (all lowercase, hyphenated)
2. Plugin.yaml `assets.skills` list matches skill directories
3. Command `Required Skills` sections reference valid skills

## Need Help?

- Check [plugins/README.md](plugins/README.md) for current plugin structure
- See [CHANGELOG.md](CHANGELOG.md) for detailed changes
- Run `aie doctor` to diagnose plugin issues

## Summary

- ✅ Skill names: noun-action pattern (java-implement, react-implement, etc.)
- ✅ Command names: verb-noun pattern (plan-migration, plan-deployment)
- ✅ Workflow names: domain-pipeline pattern (feature-delivery-pipeline)
- ✅ Removed 7 phase-specific skills; use stack-specific instead
- ✅ All plugins now require quality, security, data where used

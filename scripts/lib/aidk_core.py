from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import tomllib
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SUPPORTED_PROVIDERS = ("codex", "claude", "cursor")
PROVIDER_OUTPUTS = {
    "codex": ".codex-plugin/plugin.json",
    "claude": ".claude-plugin/plugin.json",
    "cursor": ".cursor-plugin/plugin.json",
}


class AidkError(RuntimeError):
    pass


@dataclass(frozen=True)
class Artifact:
    provider: str
    path: str
    ownership: str
    content: str

    def to_dict(self) -> dict[str, str]:
        return {
            "provider": self.provider,
            "path": self.path,
            "ownership": self.ownership,
            "content": self.content,
        }


def load_json_yaml(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise AidkError(f"required file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise AidkError(
            f"{path} must use the JSON-compatible YAML subset: {exc.msg}"
        ) from exc


def read_text_preserving_newlines(path: Path) -> str:
    with path.open("r", encoding="utf-8", newline="") as stream:
        return stream.read()


def load_skill_manifest(root: Path) -> dict[str, dict[str, Any]]:
    path = root / "skills" / "manifest.toml"
    try:
        with path.open("rb") as stream:
            manifest = tomllib.load(stream)
    except FileNotFoundError as exc:
        raise AidkError(f"skill manifest not found: {path}") from exc

    skills: dict[str, dict[str, Any]] = {}
    for item in manifest.get("skill", []):
        name = item.get("name")
        if not isinstance(name, str) or not name:
            raise AidkError("skill manifest contains an entry without a name")
        if name in skills:
            raise AidkError(f"duplicate skill in manifest: {name}")
        skills[name] = item
    return skills


def load_packages(root: Path) -> dict[str, dict[str, Any]]:
    packages_root = root / "packages"
    if not packages_root.is_dir():
        raise AidkError(f"packages root not found: {packages_root}")

    packages: dict[str, dict[str, Any]] = {}
    for path in sorted(packages_root.glob("*/package.yaml")):
        package = load_json_yaml(path)
        metadata = package.get("metadata", {})
        package_id = metadata.get("id")
        if not isinstance(package_id, str) or not package_id:
            raise AidkError(f"package id is required: {path}")
        if path.parent.name != package_id:
            raise AidkError(
                f"package id must match directory: {package_id} != {path.parent.name}"
            )
        if package_id in packages:
            raise AidkError(f"duplicate package id: {package_id}")
        packages[package_id] = package
    return packages


def validate_contracts(
    root: Path,
    config: dict[str, Any],
    packages: dict[str, dict[str, Any]],
    skills: dict[str, dict[str, Any]],
) -> None:
    required_schemas = (
        "aidk-config.schema.json",
        "package.schema.json",
        "adapter-output.schema.json",
        "install-state.schema.json",
    )
    for schema_name in required_schemas:
        schema = load_json_yaml(root / "schemas" / schema_name)
        if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
            raise AidkError(f"schema must use JSON Schema 2020-12: {schema_name}")

    if config.get("apiVersion") != "aidk.dev/v1alpha1":
        raise AidkError("unsupported AIDK config apiVersion")
    product = config.get("product", {})
    for key in ("name", "displayName", "version", "description"):
        if not product.get(key):
            raise AidkError(f"config product.{key} is required")

    configured_providers = config.get("providers", {}).get("enabled", [])
    unknown_providers = sorted(set(configured_providers) - set(SUPPORTED_PROVIDERS))
    if unknown_providers:
        raise AidkError(f"unknown providers: {', '.join(unknown_providers)}")

    configured_packages = config.get("packages", {}).get("enabled", [])
    unknown_packages = sorted(set(configured_packages) - set(packages))
    if unknown_packages:
        raise AidkError(f"unknown configured packages: {', '.join(unknown_packages)}")

    known_agents = {
        path.stem for path in (root / ".codex" / "agents").glob("*.toml")
    }
    known_workflows = load_workflow_names(root)

    for package_id, package in packages.items():
        if package.get("apiVersion") != "aidk.dev/v1alpha1":
            raise AidkError(f"unsupported package apiVersion: {package_id}")
        if package.get("kind") != "Package":
            raise AidkError(f"invalid package kind: {package_id}")
        metadata = package.get("metadata", {})
        if metadata.get("version") != product["version"]:
            raise AidkError(
                f"package version must match AIDK version: {package_id}"
            )

        dependencies = package.get("dependencies", {})
        dependency_ids = dependencies.get("required", []) + dependencies.get(
            "optional", []
        )
        for dependency in dependency_ids:
            if dependency not in packages:
                raise AidkError(
                    f"package {package_id} references unknown dependency {dependency}"
                )

        assets = package.get("assets", {})
        for skill in assets.get("skills", []):
            if skill not in skills:
                raise AidkError(
                    f"package {package_id} references unknown skill {skill}"
                )
        for agent in assets.get("agents", []):
            if agent not in known_agents:
                raise AidkError(
                    f"package {package_id} references unknown agent {agent}"
                )
        for workflow in assets.get("workflows", []):
            if workflow not in known_workflows:
                raise AidkError(
                    f"package {package_id} references unknown workflow {workflow}"
                )

    detect_dependency_cycles(packages)


def load_workflow_names(root: Path) -> set[str]:
    registry_path = root / ".codex" / "workflows" / "registry.toml"
    if not registry_path.exists():
        return set()
    with registry_path.open("rb") as stream:
        registry = tomllib.load(stream)
    names: set[str] = set()
    for key in ("workflow", "workflows"):
        for item in registry.get(key, []):
            name = item.get("name") or item.get("id")
            if isinstance(name, str):
                names.add(name)
    return names


def detect_dependency_cycles(packages: dict[str, dict[str, Any]]) -> None:
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(package_id: str) -> None:
        if package_id in visiting:
            raise AidkError(f"package dependency cycle detected at {package_id}")
        if package_id in visited:
            return
        visiting.add(package_id)
        required = packages[package_id].get("dependencies", {}).get("required", [])
        for dependency in required:
            visit(dependency)
        visiting.remove(package_id)
        visited.add(package_id)

    for package_id in sorted(packages):
        visit(package_id)


def parse_csv(value: str | None, fallback: list[str]) -> list[str]:
    if value is None or not value.strip():
        return list(fallback)
    return sorted(
        {
            item.strip()
            for item in value.split(",")
            if item.strip()
        }
    )


def resolve_packages(
    requested: list[str], packages: dict[str, dict[str, Any]]
) -> list[str]:
    unknown = sorted(set(requested) - set(packages))
    if unknown:
        raise AidkError(f"unknown requested packages: {', '.join(unknown)}")

    resolved: list[str] = []
    visiting: set[str] = set()

    def add(package_id: str) -> None:
        if package_id in resolved:
            return
        if package_id in visiting:
            raise AidkError(f"package dependency cycle detected at {package_id}")
        visiting.add(package_id)
        required = packages[package_id].get("dependencies", {}).get("required", [])
        for dependency in sorted(required):
            add(dependency)
        visiting.remove(package_id)
        resolved.append(package_id)

    for package_id in sorted(requested):
        add(package_id)
    return resolved


def resolve_assets(
    resolved_packages: list[str], packages: dict[str, dict[str, Any]]
) -> tuple[list[str], list[str], list[str]]:
    skills: set[str] = set()
    agents: set[str] = set()
    hooks: set[str] = set()
    for package_id in resolved_packages:
        assets = packages[package_id].get("assets", {})
        skills.update(assets.get("skills", []))
        agents.update(assets.get("agents", []))
        hooks.update(assets.get("hooks", []))
    return sorted(skills), sorted(agents), sorted(hooks)


def build_manifest(
    provider: str,
    config: dict[str, Any],
    packages: list[str],
    skills: list[str],
) -> dict[str, Any]:
    product = config["product"]
    manifest: dict[str, Any] = {
        "name": product["name"],
        "description": product["description"],
        "version": product["version"],
        "author": {"name": "leduyminhh"},
        "homepage": "https://github.com/leduyminhh/ai-development-kit",
        "repository": "https://github.com/leduyminhh/ai-development-kit",
        "license": "MIT",
        "keywords": ["skills", "workflow", "hooks", provider],
        "skills": "./skills/",
        "aidk": {
            "apiVersion": config["apiVersion"],
            "packages": packages,
            "resolvedSkills": skills,
        },
    }
    if provider == "claude":
        manifest["hooks"] = "./adapters/claude/hooks.json"
    elif provider == "cursor":
        manifest["displayName"] = product["displayName"]
        manifest["hooks"] = "./adapters/cursor/hooks.json"
    elif provider == "codex":
        manifest["interface"] = {
            "displayName": product["displayName"],
            "shortDescription": "Bootstrap workflow and skill routing",
            "longDescription": (
                "Use AI Development Kit to bootstrap skill selection, validate "
                "workflow registry entries, and keep provider adapters thin."
            ),
            "developerName": "leduyminhh",
            "category": "Coding",
            "capabilities": ["Read", "Write"],
            "defaultPrompt": [
                "Use $using-workflow-kit before selecting a workflow or fallback skill."
            ],
        }
    return manifest


def build_artifacts(
    root: Path,
    providers: list[str],
    config: dict[str, Any],
    packages: list[str],
    skills: list[str],
) -> list[Artifact]:
    artifacts: list[Artifact] = []
    for provider in providers:
        manifest = build_manifest(provider, config, packages, skills)
        content = json.dumps(manifest, indent=2, ensure_ascii=True) + "\n"
        artifacts.append(
            Artifact(
                provider=provider,
                path=PROVIDER_OUTPUTS[provider],
                ownership="managed",
                content=content,
            )
        )

    for skill in skills:
        skill_root = root / "skills" / skill
        for path in sorted(item for item in skill_root.rglob("*") if item.is_file()):
            relative_path = path.relative_to(root).as_posix()
            if "__pycache__" in path.parts or path.suffix == ".pyc":
                continue
            artifacts.append(
                Artifact(
                    provider="shared",
                    path=relative_path,
                    ownership="managed",
                    content=read_text_preserving_newlines(path),
                )
            )

    provider_hook_paths = {
        "claude": "adapters/claude/hooks.json",
        "cursor": "adapters/cursor/hooks.json",
    }
    for provider in providers:
        relative_path = provider_hook_paths.get(provider)
        if relative_path is None:
            continue
        path = root / relative_path
        artifacts.append(
            Artifact(
                provider=provider,
                path=relative_path,
                ownership="managed",
                content=read_text_preserving_newlines(path),
            )
        )
    return artifacts


def checksum_text(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def checksum_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_state(target_root: Path) -> dict[str, Any] | None:
    path = target_root / ".aidk" / "install-state.json"
    if not path.exists():
        return None
    return load_json_yaml(path)


def find_conflicts(
    target_root: Path,
    artifacts: list[Artifact],
    previous_state: dict[str, Any] | None,
) -> list[str]:
    conflicts: list[str] = []
    previous_checksums = (
        previous_state.get("sourceChecksums", {}) if previous_state else {}
    )
    for artifact in artifacts:
        path = target_root / artifact.path
        if not path.exists():
            continue
        desired_checksum = checksum_text(artifact.content)
        current_checksum = checksum_file(path)
        if current_checksum == desired_checksum:
            continue
        previous_checksum = previous_checksums.get(artifact.path)
        if previous_checksum is None or current_checksum != previous_checksum:
            conflicts.append(artifact.path)
    return conflicts


def write_artifacts(
    target_root: Path,
    artifacts: list[Artifact],
    overwrite_policy: str,
    previous_state: dict[str, Any] | None,
) -> list[str]:
    conflicts = find_conflicts(target_root, artifacts, previous_state)
    if conflicts and overwrite_policy == "ask":
        raise AidkError(f"conflict: {', '.join(conflicts)}")

    written: list[str] = []
    for artifact in artifacts:
        path = target_root / artifact.path
        if path.as_posix() in conflicts and overwrite_policy == "skip":
            continue
        if artifact.path in conflicts and overwrite_policy == "skip":
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(artifact.content, encoding="utf-8", newline="\n")
        written.append(artifact.path)
    return written


def write_state(
    target_root: Path,
    config: dict[str, Any],
    providers: list[str],
    resolved_packages: list[str],
    packages: dict[str, dict[str, Any]],
    hooks: list[str],
    artifacts: list[Artifact],
    written: list[str],
) -> Path:
    checksums = {
        artifact.path: checksum_file(target_root / artifact.path)
        for artifact in artifacts
        if artifact.path in written
    }
    state = {
        "schemaVersion": 1,
        "aidkVersion": config["product"]["version"],
        "providers": providers,
        "packages": {
            package_id: packages[package_id]["metadata"]["version"]
            for package_id in resolved_packages
        },
        "hooks": hooks,
        "generatedFiles": written,
        "sourceChecksums": checksums,
        "installedAt": datetime.now(timezone.utc).isoformat(),
    }
    state_path = target_root / ".aidk" / "install-state.json"
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(
        json.dumps(state, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    return state_path


def provider_hook_argument(providers: list[str]) -> str:
    has_codex = "codex" in providers
    has_claude = "claude" in providers
    if has_codex and has_claude:
        return "all"
    if has_codex:
        return "codex"
    if has_claude:
        return "claude"
    return "none"


def run_hook_installer(
    root: Path,
    target_root: Path,
    action: str,
    providers: list[str],
) -> Any:
    installer = root / "scripts" / "install-hooks.ps1"
    command = [
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(installer),
        "-TargetRoot",
        str(target_root),
        "-Action",
        action,
        "-Provider",
        provider_hook_argument(providers),
    ]
    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip()
        raise AidkError(f"hook {action} failed: {detail}")
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise AidkError(f"hook {action} returned invalid JSON") from exc


def capture_artifact_backups(
    target_root: Path, artifacts: list[Artifact]
) -> dict[str, bytes | None]:
    backups: dict[str, bytes | None] = {}
    for artifact in artifacts:
        path = target_root / artifact.path
        backups[artifact.path] = path.read_bytes() if path.exists() else None
    return backups


def restore_artifact_backups(
    target_root: Path, backups: dict[str, bytes | None]
) -> None:
    for relative_path, content in backups.items():
        path = target_root / relative_path
        if content is None:
            if path.exists():
                path.unlink()
                remove_empty_parents(path.parent, target_root)
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)


def remove_installation(root: Path, target_root: Path) -> dict[str, Any]:
    state = load_state(target_root)
    if state is None:
        return {"status": "pass", "removed": [], "message": "no install state"}

    conflicts: list[str] = []
    for relative_path in state.get("generatedFiles", []):
        path = target_root / relative_path
        if not path.exists():
            continue
        expected = state.get("sourceChecksums", {}).get(relative_path)
        if expected and checksum_file(path) != expected:
            conflicts.append(relative_path)
    if conflicts:
        raise AidkError(f"conflict: generated files have drifted: {', '.join(conflicts)}")

    hooks = state.get("hooks", [])
    if "project-audit" in hooks:
        run_hook_installer(
            root,
            target_root,
            "uninstall",
            state.get("providers", []),
        )

    removed: list[str] = []
    for relative_path in state.get("generatedFiles", []):
        path = target_root / relative_path
        if path.exists():
            path.unlink()
            removed.append(relative_path)
            remove_empty_parents(path.parent, target_root)

    state_path = target_root / ".aidk" / "install-state.json"
    state_path.unlink(missing_ok=True)
    remove_empty_parents(state_path.parent, target_root)
    return {"status": "pass", "removed": removed, "hooks": hooks}


def remove_empty_parents(path: Path, stop: Path) -> None:
    current = path
    while current != stop and current.is_dir():
        try:
            current.rmdir()
        except OSError:
            return
        current = current.parent


def execute(args: argparse.Namespace) -> dict[str, Any]:
    root = Path(args.root).resolve()
    target_root = Path(args.target_root).resolve()
    config = load_json_yaml(root / "aidk.config.yaml")
    skills = load_skill_manifest(root)
    packages = load_packages(root)
    validate_contracts(root, config, packages, skills)

    if args.action == "validate":
        return {
            "status": "pass",
            "aidkVersion": config["product"]["version"],
            "packageCount": len(packages),
            "skillCount": len(skills),
        }
    if args.action == "remove":
        return remove_installation(root, target_root)

    requested_packages = parse_csv(
        args.package, config.get("packages", {}).get("enabled", [])
    )
    providers = parse_csv(
        args.provider, config.get("providers", {}).get("enabled", [])
    )
    unknown_providers = sorted(set(providers) - set(SUPPORTED_PROVIDERS))
    if unknown_providers:
        raise AidkError(f"unknown requested providers: {', '.join(unknown_providers)}")

    resolved_packages = resolve_packages(requested_packages, packages)
    resolved_skills, resolved_agents, resolved_hooks = resolve_assets(
        resolved_packages, packages
    )
    artifacts = build_artifacts(
        root, providers, config, resolved_packages, resolved_skills
    )
    result: dict[str, Any] = {
        "status": "pass",
        "packages": resolved_packages,
        "skills": resolved_skills,
        "agents": resolved_agents,
        "hooks": resolved_hooks,
        "providers": providers,
        "artifacts": [artifact.to_dict() for artifact in artifacts],
    }
    if args.action == "plan":
        return result

    target_root.mkdir(parents=True, exist_ok=True)
    previous_state = load_state(target_root)
    overwrite_policy = args.overwrite_policy or config["generation"][
        "overwritePolicy"
    ]
    backups = capture_artifact_backups(target_root, artifacts)
    written = write_artifacts(target_root, artifacts, overwrite_policy, previous_state)
    result["written"] = written
    if args.action == "install":
        try:
            if "project-audit" in resolved_hooks:
                result["hookInstall"] = run_hook_installer(
                    root, target_root, "install", providers
                )
            state_path = write_state(
                target_root,
                config,
                providers,
                resolved_packages,
                packages,
                resolved_hooks,
                artifacts,
                written,
            )
        except Exception:
            restore_artifact_backups(target_root, backups)
            if "project-audit" in resolved_hooks:
                try:
                    run_hook_installer(root, target_root, "uninstall", providers)
                except AidkError:
                    pass
            raise
        result["statePath"] = str(state_path)
    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="AIDK repository-local CLI")
    parser.add_argument(
        "--action",
        required=True,
        choices=("validate", "plan", "export", "install", "remove"),
    )
    parser.add_argument("--root", required=True)
    parser.add_argument("--target-root", required=True)
    parser.add_argument("--package")
    parser.add_argument("--provider")
    parser.add_argument(
        "--overwrite-policy",
        choices=("ask", "overwrite", "skip"),
    )
    parser.add_argument("--json", action="store_true")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        result = execute(args)
        print(json.dumps(result, ensure_ascii=True))
        return 0
    except AidkError as exc:
        error = {"status": "fail", "error": str(exc)}
        print(json.dumps(error, ensure_ascii=True), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

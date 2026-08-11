"""Pi Dev Studio operational health checks (Phase 12).

Read-only checks for rollout operators. No Mainnet calls, no Pi credentials,
no payment execution. Safe to run in CI and staging.
"""

from __future__ import annotations

import json
import re
import subprocess
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parents[4]
_SEEDS = Path(__file__).resolve().parents[1] / "seeds"
_BUNDLES = Path(__file__).resolve().parents[1] / "bundles"
_FLAGS = _REPO_ROOT / "orchestrator" / "feature_flags"
_PI_INTEGRATION = _REPO_ROOT / "packages" / "pi-integration"

PI_FLAGS = (
    "pi_knowledge",
    "pi_skills",
    "pi_templates",
    "pi_payments_template",
)

PI_BASES = {
    "pi-web-starter": "base/pi-web-starter",
    "pi-auth-starter": "base/pi-auth-starter",
    "pi-payments-starter": "base/pi-payments-starter",
}

PI_SKILLS = (
    "pi-sdk",
    "pi-auth",
    "pi-platform-api",
    "pi-payments",
    "pi-developer-portal",
    "pi-browser",
    "pi-compliance",
)

DEFAULT_VERSION = "0.1.0"


@dataclass
class HealthCheckResult:
    name: str
    ok: bool
    detail: str = ""


@dataclass
class PiOpsHealthReport:
    ok: bool
    checks: list[HealthCheckResult] = field(default_factory=list)
    flag_defaults: dict[str, bool] = field(default_factory=dict)
    resolved_flags: dict[str, bool] = field(default_factory=dict)
    resolved_env: str = "defaults"

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "flag_defaults": self.flag_defaults,
            "resolved_env": self.resolved_env,
            "resolved_flags": self.resolved_flags,
            "checks": [asdict(c) for c in self.checks],
        }


def resolve_flags_for_env(env: str) -> dict[str, bool]:
    """Resolve defaults + optional `{env}.yaml` overrides (orchestrator semantics)."""
    import yaml

    raw = yaml.safe_load((_FLAGS / "defaults.yaml").read_text(encoding="utf-8"))
    flags = {k: v for k, v in raw.items() if k != "public" and isinstance(v, bool)}
    env_path = _FLAGS / f"{env}.yaml"
    if env_path.exists():
        overrides = yaml.safe_load(env_path.read_text(encoding="utf-8")) or {}
        for key, value in overrides.items():
            if key == "public":
                continue
            if key not in flags:
                raise ValueError(f"Unknown feature flag override '{key}' in {env}.yaml")
            if not isinstance(value, bool):
                raise ValueError(f"Flag '{key}' in {env}.yaml must be boolean")
            flags[key] = value
    return flags


def load_stage3_activation_overlay() -> dict[str, bool]:
    """Load operator Stage 3 overlay fragment (not auto-applied)."""
    import yaml

    path = _FLAGS / "overlays" / "pi-stage3-activation.yaml"
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    out: dict[str, bool] = {}
    for flag in PI_FLAGS:
        if flag not in raw:
            raise ValueError(f"Stage 3 overlay missing {flag}")
        if not isinstance(raw[flag], bool):
            raise ValueError(f"Stage 3 overlay {flag} must be boolean")
        out[flag] = raw[flag]
    return out


def validate_stage3_activation_overlay() -> HealthCheckResult:
    """Stage 1–3 ON, Stage 4 payments OFF — operator overlay contract."""
    try:
        overlay = load_stage3_activation_overlay()
    except Exception as exc:  # noqa: BLE001 — surface as health detail
        return HealthCheckResult("stage3_activation_overlay", False, str(exc))
    if overlay["pi_knowledge"] is not True:
        return HealthCheckResult("stage3_activation_overlay", False, "pi_knowledge must be true")
    if overlay["pi_skills"] is not True:
        return HealthCheckResult("stage3_activation_overlay", False, "pi_skills must be true")
    if overlay["pi_templates"] is not True:
        return HealthCheckResult("stage3_activation_overlay", False, "pi_templates must be true")
    if overlay["pi_payments_template"] is not False:
        return HealthCheckResult(
            "stage3_activation_overlay",
            False,
            "pi_payments_template must remain false (Stage 4 not activated)",
        )
    return HealthCheckResult(
        "stage3_activation_overlay",
        True,
        "Stage 3 overlay enables knowledge/skills/templates; payments OFF",
    )


def simulate_env_with_stage3_overlay(env: str = "production") -> dict[str, bool]:
    """Dry-run: merge Stage 3 overlay onto resolved env flags (in memory only)."""
    resolved = resolve_flags_for_env(env)
    overlay = load_stage3_activation_overlay()
    merged = dict(resolved)
    merged.update(overlay)
    return {flag: merged[flag] for flag in PI_FLAGS}


def _git(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=str(_REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )


def check_feature_flag_safe_defaults() -> HealthCheckResult:
    import yaml

    raw = yaml.safe_load((_FLAGS / "defaults.yaml").read_text(encoding="utf-8"))
    for flag in PI_FLAGS:
        if raw.get(flag) is not False:
            return HealthCheckResult(
                "feature_flag_defaults",
                False,
                f"{flag} is not false in defaults.yaml",
            )
    # Env overlays must not silently enable Pi flags.
    for env_file in _FLAGS.glob("*.yaml"):
        if env_file.name == "defaults.yaml":
            continue
        overrides = yaml.safe_load(env_file.read_text(encoding="utf-8")) or {}
        for flag in PI_FLAGS:
            if overrides.get(flag) is True:
                return HealthCheckResult(
                    "feature_flag_defaults",
                    False,
                    f"{env_file.name} enables {flag}=true (forbidden without operator approval)",
                )
    return HealthCheckResult(
        "feature_flag_defaults",
        True,
        "All Pi flags default OFF; no env overlay enables them",
    )


def check_marketplace_seed_availability() -> HealthCheckResult:
    bases = json.loads((_SEEDS / "bases.json").read_text(encoding="utf-8"))
    skills = json.loads((_SEEDS / "skills_pi.json").read_text(encoding="utf-8"))
    base_slugs = {b["slug"] for b in bases}
    skill_slugs = {s["slug"] for s in skills}
    missing_bases = [s for s in PI_BASES if s not in base_slugs]
    missing_skills = [s for s in PI_SKILLS if s not in skill_slugs]
    if missing_bases or missing_skills:
        return HealthCheckResult(
            "marketplace_seeds",
            False,
            f"missing bases={missing_bases} skills={missing_skills}",
        )
    return HealthCheckResult(
        "marketplace_seeds",
        True,
        f"{len(PI_BASES)} Pi bases and {len(PI_SKILLS)} Pi skills present",
    )


def check_starter_registration() -> HealthCheckResult:
    bases = {b["slug"]: b for b in json.loads((_SEEDS / "bases.json").read_text(encoding="utf-8"))}
    for slug, branch in PI_BASES.items():
        entry = bases[slug]
        if entry.get("default_branch") != branch:
            return HealthCheckResult(
                "starter_registration",
                False,
                f"{slug} default_branch={entry.get('default_branch')} expected={branch}",
            )
        if entry.get("default_branch") in {"main", "master"}:
            return HealthCheckResult(
                "starter_registration",
                False,
                f"{slug} unexpectedly resolves to main/master",
            )
        bundle = _BUNDLES / "base" / slug / f"{DEFAULT_VERSION}.tar.zst"
        if not bundle.is_file():
            return HealthCheckResult(
                "starter_registration",
                False,
                f"missing bundle {bundle}",
            )
    return HealthCheckResult(
        "starter_registration",
        True,
        "Pi starters registered with orphan default_branch + bundles",
    )


def check_orphan_branch_resolution() -> HealthCheckResult:
    missing: list[str] = []
    for branch in PI_BASES.values():
        proc = _git("rev-parse", "--verify", f"origin/{branch}")
        if proc.returncode != 0 or not re.fullmatch(r"[0-9a-f]{40}", proc.stdout.strip()):
            missing.append(branch)
    if missing:
        return HealthCheckResult(
            "orphan_branches",
            False,
            f"unresolvable: {missing}",
        )
    return HealthCheckResult(
        "orphan_branches",
        True,
        "origin/base/pi-* orphan branches resolve",
    )


def check_skill_registration() -> HealthCheckResult:
    skills = {s["slug"]: s for s in json.loads((_SEEDS / "skills_pi.json").read_text(encoding="utf-8"))}
    for slug in PI_SKILLS:
        skill = skills[slug]
        if skill.get("is_builtin") is not False:
            return HealthCheckResult(
                "skill_registration",
                False,
                f"{slug} is_builtin must be false",
            )
        bundle = _BUNDLES / "skill" / slug / f"{DEFAULT_VERSION}.tar.zst"
        if not bundle.is_file():
            return HealthCheckResult(
                "skill_registration",
                False,
                f"missing skill bundle {bundle}",
            )
    return HealthCheckResult(
        "skill_registration",
        True,
        "Seven Pi skills registered non-builtin with bundles",
    )


def check_knowledge_catalog_integrity() -> HealthCheckResult:
    catalog_path = (
        _PI_INTEGRATION / "src" / "pi_integration" / "knowledge" / "catalog.json"
    )
    claims_path = (
        _PI_INTEGRATION / "src" / "pi_integration" / "knowledge" / "unsupported_claims.json"
    )
    if not catalog_path.is_file() or not claims_path.is_file():
        return HealthCheckResult("knowledge_catalog", False, "catalog/claims missing")
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    claims = json.loads(claims_path.read_text(encoding="utf-8"))
    if catalog.get("schema_version") != 1:
        return HealthCheckResult("knowledge_catalog", False, "unexpected schema_version")
    if len(catalog.get("entries") or []) < 1:
        return HealthCheckResult("knowledge_catalog", False, "empty catalog")
    if len(claims.get("claims") or []) < 1:
        return HealthCheckResult("knowledge_catalog", False, "empty unsupported claims")
    for entry in catalog["entries"]:
        if entry.get("community") is True:
            return HealthCheckResult(
                "knowledge_catalog",
                False,
                f"community source elevated: {entry.get('id')}",
            )
        if not str(entry.get("source_url", "")).startswith("https://"):
            return HealthCheckResult(
                "knowledge_catalog",
                False,
                f"bad source_url for {entry.get('id')}",
            )
    return HealthCheckResult(
        "knowledge_catalog",
        True,
        f"{len(catalog['entries'])} catalog entries; {len(claims['claims'])} unsupported claims",
    )


def check_feature_flag_registration() -> HealthCheckResult:
    import yaml

    raw = yaml.safe_load((_FLAGS / "defaults.yaml").read_text(encoding="utf-8"))
    public = set(raw.get("public") or [])
    for flag in PI_FLAGS:
        if flag not in raw:
            return HealthCheckResult("feature_flag_registration", False, f"missing {flag}")
        if flag not in public:
            return HealthCheckResult(
                "feature_flag_registration", False, f"{flag} not public"
            )
        if f"pi.{flag.split('_', 1)[-1]}" in raw:
            return HealthCheckResult(
                "feature_flag_registration",
                False,
                "dotted proposal names must not be registered keys",
            )
    return HealthCheckResult(
        "feature_flag_registration",
        True,
        "Pi flags registered snake_case + public",
    )


def run_pi_ops_health(
    *,
    include_git_orphans: bool = True,
    env: str = "production",
    include_stage3_overlay_check: bool = True,
) -> PiOpsHealthReport:
    """Run the Phase 12/13 operational health suite."""
    import yaml

    raw = yaml.safe_load((_FLAGS / "defaults.yaml").read_text(encoding="utf-8"))
    flag_defaults = {flag: bool(raw.get(flag)) for flag in PI_FLAGS}
    resolved_flags = {flag: resolve_flags_for_env(env)[flag] for flag in PI_FLAGS}

    checks = [
        check_feature_flag_safe_defaults(),
        check_feature_flag_registration(),
        check_marketplace_seed_availability(),
        check_starter_registration(),
        check_skill_registration(),
        check_knowledge_catalog_integrity(),
    ]
    if include_git_orphans:
        checks.append(check_orphan_branch_resolution())
    if include_stage3_overlay_check:
        checks.append(validate_stage3_activation_overlay())

    ok = all(c.ok for c in checks)
    return PiOpsHealthReport(
        ok=ok,
        checks=checks,
        flag_defaults=flag_defaults,
        resolved_flags=resolved_flags,
        resolved_env=env,
    )


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Pi Dev Studio ops healthcheck")
    parser.add_argument(
        "--env",
        default="production",
        help="Environment overlay to resolve (default: production)",
    )
    parser.add_argument(
        "--simulate-stage3",
        action="store_true",
        help="Print dry-run Stage 3 overlay merge without applying it",
    )
    args = parser.parse_args()
    report = run_pi_ops_health(env=args.env)
    payload = report.to_dict()
    if args.simulate_stage3:
        payload["simulated_stage3_flags"] = simulate_env_with_stage3_overlay(args.env)
        payload["simulated_stage3_note"] = (
            "In-memory only. production.yaml was not modified. "
            "pi_payments_template remains false."
        )
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if report.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

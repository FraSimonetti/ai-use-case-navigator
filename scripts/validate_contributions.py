#!/usr/bin/env python3
"""Validate contribution JSON files for use-case and regulation proposals."""

from __future__ import annotations

import json
from pathlib import Path
import re
import sys
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parent.parent
CONTRIB_DIR = ROOT / "contrib"
USE_CASES_DIR = CONTRIB_DIR / "use-cases"
REGULATIONS_DIR = CONTRIB_DIR / "regulations"

USE_CASE_REQUIRED = {
    "id",
    "title",
    "category",
    "risk_classification",
    "summary",
    "legal_basis",
    "source_urls",
}

REG_REQUIRED = {
    "id",
    "name",
    "jurisdiction",
    "type",
    "status",
    "summary",
    "source_url",
}

VALID_RISK = {
    "high_risk",
    "limited_risk",
    "minimal_risk",
    "context_dependent",
    "exempt_from_high_risk",
}

VALID_STATUS = {
    "draft",
    "adopted",
    "in_force",
    "pending_application",
}


def _load_json(path: Path) -> Dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _is_kebab_case(name: str) -> bool:
    return bool(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name))


def _validate_required_fields(data: Dict, required: set, path: Path) -> List[str]:
    missing = sorted(required - set(data.keys()))
    return [f"{path}: missing required field '{m}'" for m in missing]


def _validate_use_case(path: Path, data: Dict) -> List[str]:
    errors = []
    errors.extend(_validate_required_fields(data, USE_CASE_REQUIRED, path))

    if "risk_classification" in data and data["risk_classification"] not in VALID_RISK:
        errors.append(
            f"{path}: invalid risk_classification '{data['risk_classification']}'. "
            f"Allowed: {sorted(VALID_RISK)}"
        )

    if "id" in data and not _is_kebab_case(data["id"]):
        errors.append(f"{path}: id must be kebab-case")

    if "legal_basis" in data and not isinstance(data["legal_basis"], list):
        errors.append(f"{path}: legal_basis must be a list")

    if "source_urls" in data:
        urls = data["source_urls"]
        if not isinstance(urls, list) or not urls:
            errors.append(f"{path}: source_urls must be a non-empty list")
        else:
            for url in urls:
                if not isinstance(url, str) or not url.startswith("http"):
                    errors.append(f"{path}: invalid source URL '{url}'")

    return errors


def _validate_regulation(path: Path, data: Dict) -> List[str]:
    errors = []
    errors.extend(_validate_required_fields(data, REG_REQUIRED, path))

    if "status" in data and data["status"] not in VALID_STATUS:
        errors.append(
            f"{path}: invalid status '{data['status']}'. Allowed: {sorted(VALID_STATUS)}"
        )

    if "id" in data and not _is_kebab_case(data["id"]):
        errors.append(f"{path}: id must be kebab-case")

    if "source_url" in data:
        source_url = data["source_url"]
        if not isinstance(source_url, str) or not source_url.startswith("http"):
            errors.append(f"{path}: source_url must start with http/https")

    return errors


def _collect_json_files(folder: Path) -> List[Path]:
    if not folder.exists():
        return []
    return sorted([p for p in folder.glob("*.json") if p.is_file()])


def _check_duplicate_ids(files: List[Path]) -> List[str]:
    errors: List[str] = []
    seen: Dict[str, Path] = {}
    for path in files:
        try:
            data = _load_json(path)
        except Exception as exc:
            errors.append(f"{path}: invalid JSON ({exc})")
            continue

        item_id = data.get("id")
        if not isinstance(item_id, str):
            continue
        if item_id in seen:
            errors.append(f"duplicate id '{item_id}' in {seen[item_id]} and {path}")
        else:
            seen[item_id] = path
    return errors


def main() -> int:
    errors: List[str] = []

    use_case_files = _collect_json_files(USE_CASES_DIR)
    regulation_files = _collect_json_files(REGULATIONS_DIR)

    errors.extend(_check_duplicate_ids(use_case_files))
    errors.extend(_check_duplicate_ids(regulation_files))

    for path in use_case_files:
        try:
            data = _load_json(path)
        except Exception as exc:
            errors.append(f"{path}: invalid JSON ({exc})")
            continue
        errors.extend(_validate_use_case(path, data))

    for path in regulation_files:
        try:
            data = _load_json(path)
        except Exception as exc:
            errors.append(f"{path}: invalid JSON ({exc})")
            continue
        errors.extend(_validate_regulation(path, data))

    if errors:
        print("Contribution validation failed:\n")
        for err in errors:
            print(f"- {err}")
        return 1

    print("Contribution validation passed.")
    print(f"Use-case proposals: {len(use_case_files)}")
    print(f"Regulation proposals: {len(regulation_files)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

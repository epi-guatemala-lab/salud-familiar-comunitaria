#!/usr/bin/env python3
"""Fail when versionable frontend files contain high-confidence secrets.

Only file, line and rule are printed; matched values never leave the runner.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BLOCKED_NAMES = {
    ".env",
    "secrets.toml",
    "tailscale.state",
    "id_rsa",
    "id_ed25519",
}
PLACEHOLDERS = (
    "CHANGE_ME",
    "CHANGEME",
    "YOUR_",
    "EXAMPLE",
    "PLACEHOLDER",
    "REDACTED",
    "DUMMY",
    "TEST_",
    "TEST-",
    "FAKE_",
)
RULES = {
    "private-key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "github-token": re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"),
    "openai-key": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    "aws-access-key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "telegram-token": re.compile(r"\b\d{8,12}:[A-Za-z0-9_-]{30,}\b"),
    "tailscale-node-key": re.compile(r"\b(?:nodekey|privkey):[A-Za-z0-9_-]{20,}\b"),
    "private-tailnet-address": re.compile(
        r"\b100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])(?:\.\d{1,3}){2}\b"
    ),
}
ASSIGNMENT = re.compile(
    r"(?i)(?:password|passwd|secret|token|api[_-]?key|access[_-]?key)"
    r"\s*[:=]\s*[\"']([^\"']{8,})[\"']"
)
LITERAL_ENV_DEFAULT = re.compile(
    r"(?i)(?:getenv|environ\.get)\(\s*[\"']"
    r"[^\"']*(?:password|passwd|secret|token|api[_-]?key|access[_-]?key)[^\"']*"
    r"[\"']\s*,\s*[\"']([^\"']{8,})[\"']\)"
)


def candidate_files() -> list[Path]:
    process = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    result = []
    for raw_path in process.stdout.split(b"\0"):
        if not raw_path:
            continue
        relative = Path(raw_path.decode("utf-8", errors="surrogateescape"))
        if any(part in {".git", "node_modules", "dist"} for part in relative.parts):
            continue
        file_path = ROOT / relative
        if file_path.is_file():
            result.append(file_path)
    return result


def is_placeholder(value: str) -> bool:
    upper_value = value.upper()
    return any(marker in upper_value for marker in PLACEHOLDERS) or value.startswith("${")


def main() -> int:
    findings: list[tuple[str, int, str]] = []
    for file_path in candidate_files():
        relative = file_path.relative_to(ROOT).as_posix()
        lower_name = file_path.name.lower()
        if lower_name in BLOCKED_NAMES or lower_name.endswith((".pem", ".p12", ".pfx")):
            findings.append((relative, 0, "blocked-secret-file"))
            continue
        if file_path.stat().st_size > 5 * 1024 * 1024:
            continue
        lines = file_path.read_text(encoding="utf-8", errors="ignore").splitlines()
        for line_number, line in enumerate(lines, 1):
            if "pragma: allowlist secret" in line.lower():
                continue
            for rule_name, pattern in RULES.items():
                if pattern.search(line):
                    findings.append((relative, line_number, rule_name))
            for pattern, rule_name in (
                (ASSIGNMENT, "literal-secret-assignment"),
                (LITERAL_ENV_DEFAULT, "literal-env-default"),
            ):
                for match in pattern.finditer(line):
                    if not is_placeholder(match.group(1)):
                        findings.append((relative, line_number, rule_name))

    if findings:
        print("Potential secrets found (matched values suppressed):")
        for relative, line_number, rule_name in sorted(set(findings)):
            suffix = f":{line_number}" if line_number else ""
            print(f"- {relative}{suffix} [{rule_name}]")
        return 1
    print("Secret scan: no high-confidence findings")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

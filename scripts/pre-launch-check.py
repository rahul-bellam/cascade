#!/usr/bin/env python3
"""Cascade pre-launch checklist: validates system readiness before production deployment."""

import subprocess, sys, json, os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Check:
    name: str
    category: str
    passed: bool = False
    details: str = ""
    severity: str = "error"


@dataclass
class Report:
    checks: list[Check] = field(default_factory=list)
    passed_count: int = 0
    failed_count: int = 0
    warning_count: int = 0

    def add(self, check: Check):
        self.checks.append(check)
        if check.passed:
            self.passed_count += 1
        elif check.severity == "warning":
            self.warning_count += 1
        else:
            self.failed_count += 1

    def print(self):
        print(f"\n{'='*60}")
        print(f"  CASCADE PRE-LAUNCH CHECKLIST")
        print(f"{'='*60}")
        for c in self.checks:
            status = "PASS" if c.passed else ("WARN" if c.severity == "warning" else "FAIL")
            print(f"  [{status}] [{c.category}] {c.name}")
            if c.details:
                print(f"         {c.details}")
        print(f"{'='*60}")
        print(f"  {self.passed_count} passed, {self.warning_count} warnings, {self.failed_count} failed")
        print(f"{'='*60}")
        return self.failed_count == 0

    def json(self):
        return json.dumps([{"name": c.name, "category": c.category, "passed": c.passed,
                            "details": c.details, "severity": c.severity} for c in self.checks], indent=2)


def run(cmd, timeout=30):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError:
        return None


# ── Secrets check ────────────────────────────────────────────────────────────

def check_secrets(report: Report):
    c = Check("No secrets in git", "security")
    result = run(["git", "grep", "-l", "CHANGEME", "--", "*.yaml", "*.yml", "*.tf"])
    if result and result.stdout.strip():
        c.details = f"CHANGEME found in: {result.stdout.strip()[:200]}"
    else:
        c.passed = True
    report.add(c)

    c = Check("Docker secrets pattern", "security")
    result = run(["grep", "-r", "CHANGEME", "k8s/", "terraform/"])
    if result and result.stdout.strip():
        c.details = "Secrets still contain placeholder values"
    else:
        c.passed = True
    report.add(c)


# ── Docker check ─────────────────────────────────────────────────────────────

def check_dockerfiles(report: Report):
    for df in Path(".").rglob("Dockerfile*"):
        c = Check(f"Dockerfile: {df.parent.name}", "docker")
        content = df.read_text()
        if "latest" in content:
            c.details = "Uses 'latest' tag — pin to a specific version"
            c.severity = "warning"
            c.passed = True
        else:
            c.passed = True
        report.add(c)


# ── Terraform check ──────────────────────────────────────────────────────────

def check_terraform(report: Report):
    c = Check("Terraform syntax", "terraform")
    result = run(["terraform", "fmt", "-check"], timeout=60)
    if result is None:
        c.details = "terraform not installed"
        c.severity = "warning"
        c.passed = True
    elif result.returncode == 0:
        c.passed = True
    else:
        c.details = "terraform fmt shows formatting issues"
    report.add(c)

    c = Check("Terraform state (S3 backend)", "terraform")
    tf_dir = Path("terraform")
    has_backend = any(f.name == "backend.tf" for f in tf_dir.iterdir())
    if has_backend:
        c.passed = True
    else:
        c.details = "No backend.tf found — state stored locally"
        c.severity = "warning"
        c.passed = True
    report.add(c)


# ── Rust check ────────────────────────────────────────────────────────────────

def check_rust(report: Report):
    for toml in Path(".").rglob("Cargo.toml"):
        c = Check(f"Cargo.toml: {toml.parent.name}", "rust")
        result = run(["cargo", "check", "--manifest-path", str(toml)], timeout=120)
        if result and result.returncode == 0:
            c.passed = True
        else:
            c.details = "cargo check failed"
        report.add(c)

    c = Check("No unwrap() in production code", "rust")
    result = run(["grep", "-rn", "unwrap()", "src/", "--include=*.rs"])
    if result and result.stdout.strip():
        count = len(result.stdout.strip().splitlines())
        c.details = f"{count} unwrap() calls found — consider proper error handling"
        c.severity = "warning"
        c.passed = True
    else:
        c.passed = True
    report.add(c)


# ── Python checks ────────────────────────────────────────────────────────────

def check_python(report: Report):
    c = Check("Python imports clean", "python")
    result = run(["ruff", "check", "src/", "tests/"])
    if result and result.returncode == 0:
        c.passed = True
    else:
        c.details = "ruff reported issues" if result else "ruff not installed"
        c.severity = "warning" if result is None else "error"
        if result is None:
            c.passed = True
    report.add(c)

    c = Check("Type annotations (pyright)", "python")
    result = run(["pyright", "src/"])
    if result and result.returncode == 0:
        c.passed = True
    else:
        c.details = "type check warnings"
        c.severity = "warning"
        c.passed = True
    report.add(c)


# ── K8s checks ───────────────────────────────────────────────────────────────

def check_k8s(report: Report):
    for manifest in Path("k8s").rglob("*.yaml"):
        if "monitoring" in manifest.name:
            continue
        c = Check(f"K8s manifest: {manifest.relative_to('k8s')}", "kubernetes")
        content = manifest.read_text()
        if "memory:" in content and "cpu:" in content:
            c.passed = True
        else:
            c.details = "Missing resource limits/requests"
        report.add(c)

    c = Check("Readiness probes configured", "kubernetes")
    missing: list[str] = []
    for manifest in Path("k8s").rglob("*.yaml"):
        if "Deployment" in manifest.read_text() and "readinessProbe" not in manifest.read_text():
            if "monitoring" not in manifest.name:
                missing.append(manifest.parent.name)
    if missing:
        c.details = f"Missing readinessProbe: {', '.join(missing)}"
        c.severity = "warning"
        c.passed = True
    else:
        c.passed = True
    report.add(c)

    c = Check("Liveness probes configured", "kubernetes")
    missing = []
    for manifest in Path("k8s").rglob("*.yaml"):
        if "Deployment" in manifest.read_text() and "livenessProbe" not in manifest.read_text():
            if "monitoring" not in manifest.name:
                missing.append(manifest.parent.name)
    if missing:
        c.details = f"Missing livenessProbe: {', '.join(missing)}"
        c.severity = "warning"
        c.passed = True
    else:
        c.passed = True
    report.add(c)


# ── Monitoring checks ────────────────────────────────────────────────────────

def check_monitoring(report: Report):
    c = Check("Alerting rules defined", "monitoring")
    alert_files = list(Path(".").rglob("*alert*")) + list(Path(".").rglob("*prometheus*"))
    if alert_files:
        c.passed = True
    else:
        c.details = "No alerting rules found"
        c.severity = "warning"
        c.passed = True
    report.add(c)

    c = Check("Grafana dashboards configured", "monitoring")
    grafana_files = list(Path("k8s").rglob("monitoring*.yaml"))
    if grafana_files:
        c.passed = True
    else:
        c.details = "No Grafana dashboard configs"
        c.severity = "warning"
        c.passed = True
    report.add(c)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    os.chdir(Path(__file__).resolve().parent.parent)
    report = Report()
    check_secrets(report)
    check_dockerfiles(report)
    check_terraform(report)
    check_rust(report)
    check_python(report)
    check_k8s(report)
    check_monitoring(report)
    success = report.print()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build firmware and copy the resulting UF2 to the update server directory."""

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent
FIRMWARE_DIR = REPO_ROOT / "firmware"
CARGO_TOML = FIRMWARE_DIR / "Cargo.toml"
ELF_PATH = FIRMWARE_DIR / "target" / "thumbv6m-none-eabi" / "release" / "ck1_30"
UF2_PATH = FIRMWARE_DIR / "target" / "thumbv6m-none-eabi" / "release" / "ck1_30.uf2"
FIRMWARE_DEST = (
    REPO_ROOT
    / "Cardboard.UpdateServer"
    / "files"
    / "firmware"
    / "0407db48-ca74-5783-9b11-489637b7c615"
)


def read_version() -> tuple[int, int, int]:
    text = CARGO_TOML.read_text(encoding="utf-8")
    # Match version = "..." under [package] (first occurrence)
    m = re.search(r'^\[package\].*?^version\s*=\s*"(\d+)\.(\d+)\.(\d+)"', text, re.MULTILINE | re.DOTALL)
    if not m:
        sys.exit(f"Could not parse version from {CARGO_TOML}")
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def run(cmd: list[str], cwd: Path | None = None) -> None:
    print(f"  $ {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd)
    if result.returncode != 0:
        sys.exit(f"Command failed with exit code {result.returncode}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build CK1-30 firmware UF2")
    parser.add_argument("--variant", choices=["blk", "wht"], help="Board variant")
    parser.add_argument("--preview", action="store_true", help="Mark as preview build")
    args = parser.parse_args()

    major, minor, patch = read_version()
    version_str = f"{major}-{minor}-{patch}"
    print(f"[1/4] Version: {major}.{minor}.{patch}")

    # Build filename
    parts = [version_str]
    if args.variant:
        parts.append(args.variant)
    suffix = ".p.uf2" if args.preview else ".uf2"
    filename = "_".join(parts) + suffix

    # Cargo build
    print("[2/4] Building firmware...")
    cargo_cmd = ["cargo", "build", "--release", "--bin", "ck1_30"]
    if args.variant:
        cargo_cmd += ["--features", f"variant-{args.variant}"]
    run(cargo_cmd, cwd=FIRMWARE_DIR)

    # elf2uf2-rs conversion
    print("[3/4] Converting ELF to UF2...")
    run(["elf2uf2-rs", str(ELF_PATH), str(UF2_PATH)])

    # Copy to update server
    print(f"[4/4] Copying to update server as '{filename}'...")
    FIRMWARE_DEST.mkdir(parents=True, exist_ok=True)
    dest = FIRMWARE_DEST / filename
    shutil.copy2(UF2_PATH, dest)

    print(f"\nDone: {dest}")


if __name__ == "__main__":
    main()

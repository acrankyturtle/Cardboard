#!/usr/bin/env python3
"""Build the Cardboard controller installer and copy it to the update server directory."""

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent
INSTALLER_DIR = REPO_ROOT / "installer"
ISS_FILE = INSTALLER_DIR / "Cardboard.iss"
CONTROLLER_PROJECT = REPO_ROOT / "Cardboard.Controller" / "Cardboard.Controller.csproj"
PUBLISH_DIR = REPO_ROOT / "Cardboard.Controller" / "bin" / "Release" / "net10.0-windows" / "publish"
EXE_PATH = PUBLISH_DIR / "Cardboard.Controller.exe"
INSTALLER_OUT_DIR = INSTALLER_DIR / "bin"
CONTROLLER_DEST = REPO_ROOT / "Cardboard.UpdateServer" / "files" / "controller"

ISCC_PATHS = [
    Path(os.environ.get("ProgramFiles(x86)", "")) / "Inno Setup 6" / "ISCC.exe",
    Path(os.environ.get("ProgramFiles", "")) / "Inno Setup 6" / "ISCC.exe",
    Path(r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe"),
    Path(r"C:\Program Files\Inno Setup 6\ISCC.exe"),
    Path.home() / "AppData" / "Local" / "Programs" / "Inno Setup 6" / "ISCC.exe",
]


def find_iscc() -> Path:
    for p in ISCC_PATHS:
        if p.is_file():
            return p
    sys.exit(
        "Inno Setup Compiler (ISCC.exe) not found.\n"
        "Install Inno Setup 6.2+ from https://jrsoftware.org/isdl.php\n"
        "or via: winget install JRSoftware.InnoSetup"
    )


def run(cmd: list[str], cwd: Path | None = None) -> None:
    print(f"  $ {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, cwd=cwd)
    if result.returncode != 0:
        sys.exit(f"Command failed with exit code {result.returncode}")


def read_exe_version(exe: Path) -> str:
    # Use PowerShell to read ProductVersion from the file; avoids extra Python deps.
    ps = (
        f"[System.Diagnostics.FileVersionInfo]::GetVersionInfo('{exe}').ProductVersion"
    )
    out = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps],
        capture_output=True, text=True, check=False,
    )
    if out.returncode != 0:
        sys.exit(f"Failed to read version from {exe}: {out.stderr.strip()}")
    raw = out.stdout.strip()
    m = re.match(r"(\d+\.\d+\.\d+)", raw)
    if not m:
        sys.exit(f"Could not parse version from assembly: {raw}")
    return m.group(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Cardboard controller installer")
    parser.add_argument("--skip-publish", action="store_true", help="Skip dotnet publish step")
    parser.add_argument("--preview", action="store_true", help="Mark as preview release")
    args = parser.parse_args()

    iscc = find_iscc()
    print(f"[1/5] Using Inno Setup: {iscc}")

    if not args.skip_publish:
        print("[2/5] Publishing .NET application...")
        run(["dotnet", "publish", str(CONTROLLER_PROJECT), "-c", "Release"])
    else:
        print("[2/5] Skipping publish (--skip-publish)")

    if not EXE_PATH.is_file():
        sys.exit(f"Main executable not found: {EXE_PATH}")

    print("[3/5] Extracting version...")
    version = read_exe_version(EXE_PATH)
    output_name = f"{version}.p" if args.preview else version
    print(f"  Version: {version}")
    print(f"  Output:  {output_name}.exe")

    print("[4/5] Compiling installer...")
    run(
        [
            str(iscc),
            f"/DMyAppVersion={version}",
            f"/DMyOutputFilename={output_name}",
            str(ISS_FILE),
        ]
    )

    installer_exe = INSTALLER_OUT_DIR / f"{output_name}.exe"
    if not installer_exe.is_file():
        sys.exit(f"Installer not found at expected location: {installer_exe}")

    print(f"[5/5] Copying to update server as '{installer_exe.name}'...")
    CONTROLLER_DEST.mkdir(parents=True, exist_ok=True)
    dest = CONTROLLER_DEST / installer_exe.name
    shutil.copy2(installer_exe, dest)

    size_mb = round(dest.stat().st_size / (1024 * 1024), 2)
    print(f"\nDone: {dest} ({size_mb} MB)")


if __name__ == "__main__":
    main()

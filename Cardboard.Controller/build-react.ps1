param (
    [Parameter(Mandatory=$true)]
    [string]$OutputPath
)

# Define paths and variables
$NodeVersion = "24.5.0"
$NodeUrl = "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip"
# Normalize all paths to absolute
$ReactProjectPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../react-frontend"))
$OutputPathAbsolute = [System.IO.Path]::GetFullPath($OutputPath)
$BuildOutputPath = [System.IO.Path]::GetFullPath((Join-Path $OutputPathAbsolute "react-frontend"))
$ReactBuildPath = [System.IO.Path]::GetFullPath((Join-Path $ReactProjectPath "dist"))
$NodeDirPath = [System.IO.Path]::GetFullPath((Join-Path $ReactProjectPath ".node"))
$NodeZipPath = [System.IO.Path]::GetFullPath((Join-Path $NodeDirPath "node-v$NodeVersion-win-x64.zip"))
$NodeExtractPath = [System.IO.Path]::GetFullPath($NodeDirPath)
$NodeBinPath = [System.IO.Path]::GetFullPath((Join-Path $NodeExtractPath "node-v$NodeVersion-win-x64"))
$NpmPath = [System.IO.Path]::GetFullPath((Join-Path $NodeBinPath "npm.cmd"))
$NodeOutputPath = [System.IO.Path]::GetFullPath((Join-Path $OutputPathAbsolute "node"))

# Debug output (critical)
Write-Host "ReactProjectPath: $ReactProjectPath"
Write-Host "ReactBuildPath: $ReactBuildPath"
Write-Host "NodeBinPath: $NodeBinPath"
Write-Host "NpmPath: $NpmPath"
Write-Host "NodeOutputPath: $NodeOutputPath"

# Validate paths are absolute
if (-not [System.IO.Path]::IsPathRooted($ReactProjectPath)) {
    Write-Error "ReactProjectPath '$ReactProjectPath' is not an absolute path."
    exit 1
}
if (-not [System.IO.Path]::IsPathRooted($ReactBuildPath)) {
    Write-Error "ReactBuildPath '$ReactBuildPath' is not an absolute path."
    exit 1
}
if (-not [System.IO.Path]::IsPathRooted($NodeBinPath)) {
    Write-Error "NodeBinPath '$NodeBinPath' is not an absolute path."
    exit 1
}
if (-not [System.IO.Path]::IsPathRooted($NodeOutputPath)) {
    Write-Error "NodeOutputPath '$NodeOutputPath' is not an absolute path."
    exit 1
}

# Validate React project directory
if (-not (Test-Path $ReactProjectPath)) {
    Write-Error "React project directory '$ReactProjectPath' does not exist. Please ensure the 'react-frontend' folder exists one level up from '$PSScriptRoot'."
    exit 1
}

# Create node directory inside ReactProjectPath
if (-not (Test-Path $NodeExtractPath)) {
    Write-Host "Creating directory: $NodeExtractPath"
    try {
        New-Item -ItemType Directory -Path $NodeExtractPath -Force -ErrorAction Stop | Out-Null
    } catch {
        Write-Error "Failed to create directory '$NodeExtractPath': $_"
        exit 1
    }
}

# Check permissions for NodeExtractPath
try {
    $acl = Get-Acl -Path $NodeExtractPath -ErrorAction Stop
    Write-Host "Permissions for '$NodeExtractPath': $($acl.AccessToString)"
} catch {
    Write-Error "Cannot access permissions for '$NodeExtractPath': $_"
    exit 1
}

# Create node directory in OutputPathAbsolute
if (-not (Test-Path $NodeOutputPath)) {
    Write-Host "Creating directory: $NodeOutputPath"
    try {
        New-Item -ItemType Directory -Path $NodeOutputPath -Force -ErrorAction Stop | Out-Null
    } catch {
        Write-Error "Failed to create directory '$NodeOutputPath': $_"
        exit 1
    }
}

# Check permissions for NodeOutputPath
try {
    $acl = Get-Acl -Path $NodeOutputPath -ErrorAction Stop
    Write-Host "Permissions for '$NodeOutputPath': $($acl.AccessToString)"
} catch {
    Write-Error "Cannot access permissions for '$NodeOutputPath': $_"
    exit 1
}

# Download and extract Node.js (lazy)
if (-not (Test-Path $NodeBinPath)) {
    # Download only if zip doesn't exist
    if (-not (Test-Path $NodeZipPath)) {
        Write-Host "Downloading Node.js to $NodeZipPath..."
        try {
            Invoke-WebRequest -Uri $NodeUrl -OutFile $NodeZipPath -ErrorAction Stop
        } catch {
            Write-Error "Failed to download Node.js to '$NodeZipPath': $_"
            exit 1
        }
    } else {
        Write-Host "Node.js zip already exists at $NodeZipPath, skipping download."
    }

    # Extract Node.js
    Write-Host "Extracting $NodeZipPath to $NodeExtractPath..."
    try {
        Expand-Archive -Path $NodeZipPath -DestinationPath $NodeExtractPath -Force -ErrorAction Stop
    } catch {
        Write-Error "Failed to extract Node.js to '$NodeExtractPath': $_"
        exit 1
    }
    # Remove zip file (skip if permission denied)
    try {
        Remove-Item $NodeZipPath -Force -ErrorAction Stop
    } catch {
        Write-Warning "Failed to delete '$NodeZipPath': $_"
    }
} else {
    Write-Host "Node.js already extracted at $NodeBinPath, skipping download and extraction."
}

# Validate npm availability
if (-not (Test-Path $NpmPath)) {
    Write-Error "npm not found at '$NpmPath'. Ensure Node.js was extracted correctly."
    exit 1
}

# Check npm version
Write-Host "Checking npm version..."
try {
    $npmVersion = & $NpmPath --version
    Write-Host "npm version: $npmVersion"
} catch {
    Write-Error "Failed to run npm at '$NpmPath': $_"
    exit 1
}

# Set Node.js in PATH using absolute path
$env:Path = "$NodeBinPath;$env:Path"
Write-Host "Updated PATH: $env:Path"

# Build React project
Write-Host "Changing to React project directory: $ReactProjectPath"
Push-Location $ReactProjectPath
try {
    if (-not (Test-Path .)) {
        Write-Error "Failed to change to React project directory '$ReactProjectPath'."
        exit 1
    }
    Write-Host "Current directory: $(Get-Location)"
    Write-Host "Running npm install in $ReactProjectPath..."
    Start-Process -FilePath $NpmPath -ArgumentList "install" -Wait -NoNewWindow
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
    Write-Host "Running npm run build in $ReactProjectPath..."
    Start-Process -FilePath $NpmPath -ArgumentList "run","build" -Wait -NoNewWindow
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm run build failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

# Copy React build output
if (Test-Path $ReactBuildPath) {
    Write-Host "Copying React build output from $ReactBuildPath to $BuildOutputPath..."
    try {
        Copy-Item -Path "$ReactBuildPath/*" -Destination $BuildOutputPath -Recurse -Force -ErrorAction Stop
    } catch {
        Write-Error "Failed to copy React build output to '$BuildOutputPath': $_"
        exit 1
    }
} else {
    Write-Error "React build output directory '$ReactBuildPath' does not exist."
    exit 1
}

# Copy server.js
$ServerJsPath = [System.IO.Path]::GetFullPath((Join-Path $ReactProjectPath "server.js"))
if (Test-Path $ServerJsPath) {
    Write-Host "Copying server.js from $ServerJsPath to $BuildOutputPath..."
    try {
        Copy-Item -Path $ServerJsPath -Destination $BuildOutputPath -Force -ErrorAction Stop
    } catch {
        Write-Error "Failed to copy server.js to '$BuildOutputPath': $_"
        exit 1
    }
} else {
    Write-Error "server.js not found at '$ServerJsPath'."
    exit 1
}

# Copy Node.js contents to OutputPathAbsolute/node
if (-not (Test-Path (Join-Path $NodeOutputPath "node.exe"))) {
    Write-Host "Copying Node.js contents from $NodeBinPath to $NodeOutputPath..."
    try {
        Copy-Item -Path "$NodeBinPath/*" -Destination $NodeOutputPath -Recurse -Force -ErrorAction Stop
    } catch {
        Write-Error "Failed to copy Node.js contents to '$NodeOutputPath': $_"
        exit 1
    }
} else {
    Write-Host "Node.js already exists at $NodeOutputPath\node.exe, skipping copy."
}

Write-Host "React build completed successfully."
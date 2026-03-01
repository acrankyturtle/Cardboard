; ==========================================================================
; Cardboard Installer Script for Inno Setup
; ==========================================================================
; Requires Inno Setup 6.2+
; Build with: ISCC.exe /DMyAppVersion=1.0.0 /DMyOutputFilename=1.0.0 Cardboard.iss
;
; Usage:
;   {version}.exe           - Install normally
;   {version}.exe /uninstall - Uninstall existing installation
; ==========================================================================

#define MyAppName "Cardboard"
#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif
#ifndef MyOutputFilename
  #define MyOutputFilename MyAppVersion
#endif
#define MyAppPublisher "Cardboard"
#define MyAppExeName "Cardboard.Controller.exe"
#define MyAppDescription "Cardboard - Programmable Keyboard Controller"

; Source paths (relative to this .iss file location)
#define PublishDir "..\Cardboard.Controller\bin\Release\net10.0-windows\publish"
#define IconPath "..\react-frontend\public\key.ico"

[Setup]
; Application identity - preserve upgrade code for compatibility with previous WixSharp installer
AppId={{B39D2DD8-822D-42E0-90D6-93BCBBA7A01B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}

; Installation paths
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Allow user to customize install directory
AllowNoIcons=yes

; License
LicenseFile=License.rtf

; Output settings
OutputDir=bin
OutputBaseFilename={#MyOutputFilename}
SetupIconFile={#IconPath}
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}

; Compression
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes

; Visual settings
WizardStyle=modern
WizardResizable=yes

; Architecture - x64 only
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

; Privileges - admin required for Program Files
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; Upgrade handling
UsePreviousAppDir=yes
UsePreviousGroup=yes

; Version info embedded in Setup.exe
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}
VersionInfoDescription={#MyAppDescription}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
; Optional tasks shown to user during installation
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "startupentry"; Description: "Start {#MyAppName} when Windows starts"; GroupDescription: "Startup Options:"

[Files]
; Include all files from publish directory
Source: "{#PublishDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Start Menu shortcut (always created)
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"

; Desktop shortcut (optional, based on task selection)
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Registry]
; Windows startup entry (optional, based on task selection)
Root: HKCU; Subkey: "SOFTWARE\Microsoft\Windows\CurrentVersion\Run"; \
    ValueType: string; ValueName: "{#MyAppName}"; ValueData: """{app}\{#MyAppExeName}"""; \
    Flags: uninsdeletevalue; Tasks: startupentry

[Run]
; "Run after install" checkbox on final page
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; \
    Flags: nowait postinstall skipifsilent

[Code]
// ==========================================================================
// Pascal Script for Uninstall Support and .NET Runtime Detection
// ==========================================================================

const
  UninstallRegKey = 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#SetupSetting("AppId")}_is1';

function GetUninstallString(): String;
var
  UninstallPath: String;
begin
  Result := '';
  if RegQueryStringValue(HKLM, UninstallRegKey, 'UninstallString', UninstallPath) then
    Result := UninstallPath
  else if RegQueryStringValue(HKCU, UninstallRegKey, 'UninstallString', UninstallPath) then
    Result := UninstallPath;
end;

function IsAppInstalled(): Boolean;
begin
  Result := (GetUninstallString() <> '');
end;

function RunUninstaller(): Boolean;
var
  UninstallPath: String;
  ResultCode: Integer;
begin
  Result := False;
  UninstallPath := GetUninstallString();

  if UninstallPath <> '' then
  begin
    // Remove quotes if present
    if (Length(UninstallPath) > 0) and (UninstallPath[1] = '"') then
      UninstallPath := RemoveQuotes(UninstallPath);

    // Run the uninstaller
    Result := Exec(UninstallPath, '/SILENT', '', SW_SHOW, ewWaitUntilTerminated, ResultCode);
  end;
end;

function CmdLineParamExists(const Param: String): Boolean;
var
  I: Integer;
begin
  Result := False;
  for I := 1 to ParamCount do
  begin
    if CompareText(ParamStr(I), Param) = 0 then
    begin
      Result := True;
      Exit;
    end;
  end;
end;

function IsDotNet10Installed(): Boolean;
var
  TempFile: String;
  ResultCode: Integer;
  Lines: TArrayOfString;
  I: Integer;
begin
  Result := False;

  // Run 'dotnet --list-runtimes' and capture output to a temp file
  TempFile := ExpandConstant('{tmp}\dotnet_runtimes.txt');
  Exec('cmd.exe', '/C dotnet --list-runtimes > "' + TempFile + '" 2>&1', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  if LoadStringsFromFile(TempFile, Lines) then
  begin
    for I := 0 to GetArrayLength(Lines) - 1 do
    begin
      // Look for the required ASP.NET Core runtime (e.g. "Microsoft.AspNetCore.App 10.0.3")
      if Pos('Microsoft.AspNetCore.App 10.', Lines[I]) > 0 then
      begin
        Result := True;
        Exit;
      end;
    end;
  end;

  DeleteFile(TempFile);
end;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;

  if not IsDotNet10Installed() then
  begin
    case MsgBox('ASP.NET Core 10.0 Runtime is required but was not detected.' + #13#10 + #13#10 +
                'Would you like to open the download page?' + #13#10 + #13#10 +
                'Click Yes to open the download page' + #13#10 +
                'Click No to continue anyway' + #13#10 +
                'Click Cancel to abort installation',
                mbConfirmation, MB_YESNOCANCEL) of
      IDYES:
        begin
          ShellExec('open', 'https://dotnet.microsoft.com/download/dotnet/10.0', '', '', SW_SHOW, ewNoWait, ResultCode);
          MsgBox('Please install ASP.NET Core 10.0 Runtime, then run this installer again.',
                 mbInformation, MB_OK);
          Result := False;
        end;
      IDNO:
        Result := True; // Continue anyway
      IDCANCEL:
        Result := False;
    end;
  end;
end;

function InitializeUninstall(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  // Try to stop the application if it's running
  Exec('taskkill.exe', '/F /IM {#MyAppExeName}', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(500); // Give it time to close
end;

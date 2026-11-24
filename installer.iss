; Garuda Construction Service - Inno Setup installer
; Build:  iscc /DAppVersion=1.0.0 installer.iss   (after "npm run dist" creates dist\win-unpacked)
; Silent: Garuda-Construction-Service-Setup-1.0.0.exe /VERYSILENT /DATADIR="D:\GarudaData"   (DATADIR optional)

#define MyAppName "Garuda Construction Service"
#define MyAppExe  "Garuda Construction Service.exe"
#define MyPublisher "Dhineshkumar Adpc Murugan Trader"
#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

[Setup]
AppId={{7B2E4C1A-5D3F-4E8B-9A61-2C7F0D84E5B3}
AppName={#MyAppName}
AppVersion={#AppVersion}
AppVerName={#MyAppName} {#AppVersion}
AppPublisher={#MyPublisher}
AppPublisherURL=https://adpc.shop
AppSupportURL=https://adpc.shop
VersionInfoVersion={#AppVersion}.0
VersionInfoCompany={#MyPublisher}
VersionInfoProductName={#MyAppName}
VersionInfoDescription={#MyAppName} Setup
VersionInfoCopyright=Copyright (C) 2026 {#MyPublisher}
; Per-user install: no admin prompt, program files stay writable
PrivilegesRequired=lowest
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=icon.ico
OutputDir=installer_out
OutputBaseFilename=Garuda-Construction-Service-Setup-{#AppVersion}
UninstallDisplayName={#MyAppName}
UninstallDisplayIcon={app}\{#MyAppExe}
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Shortcuts:"

[Dirs]
; Data folder is created here and is NEVER removed on uninstall
Name: "{code:GetDataDir}"; Flags: uninsneveruninstall

[Files]
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExe}"; Tasks: desktopicon
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExe}"

[Registry]
; Remember the data folder (used on re-install / update)
Root: HKCU; Subkey: "Software\Garuda Construction Service"; ValueType: string; ValueName: "DataDir"; ValueData: "{code:GetDataDir}"

[Run]
Filename: "{app}\{#MyAppExe}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent

[Code]
var
  DataDirPage: TInputDirWizardPage;
  DataDirPageReady: Boolean;

function DefaultDataDir: String;
begin
  Result := ExpandConstant('{userdocs}\Garuda Construction Service Data');
end;

function SavedDataDir: String;
begin
  if not RegQueryStringValue(HKCU, 'Software\Garuda Construction Service', 'DataDir', Result) then
    Result := '';
end;

procedure InitializeWizard;
var
  Initial: String;
begin
  { priority: /DATADIR= parameter, then previous install, then Documents }
  Initial := ExpandConstant('{param:DATADIR|}');
  if Initial = '' then Initial := SavedDataDir;
  if Initial = '' then Initial := DefaultDataDir;

  DataDirPage := CreateInputDirPage(wpSelectDir,
    'Choose data folder',
    'Where should Garuda Construction Service save your database?',
    'All your bills, customers, stock and reports are saved in this folder.' + #13#10 +
    'The Documents folder is recommended and already selected. ' +
    'You can choose another drive (for example D:\) if you prefer.' + #13#10#13#10 +
    'Your data is kept safe when you update or uninstall the software.',
    False, 'Garuda Construction Service Data');
  DataDirPage.Add('Data folder:');
  DataDirPage.Values[0] := Initial;
  DataDirPageReady := True;
end;

function GetDataDir(Param: String): String;
begin
  Result := '';
  if DataDirPageReady then
    Result := Trim(DataDirPage.Values[0]);
  if Result = '' then
    Result := DefaultDataDir;
  Result := RemoveBackslashUnlessRoot(Result);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  Dir, TestFile: String;
begin
  Result := True;
  if DataDirPageReady and (CurPageID = DataDirPage.ID) then
  begin
    Dir := Trim(DataDirPage.Values[0]);
    if (Dir = '') or (ExtractFileDrive(Dir) = '') then
    begin
      MsgBox('Please choose a full folder path, for example C:\Users\...\Documents\Garuda Construction Service Data', mbError, MB_OK);
      Result := False;
      Exit;
    end;
    TestFile := AddBackslash(Dir) + '.vbcs-write-test';
    if (not ForceDirectories(Dir)) or (not SaveStringToFile(TestFile, 'ok', False)) then
    begin
      MsgBox('Cannot write to this folder:' + #13#10 + Dir + #13#10#13#10 + 'Please choose another folder (for example your Documents folder).', mbError, MB_OK);
      Result := False;
      Exit;
    end;
    DeleteFile(TestFile);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Dir, CfgDir: String;
  Lines: TArrayOfString;
begin
  if CurStep = ssPostInstall then
  begin
    Dir := GetDataDir('');
    CfgDir := ExpandConstant('{userappdata}\Garuda Construction Service');
    ForceDirectories(CfgDir);
    ForceDirectories(Dir);
    { the app reads this file at start-up to find the database folder }
    SetArrayLength(Lines, 1);
    Lines[0] := Dir;
    SaveStringsToUTF8File(CfgDir + '\datapath.txt', Lines, False);
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Dir: String;
begin
  if CurUninstallStep = usUninstall then
    { remove the "start with Windows" entry the app may have created }
    RegDeleteValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Run', 'GarudaConstructionService');
  if CurUninstallStep = usPostUninstall then
    if (not UninstallSilent) and RegQueryStringValue(HKCU, 'Software\Garuda Construction Service', 'DataDir', Dir) then
      MsgBox('Garuda Construction Service was removed.' + #13#10#13#10 +
             'Your data was NOT deleted. It is still saved in:' + #13#10 + Dir, mbInformation, MB_OK);
end;

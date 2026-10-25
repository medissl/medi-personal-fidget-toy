param(
    [Parameter(Mandatory=$true)][string]$BuildTools,
    [Parameter(Mandatory=$true)][string]$AndroidJar
)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$buildRoot = Join-Path $projectRoot 'build'
$toolsRoot = (Resolve-Path -LiteralPath $BuildTools).Path
$platformJar = (Resolve-Path -LiteralPath $AndroidJar).Path
$sourceRoot = Join-Path $projectRoot 'android/src/main'
New-Item -ItemType Directory -Force -Path $buildRoot,(Join-Path $buildRoot 'generated'),(Join-Path $buildRoot 'classes'),(Join-Path $buildRoot 'dex'),(Join-Path $projectRoot '.local') | Out-Null
function Run-Checked([string]$program, [string[]]$arguments) {
    & $program @arguments
    if ($LASTEXITCODE -ne 0) { throw "$program failed (exit $LASTEXITCODE)." }
}
Run-Checked (Join-Path $toolsRoot 'aapt2.exe') @('compile','--dir',(Join-Path $sourceRoot 'res'),'-o',(Join-Path $buildRoot 'compiled.zip'))
Run-Checked (Join-Path $toolsRoot 'aapt2.exe') @('link','-o',(Join-Path $buildRoot 'resources.apk'),'-I',$platformJar,'--manifest',(Join-Path $sourceRoot 'AndroidManifest.xml'),'--java',(Join-Path $buildRoot 'generated'),'-A',(Join-Path $projectRoot 'web'),(Join-Path $buildRoot 'compiled.zip'))
$javaSources = @((Join-Path $sourceRoot 'java/app/still/personal/MainActivity.java'),(Join-Path $buildRoot 'generated/app/still/personal/R.java'))
Run-Checked 'javac' (@('-encoding','UTF-8','-source','8','-target','8','-Xlint:-options','-bootclasspath',$platformJar,'-classpath',(Join-Path $toolsRoot 'core-lambda-stubs.jar'),'-d',(Join-Path $buildRoot 'classes')) + $javaSources)
Run-Checked 'jar' @("-J-Djava.io.tmpdir=$buildRoot",'--create','--file',(Join-Path $buildRoot 'classes.jar'),'-C',(Join-Path $buildRoot 'classes'),'.')
Run-Checked 'java' @('-cp',(Join-Path $toolsRoot 'lib/d8.jar'),'com.android.tools.r8.D8','--release','--lib',$platformJar,'--min-api','26','--output',(Join-Path $buildRoot 'dex'),(Join-Path $buildRoot 'classes.jar'))
Copy-Item -LiteralPath (Join-Path $buildRoot 'resources.apk') -Destination (Join-Path $buildRoot 'unaligned.apk') -Force
Run-Checked 'jar' @("-J-Djava.io.tmpdir=$buildRoot",'--update','--file',(Join-Path $buildRoot 'unaligned.apk'),'-C',(Join-Path $buildRoot 'dex'),'classes.dex')
Run-Checked (Join-Path $toolsRoot 'zipalign.exe') @('-f','-p','4',(Join-Path $buildRoot 'unaligned.apk'),(Join-Path $buildRoot 'aligned.apk'))
$keyPath = Join-Path $projectRoot '.local/still-personal.p12'
if (-not (Test-Path -LiteralPath $keyPath)) {
    # This is a local development key. Keep it to install future builds as updates.
    Run-Checked 'keytool' @('-genkeypair','-keystore',$keyPath,'-storetype','PKCS12','-storepass','android','-keypass','android','-alias','still-personal','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Still Personal,OU=Local Development')
}
$apkPath = Join-Path $projectRoot 'Medi-Personal-Fidget-Toy.apk'
Run-Checked (Join-Path $toolsRoot 'apksigner.bat') @('sign','--ks',$keyPath,'--ks-key-alias','still-personal','--ks-pass','pass:android','--key-pass','pass:android','--out',$apkPath,(Join-Path $buildRoot 'aligned.apk'))
Run-Checked (Join-Path $toolsRoot 'apksigner.bat') @('verify','--verbose',$apkPath)
Write-Output "APK built: $apkPath"

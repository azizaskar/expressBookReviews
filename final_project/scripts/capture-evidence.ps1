# Generate real cURL command + output evidence for Coursera Questions 1-10.
# Run in PowerShell while `node index.js` is active in a second terminal.
# Needs an actual fork at github.com/<GitHubUser>/expressBookReviews.
param(
  [string]$GitHubUser = 'azizaskar',
  [string]$BaseUrl = 'http://127.0.0.1:5000'
)

$ErrorActionPreference = 'Stop'
$evidenceDirectory = Join-Path $PSScriptRoot '..\submission_evidence'
New-Item -ItemType Directory -Force -Path $evidenceDirectory | Out-Null
$cookieFile = Join-Path $env:TEMP ("bookreview-cookies-" + $PID + ".txt")
$demoUsername = "aziz_demo_$PID"
$demoPassword = 'DemoOnly-Book123!' # Disposable course-test credential only.

function Save-Evidence {
  param([string]$FileName, [string[]]$CurlArguments)
  $prettyArguments = @($CurlArguments | ForEach-Object {
    if ($_ -match '\s') { '"' + $_ + '"' } else { $_ }
  })
  $commandLine = 'curl.exe ' + ($prettyArguments -join ' ')
  $output = @(& curl.exe @CurlArguments 2>&1)
  if ($LASTEXITCODE -ne 0) { throw "cURL failed in ${FileName}: $($output -join ' ')" }
  $content = '$ ' + $commandLine + [Environment]::NewLine +
    ($output -join [Environment]::NewLine) + [Environment]::NewLine
  $path = Join-Path $evidenceDirectory ("$FileName.txt")
  [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
  if (($output -join "`n") -notmatch '(?m)^(HTTP/\S+ |HTTP status: )(200|201|204)\b') {
    throw "Unexpected HTTP response in $FileName. Inspect $path"
  }
  Write-Host "OK: $FileName" -ForegroundColor Green
}

try {
  # Q1: require a genuine public GitHub fork, not just a copied repository.
  $repoUrl = "https://api.github.com/repos/$GitHubUser/expressBookReviews"
  $githubCommand = 'curl.exe -sS -H "Accept: application/vnd.github+json" ' + $repoUrl + ' | ConvertFrom-Json | Select-Object full_name,fork,@{Name="parent";Expression={$_.parent.full_name}} | Format-List'
  $githubResult = @(& curl.exe '-sS' '-H' 'Accept: application/vnd.github+json' $repoUrl 2>&1)
  if ($LASTEXITCODE -ne 0) { throw "GitHub cURL failed: $githubResult" }
  $repo = ($githubResult -join "`n") | ConvertFrom-Json
  if ($repo.fork -ne $true -or $repo.parent.full_name -ne 'ibm-developer-skills-network/expressBookReviews') {
    throw "First fork the official IBM repository to $GitHubUser. The API did not confirm its parent."
  }
  $githubFormatted = $repo | Select-Object full_name, fork, @{Name='parent';Expression={$_.parent.full_name}} | Format-List | Out-String
  $githubEvidence = '$ ' + $githubCommand + [Environment]::NewLine + $githubFormatted
  [System.IO.File]::WriteAllText((Join-Path $evidenceDirectory 'githubrepo.txt'),
    $githubEvidence + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
  Write-Host 'OK: githubrepo' -ForegroundColor Green

  Save-Evidence 'getallbooks' @('-sS','-i', "$BaseUrl/")
  Save-Evidence 'getbooksbyISBN' @('-sS','-i', "$BaseUrl/isbn/1")
  Save-Evidence 'getbooksbyauthor' @('-sS','-i', "$BaseUrl/author/Unknown")
  Save-Evidence 'getbooksbytitle' @('-sS','-i', "$BaseUrl/title/Pride%20and%20Prejudice")
  Save-Evidence 'getbookreview' @('-sS','-i', "$BaseUrl/review/1")
  Save-Evidence 'register' @('-sS','-i','-X','POST',"$BaseUrl/register",'-d', "username=$demoUsername&password=$demoPassword")
  Save-Evidence 'login' @('-sS','-w','\nHTTP status: %{http_code}\n','-c',$cookieFile,'-X','POST',"$BaseUrl/customer/login",'-d', "username=$demoUsername&password=$demoPassword")
  Save-Evidence 'reviewadded' @('-sS','-i','-b',$cookieFile,'-X','PUT',"$BaseUrl/customer/auth/review/1?review=Excellent%20book")
  Save-Evidence 'deletereview' @('-sS','-i','-b',$cookieFile,'-X','DELETE',"$BaseUrl/customer/auth/review/1")
  Write-Host "Completed all 10 evidence files: $evidenceDirectory" -ForegroundColor Cyan
} finally {
  Remove-Item $cookieFile -Force -ErrorAction SilentlyContinue
}

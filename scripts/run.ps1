# HashEnv Docker runner (PowerShell)
# Usage: .\scripts\run.ps1 dev | dev-watch | prod | test | ...

param(
    [Parameter(Position = 0)]
    [ValidateSet(
        "help", "dev", "dev-watch", "dev-down",
        "prod", "prod-down", "prod-logs", "build",
        "test", "test-backend", "test-frontend", "test-unit",
        "test-mongo-up", "test-mongo-down"
    )]
    [string]$Command = "help"
)

$ComposeDev  = @("compose", "-f", "docker-compose.dev.yml")
$ComposeProd = @("compose", "-f", "docker-compose.yml")
$ComposeTest = @("compose", "-f", "docker-compose.test.yml")

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Invoke-Docker {
    param([string[]]$Args)
    & docker @Args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

switch ($Command) {
    "help" {
        Write-Host @"
HashEnv Docker commands:
  .\scripts\run.ps1 dev              Start dev stack (hot reload, Atlas via backend/.env)
  .\scripts\run.ps1 dev-watch        Start dev stack with compose file watch
  .\scripts\run.ps1 dev-down         Stop dev stack
  .\scripts\run.ps1 prod             Build and start production-like local stack
  .\scripts\run.ps1 prod-down        Stop production-like stack
  .\scripts\run.ps1 prod-logs        Tail production-like logs
  .\scripts\run.ps1 test             Run backend + frontend tests
  .\scripts\run.ps1 test-backend     Backend tests (tmpfs MongoDB replica set)
  .\scripts\run.ps1 test-frontend    Frontend Vitest in Docker
  .\scripts\run.ps1 test-unit        Backend unit tests only (no MongoDB)
  .\scripts\run.ps1 test-mongo-up    Start test MongoDB on localhost:27017
  .\scripts\run.ps1 test-mongo-down  Stop test MongoDB
  .\scripts\run.ps1 build            Build production images
"@
    }
    "dev"             { Invoke-Docker ($ComposeDev + @("up", "--build")) }
    "dev-watch"       { Invoke-Docker ($ComposeDev + @("up", "--watch", "--build")) }
    "dev-down"        { Invoke-Docker ($ComposeDev + @("down")) }
    "prod"            { Invoke-Docker ($ComposeProd + @("up", "--build", "-d")) }
    "prod-down"       { Invoke-Docker ($ComposeProd + @("down")) }
    "prod-logs"       { Invoke-Docker ($ComposeProd + @("logs", "-f")) }
    "build"           { Invoke-Docker ($ComposeProd + @("build")) }
    "test"            {
        Invoke-Docker ($ComposeTest + @("run", "--rm", "--build", "backend-test"))
        Invoke-Docker ($ComposeTest + @("--profile", "frontend", "run", "--rm", "--build", "frontend-test"))
    }
    "test-backend"    { Invoke-Docker ($ComposeTest + @("run", "--rm", "--build", "backend-test")) }
    "test-frontend"   { Invoke-Docker ($ComposeTest + @("--profile", "frontend", "run", "--rm", "--build", "frontend-test")) }
    "test-unit"       { Invoke-Docker ($ComposeTest + @("--profile", "unit", "run", "--rm", "--build", "backend-unit")) }
    "test-mongo-up"   { Invoke-Docker ($ComposeTest + @("up", "mongo", "-d", "--wait")) }
    "test-mongo-down" { Invoke-Docker ($ComposeTest + @("down", "-v")) }
}

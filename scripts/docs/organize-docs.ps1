$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $repoRoot

function Get-RelativePath {
    param(
        [Parameter(Mandatory = $true)][string]$FromDirectory,
        [Parameter(Mandatory = $true)][string]$ToPath
    )

    $from = [System.Uri]::new(($FromDirectory.TrimEnd([char]92) + [char]92))
    $to = [System.Uri]::new($ToPath)
    return [System.Uri]::UnescapeDataString($from.MakeRelativeUri($to).ToString())
}

$archiveRules = @(
    @{ Name = 'sprints'; Pattern = '^(SPRINT|X\d|PHASE(?:_|\d)|H[23](?:_|$))' },
    @{ Name = 'releases'; Pattern = '^(RC\d|BETA_|PRIVATE_BETA_|FINAL_BETA_|CLOSED_BETA_)' },
    @{ Name = 'audits'; Pattern = '(_AUDIT|_REVIEW|_REPORT|_VERDICT|_SIGNOFF|_CERTIFICATION|_SCORECARD)\.md$' }
)

$activeRules = @(
    @{ Name = 'operations'; Pattern = '(DEPLOY|PRODUCTION|RELEASE|SECURITY|SECRET|INCIDENT|ROLLBACK|RUNBOOK|ENVIRONMENT|OBSERVABILITY|HEALTH|BACKUP|INSTALL|GO_LIVE|READINESS|BLOCKER)' },
    @{ Name = 'methodologies'; Pattern = '(METHODOLOGY|SCORING|_RESEARCH|DATA_STRATEGY|CALIBRATION|QUALITY_MODEL|SOURCE_SCORING)' },
    @{ Name = 'engineering'; Pattern = '(^API_|_API|TEST|PERFORMANCE|DEPENDENCY|BUILD|CODE_|TOOLING|FEATURE_FLAGS|DATABASE|REDIS|DATASET|DATA_QUALITY)' },
    @{ Name = 'architecture'; Pattern = '(ARCHITECTURE|DATA_MODEL|CONTRACT|SCHEMA|ENGINE|PLATFORM|KNOWLEDGE_GRAPH|DOMAIN_MODEL|EVENT_SCHEMA)' },
    @{ Name = 'design'; Pattern = '(^DESIGN|_DESIGN|VISUAL|^UI_|^UX_|MOTION|3D|CAMERA|COLOR|TYPOGRAPHY|SPATIAL|CINEMATIC|PIXEL|LAYOUT|THEME|NOVA|FLAGSHIP|WORLD_)' },
    @{ Name = 'planning'; Pattern = '(PLAN|ROADMAP|BACKLOG|CHECKLIST|_GAPS|RISK_REGISTER|PRIORITIES|OPPORTUNITIES|FUTURE_|NEXT_)' },
    @{ Name = 'product'; Pattern = '.*' }
)

$reservedRootDocs = @('README.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'SECURITY.md')
$moves = [System.Collections.Generic.List[object]]::new()

foreach ($file in Get-ChildItem -LiteralPath $repoRoot -File -Filter '*.md') {
    if ($reservedRootDocs -contains $file.Name) {
        continue
    }

    $rule = $archiveRules | Where-Object { $file.Name -match $_.Pattern } | Select-Object -First 1
    if (-not $rule) {
        continue
    }

    $destinationDirectory = Join-Path $repoRoot "docs\archive\$($rule.Name)"
    New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
    $destination = Join-Path $destinationDirectory $file.Name

    if (Test-Path -LiteralPath $destination) {
        throw "Refusing to overwrite existing documentation file: $destination"
    }

    Move-Item -LiteralPath $file.FullName -Destination $destination
    $moves.Add([pscustomobject]@{
        Name = $file.Name
        From = $file.Name
        To = ((Resolve-Path -Relative $destination).TrimStart([char[]]@('.', [char]92)) -replace '\\', '/')
        Category = $rule.Name
    })
}

# Categorize every remaining root document. The final product rule is an
# intentional catch-all for durable business, feature, and experience material.
foreach ($file in Get-ChildItem -LiteralPath $repoRoot -File -Filter '*.md') {
    if ($reservedRootDocs -contains $file.Name) {
        continue
    }

    $rule = $activeRules | Where-Object { $file.Name -match $_.Pattern } | Select-Object -First 1
    $destinationDirectory = Join-Path $repoRoot "docs\$($rule.Name)"
    New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
    $destination = Join-Path $destinationDirectory $file.Name

    if (Test-Path -LiteralPath $destination) {
        throw "Refusing to overwrite existing documentation file: $destination"
    }

    Move-Item -LiteralPath $file.FullName -Destination $destination
    $moves.Add([pscustomobject]@{
        Name = $file.Name
        From = $file.Name
        To = ((Resolve-Path -Relative $destination).TrimStart([char[]]@('.', [char]92)) -replace '\\', '/')
        Category = $rule.Name
    })
}

# Reconstruct prior moves when rerunning after an interrupted first pass.
foreach ($rule in $archiveRules) {
    $archiveDirectory = Join-Path $repoRoot "docs\archive\$($rule.Name)"
    if (-not (Test-Path -LiteralPath $archiveDirectory)) {
        continue
    }

    foreach ($file in Get-ChildItem -LiteralPath $archiveDirectory -File -Filter '*.md') {
        if ($moves.Name -contains $file.Name) {
            continue
        }
        $moves.Add([pscustomobject]@{
            Name = $file.Name
            From = $file.Name
            To = ((Resolve-Path -Relative $file.FullName).TrimStart([char[]]@('.', [char]92)) -replace '\\', '/')
            Category = $rule.Name
        })
    }
}

foreach ($rule in $activeRules) {
    $activeDirectory = Join-Path $repoRoot "docs\$($rule.Name)"
    if (-not (Test-Path -LiteralPath $activeDirectory)) {
        continue
    }

    foreach ($file in Get-ChildItem -LiteralPath $activeDirectory -File -Filter '*.md') {
        if ($moves.Name -contains $file.Name) {
            continue
        }
        $moves.Add([pscustomobject]@{
            Name = $file.Name
            From = $file.Name
            To = ((Resolve-Path -Relative $file.FullName).TrimStart([char[]]@('.', [char]92)) -replace '\\', '/')
            Category = $rule.Name
        })
    }
}

# Repair Markdown links that previously targeted a moved root document. A single
# alternation regex avoids an expensive documents-times-moves nested scan.
$moveByName = @{}
foreach ($move in $moves) {
    $moveByName[$move.Name] = $move
}
$linkPattern = '(?<=\]\()(?<target>[^)]+)(?=\))'
$markdownFiles = & rg --files -g '*.md' -g '!node_modules/**' -g '!frontend/node_modules/**' |
    ForEach-Object { Get-Item -LiteralPath (Join-Path $repoRoot $_) }

foreach ($document in $markdownFiles) {
    $content = [System.IO.File]::ReadAllText($document.FullName)
    $updated = [regex]::Replace($content, $linkPattern, {
        param($match)
        $rawTarget = $match.Groups['target'].Value
        if ($rawTarget -match '^(?:[a-z]+:|#)' -or $rawTarget -match '^<') {
            return $rawTarget
        }

        $parts = $rawTarget -split '#', 2
        $pathPart = $parts[0]
        $anchor = if ($parts.Count -gt 1) { "#$($parts[1])" } else { '' }
        $documentRelative = Join-Path $document.DirectoryName ($pathPart -replace '/', '\')
        if (Test-Path -LiteralPath $documentRelative) {
            return $rawTarget
        }

        $leafName = [System.IO.Path]::GetFileName($pathPart)
        if ($moveByName.ContainsKey($leafName)) {
            $move = $moveByName[$leafName]
            $targetAbsolute = Join-Path $repoRoot ($move.To -replace '/', '\')
            $relativeTarget = Get-RelativePath -FromDirectory $document.DirectoryName -ToPath $targetAbsolute
            return "$relativeTarget$anchor"
        }

        $rootRelative = Join-Path $repoRoot ($pathPart -replace '/', '\')
        if (Test-Path -LiteralPath $rootRelative) {
            $relativeTarget = Get-RelativePath -FromDirectory $document.DirectoryName -ToPath $rootRelative
            return "$relativeTarget$anchor"
        }

        return $rawTarget
    })

    if ($updated -ne $content) {
        [System.IO.File]::WriteAllText($document.FullName, $updated, [System.Text.UTF8Encoding]::new($false))
    }
}

$manifestPath = Join-Path $repoRoot 'docs\DOCUMENTATION_MANIFEST.md'
$activeRootDocs = Get-ChildItem -LiteralPath $repoRoot -File -Filter '*.md' | Sort-Object Name
$archiveGroups = $moves | Where-Object { $_.To -like 'docs/archive/*' } | Group-Object Category | Sort-Object Name
$activeGroups = $moves | Where-Object { $_.To -notlike 'docs/archive/*' } | Group-Object Category | Sort-Object Name

$manifest = [System.Collections.Generic.List[string]]::new()
$manifest.Add('# Documentation manifest')
$manifest.Add('')
$manifest.Add('This manifest records the first-pass documentation classification. Files were archived only when their names clearly identify point-in-time evidence. Remaining root documents require canonical-versus-superseded review before relocation.')
$manifest.Add('')
$manifest.Add('## Current root documents')
$manifest.Add('')
foreach ($file in $activeRootDocs) {
    $manifest.Add("- ``$($file.Name)`` - pending canonical/supporting classification")
}
$manifest.Add('')
$manifest.Add('## Archived in this pass')
$manifest.Add('')
foreach ($group in $archiveGroups) {
    $manifest.Add("### $($group.Name) ($($group.Count))")
    $manifest.Add('')
    foreach ($move in $group.Group | Sort-Object Name) {
        $manifest.Add("- [$($move.Name)]($($move.To.Substring(5)))")
    }
    $manifest.Add('')
}
$manifest.Add('## Active subject categories')
$manifest.Add('')
foreach ($group in $activeGroups) {
    $manifest.Add("### $($group.Name) ($($group.Count))")
    $manifest.Add('')
    foreach ($move in $group.Group | Sort-Object Name) {
        $manifest.Add("- [$($move.Name)]($($move.To.Substring(5))) - pending canonical/supporting review")
    }
    $manifest.Add('')
}
$manifest.Add('## Classification policy')
$manifest.Add('')
$manifest.Add('- **Canonical:** current source of truth, maintained with product behavior.')
$manifest.Add('- **Supporting:** useful durable context that does not define current behavior.')
$manifest.Add('- **Archive:** point-in-time evidence such as audits, sprint reports, reviews, verdicts, and sign-offs.')
$manifest.Add('- **Duplicate:** byte-identical exported evidence; retained pending a separate approved deduplication pass.')
$manifest.Add('- **Undecided:** overlapping or potentially superseded documents requiring human review.')
$manifest.Add('')
$manifest.Add('Generated by `scripts/docs/organize-docs.ps1`.')

New-Item -ItemType Directory -Force -Path (Split-Path $manifestPath) | Out-Null
[System.IO.File]::WriteAllLines($manifestPath, $manifest, [System.Text.UTF8Encoding]::new($false))

Write-Output "Classified $($moves.Count) root Markdown files."
$archiveGroups | ForEach-Object { Write-Output "  $($_.Name): $($_.Count)" }
$activeGroups | ForEach-Object { Write-Output "  $($_.Name): $($_.Count)" }
Write-Output "Remaining root Markdown files: $($activeRootDocs.Count)"

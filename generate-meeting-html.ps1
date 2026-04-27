param(
  [string]$RootPath,
  [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$defaultOutputPath = Join-Path $scriptDirectory 'advisor-meeting-board.html'

if (-not $RootPath) { $RootPath = $scriptDirectory }
if (-not $OutputPath) { $OutputPath = $defaultOutputPath }

function New-Block {
  param([int]$Index, [string]$Type, [hashtable]$Extra = @{})

  $data = [ordered]@{
    id   = ('block-{0:D4}' -f $Index)
    type = $Type
  }

  foreach ($key in $Extra.Keys) {
    $data[$key] = $Extra[$key]
  }

  [pscustomobject]$data
}

function Convert-MarkdownToBlocks {
  param([string]$Markdown)

  $lines = ($Markdown -replace "`r`n", "`n" -replace "`r", "`n") -split "`n"
  $blocks = New-Object 'System.Collections.Generic.List[object]'
  $i = 0
  $blockIndex = 0

  while ($i -lt $lines.Length) {
    $line = $lines[$i]

    if ([string]::IsNullOrWhiteSpace($line)) {
      $count = 0
      while ($i -lt $lines.Length -and [string]::IsNullOrWhiteSpace($lines[$i])) {
        $count += 1
        $i += 1
      }
      $blocks.Add((New-Block $blockIndex 'blank-line' @{ count = $count }))
      $blockIndex += 1
      continue
    }

    $fence = [regex]::Match($line, '^```(.*)$')
    if ($fence.Success) {
      $lang = $fence.Groups[1].Value.Trim()
      $code = New-Object 'System.Collections.Generic.List[string]'
      $i += 1
      while ($i -lt $lines.Length -and -not [regex]::IsMatch($lines[$i], '^```\s*$')) {
        $code.Add($lines[$i])
        $i += 1
      }
      if ($i -lt $lines.Length) { $i += 1 }
      $langLower = $lang.ToLowerInvariant()
      $type = if ($langLower -eq 'mermaid') { 'mermaid' } elseif ($langLower -eq 'plantuml' -or $langLower -eq 'puml') { 'plantuml' } else { 'code' }
      $blocks.Add((New-Block $blockIndex $type @{ language = $lang; text = ($code.ToArray() -join "`n") }))
      $blockIndex += 1
      continue
    }

    if (
      [regex]::IsMatch($line, '^\s*\|.*\|\s*$') -and
      $i + 1 -lt $lines.Length -and
      [regex]::IsMatch($lines[$i + 1], '^\s*\|?\s*:?[-]{3,}')
    ) {
      $table = New-Object 'System.Collections.Generic.List[string]'
      $table.Add($line)
      $table.Add($lines[$i + 1])
      $cursor = $i + 2
      while ($cursor -lt $lines.Length -and [regex]::IsMatch($lines[$cursor], '^\s*\|.*\|\s*$')) {
        $table.Add($lines[$cursor])
        $cursor += 1
      }
      $blocks.Add((New-Block $blockIndex 'table' @{ raw = ($table.ToArray() -join "`n") }))
      $blockIndex += 1
      $i = $cursor
      continue
    }

    $heading = [regex]::Match($line, '^(#{1,6})\s+(.*)$')
    if ($heading.Success) {
      $blocks.Add((New-Block $blockIndex 'heading' @{ level = $heading.Groups[1].Value.Length; text = $heading.Groups[2].Value }))
      $blockIndex += 1
      $i += 1
      continue
    }

    if ([regex]::IsMatch($line, '^>\s?')) {
      $quote = New-Object 'System.Collections.Generic.List[string]'
      while ($i -lt $lines.Length -and [regex]::IsMatch($lines[$i], '^>\s?')) {
        $quote.Add(([regex]::Replace($lines[$i], '^>\s?', '')))
        $i += 1
      }
      $blocks.Add((New-Block $blockIndex 'blockquote' @{ text = ($quote.ToArray() -join "`n") }))
      $blockIndex += 1
      continue
    }

    $list = [regex]::Match($line, '^(\s*)([-*+]|\d+\.)\s+(.*)$')
    if ($list.Success) {
      $marker = $list.Groups[2].Value
      $blocks.Add((New-Block $blockIndex 'list-item' @{
            indent  = [Math]::Min([Math]::Floor($list.Groups[1].Value.Length / 2), 6)
            marker  = $marker
            ordered = [regex]::IsMatch($marker, '^\d+\.$')
            text    = $list.Groups[3].Value
          }))
      $blockIndex += 1
      $i += 1
      continue
    }

    $paragraph = New-Object 'System.Collections.Generic.List[string]'
    $paragraph.Add($line)
    $i += 1
    while (
      $i -lt $lines.Length -and
      -not [string]::IsNullOrWhiteSpace($lines[$i]) -and
      -not [regex]::IsMatch($lines[$i], '^(#{1,6})\s+') -and
      -not [regex]::IsMatch($lines[$i], '^```') -and
      -not [regex]::IsMatch($lines[$i], '^>\s?') -and
      -not [regex]::IsMatch($lines[$i], '^(\s*)([-*+]|\d+\.)\s+') -and
      -not (
        [regex]::IsMatch($lines[$i], '^\s*\|.*\|\s*$') -and
        $i + 1 -lt $lines.Length -and
        [regex]::IsMatch($lines[$i + 1], '^\s*\|?\s*:?[-]{3,}')
      )
    ) {
      $paragraph.Add($lines[$i])
      $i += 1
    }

    $blocks.Add((New-Block $blockIndex 'paragraph' @{ text = ($paragraph.ToArray() -join "`n") }))
    $blockIndex += 1
  }

  $blocks.ToArray()
}

function Get-ProjectFiles {
  param([string]$Path, [string]$Filter)
  Get-ChildItem -Path $Path -File -Filter $Filter
  Get-ChildItem -Path $Path -Directory | Where-Object { $_.Name -notmatch '^(\.git|\.github|node_modules)$' } | ForEach-Object {
    Get-ProjectFiles -Path $_.FullName -Filter $Filter
  }
}

$mdDocuments = Get-ProjectFiles -Path $RootPath -Filter '*.md' |
  Sort-Object FullName |
  ForEach-Object {
    $relPath = $_.FullName.Substring($RootPath.Length).TrimStart('\', '/')
    $folder = [System.IO.Path]::GetDirectoryName($relPath)
    $displayName = if ($folder) { "$folder/$($_.Name)" } else { $_.Name }
    $markdown = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    [pscustomobject]@{
      id       = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
      name     = $displayName
      title    = [System.IO.Path]::GetFileNameWithoutExtension($_.Name) -replace '_', ' '
      markdown = $markdown
      blocks   = Convert-MarkdownToBlocks $markdown
    }
  }

$pumlDocuments = Get-ProjectFiles -Path $RootPath -Filter '*.puml' |
  Sort-Object FullName |
  ForEach-Object {
    $relPath = $_.FullName.Substring($RootPath.Length).TrimStart('\', '/')
    $folder = [System.IO.Path]::GetDirectoryName($relPath)
    $displayName = if ($folder) { "$folder/$($_.Name)" } else { $_.Name }
    $pumlContent = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    $fence = '```'
    $title = [System.IO.Path]::GetFileNameWithoutExtension($_.Name) -replace '-', ' '
    $markdown = "# $title`n`n${fence}plantuml`n$pumlContent`n${fence}"
    [pscustomobject]@{
      id       = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
      name     = $displayName
      title    = [System.IO.Path]::GetFileNameWithoutExtension($_.Name) -replace '[-_]', ' '
      markdown = $markdown
      blocks   = Convert-MarkdownToBlocks $markdown
    }
  }

$documents = @()
if ($mdDocuments) { $documents += $mdDocuments }
if ($pumlDocuments) { $documents += $pumlDocuments }

$documentsJson = ($documents | ConvertTo-Json -Depth 10 -Compress).Replace('</', '<\/')
$generatedAt = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')

$template = @'
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agentic IDE Toplanti Panosu</title>
  <style>
    :root{--bg:#f5f0e6;--panel:#fff;--line:rgba(107,84,59,.16);--text:#2e241c;--muted:#6d5b4c;--accent:#b45309;--accent-soft:rgba(180,83,9,.12);--danger:#9b2c2c;--ok:#2f855a;--shadow:0 8px 30px rgba(74,48,22,.08);--sans:"Inter","Segoe UI","Helvetica Neue",sans-serif;--serif:"Georgia","Times New Roman",serif;--mono:"JetBrains Mono","Cascadia Code",Consolas,monospace;--bg-hero:linear-gradient(135deg,#fcfaf8,#f3ebe1)}
    :root[data-theme="dark"]{--bg:#0f0f11;--panel:#1c1c1e;--line:rgba(255,255,255,.12);--text:#e4e4e7;--muted:#a1a1aa;--accent:#f59e0b;--accent-soft:rgba(245,158,11,.15);--danger:#ef4444;--ok:#10b981;--shadow:0 10px 40px rgba(0,0,0,.5);--bg-hero:linear-gradient(135deg,#18181b,#111113)}
    *{box-sizing:border-box} html{scroll-behavior:smooth} body{margin:0;font-family:var(--sans);color:var(--text);background:var(--bg);min-height:100vh;transition:background 0.3s, color 0.3s}
    a{color:inherit} button,input,textarea{font:inherit}
    .layout{display:grid;grid-template-columns:minmax(280px,340px) 1fr;min-height:100vh}
    .sidebar{position:sticky;top:0;align-self:start;height:100vh;overflow-y:auto;padding:28px 20px;border-right:1px solid var(--line);background:var(--panel);z-index:10}
    .brand,.hero,.document,.empty-state{border:1px solid var(--line);background:var(--panel);box-shadow:var(--shadow)}
    .brand{margin-bottom:24px;padding:18px;border-radius:18px;background:var(--accent-soft)}
    .brand h1{margin:0 0 8px;font-family:var(--serif);font-size:1.5rem;line-height:1.1}
    .meta,.doc-meta,.stat-label,.footer-note,.empty-state,.brand p{color:var(--muted)}
    .search-box{width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--bg);color:var(--text);margin-bottom:16px}
    .stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:18px}
    .stat{padding:12px 14px;border-radius:16px;background:var(--bg);border:1px solid var(--line)} .stat strong{display:block;font-size:1.15rem}
    .progress-container{margin-bottom:20px;padding:14px;border-radius:14px;background:var(--bg);border:1px solid var(--line)}
    .progress-bar{height:6px;border-radius:3px;background:var(--line);margin-top:8px;overflow:hidden}
    .progress-fill{height:100%;background:var(--ok);width:0%;transition:width 0.4s cubic-bezier(0.4, 0, 0.2, 1)}
    .nav-list{display:grid;gap:8px;padding:0;margin:0;list-style:none}
    .nav-link{display:block;padding:10px 14px;border-radius:12px;text-decoration:none;border:1px solid transparent;transition:all 0.15s;background:transparent} .nav-link:hover,.nav-link:focus-visible{border-color:var(--line);background:var(--bg);outline:none}
    .nav-link small{display:block;color:var(--muted);margin-top:2px}
    .content{padding:32px;max-width:1400px;margin:0 auto;width:100%}
    .hero{padding:32px;border-radius:24px;margin-bottom:28px;background:var(--bg-hero)}
    .hero h2{margin:0 0 12px;font-family:var(--serif);font-size:clamp(1.8rem,3vw,2.4rem);line-height:1.1}
    .hero p{max-width:72ch;line-height:1.6;font-size:1.05rem}
    .toolbar,.doc-tools,.view-switch,.action-group,.badge-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .toolbar{margin-top:24px}
    .toolbar button,.secondary-action,.view-button,.doc-button,.copy-button,.theme-toggle{cursor:pointer;border:1px solid var(--line);border-radius:8px;padding:8px 14px;background:var(--bg);color:var(--text);font-weight:500;transition:all 0.15s}
    .toolbar button:hover,.secondary-action:hover,.view-button:hover,.doc-button:hover,.copy-button:hover,.theme-toggle:hover{border-color:var(--accent);background:var(--accent-soft)}
    .primary{background:var(--accent)!important;color:#fff!important;border-color:transparent!important} .primary:hover{opacity:0.9}
    .documents{display:grid;gap:24px}
    .document{border-radius:16px;overflow:hidden}
    .document[hidden],.nav-item[hidden],.empty-state[hidden]{display:none!important}
    .document summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 24px;border-bottom:1px solid var(--line);background:var(--bg)}
    .document summary::-webkit-details-marker{display:none}
    .summary-title h3{margin:0;font-size:1.25rem;line-height:1.3}
    .doc-meta{margin-top:6px;font-size:.92rem;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .pill{display:inline-flex;align-items:center;padding:4px 10px;border-radius:6px;border:1px solid var(--line);background:var(--bg);font-size:.82rem;font-weight:600}
    .pill.keep{color:var(--ok);border-color:var(--ok)} .pill.revise{color:var(--accent);border-color:var(--accent)} .pill.discuss{color:#3b82f6;border-color:#3b82f6} .pill.remove{color:var(--danger);border-color:var(--danger)}
    .document-body{padding:24px;display:grid;gap:20px}
    .selection-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
    .selection-card,.inline-toggle{display:flex;gap:12px;align-items:flex-start;padding:16px;border-radius:12px;background:var(--bg);border:1px solid var(--line);cursor:pointer;transition:all 0.2s}
    .selection-card:hover{border-color:var(--accent)}
    .selection-card.active{border-color:var(--accent);background:var(--accent-soft)}
    .selection-card strong{display:block;margin-bottom:4px;font-size:1.05rem}
    .selection-card input,.inline-toggle input{accent-color:var(--accent);inline-size:20px;block-size:20px;margin-top:2px;flex:0 0 auto;cursor:pointer}
    .doc-tools{justify-content:space-between;padding:12px 16px;border-radius:12px;border:1px solid var(--line);background:var(--bg)}
    .view-button.active{background:var(--accent);color:#fff;border-color:var(--accent)}
    .panel{border-radius:12px;border:1px solid var(--line);background:var(--bg);padding:24px}
    .panel[hidden]{display:none!important}
    /* Split View Container */
    .view-container{display:flex;flex-direction:column;gap:16px}
    .view-container.split{flex-direction:row;align-items:flex-start}
    .view-container.split > .panel{flex:1;min-width:0;position:sticky;top:20px}
    .preview-note{padding:14px 16px;border-radius:8px;border:1px solid rgba(239,68,68,.2);background:rgba(239,68,68,.1);color:var(--danger)}
    .editor-grid,.markdown{display:grid;gap:16px}
    .editor-block,.code-block,.mermaid-block{display:grid;gap:10px;padding:16px;border-radius:12px;border:1px solid var(--line);background:var(--panel)}
    .block-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .block-tag{display:inline-flex;align-items:center;justify-content:center;padding:4px 8px;border-radius:6px;background:var(--accent-soft);color:var(--accent);font-size:.8rem;font-weight:700}
    .editor,.raw-markdown,.code-surface{width:100%;border-radius:8px;border:1px solid var(--line);padding:14px;resize:vertical;white-space:pre-wrap;overflow-x:auto;line-height:1.6;background:var(--bg);color:var(--text)}
    .editor.code,.raw-markdown,.code-surface{font-family:var(--mono);font-size:.92rem;background:#18181b;color:#e4e4e7;border-color:#27272a}
    :root[data-theme="dark"] .editor.code, :root[data-theme="dark"] .raw-markdown, :root[data-theme="dark"] .code-surface{background:#09090b;color:#d4d4d8}
    .editor.heading{min-height:56px;font-weight:700;font-size:1.1rem}
    .visual-table-editor{display:flex;flex-direction:column;gap:4px;border:1px solid var(--line);padding:8px;border-radius:8px;background:var(--panel);overflow-x:auto;margin-top:8px}
    .table-row-editor{display:flex;gap:4px}
    .table-cell-input{flex:1;min-width:120px;padding:6px 8px;font-family:var(--sans);font-size:.9rem;border:1px solid var(--line);border-radius:4px;background:var(--bg);color:var(--text)}
    .table-cell-input.header{font-weight:600;background:var(--accent-soft)}
    .table-actions{display:flex;gap:8px;margin-top:8px}
    .table-action-btn{background:var(--bg);color:var(--text);border:1px dashed var(--line);padding:6px 10px;font-size:.85rem;border-radius:6px;cursor:pointer;transition:.2s}
    .table-action-btn:hover{background:var(--accent-soft);border-color:var(--accent)}
    .hidden-table-editor{display:none!important}
    .ai-btn{background:transparent;border:1px solid #a855f7;color:#a855f7;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:.8rem;display:inline-flex;align-items:center;transition:.2s;margin-right:8px}
    .ai-btn:hover{background:#a855f7;color:#fff}
    .ai-loading{animation:pulse 1.5s infinite;opacity:0.6;pointer-events:none}
    @keyframes pulse{0%{opacity:0.6}50%{opacity:1}100%{opacity:0.6}}
    .ai-popup{position:absolute;z-index:100;background:var(--panel);border:1px solid #a855f7;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.2);width:260px;font-family:var(--sans)}
    .ai-popup-header{background:rgba(168,85,247,0.1);color:#a855f7;padding:8px 12px;font-weight:600;font-size:0.9rem;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center}
    .close-ai{cursor:pointer;font-size:1.2rem}
    .ai-popup-body{padding:12px;display:flex;flex-direction:column;gap:8px}
    .ai-prompt-btn{background:var(--bg);border:1px solid var(--line);padding:6px 10px;border-radius:6px;cursor:pointer;text-align:left;color:var(--text);font-size:0.85rem;transition:.2s}
    .ai-prompt-btn:hover{border-color:#a855f7;color:#a855f7}
    #aiCustomPrompt{width:100%;padding:6px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--text);font-family:var(--sans);font-size:0.85rem;resize:vertical}
    .markdown h1,.markdown h2,.markdown h3,.markdown h4,.markdown h5,.markdown h6{margin:0;line-height:1.3;font-family:var(--serif);font-weight:600}
    .heading-1 h1{font-size:2rem;border-bottom:2px solid var(--line);padding-bottom:10px} .heading-2 h2{font-size:1.5rem} .heading-3 h3{font-size:1.25rem}
    .markdown p,.markdown blockquote,.markdown table,.markdown pre,.markdown ul,.markdown ol,.markdown .mermaid-block,.markdown .code-block{margin:0;font-size:1rem}
    .markdown blockquote{padding:16px 20px;border-left:4px solid var(--accent);background:var(--accent-soft);border-radius:0 8px 8px 0;font-style:italic}
    .preview-list{display:grid;gap:8px;padding:0;list-style:none}
    .preview-item{display:flex;align-items:flex-start;gap:12px;padding:8px 0}
    .preview-item[data-indent="1"]{margin-left:24px}.preview-item[data-indent="2"]{margin-left:48px}.preview-item[data-indent="3"]{margin-left:72px}.preview-item[data-indent="4"]{margin-left:96px}
    .ordinal{color:var(--accent);font-weight:700;min-width:1.5rem;display:inline-block}
    .markdown table{width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid var(--line)}
    .markdown th,.markdown td{text-align:left;vertical-align:top;padding:12px 16px;border-bottom:1px solid var(--line);border-right:1px solid var(--line)}
    .markdown th:last-child,.markdown td:last-child{border-right:none}.markdown thead{background:var(--bg)}
    .mermaid-preview{border-radius:8px;border:1px dashed var(--line);background:var(--panel);min-height:80px;padding:16px;overflow-x:auto;display:flex;justify-content:center}
    .mermaid-preview.error{color:var(--danger);border-style:solid;background:rgba(239,68,68,.1)}
    .markdown code{font-family:var(--mono);background:var(--line);border-radius:4px;padding:2px 6px;font-size:.9em}
    .empty-state{padding:32px;border-radius:16px;text-align:center;font-size:1.1rem}
    .footer-note{margin-top:24px;font-size:.92rem;opacity:0.8}
    .save-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:16px;margin-top:8px;border-radius:12px;border:1px solid rgba(16,185,129,.2);background:rgba(16,185,129,.05)}
    .save-button{cursor:pointer;border:none;border-radius:8px;padding:10px 20px;background:var(--ok);color:#fff;font-weight:600;font-size:.95rem;transition:opacity .15s} .save-button:hover{opacity:.85} .save-button:disabled{opacity:.4;cursor:not-allowed}
    .save-status{font-size:.9rem;padding:6px 14px;border-radius:6px;font-weight:500} .save-status.ok{color:var(--ok);background:rgba(16,185,129,.1)} .save-status.err{color:var(--danger);background:rgba(239,68,68,.1)} .save-status.info{color:var(--muted);background:var(--bg)}
    .dir-indicator{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:8px;font-size:.9rem;border:1px solid var(--line);background:var(--bg);color:var(--muted)} .dir-indicator.active{color:var(--text);border-color:var(--ok);background:rgba(16,185,129,.1)}
    @media (max-width:1200px){.view-container.split{flex-direction:column} .view-container.split > .panel{position:static}}
    @media (max-width:1080px){.layout{grid-template-columns:1fr}.sidebar{position:relative;height:auto;border-right:none;border-bottom:1px solid var(--line)}}
    @media (max-width:720px){.content{padding:16px}.hero,.document summary,.document-body,.sidebar{padding-left:16px;padding-right:16px}.selection-grid,.stats{grid-template-columns:1fr}.doc-tools{align-items:stretch}}
  </style>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <h1>Agentic IDE<br />Toplanti Panosu</h1>
        <p class="meta">Hocayla belge bazli karar almak, bloklari temizlemek ve temiz Markdown kopyalari indirmek icin tek dosyalik calisma yuzeyi.</p>
      </div>
      <input id="searchBox" class="search-box" type="search" placeholder="Belge veya icerik ara" aria-label="Belge veya icerik ara" />
      <div class="stats">
        <div class="stat"><span class="stat-label">Belge</span><strong id="docCount">0</strong></div>
        <div class="stat"><span class="stat-label">Isaretli</span><strong id="checkedCount">0</strong></div>
        <div class="stat"><span class="stat-label">Diyagram</span><strong id="diagramCount">0</strong></div>
        <div class="stat"><span class="stat-label">Son uretim</span><strong id="generatedAt">__GENERATED_AT__</strong></div>
      </div>
      <div class="progress-container">
        <div style="display:flex;justify-content:space-between;font-size:0.9rem;font-weight:600">
          <span>Karar Ilerlemesi</span>
          <span id="progressText">0%</span>
        </div>
        <div class="progress-bar"><div id="progressFill" class="progress-fill"></div></div>
      </div>
      <ul id="navList" class="nav-list"></ul>
      <p class="footer-note">Secimler ve duzenlemeler tarayicida yerel olarak saklanir. Kaydet butonuyla orijinal Markdown dosyalarinin uzerine yazabilirsiniz.</p>
    </aside>
    <main class="content">
      <section class="hero">
        <h2>Requirements Review ve Temiz Export</h2>
        <p>Belge kararlarini sec, blok bazli duzenle, aninda temiz Markdown onizlemesini gore ve export paketini indir. "Simdilik ciksin" secilen belgeler pakete girmez; kapatilan basliklar kendi alt bolumleriyle birlikte elenir.</p>
        <div class="toolbar">
          <input type="password" id="geminiApiKey" class="search-box" style="width:200px;padding:6px 10px;margin-right:auto;" placeholder="Gemini API Key" title="Gemini 2.5 Flash API Key">
          <button id="themeToggle" class="theme-toggle" type="button" title="Karanlik/Aydinlik Tema Degistir">< Koyu Tema</button>
          <button id="expandAll" class="primary" type="button">Tum belgeleri ac</button>
          <button id="collapseAll" type="button">Tum belgeleri kapat</button>
          <button id="clearSelections" type="button">Secimleri sifirla</button>
          <button id="resetEdits" type="button">Duzenlemeleri sifirla</button>
          <button id="exportSummary" type="button">Toplanti karar ozeti indir</button>
          <button id="exportPack" type="button">Temiz Markdown paketi indir</button>
          <button id="pickDirectory" type="button">&#x1F4C1; Calisma dizini sec</button>
          <span id="dirIndicator" class="dir-indicator">Dizin secilmedi</span>
        </div>
      </section>
      <section class="document" id="meetingQuestionsPanel" open>
        <div class="document-body">
          <div class="doc-tools">
            <strong>Danismana Sorulacak Kritik Sorular (Product Plan)</strong>
            <span class="pill discuss">Toplantida tartisilacak</span>
          </div>
          <ul class="preview-list">
            <li class="preview-item"><div><strong>1)</strong> Ana arastirma sorusu yeterince net mi?<br><small class="meta">Ilgili Alan: Arastirma Sorusu | Bolum: PRODUCT_PLAN �2.1</small></div></li>
            <li class="preview-item"><div><strong>2)</strong> Basari esigi (>= %60) uygun mu?<br><small class="meta">Ilgili Alan: Basari Kriterleri | Bolum: PRODUCT_PLAN �7</small></div></li>
            <li class="preview-item"><div><strong>3)</strong> Guven olcumu icin rollback + anket yeterli mi?<br><small class="meta">Ilgili Alan: Metrikler | Bolum: PRODUCT_PLAN �7</small></div></li>
            <li class="preview-item"><div><strong>4)</strong> Terminal entegrasyonu MVP disinda kesin kalsin mi?<br><small class="meta">Ilgili Alan: MVP Disi Ozellikler | Bolum: PRODUCT_PLAN �6</small></div></li>
            <li class="preview-item"><div><strong>5)</strong> MVP disi listeden iceri alinacak tek bir ozellik var mi?<br><small class="meta">Ilgili Alan: Kapsam Siniri | Bolum: PRODUCT_PLAN �6</small></div></li>
            <li class="preview-item"><div><strong>6)</strong> Hedef kullaniciyi tek gruba indirmek dogru mu?<br><small class="meta">Ilgili Alan: Hedef Kullanici | Bolum: PRODUCT_PLAN �3</small></div></li>
            <li class="preview-item"><div><strong>7)</strong> Bes kullanim senaryosu juri icin yeterli mi?<br><small class="meta">Ilgili Alan: Kullanim Senaryolari | Bolum: PRODUCT_PLAN �4</small></div></li>
            <li class="preview-item"><div><strong>8)</strong> Rekabet tablosu iddialarini yumusatmali miyiz?<br><small class="meta">Ilgili Alan: Rekabetci Konumlandirma | Bolum: PRODUCT_PLAN �5.2</small></div></li>
          </ul>
          <div class="preview-note">Kapanis sorusu: Bugun onay verdiginiz 3 maddeyi ve revize etmem gereken 3 maddeyi netlestirebilir miyiz?</div>
        </div>
      </section>

      <section class="document" id="safetyQuestionsPanel" open>
        <div class="document-body">
          <div class="doc-tools">
            <strong>Danismana Sorulacak Kritik Sorular (Safety & Guardrails)</strong>
            <span class="pill discuss">Toplantida tartisilacak</span>
          </div>
          <ul class="preview-list">
            <li class="preview-item"><div><strong>1)</strong> Sandbox kontrolu mevcut haliyle yeterli mi?<br><small class="meta">Ilgili Alan: Katman 1 Sandbox | Bolum: SAFETY_AND_GUARDRAILS �2.1</small></div></li>
            <li class="preview-item"><div><strong>2)</strong> Gizli dosya pattern listesine ek zorunlu kalem var mi?<br><small class="meta">Ilgili Alan: Katman 2 Gizli Dosya Korumasi | Bolum: SAFETY_AND_GUARDRAILS �2.2</small></div></li>
            <li class="preview-item"><div><strong>3)</strong> "Secerek uygula" MVP'de kalmali mi?<br><small class="meta">Ilgili Alan: Katman 3 Human Gate | Bolum: SAFETY_AND_GUARDRAILS �2.3</small></div></li>
            <li class="preview-item"><div><strong>4)</strong> Undo stack (10 degisiklik) yeterli mi?<br><small class="meta">Ilgili Alan: Katman 4 Atomik Yazma ve Undo | Bolum: SAFETY_AND_GUARDRAILS �2.4</small></div></li>
            <li class="preview-item"><div><strong>5)</strong> Audit log alanlari tez degerlendirmesi icin yeterli mi?<br><small class="meta">Ilgili Alan: Katman 5 Audit Log | Bolum: SAFETY_AND_GUARDRAILS �2.5</small></div></li>
            <li class="preview-item"><div><strong>6)</strong> Prompt injection azaltimi MVP icin savunulabilir mi?<br><small class="meta">Ilgili Alan: Ic Tehditler + OWASP | Bolum: SAFETY_AND_GUARDRAILS �3.1, �4</small></div></li>
            <li class="preview-item"><div><strong>7)</strong> API anahtari sizintisi onlemleri yeterli mi?<br><small class="meta">Ilgili Alan: Dis Tehditler | Bolum: SAFETY_AND_GUARDRAILS �3.2</small></div></li>
            <li class="preview-item"><div><strong>8)</strong> Guvenlik test kapsami (otomatik + manuel) yeterli mi?<br><small class="meta">Ilgili Alan: Test Plani | Bolum: SAFETY_AND_GUARDRAILS �5.1, �5.2</small></div></li>
          </ul>
          <div class="preview-note">Kapanis sorusu: Bu guvenlik modelinde onayladiginiz 3 kontrol ve guclendirmemi istediginiz 3 kontrolu netlestirebilir miyiz?</div>
        </div>
      </section>
      <section id="documents" class="documents"></section>
      <section id="emptyState" class="empty-state" hidden>Arama sonucu belge bulunamadi.</section>
    </main>
  </div>

  <div id="aiPopup" class="ai-popup" hidden>
     <div class="ai-popup-header">Gemini AI <span class="close-ai">&times;</span></div>
     <div class="ai-popup-body">
        <button class="ai-prompt-btn" type="button" data-prompt="L�tfen bu metindeki dilbilgisi ve yaz1m hatalar1n1 d�zelt. Orijinal dili ve format1 koru.">D�zelt</button>
        <button class="ai-prompt-btn" type="button" data-prompt="Bu metni daha akademik, resmi ve profesyonel bir dille yeniden yaz.">Akademik Yap</button>
        <button class="ai-prompt-btn" type="button" data-prompt="Bu metni biraz daha detayland1rarak uzat.">Uzat</button>
        <button class="ai-prompt-btn" type="button" data-prompt="L�tfen bu metindeki konuyu internetteki en g�ncel verilerle ara_t1r ve yeni, dorulanm1_ bilgilerle detayland1r. Orijinal tablo, liste, veya ba_l1k yap1s1n1 kesinlikle koru.">< 0nternetten Ara_t1r ve Detayland1r</button>
        <button class="ai-prompt-btn" type="button" data-prompt="Bu metnin ana fikrini koruyarak daha k1sa ve �z hale getir.">K1salt</button>
        <textarea id="aiCustomPrompt" placeholder="�zel prompt yaz..." rows="2"></textarea>
        <button id="aiCustomSubmit" type="button" class="primary" style="width:100%">G�nder</button>
     </div>
  </div>

  <script id="documentsData" type="application/json">__DOCUMENTS_JSON__</script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
  <script>
    const documents = JSON.parse(document.getElementById('documentsData').textContent);
    const storagePrefix = 'agentic-ide-board:v2:';
    const decisions = ['keep', 'revise', 'discuss', 'remove'];
    const timers = Object.create(null);
    let mermaidReady = false;
    let directoryHandle = null;

    const slugify = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
    const norm = (value) => String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const key = (name) => storagePrefix + name;
    const getStore = (name) => { try { return localStorage.getItem(key(name)); } catch { return null; } };
    const setStore = (name, value) => { try { localStorage.setItem(key(name), value); } catch {} };
    const clearStore = (name) => { try { localStorage.removeItem(key(name)); } catch {} };
    const docSlug = (doc) => slugify(doc.name);
    const docBySlug = (slug) => documents.find((doc) => docSlug(doc) === slug) || null;
    const decisionKey = (slug, name) => `${slug}:decision:${name}`;
    const editKey = (slug, blockId) => `${slug}:block:${blockId}:edit`;
    const includeKey = (slug, blockId) => `${slug}:block:${blockId}:include`;
    const viewKey = (slug) => `${slug}:view`;
    const cleanName = (doc) => doc.name.replace(/\.md$/i, '') + '.cleaned.md';
    const parseInline = (raw) => escapeHtml(raw).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    const splitTableRow = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
    const toggleable = (block) => block.type === 'heading' || block.type === 'list-item';
    const originalValue = (block) => (block.type === 'table' ? (block.raw || '') : (block.text || ''));
    const blockValue = (slug, block) => { const stored = getStore(editKey(slug, block.id)); return stored !== null ? stored : originalValue(block); };
    const blockIncluded = (slug, block) => !toggleable(block) ? true : (getStore(includeKey(slug, block.id)) ?? '1') === '1';
    const docDecision = (slug) => decisions.find((name) => getStore(decisionKey(slug, name)) === '1') || '';
    const docView = (slug) => { const v = getStore(viewKey(slug)); return ['edit','preview','split'].includes(v) ? v : 'preview'; };

    // --- Theme Management ---
    const themeKey = storagePrefix + 'theme';
    const initTheme = () => {
      const stored = localStorage.getItem(themeKey);
      if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeToggle').textContent = '  Acik Tema';
      }
    };
    initTheme();

    function blockLabel(block) {
      if (block.type === 'heading') return `Baslik H${block.level}`;
      if (block.type === 'paragraph') return 'Paragraf';
      if (block.type === 'blockquote') return 'Alinti';
      if (block.type === 'table') return 'Tablo';
      if (block.type === 'list-item') return block.ordered ? 'Sirali madde' : 'Madde';
      if (block.type === 'code') return block.language ? `Kod (${block.language})` : 'Kod';
      if (block.type === 'mermaid') return 'Mermaid';
      if (block.type === 'plantuml') return 'PlantUML';
      return 'Bos satir';
    }

    function blockHint(block) {
      if (block.type === 'heading') return 'Bu baslik kapanirsa alt bolum export disi kalir.';
      if (block.type === 'list-item') return 'Bu checkbox kapanirsa yalnizca ilgili madde elenir.';
      if (block.type === 'blockquote') return 'Her satir exportta > ile yeniden yazilir.';
      if (block.type === 'table') return 'Tabloyu ham Markdown olarak duzenle.';
      if (block.type === 'code') return 'Kod blogu orijinal dil etiketiyle export edilir.';
      if (block.type === 'mermaid') return 'Bu kaynak hem onizleme hem export icin kullanilir.';
      if (block.type === 'plantuml') return 'PlantUML sunucusu uzerinden SVG olarak render edilir.';
      if (block.type === 'blank-line') return `${block.count || 1} bos satir korunur.`;
      return 'Metni duzenleyip onizlemede aninda gorebilirsin.';
    }

    function rowsFor(value, min) {
      return Math.max(min, Math.min(norm(value).split('\n').length + 1, 14));
    }

    function renderBlockEditor(slug, block) {
      if (block.type === 'blank-line') {
        return `<section class="editor-block"><div class="block-head"><div><strong>${blockLabel(block)}</strong><div class="meta">${blockHint(block)}</div></div><span class="block-tag">${block.count || 1} satir</span></div></section>`;
      }
      const value = originalValue(block);
      const aiBtn = `<button class="ai-btn" type="button" data-ai-block="${block.id}" data-ai-doc="${slug}" title="AI ile duzenle">&#x2728; AI</button>`;
      const include = toggleable(block) ? `<label class="inline-toggle"><input type="checkbox" data-include="${includeKey(slug, block.id)}" /><span>${block.type === 'heading' ? 'Bolumu dahil et' : 'Maddeyi dahil et'}</span></label>` : '';
      const codeLike = block.type === 'code' || block.type === 'mermaid' || block.type === 'plantuml' || block.type === 'table';
      const headingClass = block.type === 'heading' ? ' heading' : '';
      const tag = block.type === 'list-item' ? `${block.marker || '-'} / ${block.indent || 0}` : (block.language || block.type);
      
      if (block.type === 'table') {
         const lines = norm(value).split('\n');
         const rowsHTML = lines.map((line, rowIndex) => {
             if (rowIndex === 1 && /^\|?\s*:?[-]{3,}/.test(line.trim())) return '';
             const isHeader = rowIndex === 0;
             const cells = splitTableRow(line);
             const cellsHTML = cells.map((cell, colIndex) => `<input type="text" class="table-cell-input ${isHeader ? 'header' : ''}" value="${escapeHtml(cell)}" data-row="${rowIndex}" data-col="${colIndex}" />`).join('');
             return `<div class="table-row-editor">${cellsHTML}</div>`;
         }).filter(Boolean).join('');
         const visualEditor = `<div class="visual-table-editor" data-table-edit="${block.id}">${rowsHTML}</div>`;
         return `<section class="editor-block"><div class="block-head"><div><strong>${escapeHtml(blockLabel(block))}</strong><div class="meta">${escapeHtml(blockHint(block))}</div></div><div class="badge-row">${aiBtn}<span class="block-tag">${escapeHtml(String(tag))}</span>${include}</div></div>${visualEditor}<textarea class="editor code hidden-table-editor" data-doc="${slug}" data-edit="${block.id}" spellcheck="false">${escapeHtml(value)}</textarea><div class="table-actions"><button type="button" class="table-action-btn" data-table-action="add-row" data-block="${block.id}">+ Satir Ekle</button><button type="button" class="table-action-btn" data-table-action="add-col" data-block="${block.id}">+ Sutun Ekle</button></div></section>`;
      }
      
      return `<section class="editor-block"><div class="block-head"><div><strong>${escapeHtml(blockLabel(block))}</strong><div class="meta">${escapeHtml(blockHint(block))}</div></div><div class="badge-row">${aiBtn}<span class="block-tag">${escapeHtml(String(tag))}</span>${include}</div></div><textarea class="editor${codeLike ? ' code' : ''}${headingClass}" data-doc="${slug}" data-edit="${block.id}" rows="${rowsFor(value, block.type === 'heading' ? 2 : 4)}" spellcheck="${codeLike ? 'false' : 'true'}">${escapeHtml(value)}</textarea></section>`;
    }

    function renderSelectionCard(slug, name, label, description) {
      return `<label class="selection-card" data-card="${slug}:${name}"><input type="checkbox" data-decision="${name}" data-doc="${slug}" /><span><strong>${escapeHtml(label)}</strong><span class="meta">${escapeHtml(description)}</span></span></label>`;
    }

    function renderDocument(doc) {
      const slug = docSlug(doc);
      const mermaids = doc.blocks.filter((block) => block.type === 'mermaid' || block.type === 'plantuml').length;
      const items = doc.blocks.filter((block) => block.type === 'list-item').length;
      return `<details class="document" id="${slug}" open data-search="${escapeHtml((doc.name + ' ' + doc.markdown).toLowerCase())}"><summary><div class="summary-title"><h3>${escapeHtml(doc.name)}</h3><div class="doc-meta"><span>${items} madde, ${mermaids} diyagram</span><span class="pill" data-status="${slug}">Karar yok</span></div></div><button class="secondary-action" type="button" data-copy-raw="${slug}">Ham Markdown kopyala</button></summary><div class="document-body"><div class="selection-grid">${renderSelectionCard(slug, 'keep', 'Bu belge kalsin', 'Toplanti sonunda korunacak belge olarak isaretle.')}${renderSelectionCard(slug, 'revise', 'Revize edilsin', 'Metin veya kapsam duzeltmesi gerekiyor.')}${renderSelectionCard(slug, 'discuss', 'Toplantida tartisilsin', 'Ozellikle soru veya karar gerektiriyor.')}${renderSelectionCard(slug, 'remove', 'Simdilik ciksin', 'Bu belge export paketine girmesin.')}</div><div class="doc-tools"><div class="view-switch"><button class="view-button" type="button" data-view="${slug}:preview">Onizleme</button><button class="view-button" type="button" data-view="${slug}:edit">Duzenle</button><button class="view-button" type="button" data-view="${slug}:split">Split (Yan Yana)</button></div><div class="action-group"><button class="doc-button" type="button" data-copy-clean="${slug}">Temiz Markdown kopyala</button><button class="doc-button primary" type="button" data-export-doc="${slug}">Bu belgeyi disa aktar</button></div></div><div class="view-container" data-view-container="${slug}"><section class="panel" data-panel="${slug}:preview"></section><section class="panel" data-panel="${slug}:edit" hidden><div class="editor-grid">${doc.blocks.map((block) => renderBlockEditor(slug, block)).join('')}</div></section></div><details><summary>Ham Markdown</summary><pre class="raw-markdown" id="raw-${slug}">${escapeHtml(doc.markdown)}</pre></details><div class="save-bar"><button class="save-button" type="button" data-save-doc="${slug}" title="${escapeHtml(doc.name)} dosyasini kaydet">&#x1F4BE; Bu dosyayi kaydet (${escapeHtml(doc.name)})</button><span class="save-status info" data-save-status="${slug}">Henuz kaydedilmedi</span></div></div></details>`;
    }

    function renderNav() {
      document.getElementById('navList').innerHTML = documents.map((doc) => `<li class="nav-item" data-nav="${docSlug(doc)}"><a class="nav-link" href="#${docSlug(doc)}">${escapeHtml(doc.name)}<small>${doc.blocks.filter((block) => block.type === 'mermaid' || block.type === 'plantuml').length} diyagram</small></a></li>`).join('');
    }

    function mount() {
      document.getElementById('documents').innerHTML = documents.map(renderDocument).join('');
    }

    function syncDecisionUI(slug) {
      const selected = docDecision(slug);
      document.querySelectorAll(`[data-doc="${slug}"][data-decision]`).forEach((input) => {
        const active = input.dataset.decision === selected;
        input.checked = active;
        input.closest('[data-card]')?.classList.toggle('active', active);
      });
    }

    function applyView(slug) {
      const view = docView(slug);
      const container = document.querySelector(`[data-view-container="${slug}"]`);
      if (container) {
        container.classList.toggle('split', view === 'split');
      }
      document.querySelector(`[data-panel="${slug}:preview"]`).hidden = view === 'edit'; // hidden if edit only
      document.querySelector(`[data-panel="${slug}:edit"]`).hidden = view === 'preview'; // hidden if preview only
      document.querySelectorAll(`[data-view^="${slug}:"]`).forEach((button) => button.classList.toggle('active', button.dataset.view.endsWith(`:${view}`)));
    }

    function updateProgress() {
      let made = 0;
      documents.forEach(doc => { if (docDecision(docSlug(doc))) made++; });
      const total = documents.length;
      const pct = total === 0 ? 0 : Math.round((made / total) * 100);
      document.getElementById('progressText').textContent = pct + '% (' + made + '/' + total + ')';
      document.getElementById('progressFill').style.width = pct + '%';
    }

    function updateStatus(slug) {
      const value = docDecision(slug);
      const status = document.querySelector(`[data-status="${slug}"]`);
      const labels = { '': 'Karar yok', keep: 'Kalsin', revise: 'Revize', discuss: 'Tartisilacak', remove: 'Export disi' };
      status.className = `pill${value ? ` ${value}` : ''}`;
      status.textContent = labels[value] || value;
      const disabled = value === 'remove';
      document.querySelector(`[data-export-doc="${slug}"]`).disabled = disabled;
      document.querySelector(`[data-copy-clean="${slug}"]`).disabled = disabled;
    }

    function serializeList(text, indent, marker) {
      const lines = norm(text).split('\n');
      const spaces = ' '.repeat((indent || 0) * 2);
      const prefix = `${spaces}${marker} `;
      const rest = `${spaces}${' '.repeat(marker.length + 1)}`;
      return lines.map((line, index) => `${index === 0 ? prefix : rest}${line}`);
    }

    function linesForBlock(slug, block, ordered) {
      const value = blockValue(slug, block);
      if (block.type === 'heading') { ordered.counts = []; return [`${'#'.repeat(block.level || 1)} ${norm(value).trimEnd()}`]; }
      if (block.type === 'paragraph') { ordered.counts = []; return norm(value).split('\n'); }
      if (block.type === 'blockquote') { ordered.counts = []; return norm(value).split('\n').map((line) => line ? `> ${line}` : '>'); }
      if (block.type === 'table') { ordered.counts = []; return norm(value).split('\n'); }
      if (block.type === 'code') { ordered.counts = []; return [`\`\`\`${block.language || ''}`, ...norm(value).split('\n'), '```']; }
      if (block.type === 'mermaid') { ordered.counts = []; return ['```mermaid', ...norm(value).split('\n'), '```']; }
      if (block.type === 'plantuml') { ordered.counts = []; return ['```plantuml', ...norm(value).split('\n'), '```']; }
      if (block.type === 'blank-line') { ordered.counts = []; return new Array(Math.max(block.count || 1, 1)).fill(''); }
      const indent = block.indent || 0;
      ordered.counts = ordered.counts.slice(0, indent + 1);
      let marker = block.marker || '-';
      if (block.ordered) {
        ordered.counts[indent] = (ordered.counts[indent] || 0) + 1;
        marker = `${ordered.counts[indent]}.`;
      } else {
        ordered.counts = ordered.counts.slice(0, indent);
      }
      return serializeList(value, indent, marker);
    }

    function collapse(lines) {
      const out = [];
      let blank = 0;
      lines.forEach((line) => {
        if (!line.trim()) {
          blank += 1;
          if (blank <= 1) out.push('');
        } else {
          blank = 0;
          out.push(line.replace(/\s+$/g, ''));
        }
      });
      while (out.length && !out[0].trim()) out.shift();
      while (out.length && !out[out.length - 1].trim()) out.pop();
      return out;
    }

    function buildMarkdown(doc) {
      const slug = docSlug(doc);
      if (docDecision(slug) === 'remove') return null;
      const lines = [];
      const ordered = { counts: [] };
      let skipLevel = null;
      for (const block of doc.blocks) {
        if (skipLevel !== null && block.type === 'heading' && (block.level || 7) <= skipLevel) skipLevel = null;
        if (skipLevel !== null) continue;
        if (block.type === 'heading' && !blockIncluded(slug, block)) { skipLevel = block.level || 6; ordered.counts = []; continue; }
        if (block.type === 'list-item' && !blockIncluded(slug, block)) continue;
        lines.push(...linesForBlock(slug, block, ordered));
      }
      return collapse(lines).join('\n');
    }

    function renderTable(lines, start) {
      const header = splitTableRow(lines[start]).map((cell) => `<th>${parseInline(cell)}</th>`).join('');
      const rows = [];
      let cursor = start + 2;
      while (cursor < lines.length && /^\s*\|.*\|\s*$/.test(lines[cursor])) {
        rows.push(`<tr>${splitTableRow(lines[cursor]).map((cell) => `<td>${parseInline(cell)}</td>`).join('')}</tr>`);
        cursor += 1;
      }
      return { html: `<table><thead><tr>${header}</tr></thead><tbody>${rows.join('')}</tbody></table>`, next: cursor };
    }

    function previewCode(lang, code, slug, index) {
      const id = `${slug}-preview-${index}-source`;
      if ((lang || '').trim().toLowerCase() === 'mermaid') {
        const target = `${slug}-preview-${index}-target`;
        return `<section class="mermaid-block"><div class="block-head"><strong>Mermaid</strong><button class="copy-button" type="button" data-copy-code="${id}">Kodu kopyala</button></div><pre class="code-surface" id="${id}">${escapeHtml(code)}</pre><div class="mermaid-preview" data-mermaid="${target}" data-source="${id}"></div></section>`;
      }
      const langNorm = (lang || '').trim().toLowerCase();
      if (langNorm === 'plantuml' || langNorm === 'puml') {
        const target = `${slug}-preview-${index}-puml-target`;
        return `<section class="mermaid-block"><div class="block-head"><strong>PlantUML</strong><button class="copy-button" type="button" data-copy-code="${id}">Kodu kopyala</button></div><pre class="code-surface" id="${id}">${escapeHtml(code)}</pre><div class="mermaid-preview" data-plantuml="${target}" data-source="${id}">PlantUML yukleniyor...</div></section>`;
      }
      return `<section class="code-block"><div class="block-head"><strong>${escapeHtml(lang || 'kod')}</strong><button class="copy-button" type="button" data-copy-code="${id}">Kodu kopyala</button></div><pre class="code-surface" id="${id}">${escapeHtml(code)}</pre></section>`;
    }

    function renderPreview(markdown, slug) {
      const lines = norm(markdown).split('\n');
      const parts = [];
      let i = 0;
      let blockIndex = 0;
      while (i < lines.length) {
        const raw = lines[i];
        const line = raw.trimEnd();
        if (!line.trim()) { i += 1; continue; }
        const fence = raw.match(/^```(.*)$/);
        if (fence) {
          const lang = fence[1] || '';
          const code = [];
          i += 1;
          while (i < lines.length && !/^```\s*$/.test(lines[i])) { code.push(lines[i]); i += 1; }
          if (i < lines.length) i += 1;
          parts.push(previewCode(lang, code.join('\n'), slug, blockIndex));
          blockIndex += 1;
          continue;
        }
        if (/^\s*\|.*\|\s*$/.test(raw) && i + 1 < lines.length && /^\s*\|?\s*:?[-]{3,}/.test(lines[i + 1])) {
          const table = renderTable(lines, i);
          parts.push(table.html);
          i = table.next;
          continue;
        }
        const heading = raw.match(/^(#{1,6})\s+(.*)$/);
        if (heading) { const level = Math.min(Math.max(heading[1].length, 1), 6); parts.push(`<div class="heading-${level}"><h${level}>${parseInline(heading[2])}</h${level}></div>`); i += 1; continue; }
        if (/^>\s?/.test(raw)) {
          const quote = [];
          while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, '')); i += 1; }
          parts.push(`<blockquote>${parseInline(quote.join('<br />'))}</blockquote>`);
          continue;
        }
        const list = raw.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (list) {
          const items = [];
          while (i < lines.length) {
            const current = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
            if (!current) break;
            items.push({ indent: Math.min(Math.floor((current[1] || '').length / 2), 6), ordered: /\d+\./.test(current[2]), marker: /\d+\./.test(current[2]) ? current[2] : '', text: current[3] });
            i += 1;
          }
          parts.push(`<ul class="preview-list">${items.map((item) => {
            let innerText = item.text;
            let checkHtml = '';
            const checkMatch = innerText.match(/^\[([ xX])\]\s+(.*)$/);
            if (checkMatch) {
              const isChecked = checkMatch[1].toLowerCase() === 'x';
              checkHtml = `<input type="checkbox" class="preview-task-checkbox" data-task="${escapeHtml(item.text)}" data-doc="${slug}" ${isChecked ? 'checked' : ''} /> `;
              innerText = checkMatch[2];
            }
            return `<li class="preview-item" data-indent="${item.indent}"><div style="display:flex;align-items:flex-start;gap:6px">${item.ordered ? `<span class="ordinal">${escapeHtml(item.marker)}</span>` : ''}${checkHtml}<div style="flex:1">${parseInline(innerText)}</div></div></li>`;
          }).join('')}</ul>`);
          continue;
        }
        const paragraph = [line.trim()];
        i += 1;
        while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s+/.test(lines[i]) && !/^```/.test(lines[i]) && !/^>\s?/.test(lines[i]) && !/^(\s*)([-*+]|\d+\.)\s+/.test(lines[i]) && !(/^\s*\|.*\|\s*$/.test(lines[i]) && i + 1 < lines.length && /^\s*\|?\s*:?[-]{3,}/.test(lines[i + 1]))) { paragraph.push(lines[i].trim()); i += 1; }
        parts.push(`<p>${parseInline(paragraph.join(' '))}</p>`);
      }
      return parts.join('');
    }

    function ensureMermaid() {
      if (window.mermaid && !mermaidReady) {
        window.mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'neutral' });
        mermaidReady = true;
      }
    }

    async function drawMermaid(node, source, token) {
      const text = norm(source).trim();
      if (!text) { node.innerHTML = '<p class="meta">Bos Mermaid kaynagi.</p>'; node.classList.remove('error'); return; }
      ensureMermaid();
      if (!window.mermaid) { node.innerHTML = '<pre class="raw-markdown">Mermaid kutuphanesi yuklenemedi.</pre>'; node.classList.add('error'); return; }
      try {
        const result = await window.mermaid.render(`${token}-${Math.random().toString(36).slice(2)}`, text);
        node.innerHTML = result.svg;
        node.classList.remove('error');
        if (typeof result.bindFunctions === 'function') result.bindFunctions(node);
      } catch (error) {
        node.textContent = `Mermaid hatasi: ${error.message}`;
        node.classList.add('error');
      }
    }

    async function drawPlantUML(node, source) {
      const text = norm(source).trim();
      if (!text) { node.innerHTML = '<p class="meta">Bos PlantUML kaynagi.</p>'; return; }
      try {
        const hex = Array.from(new TextEncoder().encode(text)).map(b => b.toString(16).padStart(2, '0')).join('');
        const url = 'https://www.plantuml.com/plantuml/svg/~h' + hex;
        node.innerHTML = '<img src="' + url + '" alt="PlantUML Diagram" style="max-width:100%;border-radius:8px" onerror="this.parentNode.innerHTML=\'<pre class=raw-markdown>PlantUML render hatasi.</pre>\';this.parentNode.classList.add(\'error\')" />';
        node.classList.remove('error');
      } catch (error) {
        node.textContent = 'PlantUML hatasi: ' + error.message;
        node.classList.add('error');
      }
    }

    function renderDocPreview(slug) {
      const doc = docBySlug(slug);
      const panel = document.querySelector(`[data-panel="${slug}:preview"]`);
      if (!doc || !panel) return;
      const markdown = buildMarkdown(doc);
      if (markdown === null) { panel.innerHTML = '<div class="preview-note">Bu belge export disi olarak isaretli.</div>'; return; }
      if (!markdown.trim()) { panel.innerHTML = '<div class="preview-note">Bu belge icin exportta icerik kalmadi.</div>'; return; }
      panel.innerHTML = `<article class="markdown">${renderPreview(markdown, slug)}</article>`;
      panel.querySelectorAll('[data-mermaid]').forEach((target) => {
        const sourceNode = document.getElementById(target.dataset.source);
        if (sourceNode) drawMermaid(target, sourceNode.textContent || '', target.dataset.mermaid);
      });
      panel.querySelectorAll('[data-plantuml]').forEach((target) => {
        const sourceNode = document.getElementById(target.dataset.source);
        if (sourceNode) drawPlantUML(target, sourceNode.textContent || '');
      });
    }

    function schedulePreview(slug) {
      clearTimeout(timers[slug]);
      timers[slug] = setTimeout(() => renderDocPreview(slug), 160);
    }

    function hydrate() {
      documents.forEach((doc) => {
        const slug = docSlug(doc);
        syncDecisionUI(slug);
        updateStatus(slug);
        applyView(slug);
        doc.blocks.forEach((block) => {
          const input = document.querySelector(`[data-doc="${slug}"][data-edit="${block.id}"]`);
          if (input) input.value = blockValue(slug, block);
          if (toggleable(block)) {
            const include = document.querySelector(`[data-include="${includeKey(slug, block.id)}"]`);
            if (include) include.checked = blockIncluded(slug, block);
          }
        });
        renderDocPreview(slug);
      });
      applySearch();
      document.getElementById('docCount').textContent = String(documents.length);
      document.getElementById('checkedCount').textContent = String(document.querySelectorAll('.documents input[type="checkbox"]:checked').length);
      document.getElementById('diagramCount').textContent = String(documents.reduce((sum, doc) => sum + doc.blocks.filter((block) => block.type === 'mermaid' || block.type === 'plantuml').length, 0));
      updateProgress();
    }

    function applySearch() {
      const q = document.getElementById('searchBox').value.trim().toLowerCase();
      let visible = 0;
      document.querySelectorAll('.document').forEach((doc) => {
        const match = !q || doc.dataset.search.includes(q);
        doc.hidden = !match;
        const nav = document.querySelector(`[data-nav="${doc.id}"]`);
        if (nav) nav.hidden = !match;
        if (match) visible += 1;
      });
      document.getElementById('emptyState').hidden = visible !== 0;
    }

    function flash(button, label) {
      const original = button.dataset.original || button.textContent;
      button.dataset.original = original;
      button.textContent = label;
      setTimeout(() => { button.textContent = original; }, 1400);
    }

    async function copyText(text) {
      if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
      const helper = document.createElement('textarea');
      helper.value = text;
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
      return Promise.resolve();
    }

    function download(name, content, type) {
      const blob = content instanceof Blob ? content : new Blob([content], { type: type || 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1200);
    }

    function summary(doc) {
      const slug = docSlug(doc);
      return {
        decision: docDecision(slug) || 'none',
        markdown: buildMarkdown(doc),
        headings: doc.blocks.filter((block) => block.type === 'heading' && !blockIncluded(slug, block)).length,
        items: doc.blocks.filter((block) => block.type === 'list-item' && !blockIncluded(slug, block)).length
      };
    }

    function meetingSummary() {
      const lines = ['# Toplanti Karar Ozeti', '', `Uretim zamani: ${new Date().toLocaleString('tr-TR')}`, ''];
      const labels = { none: 'Karar yok', keep: 'Bu belge kalsin', revise: 'Revize edilsin', discuss: 'Toplantida tartisilsin', remove: 'Simdilik ciksin' };
      documents.forEach((doc) => {
        const info = summary(doc);
        lines.push(`## ${doc.name}`);
        lines.push(`- Karar: ${labels[info.decision] || info.decision}`);
        lines.push(`- Export: ${info.markdown === null ? 'Haric' : 'Dahil'}`);
        lines.push(`- Temiz dosya: ${cleanName(doc)}`);
        lines.push(`- Gizlenen baslik sayisi: ${info.headings}`);
        lines.push(`- Gizlenen madde sayisi: ${info.items}`);
        lines.push('');
      });
      return lines.join('\n').trim() + '\n';
    }

    async function exportPack() {
      if (!window.JSZip) { window.alert('ZIP kutuphanesi yuklenemedi.'); return; }
      const zip = new window.JSZip();
      let count = 0;
      documents.forEach((doc) => {
        const markdown = buildMarkdown(doc);
        if (markdown === null) return;
        zip.file(cleanName(doc), `${markdown.trim()}\n`);
        count += 1;
      });
      zip.file('meeting-decisions.md', meetingSummary());
      if (!count) { window.alert('Pakete eklenecek belge kalmadi.'); return; }
      download('agentic-ide-clean-markdown.zip', await zip.generateAsync({ type: 'blob' }), 'application/zip');
    }

    function resetSelections() {
      documents.forEach((doc) => {
        const slug = docSlug(doc);
        decisions.forEach((name) => clearStore(decisionKey(slug, name)));
        doc.blocks.forEach((block) => { if (toggleable(block)) clearStore(includeKey(slug, block.id)); });
      });
      hydrate();
    }

    function resetEdits() {
      documents.forEach((doc) => {
        const slug = docSlug(doc);
        doc.blocks.forEach((block) => clearStore(editKey(slug, block.id)));
      });
      mount();
      hydrate();
    }

    async function pickDirectory() {
      if (!window.showDirectoryPicker) { window.alert('Bu tarayici dosya sistemi erisimini desteklemiyor. Lutfen Chrome veya Edge kullanin.'); return; }
      try {
        directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        const indicator = document.getElementById('dirIndicator');
        indicator.textContent = '\u{1F4C2} ' + directoryHandle.name;
        indicator.classList.add('active');
        document.querySelectorAll('.save-button').forEach((btn) => { btn.disabled = false; });
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Dizin secimi hatasi:', err);
      }
    }

    async function saveDocToFile(slug) {
      const doc = docBySlug(slug);
      if (!doc) return;
      const statusEl = document.querySelector(`[data-save-status="${slug}"]`);
      const btnEl = document.querySelector(`[data-save-doc="${slug}"]`);
      if (!directoryHandle) {
        await pickDirectory();
        if (!directoryHandle) return;
      }
      const markdown = buildMarkdown(doc);
      if (markdown === null) {
        statusEl.className = 'save-status err';
        statusEl.textContent = '\u26A0 Belge export disi isaretli, kayit yapilmadi';
        return;
      }
      try {
        btnEl.disabled = true;
        statusEl.className = 'save-status info';
        statusEl.textContent = '\u{23F3} Kaydediliyor...';
        const fileHandle = await directoryHandle.getFileHandle(doc.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(markdown.trim() + '\n');
        await writable.close();
        statusEl.className = 'save-status ok';
        statusEl.textContent = '\u2705 Kaydedildi \u2014 ' + new Date().toLocaleTimeString('tr-TR');
      } catch (err) {
        statusEl.className = 'save-status err';
        statusEl.textContent = '\u274C Hata: ' + err.message;
        console.error('Kayit hatasi:', err);
      } finally {
        btnEl.disabled = false;
      }
    }

    function bindStatic() {
      document.getElementById('expandAll').addEventListener('click', () => document.querySelectorAll('.document').forEach((doc) => { doc.open = true; }));
      document.getElementById('collapseAll').addEventListener('click', () => document.querySelectorAll('.document').forEach((doc) => { doc.open = false; }));
      document.getElementById('clearSelections').addEventListener('click', resetSelections);
      document.getElementById('resetEdits').addEventListener('click', resetEdits);
      document.getElementById('exportSummary').addEventListener('click', () => download('meeting-decisions.md', meetingSummary(), 'text/markdown;charset=utf-8'));
      document.getElementById('exportPack').addEventListener('click', exportPack);
      document.getElementById('searchBox').addEventListener('input', applySearch);
      document.getElementById('pickDirectory').addEventListener('click', pickDirectory);
      
      const apiKeyKey = storagePrefix + 'gemini-key';
      const keyInput = document.getElementById('geminiApiKey');
      if (keyInput) {
         keyInput.value = localStorage.getItem(apiKeyKey) || '';
         keyInput.addEventListener('change', (e) => localStorage.setItem(apiKeyKey, e.target.value));
      }
      
      document.getElementById('themeToggle').addEventListener('click', (e) => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
          document.documentElement.removeAttribute('data-theme');
          localStorage.setItem(themeKey, 'light');
          e.target.textContent = '< Koyu Tema';
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem(themeKey, 'dark');
          e.target.textContent = '  Acik Tema';
        }
      });
    }

    let currentAiTarget = null;
    
    async function callGemini(instruction, target) {
       const apiKey = document.getElementById('geminiApiKey').value.trim();
       if (!apiKey) { window.alert('Lutfen once Gemini API Key giriniz.'); return; }
       const textarea = document.querySelector(`textarea[data-doc="${target.slug}"][data-edit="${target.blockId}"]`);
       if (!textarea) return;
       const originalText = textarea.value;
       
       target.btn.classList.add('ai-loading');
       target.btn.innerHTML = '&#x23F3; AI';
       try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                contents: [{ parts: [{ text: `A_a1daki Markdown metnini _u talimata g�re dei_tir ve YALNIZCA dei_tirilmi_ metni d�n. Ekstra a�1klama veya markdown backtick'leri ekleme:\n\nTalimat: ${instruction}\n\nMetin:\n${originalText}` }] }],
                tools: [{ googleSearch: {} }]
             })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error.message);
          let newText = data.candidates[0].content.parts[0].text.trim();
          newText = newText.replace(/^```markdown\n?/, '').replace(/\n?```$/, '');
          textarea.value = newText;
          setStore(editKey(target.slug, target.blockId), newText);
          schedulePreview(target.slug);
          if (textarea.classList.contains('hidden-table-editor')) {
             mount(); hydrate(); applyView(target.slug);
          }
       } catch (err) {
          window.alert('Gemini Hatasi: ' + err.message);
       } finally {
          target.btn.classList.remove('ai-loading');
          target.btn.innerHTML = '&#x2728; AI';
       }
    }

    function bindDelegated() {
      document.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.matches('.preview-task-checkbox')) {
          const slug = target.dataset.doc;
          const oldText = target.dataset.task;
          const isChecked = target.checked;
          const newText = isChecked ? oldText.replace(/^\[ \]/, '[x]') : oldText.replace(/^\[[xX]\]/, '[ ]');
          const textareas = Array.from(document.querySelectorAll(`textarea[data-doc="${slug}"]`));
          const textarea = textareas.find(ta => ta.value === oldText);
          if (textarea) {
            textarea.value = newText;
            setStore(editKey(slug, textarea.dataset.edit), newText);
            schedulePreview(slug);
          }
          return;
        }
        if (target.matches('[data-doc][data-decision]')) {
          const slug = target.dataset.doc;
          const decision = target.dataset.decision || '';
          decisions.forEach((name) => name === decision && target.checked ? setStore(decisionKey(slug, name), '1') : clearStore(decisionKey(slug, name)));
          syncDecisionUI(slug);
          updateStatus(slug);
          renderDocPreview(slug);
          hydrate();
          return;
        }
        if (target.matches('[data-include]')) {
          const name = target.dataset.include;
          const slug = name ? name.split(':')[0] : '';
          if (!name || !slug) return;
          setStore(name, target.checked ? '1' : '0');
          schedulePreview(slug);
          hydrate();
        }
      });

      document.addEventListener('input', (event) => {
        const target = event.target;
        if (target.matches('.table-cell-input')) {
          const blockId = target.closest('.visual-table-editor').dataset.tableEdit;
          const textarea = target.closest('.editor-block').querySelector(`textarea[data-edit="${blockId}"]`);
          if (textarea) {
            const editorContainer = target.closest('.visual-table-editor');
            const rows = Array.from(editorContainer.querySelectorAll('.table-row-editor'));
            let markdownRows = [];
            rows.forEach((rowEl, rowIndex) => {
                const inputs = Array.from(rowEl.querySelectorAll('.table-cell-input'));
                const values = inputs.map(inp => inp.value || ' ');
                markdownRows.push('| ' + values.join(' | ') + ' |');
                if (rowIndex === 0) {
                    const separators = values.map(() => '---');
                    markdownRows.push('| ' + separators.join(' | ') + ' |');
                }
            });
            const newMarkdown = markdownRows.join('\n');
            textarea.value = newMarkdown;
            setStore(editKey(textarea.dataset.doc, blockId), newMarkdown);
            schedulePreview(textarea.dataset.doc);
          }
          return;
        }
        if (!(target instanceof HTMLTextAreaElement) || !target.matches('[data-doc][data-edit]')) return;
        setStore(editKey(target.dataset.doc, target.dataset.edit), target.value);
        schedulePreview(target.dataset.doc);
      });

      document.addEventListener('click', async (event) => {
        const aiBtn = event.target.closest('.ai-btn');
        if (aiBtn) {
           currentAiTarget = { blockId: aiBtn.dataset.aiBlock, slug: aiBtn.dataset.aiDoc, btn: aiBtn };
           const rect = aiBtn.getBoundingClientRect();
           const popup = document.getElementById('aiPopup');
           popup.style.top = (window.scrollY + rect.bottom + 8) + 'px';
           popup.style.left = Math.min(window.scrollX + rect.left, document.body.clientWidth - 280) + 'px';
           popup.hidden = false;
           return;
        }
        if (event.target.closest('.close-ai')) {
           document.getElementById('aiPopup').hidden = true;
           return;
        }
        if (event.target.closest('.ai-prompt-btn') || event.target.id === 'aiCustomSubmit') {
           const popup = document.getElementById('aiPopup');
           const promptMsg = event.target.id === 'aiCustomSubmit' ? document.getElementById('aiCustomPrompt').value : event.target.dataset.prompt;
           if (!promptMsg || !currentAiTarget) return;
           popup.hidden = true;
           callGemini(promptMsg, currentAiTarget);
           return;
        }

        const button = event.target instanceof HTMLElement ? event.target.closest('button') : null;
        if (!button) return;
        if (button.dataset.tableAction) {
           const blockId = button.dataset.block;
           const editorContainer = document.querySelector(`.visual-table-editor[data-table-edit="${blockId}"]`);
           const rows = Array.from(editorContainer.querySelectorAll('.table-row-editor'));
           if (button.dataset.tableAction === 'add-row') {
               const cols = rows[0].querySelectorAll('.table-cell-input').length;
               const newRow = document.createElement('div');
               newRow.className = 'table-row-editor';
               const rowIndex = rows.length + 1;
               let html = '';
               for (let i=0; i<cols; i++) { html += `<input type="text" class="table-cell-input" data-row="${rowIndex}" data-col="${i}" value="" />`; }
               newRow.innerHTML = html;
               editorContainer.appendChild(newRow);
           } else if (button.dataset.tableAction === 'add-col') {
               rows.forEach((rowEl) => {
                   const inputs = rowEl.querySelectorAll('.table-cell-input');
                   const colIndex = inputs.length;
                   const rowIndex = inputs[0].dataset.row;
                   const isHeader = rowEl.querySelector('.header') !== null;
                   const newCol = document.createElement('input');
                   newCol.type = 'text';
                   newCol.className = `table-cell-input ${isHeader ? 'header' : ''}`;
                   newCol.dataset.row = rowIndex;
                   newCol.dataset.col = colIndex;
                   newCol.value = '';
                   rowEl.appendChild(newCol);
               });
           }
           const firstInput = editorContainer.querySelector('.table-cell-input');
           if (firstInput) firstInput.dispatchEvent(new Event('input', { bubbles: true }));
           return;
        }
        if (button.dataset.view) {
          const [slug, view] = button.dataset.view.split(':');
          setStore(viewKey(slug), view);
          applyView(slug);
          return;
        }
        if (button.dataset.copyRaw) {
          const raw = document.getElementById(`raw-${button.dataset.copyRaw}`);
          if (!raw) return;
          await copyText(raw.textContent || '');
          flash(button, 'Kopyalandi');
          return;
        }
        if (button.dataset.copyCode) {
          const node = document.getElementById(button.dataset.copyCode);
          if (!node) return;
          await copyText(node.textContent || '');
          flash(button, 'Kopyalandi');
          return;
        }
        if (button.dataset.copyClean) {
          const doc = docBySlug(button.dataset.copyClean);
          if (!doc) return;
          const markdown = buildMarkdown(doc);
          if (markdown === null) { window.alert('Bu belge export disi olarak isaretlenmis.'); return; }
          await copyText(markdown);
          flash(button, 'Kopyalandi');
          return;
        }
        if (button.dataset.exportDoc) {
          const doc = docBySlug(button.dataset.exportDoc);
          if (!doc) return;
          const markdown = buildMarkdown(doc);
          if (markdown === null) { window.alert('Bu belge export disi olarak isaretlenmis.'); return; }
          download(cleanName(doc), `${markdown.trim()}\n`, 'text/markdown;charset=utf-8');
        }
        if (button.dataset.saveDoc) {
          await saveDocToFile(button.dataset.saveDoc);
        }
      });
    }

    mount();
    renderNav();
    bindStatic();
    bindDelegated();
    hydrate();
  </script>
</body>
</html>
'@

$html = $template.Replace('__DOCUMENTS_JSON__', $documentsJson).Replace('__GENERATED_AT__', $generatedAt)
Set-Content -Path $OutputPath -Value $html -Encoding UTF8

$rootMirrorPath = Join-Path (Split-Path -Parent $scriptDirectory) 'advisor-meeting-board.html'
if ([System.IO.Path]::GetFullPath($OutputPath) -eq [System.IO.Path]::GetFullPath($defaultOutputPath) -and (Test-Path -LiteralPath $rootMirrorPath)) {
  Set-Content -Path $rootMirrorPath -Value $html -Encoding UTF8
}

Write-Output "Generated $OutputPath"

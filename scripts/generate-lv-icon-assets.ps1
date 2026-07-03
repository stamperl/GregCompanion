Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$resourceOut = Join-Path $root 'public/game-icons/resources'
$machineOut = Join-Path $root 'public/game-icons/machines'

function Icon-Path($kind, $id) {
  Join-Path $root "public/game-icons/$kind/$id.png"
}

function New-Color($hex) {
  [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function Lerp($a, $b, $t) {
  [int][Math]::Round($a + (($b - $a) * $t))
}

function Lerp-Color($left, $right, $t, $alpha) {
  [System.Drawing.Color]::FromArgb(
    $alpha,
    (Lerp $left.R $right.R $t),
    (Lerp $left.G $right.G $t),
    (Lerp $left.B $right.B $t)
  )
}

function Palette-Color($luma, $darkHex, $midHex, $lightHex, $alpha) {
  $dark = New-Color $darkHex
  $mid = New-Color $midHex
  $light = New-Color $lightHex
  $t = [Math]::Max(0, [Math]::Min(1, $luma / 255.0))
  if ($t -lt 0.5) {
    return Lerp-Color $dark $mid ($t * 2.0) $alpha
  }
  return Lerp-Color $mid $light (($t - 0.5) * 2.0) $alpha
}

function Get-Luma($color) {
  (0.2126 * $color.R) + (0.7152 * $color.G) + (0.0722 * $color.B)
}

function Get-Saturation($color) {
  $max = [Math]::Max($color.R, [Math]::Max($color.G, $color.B))
  $min = [Math]::Min($color.R, [Math]::Min($color.G, $color.B))
  if ($max -eq 0) { return 0 }
  return ($max - $min) / $max
}

function Copy-Bitmap($path) {
  $source = [System.Drawing.Image]::FromFile($path)
  $bitmap = New-Object System.Drawing.Bitmap $source.Width, $source.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  $graphics.DrawImage($source, 0, 0, $source.Width, $source.Height)
  $graphics.Dispose()
  $source.Dispose()
  return $bitmap
}

function Save-Bitmap($bitmap, $path) {
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

function Recolor-Material($sourcePath, $outPath, $darkHex, $midHex, $lightHex) {
  $bitmap = Copy-Bitmap $sourcePath
  for ($y = 0; $y -lt $bitmap.Height; $y++) {
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
      $color = $bitmap.GetPixel($x, $y)
      if ($color.A -eq 0) { continue }
      $luma = Get-Luma $color
      if ($luma -lt 34) {
        $bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($color.A, 8, 10, 12))
      } else {
        $bitmap.SetPixel($x, $y, (Palette-Color $luma $darkHex $midHex $lightHex $color.A))
      }
    }
  }
  Save-Bitmap $bitmap $outPath
}

function Recolor-Accent($sourcePath, $outPath, $darkHex, $midHex, $lightHex, $minimumSaturation = 0.12) {
  $bitmap = Copy-Bitmap $sourcePath
  for ($y = 0; $y -lt $bitmap.Height; $y++) {
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
      $color = $bitmap.GetPixel($x, $y)
      if ($color.A -eq 0) { continue }
      $sat = Get-Saturation $color
      $luma = Get-Luma $color
      if ($sat -ge $minimumSaturation -and $luma -gt 36) {
        $bitmap.SetPixel($x, $y, (Palette-Color $luma $darkHex $midHex $lightHex $color.A))
      }
    }
  }
  Save-Bitmap $bitmap $outPath
}

function Open-Overlay($basePath) {
  $bitmap = Copy-Bitmap $basePath
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Finish-Overlay($canvas, $outPath) {
  $canvas.Graphics.Dispose()
  Save-Bitmap $canvas.Bitmap $outPath
}

function Brush($hex) {
  New-Object System.Drawing.SolidBrush (New-Color $hex)
}

function Pen($hex, $width = 4) {
  $pen = New-Object System.Drawing.Pen (New-Color $hex), $width
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Miter
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Square
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Square
  return $pen
}

function Points([int[]]$values) {
  $points = @()
  for ($i = 0; $i -lt $values.Count; $i += 2) {
    $points += New-Object System.Drawing.Point $values[$i], $values[$i + 1]
  }
  [System.Drawing.Point[]]$points
}

function Fill-Polygon($g, $hex, [int[]]$values) {
  $brush = Brush $hex
  $g.FillPolygon($brush, (Points $values))
  $brush.Dispose()
}

function Draw-Line($g, $hex, $width, [int[]]$values) {
  $pen = Pen $hex $width
  $g.DrawLines($pen, (Points $values))
  $pen.Dispose()
}

function Fill-Rect($g, $hex, $x, $y, $w, $h) {
  $brush = Brush $hex
  $g.FillRectangle($brush, $x, $y, $w, $h)
  $brush.Dispose()
}

function Fill-Ellipse($g, $hex, $x, $y, $w, $h) {
  $brush = Brush $hex
  $g.FillEllipse($brush, $x, $y, $w, $h)
  $brush.Dispose()
}

function Add-Lightning($g, $x = 58, $y = 42) {
  Draw-Line $g '#11151b' 9 @($x, $y, ($x - 10), ($y + 24), ($x + 3), ($y + 22), ($x - 8), ($y + 50))
  Draw-Line $g '#79d4ff' 5 @($x, $y, ($x - 10), ($y + 24), ($x + 3), ($y + 22), ($x - 8), ($y + 50))
  Draw-Line $g '#f8ffff' 2 @(($x - 1), ($y + 3), ($x - 7), ($y + 21), ($x + 1), ($y + 21))
}

function Add-Fluid-Drop($g, $x, $y, $mainHex, $lightHex) {
  Fill-Polygon $g '#121416' @($x, $y, ($x + 16), ($y + 22), ($x + 8), ($y + 38), ($x - 8), ($y + 22))
  Fill-Polygon $g $mainHex @(($x + 1), ($y + 7), ($x + 11), ($y + 23), ($x + 7), ($y + 31), ($x - 5), ($y + 22))
  Fill-Polygon $g $lightHex @(($x + 1), ($y + 10), ($x + 5), ($y + 19), ($x - 1), ($y + 20))
}

function Add-Bent-Plate($g) {
  Fill-Polygon $g '#14181d' @(36, 82, 56, 92, 86, 74, 92, 82, 58, 104, 32, 90)
  Fill-Polygon $g '#c5d2d6' @(40, 82, 56, 89, 84, 72, 88, 78, 58, 96, 36, 88)
  Draw-Line $g '#eef9fb' 3 @(44, 82, 57, 87, 78, 74)
}

function Add-Rod($g) {
  Draw-Line $g '#0f1216' 12 @(42, 82, 92, 54)
  Draw-Line $g '#aab9bd' 8 @(42, 82, 92, 54)
  Draw-Line $g '#f1fbfb' 3 @(48, 78, 86, 57)
}

function Add-Circuit($g) {
  Fill-Polygon $g '#111317' @(38, 54, 84, 42, 98, 78, 50, 92)
  Fill-Polygon $g '#49753e' @(42, 56, 82, 46, 92, 76, 52, 86)
  Draw-Line $g '#d49748' 3 @(50, 66, 64, 62, 78, 72)
  Fill-Rect $g '#d8c78e' 54 58 7 6
  Fill-Rect $g '#d8c78e' 76 68 7 6
  Fill-Rect $g '#202226' 62 68 12 10
}

function Add-Rotor($g) {
  Fill-Ellipse $g '#101318' 46 42 42 42
  Fill-Ellipse $g '#7bc4d8' 52 48 30 30
  Fill-Ellipse $g '#1e3038' 60 56 14 14
  Draw-Line $g '#e7ffff' 4 @(67, 49, 76, 65, 58, 65, 67, 49)
}

function Add-Arc($g) {
  Draw-Line $g '#11151b' 8 @(32, 56, 48, 50, 58, 62, 74, 46, 94, 58)
  Draw-Line $g '#7de8ff' 4 @(32, 56, 48, 50, 58, 62, 74, 46, 94, 58)
  Draw-Line $g '#f7ffff' 2 @(36, 55, 48, 52, 57, 62)
}

New-Item -ItemType Directory -Force -Path $resourceOut | Out-Null
New-Item -ItemType Directory -Force -Path $machineOut | Out-Null

Recolor-Accent (Icon-Path 'resources' 'copperOre') (Icon-Path 'resources' 'nickelOre') '#36554f' '#7fa895' '#cde4da' 0.12
Recolor-Accent (Icon-Path 'resources' 'copperOre') (Icon-Path 'resources' 'bauxiteOre') '#672d24' '#b35b43' '#efa06b' 0.12
Recolor-Accent (Icon-Path 'resources' 'crushedCopperOre') (Icon-Path 'resources' 'crushedBauxiteOre') '#693027' '#b96349' '#ed9c67' 0.10
Recolor-Material (Icon-Path 'resources' 'tinDust') (Icon-Path 'resources' 'nickelDust') '#3f5c54' '#83aa98' '#d4e9df'
Recolor-Material (Icon-Path 'resources' 'copperDust') (Icon-Path 'resources' 'bauxiteDust') '#6e342b' '#b35b43' '#ee9e69'
Recolor-Material (Icon-Path 'resources' 'tinDust') (Icon-Path 'resources' 'aluminiumDust') '#708089' '#c0ced2' '#f5fbfb'
Recolor-Material (Icon-Path 'resources' 'tinIngot') (Icon-Path 'resources' 'nickelIngot') '#3e5b54' '#89ad9c' '#d7ece2'
Recolor-Material (Icon-Path 'resources' 'bronzeIngot') (Icon-Path 'resources' 'cupronickelIngot') '#73402e' '#c28455' '#f3c282'
Recolor-Material (Icon-Path 'resources' 'ironIngot') (Icon-Path 'resources' 'aluminiumIngot') '#6f7c84' '#c7d4d8' '#f7ffff'
Recolor-Material (Icon-Path 'resources' 'ironPlate') (Icon-Path 'resources' 'aluminiumPlate') '#64737b' '#bdcbd0' '#f6ffff'
Recolor-Material (Icon-Path 'resources' 'redAlloyWire') (Icon-Path 'resources' 'heatingCoil') '#5d1f19' '#c94d30' '#ffb15f'
Recolor-Material (Icon-Path 'resources' 'bbfCasing') (Icon-Path 'resources' 'heatProofCasing') '#35251e' '#8e6145' '#d6b384'

Copy-Item -LiteralPath (Icon-Path 'machines' 'steamBoiler') -Destination (Icon-Path 'machines' 'liquidSteamBoiler') -Force
$canvas = Open-Overlay (Icon-Path 'machines' 'liquidSteamBoiler')
Add-Fluid-Drop $canvas.Graphics 66 48 '#b06a28' '#ffd27a'
Finish-Overlay $canvas (Icon-Path 'machines' 'liquidSteamBoiler')

Copy-Item -LiteralPath (Icon-Path 'machines' 'steamCompressor') -Destination (Icon-Path 'machines' 'lvBender') -Force
$canvas = Open-Overlay (Icon-Path 'machines' 'lvBender')
Add-Bent-Plate $canvas.Graphics
Finish-Overlay $canvas (Icon-Path 'machines' 'lvBender')

Copy-Item -LiteralPath (Icon-Path 'machines' 'lvWiremill') -Destination (Icon-Path 'machines' 'lvLathe') -Force
$canvas = Open-Overlay (Icon-Path 'machines' 'lvLathe')
Add-Rod $canvas.Graphics
Finish-Overlay $canvas (Icon-Path 'machines' 'lvLathe')

Copy-Item -LiteralPath (Icon-Path 'machines' 'steamExtractor') -Destination (Icon-Path 'machines' 'lvElectrolyzer') -Force
$canvas = Open-Overlay (Icon-Path 'machines' 'lvElectrolyzer')
Add-Lightning $canvas.Graphics 70 36
Add-Fluid-Drop $canvas.Graphics 50 44 '#4ba6cf' '#ddffff'
Finish-Overlay $canvas (Icon-Path 'machines' 'lvElectrolyzer')

Copy-Item -LiteralPath (Icon-Path 'machines' 'steamAlloySmelter') -Destination (Icon-Path 'machines' 'lvAssembler') -Force
$canvas = Open-Overlay (Icon-Path 'machines' 'lvAssembler')
Add-Circuit $canvas.Graphics
Finish-Overlay $canvas (Icon-Path 'machines' 'lvAssembler')

Copy-Item -LiteralPath (Icon-Path 'machines' 'steamMacerator') -Destination (Icon-Path 'machines' 'lvCentrifuge') -Force
$canvas = Open-Overlay (Icon-Path 'machines' 'lvCentrifuge')
Add-Rotor $canvas.Graphics
Finish-Overlay $canvas (Icon-Path 'machines' 'lvCentrifuge')

Copy-Item -LiteralPath (Icon-Path 'machines' 'steamTank') -Destination (Icon-Path 'machines' 'lvBatteryBuffer') -Force
$canvas = Open-Overlay (Icon-Path 'machines' 'lvBatteryBuffer')
Add-Lightning $canvas.Graphics 66 38
Fill-Rect $canvas.Graphics '#8fe6ff' 88 46 8 30
Fill-Rect $canvas.Graphics '#f8ffff' 90 48 4 8
Finish-Overlay $canvas (Icon-Path 'machines' 'lvBatteryBuffer')

Copy-Item -LiteralPath (Icon-Path 'machines' 'brickedBlastFurnacePart') -Destination (Icon-Path 'machines' 'brickedBlastFurnace') -Force

Copy-Item -LiteralPath (Icon-Path 'machines' 'brickedBlastFurnacePart') -Destination (Icon-Path 'machines' 'arcBlastFurnacePart') -Force
$canvas = Open-Overlay (Icon-Path 'machines' 'arcBlastFurnacePart')
Fill-Rect $canvas.Graphics '#89dfff' 38 88 8 10
Fill-Rect $canvas.Graphics '#f8ffff' 40 88 3 5
Finish-Overlay $canvas (Icon-Path 'machines' 'arcBlastFurnacePart')

Copy-Item -LiteralPath (Icon-Path 'machines' 'brickedBlastFurnace') -Destination (Icon-Path 'machines' 'arcBlastFurnace') -Force
$canvas = Open-Overlay (Icon-Path 'machines' 'arcBlastFurnace')
Add-Arc $canvas.Graphics
Add-Lightning $canvas.Graphics 82 34
Finish-Overlay $canvas (Icon-Path 'machines' 'arcBlastFurnace')

Write-Output "Generated LV icon assets from upgraded icon sources."

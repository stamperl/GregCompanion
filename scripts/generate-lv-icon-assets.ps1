Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$resourceOut = Join-Path $root 'public/game-icons/resources'
$machineOut = Join-Path $root 'public/game-icons/machines'

New-Item -ItemType Directory -Force -Path $resourceOut | Out-Null
New-Item -ItemType Directory -Force -Path $machineOut | Out-Null

function New-Canvas {
  $bitmap = New-Object System.Drawing.Bitmap 128, 128, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function New-Color($hex) {
  return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function Brush($hex) {
  return New-Object System.Drawing.SolidBrush (New-Color $hex)
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
  return [System.Drawing.Point[]]$points
}

function Save-Icon($canvas, $path) {
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Bitmap.Dispose()
}

function Draw-Rect($g, $hex, $x, $y, $w, $h) {
  $b = Brush $hex
  $g.FillRectangle($b, $x, $y, $w, $h)
  $b.Dispose()
}

function Draw-Poly($g, $hex, [int[]]$values) {
  $b = Brush $hex
  $g.FillPolygon($b, (Points $values))
  $b.Dispose()
}

function Draw-PolyLine($g, $hex, $width, [int[]]$values) {
  $p = Pen $hex $width
  $g.DrawLines($p, (Points $values))
  $p.Dispose()
}

function New-OreIcon($path, $ore, $oreDark) {
  $c = New-Canvas
  $g = $c.Graphics
  Draw-Poly $g '#202329' @(24, 28, 82, 16, 110, 44, 96, 92, 46, 110, 16, 76)
  Draw-Poly $g '#5d6268' @(30, 34, 80, 24, 100, 46, 88, 84, 48, 100, 24, 72)
  Draw-Poly $g '#838a90' @(34, 38, 76, 30, 92, 48, 82, 76, 50, 90, 30, 70)
  Draw-Poly $g '#3b3f45' @(24, 72, 48, 100, 88, 84, 96, 92, 46, 110, 16, 76)
  Draw-Rect $g $ore 46 36 14 10
  Draw-Rect $g $oreDark 60 42 10 8
  Draw-Rect $g $ore 78 56 16 12
  Draw-Rect $g $oreDark 34 66 16 10
  Draw-Rect $g $ore 56 80 18 10
  Draw-Rect $g '#d7dde1' 38 38 14 6
  Save-Icon $c $path
}

function New-DustIcon($path, $main, $mid, $light) {
  $c = New-Canvas
  $g = $c.Graphics
  Draw-Poly $g '#25282d' @(26, 92, 38, 68, 62, 54, 88, 64, 106, 92)
  Draw-Poly $g $main @(34, 86, 44, 68, 64, 60, 86, 68, 98, 86)
  Draw-Poly $g $mid @(26, 92, 38, 80, 66, 74, 94, 82, 106, 92)
  Draw-Rect $g $light 48 66 12 6
  Draw-Rect $g $light 76 72 10 6
  Draw-Rect $g '#ffffff' 58 58 6 4
  Draw-Rect $g $main 30 96 16 8
  Draw-Rect $g $mid 76 96 18 8
  Save-Icon $c $path
}

function New-IngotIcon($path, $main, $mid, $light, $dark) {
  $c = New-Canvas
  $g = $c.Graphics
  Draw-Poly $g '#202329' @(24, 48, 82, 34, 108, 58, 96, 84, 38, 96, 16, 70)
  Draw-Poly $g $main @(30, 50, 80, 40, 100, 58, 90, 78, 40, 88, 24, 70)
  Draw-Poly $g $light @(36, 52, 78, 44, 90, 54, 48, 62)
  Draw-Poly $g $mid @(40, 66, 94, 58, 88, 76, 42, 84)
  Draw-Poly $g $dark @(24, 70, 40, 88, 90, 78, 96, 84, 38, 96, 16, 70)
  Save-Icon $c $path
}

function New-PlateIcon($path, $main, $light, $dark) {
  $c = New-Canvas
  $g = $c.Graphics
  Draw-Poly $g '#202329' @(24, 34, 96, 26, 108, 88, 36, 102)
  Draw-Poly $g $main @(32, 40, 90, 34, 100, 82, 42, 94)
  Draw-Poly $g $light @(40, 46, 82, 42, 88, 52, 46, 58)
  Draw-Poly $g $dark @(42, 82, 100, 72, 100, 82, 42, 94)
  Draw-Rect $g '#edf3f2' 50 48 16 5
  Save-Icon $c $path
}

function New-CoilIcon($path) {
  $c = New-Canvas
  $g = $c.Graphics
  Draw-Rect $g '#23252b' 28 30 72 68
  Draw-Rect $g '#353941' 34 36 60 56
  foreach ($x in @(40, 54, 68, 82)) {
    Draw-Rect $g '#26120e' $x 42 8 44
    Draw-Rect $g '#f28d4b' ($x + 2) 44 4 40
  }
  Draw-PolyLine $g '#ffcf68' 6 @(38, 48, 48, 80, 58, 48, 68, 80, 78, 48, 88, 80)
  Draw-Rect $g '#9a4130' 30 58 68 12
  Draw-Rect $g '#ffd68a' 42 56 16 4
  Save-Icon $c $path
}

function New-CasingIcon($path) {
  $c = New-Canvas
  $g = $c.Graphics
  Draw-Rect $g '#1f2228' 24 24 80 80
  Draw-Rect $g '#6f4430' 30 30 68 68
  Draw-Rect $g '#9b6541' 36 36 56 56
  foreach ($y in @(42, 58, 74)) { Draw-Rect $g '#40281e' 34 $y 60 4 }
  Draw-Rect $g '#40281e' 50 34 4 58
  Draw-Rect $g '#40281e' 74 34 4 58
  Draw-Rect $g '#d99755' 42 42 14 10
  Draw-Rect $g '#f2c27b' 62 60 18 10
  Draw-Rect $g '#2a1512' 42 82 40 8
  Save-Icon $c $path
}

function New-ShardsIcon($path) {
  $c = New-Canvas
  $g = $c.Graphics
  Draw-Poly $g '#24262b' @(24, 88, 44, 54, 62, 92)
  Draw-Poly $g '#8e4b3b' @(30, 84, 44, 62, 56, 88)
  Draw-Poly $g '#24262b' @(54, 96, 78, 42, 102, 90)
  Draw-Poly $g '#b7664c' @(62, 88, 78, 54, 94, 84)
  Draw-Poly $g '#24262b' @(38, 98, 74, 72, 108, 100)
  Draw-Poly $g '#d58a5b' @(48, 94, 74, 78, 96, 96)
  Draw-Rect $g '#f0b783' 72 62 10 6
  Save-Icon $c $path
}

function New-MachineBase($g, $main, $side) {
  Draw-Rect $g '#1d2026' 18 20 92 90
  Draw-Rect $g $main 26 28 76 74
  Draw-Rect $g $side 26 82 76 20
  Draw-Rect $g '#d8e5e4' 34 34 24 6
  Draw-Rect $g '#111318' 34 94 60 4
}

function New-BatteryBufferIcon($path) {
  $c = New-Canvas
  $g = $c.Graphics
  New-MachineBase $g '#3f5966' '#26363f'
  foreach ($x in @(34, 56, 78)) {
    Draw-Rect $g '#161b20' $x 44 14 34
    Draw-Rect $g '#83c7df' ($x + 3) 50 8 20
    Draw-Rect $g '#dffffa' ($x + 5) 46 4 4
  }
  Draw-PolyLine $g '#ffd563' 5 @(62, 40, 54, 60, 66, 60, 58, 82)
  Save-Icon $c $path
}

function New-LiquidBoilerIcon($path) {
  $c = New-Canvas
  $g = $c.Graphics
  New-MachineBase $g '#5a4a3d' '#2f2924'
  Draw-Rect $g '#181b20' 42 32 44 62
  Draw-Rect $g '#9b6a35' 48 38 32 46
  Draw-Rect $g '#d49748' 52 42 24 12
  Draw-Rect $g '#6b311f' 52 70 24 10
  Draw-PolyLine $g '#d7f8ff' 5 @(38, 28, 32, 18, 44, 12, 54, 20, 66, 14)
  Draw-Rect $g '#7a4a2a' 84 58 20 10
  Save-Icon $c $path
}

function New-BenderIcon($path) {
  $c = New-Canvas
  $g = $c.Graphics
  New-MachineBase $g '#455c68' '#273640'
  Draw-Rect $g '#171a1f' 36 34 56 14
  Draw-Rect $g '#a7c5ca' 58 48 12 22
  Draw-Rect $g '#171a1f' 34 82 60 10
  Draw-PolyLine $g '#d7a558' 7 @(42, 70, 58, 80, 78, 70, 90, 76)
  Save-Icon $c $path
}

function New-LatheIcon($path) {
  $c = New-Canvas
  $g = $c.Graphics
  New-MachineBase $g '#4f6070' '#2a3640'
  Draw-Rect $g '#171a1f' 34 78 62 10
  Draw-Rect $g '#c0c9ca' 40 54 44 10
  Draw-Rect $g '#272c32' 34 46 16 28
  Draw-Rect $g '#272c32' 82 50 12 22
  Draw-Rect $g '#f0d36e' 54 50 24 6
  Draw-Rect $g '#92e3ed' 62 42 8 8
  Save-Icon $c $path
}

function New-ElectrolyzerIcon($path) {
  $c = New-Canvas
  $g = $c.Graphics
  New-MachineBase $g '#41596a' '#253743'
  Draw-Rect $g '#15191e' 40 34 48 52
  Draw-Rect $g '#5ab7ca' 46 44 36 36
  Draw-Rect $g '#dffcff' 50 48 12 6
  Draw-Rect $g '#282b30' 52 28 6 30
  Draw-Rect $g '#282b30' 70 28 6 30
  Draw-Rect $g '#ffffff' 62 64 6 6
  Draw-Rect $g '#ffffff' 72 54 4 4
  Save-Icon $c $path
}

function New-AssemblerIcon($path) {
  $c = New-Canvas
  $g = $c.Graphics
  New-MachineBase $g '#4c5c58' '#2a3534'
  Draw-Rect $g '#171a1f' 34 78 60 12
  Draw-PolyLine $g '#d6a657' 7 @(42, 44, 58, 56, 72, 46)
  Draw-PolyLine $g '#d6a657' 7 @(84, 44, 70, 58, 58, 50)
  Draw-Rect $g '#94d6d1' 56 58 20 14
  Draw-Rect $g '#ffcf68' 62 40 8 8
  Save-Icon $c $path
}

function New-CentrifugeIcon($path) {
  $c = New-Canvas
  $g = $c.Graphics
  New-MachineBase $g '#575368' '#302f3c'
  Draw-Rect $g '#171a1f' 38 34 52 52
  $b = Brush '#7bb8ca'
  $g.FillEllipse($b, 44, 40, 40, 40)
  $b.Dispose()
  $b = Brush '#28343d'
  $g.FillEllipse($b, 54, 50, 20, 20)
  $b.Dispose()
  Draw-PolyLine $g '#effcff' 5 @(64, 42, 74, 64, 52, 64, 64, 42)
  Save-Icon $c $path
}

function New-ArcPartIcon($path) {
  $c = New-Canvas
  $g = $c.Graphics
  New-CasingIcon $path
}

function New-ArcBlastIcon($path) {
  $c = New-Canvas
  $g = $c.Graphics
  Draw-Rect $g '#181b20' 18 18 92 92
  Draw-Rect $g '#654535' 26 26 76 76
  Draw-Rect $g '#8b6248' 34 34 60 60
  Draw-Rect $g '#16191f' 44 36 40 52
  Draw-Rect $g '#f08c48' 50 46 28 34
  Draw-Rect $g '#ffdc86' 56 54 16 16
  Draw-PolyLine $g '#8df4ff' 5 @(34, 48, 50, 58, 42, 68, 62, 76, 78, 56, 94, 66)
  Draw-Rect $g '#272b31' 50 90 28 8
  Save-Icon $c $path
}

New-OreIcon (Join-Path $resourceOut 'nickelOre.png') '#8fbca2' '#4c7969'
New-OreIcon (Join-Path $resourceOut 'bauxiteOre.png') '#c16c4f' '#7b3f34'
New-ShardsIcon (Join-Path $resourceOut 'crushedBauxiteOre.png')
New-DustIcon (Join-Path $resourceOut 'nickelDust.png') '#739985' '#557565' '#a7d0b8'
New-DustIcon (Join-Path $resourceOut 'bauxiteDust.png') '#a95441' '#7d3f34' '#d98b61'
New-DustIcon (Join-Path $resourceOut 'aluminiumDust.png') '#b9cfd4' '#8ea7ad' '#edf7f7'
New-IngotIcon (Join-Path $resourceOut 'nickelIngot.png') '#8fb09d' '#6d8f80' '#c7dfd4' '#4e665d'
New-IngotIcon (Join-Path $resourceOut 'cupronickelIngot.png') '#c78958' '#9e6344' '#efbd7a' '#6e3d2f'
New-IngotIcon (Join-Path $resourceOut 'aluminiumIngot.png') '#c9d7da' '#a1b3b8' '#f3fbfb' '#72838a'
New-PlateIcon (Join-Path $resourceOut 'aluminiumPlate.png') '#b9c8cc' '#f2fbfb' '#6f7d84'
New-CoilIcon (Join-Path $resourceOut 'heatingCoil.png')
New-CasingIcon (Join-Path $resourceOut 'heatProofCasing.png')

New-BatteryBufferIcon (Join-Path $machineOut 'lvBatteryBuffer.png')
New-LiquidBoilerIcon (Join-Path $machineOut 'liquidSteamBoiler.png')
New-BenderIcon (Join-Path $machineOut 'lvBender.png')
New-LatheIcon (Join-Path $machineOut 'lvLathe.png')
New-ElectrolyzerIcon (Join-Path $machineOut 'lvElectrolyzer.png')
New-AssemblerIcon (Join-Path $machineOut 'lvAssembler.png')
New-CentrifugeIcon (Join-Path $machineOut 'lvCentrifuge.png')
New-CasingIcon (Join-Path $machineOut 'arcBlastFurnacePart.png')
New-ArcBlastIcon (Join-Path $machineOut 'arcBlastFurnace.png')

Write-Output "Generated LV resource icons: 12"
Write-Output "Generated LV machine icons: 9"

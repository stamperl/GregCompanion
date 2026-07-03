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

Add-Type -ReferencedAssemblies 'System.Drawing' -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class SheetIconExporter
{
    private sealed class Component
    {
        public int MinX;
        public int MinY;
        public int MaxX;
        public int MaxY;
        public int Area;
    }

    public static void ExportIcon(string sheetPath, int cols, int rows, int index, string outPath)
    {
        using (var sheet = new Bitmap(sheetPath))
        {
            var col = index % cols;
            var row = index / cols;
            var cellX = (int)Math.Round(col * sheet.Width / (double)cols);
            var cellY = (int)Math.Round(row * sheet.Height / (double)rows);
            var nextX = (int)Math.Round((col + 1) * sheet.Width / (double)cols);
            var nextY = (int)Math.Round((row + 1) * sheet.Height / (double)rows);
            var cellW = nextX - cellX;
            var cellH = nextY - cellY;

            using (var tile = new Bitmap(cellW, cellH, PixelFormat.Format32bppArgb))
            using (var tileGraphics = Graphics.FromImage(tile))
            {
                tileGraphics.DrawImage(sheet, new Rectangle(0, 0, cellW, cellH), new Rectangle(cellX, cellY, cellW, cellH), GraphicsUnit.Pixel);
                RemoveConnectedBackground(tile);
                RemoveSmallComponents(tile);
                SaveTrimmed(tile, outPath);
            }
        }
    }

    private static bool LooksLikeBackground(Color color)
    {
        if (color.A == 0) return true;
        var max = Math.Max(color.R, Math.Max(color.G, color.B));
        var min = Math.Min(color.R, Math.Min(color.G, color.B));
        var luma = 0.2126 * color.R + 0.7152 * color.G + 0.0722 * color.B;
        return max - min < 24 && luma >= 54 && luma <= 142;
    }

    private static void RemoveConnectedBackground(Bitmap bitmap)
    {
        var width = bitmap.Width;
        var height = bitmap.Height;
        var visited = new bool[width, height];
        var queue = new Queue<Point>(width * 2 + height * 2);

        for (var x = 0; x < width; x++)
        {
            queue.Enqueue(new Point(x, 0));
            queue.Enqueue(new Point(x, height - 1));
        }
        for (var y = 0; y < height; y++)
        {
            queue.Enqueue(new Point(0, y));
            queue.Enqueue(new Point(width - 1, y));
        }

        while (queue.Count > 0)
        {
            var point = queue.Dequeue();
            var x = point.X;
            var y = point.Y;
            if (x < 0 || y < 0 || x >= width || y >= height || visited[x, y]) continue;
            visited[x, y] = true;
            if (!LooksLikeBackground(bitmap.GetPixel(x, y))) continue;

            bitmap.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
            queue.Enqueue(new Point(x + 1, y));
            queue.Enqueue(new Point(x - 1, y));
            queue.Enqueue(new Point(x, y + 1));
            queue.Enqueue(new Point(x, y - 1));
        }
    }

    private static void RemoveSmallComponents(Bitmap bitmap)
    {
        var width = bitmap.Width;
        var height = bitmap.Height;
        var visited = new bool[width, height];
        var components = new List<Component>();

        for (var startY = 0; startY < height; startY++)
        {
            for (var startX = 0; startX < width; startX++)
            {
                if (visited[startX, startY] || bitmap.GetPixel(startX, startY).A <= 24) continue;
                var component = new Component { MinX = startX, MinY = startY, MaxX = startX, MaxY = startY };
                var queue = new Queue<Point>();
                queue.Enqueue(new Point(startX, startY));
                visited[startX, startY] = true;

                while (queue.Count > 0)
                {
                    var point = queue.Dequeue();
                    var x = point.X;
                    var y = point.Y;
                    component.Area++;
                    component.MinX = Math.Min(component.MinX, x);
                    component.MinY = Math.Min(component.MinY, y);
                    component.MaxX = Math.Max(component.MaxX, x);
                    component.MaxY = Math.Max(component.MaxY, y);
                    EnqueueAlpha(bitmap, visited, queue, x + 1, y);
                    EnqueueAlpha(bitmap, visited, queue, x - 1, y);
                    EnqueueAlpha(bitmap, visited, queue, x, y + 1);
                    EnqueueAlpha(bitmap, visited, queue, x, y - 1);
                }

                components.Add(component);
            }
        }

        foreach (var component in components)
        {
            var compW = component.MaxX - component.MinX + 1;
            var compH = component.MaxY - component.MinY + 1;
            if (component.Area >= 140 || (compW >= 18 && compH >= 10)) continue;
            for (var y = component.MinY; y <= component.MaxY; y++)
            {
                for (var x = component.MinX; x <= component.MaxX; x++)
                {
                    if (bitmap.GetPixel(x, y).A > 0) bitmap.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                }
            }
        }
    }

    private static void EnqueueAlpha(Bitmap bitmap, bool[,] visited, Queue<Point> queue, int x, int y)
    {
        if (x < 0 || y < 0 || x >= bitmap.Width || y >= bitmap.Height || visited[x, y]) return;
        visited[x, y] = true;
        if (bitmap.GetPixel(x, y).A > 24) queue.Enqueue(new Point(x, y));
    }

    private static void SaveTrimmed(Bitmap tile, string outPath)
    {
        var minX = tile.Width;
        var minY = tile.Height;
        var maxX = -1;
        var maxY = -1;

        for (var y = 0; y < tile.Height; y++)
        {
            for (var x = 0; x < tile.Width; x++)
            {
                if (tile.GetPixel(x, y).A <= 24) continue;
                minX = Math.Min(minX, x);
                minY = Math.Min(minY, y);
                maxX = Math.Max(maxX, x);
                maxY = Math.Max(maxY, y);
            }
        }

        using (var canvas = new Bitmap(128, 128, PixelFormat.Format32bppArgb))
        using (var graphics = Graphics.FromImage(canvas))
        {
            graphics.Clear(Color.FromArgb(0, 0, 0, 0));
            graphics.InterpolationMode = InterpolationMode.NearestNeighbor;
            graphics.PixelOffsetMode = PixelOffsetMode.Half;

            if (maxX >= 0)
            {
                const int pad = 10;
                minX = Math.Max(0, minX - pad);
                minY = Math.Max(0, minY - pad);
                maxX = Math.Min(tile.Width - 1, maxX + pad);
                maxY = Math.Min(tile.Height - 1, maxY + pad);
                var trimW = maxX - minX + 1;
                var trimH = maxY - minY + 1;
                var scale = Math.Min(118 / (double)trimW, 118 / (double)trimH);
                var destW = (int)Math.Round(trimW * scale);
                var destH = (int)Math.Round(trimH * scale);
                var destX = (128 - destW) / 2;
                var destY = (128 - destH) / 2;
                graphics.DrawImage(tile, new Rectangle(destX, destY, destW, destH), new Rectangle(minX, minY, trimW, trimH), GraphicsUnit.Pixel);
            }

            RemoveSmallComponents(canvas);
            canvas.Save(outPath, ImageFormat.Png);
        }
    }
}
'@

function Export-SheetIcon($sheetName, $cols, $rows, $index, $outPath) {
  $sheetPath = Join-Path $root "public/icon-reviews/$sheetName"
  [SheetIconExporter]::ExportIcon($sheetPath, $cols, $rows, $index, $outPath)
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

Copy-Item -LiteralPath (Icon-Path 'machines' 'brickedBlastFurnacePart') -Destination (Icon-Path 'machines' 'brickedBlastFurnace') -Force

Export-SheetIcon 'lv-machines.png' 3 3 0 (Icon-Path 'machines' 'lvBatteryBuffer')
Export-SheetIcon 'lv-machines.png' 3 3 1 (Icon-Path 'machines' 'liquidSteamBoiler')
Export-SheetIcon 'lv-machines.png' 3 3 2 (Icon-Path 'machines' 'lvBender')
Export-SheetIcon 'lv-machines.png' 3 3 3 (Icon-Path 'machines' 'lvLathe')
Export-SheetIcon 'lv-machines.png' 3 3 4 (Icon-Path 'machines' 'lvElectrolyzer')
Export-SheetIcon 'lv-machines.png' 3 3 5 (Icon-Path 'machines' 'lvAssembler')
Export-SheetIcon 'lv-machines.png' 3 3 6 (Icon-Path 'machines' 'lvCentrifuge')
Export-SheetIcon 'lv-machines.png' 3 3 7 (Icon-Path 'machines' 'arcBlastFurnacePart')
Export-SheetIcon 'lv-machines.png' 3 3 8 (Icon-Path 'machines' 'arcBlastFurnace')

Write-Output "Generated LV icon assets from upgraded icon sources."

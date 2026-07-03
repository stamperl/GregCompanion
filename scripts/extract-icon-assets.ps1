Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

Add-Type -ReferencedAssemblies 'System.Drawing' -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class IconCropper
{
    public static void ExportTile(string sheetPath, int cols, int rows, int index, string outPath, int canvasSize)
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
            using (var g = Graphics.FromImage(tile))
            {
                g.DrawImage(sheet, new Rectangle(0, 0, cellW, cellH), new Rectangle(cellX, cellY, cellW, cellH), GraphicsUnit.Pixel);

                var labelW = Math.Min(78, (int)(cellW * 0.34));
                var labelH = Math.Min(60, (int)(cellH * 0.24));
                for (var y = 0; y < labelH; y++)
                {
                    for (var x = 0; x < labelW; x++)
                    {
                        tile.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                    }
                }

                var bounds = FindSubjectBounds(tile);
                using (var subject = new Bitmap(bounds.Width, bounds.Height, PixelFormat.Format32bppArgb))
                using (var subjectG = Graphics.FromImage(subject))
                {
                    subjectG.DrawImage(tile, new Rectangle(0, 0, bounds.Width, bounds.Height), bounds, GraphicsUnit.Pixel);
                    RemoveConnectedBackground(subject);
                    SaveTrimmed(subject, outPath, canvasSize);
                }
            }
        }
    }

    private sealed class Component
    {
        public int MinX;
        public int MinY;
        public int MaxX;
        public int MaxY;
        public int Area;

        public int CenterX { get { return (MinX + MaxX) / 2; } }
        public int CenterY { get { return (MinY + MaxY) / 2; } }
    }

    private static bool IsForeground(Color color)
    {
        if (color.A == 0) return false;
        var neutral = Math.Abs(color.R - color.G) < 20
            && Math.Abs(color.G - color.B) < 20
            && color.R >= 74
            && color.R <= 222;
        var darkOutline = color.R < 78 && color.G < 88 && color.B < 98;
        var saturated = Math.Abs(color.R - color.G) > 24 || Math.Abs(color.G - color.B) > 24 || Math.Abs(color.R - color.B) > 24;
        return darkOutline || saturated || !neutral;
    }

    private static Rectangle FindSubjectBounds(Bitmap tile)
    {
        var width = tile.Width;
        var height = tile.Height;
        var visited = new bool[width, height];
        var components = new List<Component>();

        for (var startY = 0; startY < height; startY++)
        {
            for (var startX = 0; startX < width; startX++)
            {
                if (visited[startX, startY] || !IsForeground(tile.GetPixel(startX, startY))) continue;

                var component = new Component
                {
                    MinX = startX,
                    MinY = startY,
                    MaxX = startX,
                    MaxY = startY,
                    Area = 0
                };
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

                    EnqueueForeground(tile, visited, queue, x + 1, y);
                    EnqueueForeground(tile, visited, queue, x - 1, y);
                    EnqueueForeground(tile, visited, queue, x, y + 1);
                    EnqueueForeground(tile, visited, queue, x, y - 1);
                }

                var compW = component.MaxX - component.MinX + 1;
                var compH = component.MaxY - component.MinY + 1;
                var labelLike = component.MinX < width * 0.34 && component.MinY < height * 0.24 && compW < 80 && compH < 70;
                if (component.Area >= 36 && !labelLike)
                {
                    components.Add(component);
                }
            }
        }

        if (components.Count == 0)
        {
            return new Rectangle(0, 0, width, height);
        }

        var expectedX = width / 2.0;
        var expectedY = height / 2.0;
        Component main = null;
        var bestScore = double.MinValue;
        foreach (var component in components)
        {
            var dx = component.CenterX - expectedX;
            var dy = component.CenterY - expectedY;
            var distance = Math.Sqrt(dx * dx + dy * dy);
            var score = component.Area / (1.0 + distance / 55.0);
            if (score > bestScore)
            {
                bestScore = score;
                main = component;
            }
        }

        var minX = main.MinX;
        var minY = main.MinY;
        var maxX = main.MaxX;
        var maxY = main.MaxY;
        foreach (var component in components)
        {
            if (Object.ReferenceEquals(component, main)) continue;
            var dx = component.CenterX - main.CenterX;
            var dy = component.CenterY - main.CenterY;
            var distance = Math.Sqrt(dx * dx + dy * dy);
            var usefulPart = component.Area > main.Area * 0.08 && distance < 130;
            var nearMain = distance < 92;
            if (!usefulPart && !nearMain) continue;
            minX = Math.Min(minX, component.MinX);
            minY = Math.Min(minY, component.MinY);
            maxX = Math.Max(maxX, component.MaxX);
            maxY = Math.Max(maxY, component.MaxY);
        }

        const int pad = 14;
        minX = Math.Max(0, minX - pad);
        minY = Math.Max(0, minY - pad);
        maxX = Math.Min(width - 1, maxX + pad);
        maxY = Math.Min(height - 1, maxY + pad);
        return new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
    }

    private static void EnqueueForeground(Bitmap bitmap, bool[,] visited, Queue<Point> queue, int x, int y)
    {
        if (x < 0 || y < 0 || x >= bitmap.Width || y >= bitmap.Height || visited[x, y]) return;
        visited[x, y] = true;
        if (IsForeground(bitmap.GetPixel(x, y)))
        {
            queue.Enqueue(new Point(x, y));
        }
    }

    private static bool LooksLikeBackground(Color color)
    {
        if (color.A == 0) return true;
        return Math.Abs(color.R - color.G) < 16
            && Math.Abs(color.G - color.B) < 16
            && color.R >= 78
            && color.R <= 195;
    }

    private static void RemoveConnectedBackground(Bitmap tile)
    {
        var width = tile.Width;
        var height = tile.Height;
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

            var color = tile.GetPixel(x, y);
            if (!LooksLikeBackground(color)) continue;

            tile.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
            queue.Enqueue(new Point(x + 1, y));
            queue.Enqueue(new Point(x - 1, y));
            queue.Enqueue(new Point(x, y + 1));
            queue.Enqueue(new Point(x, y - 1));
        }
    }

    private static void SaveTrimmed(Bitmap tile, string outPath, int canvasSize)
    {
        var minX = tile.Width;
        var minY = tile.Height;
        var maxX = -1;
        var maxY = -1;

        for (var y = 0; y < tile.Height; y++)
        {
            for (var x = 0; x < tile.Width; x++)
            {
                if (tile.GetPixel(x, y).A <= 18) continue;
                minX = Math.Min(minX, x);
                minY = Math.Min(minY, y);
                maxX = Math.Max(maxX, x);
                maxY = Math.Max(maxY, y);
            }
        }

        if (maxX < 0)
        {
            tile.Save(outPath, ImageFormat.Png);
            return;
        }

        const int pad = 8;
        minX = Math.Max(0, minX - pad);
        minY = Math.Max(0, minY - pad);
        maxX = Math.Min(tile.Width - 1, maxX + pad);
        maxY = Math.Min(tile.Height - 1, maxY + pad);

        var trimW = maxX - minX + 1;
        var trimH = maxY - minY + 1;
        using (var canvas = new Bitmap(canvasSize, canvasSize, PixelFormat.Format32bppArgb))
        using (var g = Graphics.FromImage(canvas))
        {
            g.Clear(Color.FromArgb(0, 0, 0, 0));
            g.InterpolationMode = InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = PixelOffsetMode.Half;
            var scale = Math.Min((canvasSize - 8) / (double)trimW, (canvasSize - 8) / (double)trimH);
            var destW = (int)Math.Round(trimW * scale);
            var destH = (int)Math.Round(trimH * scale);
            var destX = (canvasSize - destW) / 2;
            var destY = (canvasSize - destH) / 2;
            g.DrawImage(
                tile,
                new Rectangle(destX, destY, destW, destH),
                new Rectangle(minX, minY, trimW, trimH),
                GraphicsUnit.Pixel
            );
            canvas.Save(outPath, ImageFormat.Png);
        }
    }
}
'@

$root = Split-Path -Parent $PSScriptRoot
$reviewDir = Join-Path $root 'public/icon-reviews'
$outRoot = Join-Path $root 'public/game-icons'
$resourceOut = Join-Path $outRoot 'resources'
$machineOut = Join-Path $outRoot 'machines'

New-Item -ItemType Directory -Force -Path $resourceOut | Out-Null
New-Item -ItemType Directory -Force -Path $machineOut | Out-Null

Get-ChildItem $resourceOut -Filter *.png -ErrorAction SilentlyContinue | Remove-Item
Get-ChildItem $machineOut -Filter *.png -ErrorAction SilentlyContinue | Remove-Item

$toolSheet = @(
  'woodenAxe', 'woodenPickaxe', 'woodenShovel', 'stoneAxe', 'stonePickaxe',
  'stoneShovel', 'ironAxe', 'ironPickaxe', 'ironShovel', 'stoneHammer',
  'ironHammer', 'ironFile', 'bronzeFile', 'ironWireCutters', 'ironWrench',
  'bronzeWrench', 'ironCrowbar', 'treeTap', 'mortar', 'bronzeMortar'
)

$itemSheets = @(
  @{ File = 'all-items-1.png'; Cols = 5; Rows = 4; Ids = @(
    'log', 'plank', 'stick', 'treeTap', 'woodenAxe',
    'woodenPickaxe', 'woodenShovel', 'stoneAxe', 'stonePickaxe', 'stoneShovel',
    'ironAxe', 'ironPickaxe', 'ironShovel', 'stoneHammer', 'ironHammer',
    'ironFile', 'bronzeFile', 'ironWireCutters', 'ironWrench', 'bronzeWrench'
  ) },
  @{ File = 'all-items-2.png'; Cols = 5; Rows = 4; Ids = @(
    'ironCrowbar', 'stone', 'cobblestone', 'gravel', 'flint',
    'ironOre', 'copperOre', 'tinOre', 'redstoneDust', 'crushedIronOre',
    'crushedCopperOre', 'crushedTinOre', 'coal', 'charcoal', 'coalCoke',
    'mortar', 'ironMortar', 'bronzeMortar', 'unfiredBrick', 'brick'
  ) },
  @{ File = 'all-items-3.png'; Cols = 5; Rows = 4; Ids = @(
    'bucket', 'ironIngot', 'copperIngot', 'tinIngot', 'ironDust',
    'copperDust', 'tinDust', 'bronzeIngot', 'clay', 'sand',
    'rubberSap', 'pipeSealant', 'rubber', 'water', 'ironPlate',
    'copperPlate', 'tinPlate', 'bronzePlate', 'ironRod', 'copperRod'
  ) },
  @{ File = 'all-items-4.png'; Cols = 5; Rows = 4; Ids = @(
    'tinRod', 'bronzeRod', 'steelIngot', 'steelPlate', 'steelRod',
    'tinWire', 'tinCable', 'copperWire', 'glass', 'glassTube',
    'woodPulp', 'carbonDust', 'redAlloyIngot', 'redAlloyPlate', 'redAlloyWire',
    'resistor', 'vacuumTube', 'bronzeBlend', 'steamCasing', 'cokeOvenBrick'
  ) },
  @{ File = 'all-items-5.png'; Cols = 3; Rows = 2; Ids = @(
    'firebrick', 'bbfCasing', 'lvMachineCasing',
    'lvMachineHull', 'basicBoard', 'primitiveCircuit'
  ) }
)

$machineSheet = @{
  File = 'machines.png'
  Cols = 5
  Rows = 5
  Ids = @(
    'furnace', 'well', 'steamBoiler', 'steamTank', 'copperPipe',
    'bronzePipe', 'ironPipe', 'steamMacerator', 'steamForgeHammer', 'steamCompressor',
    'steamExtractor', 'steamAlloySmelter', 'steamFurnace', 'steamAutoMiner', 'steamTurbine',
    'tinCable', 'lvWiremill', 'lvAutoMiner', 'cokeOven', 'brickedBlastFurnacePart',
    'brickedBlastFurnace'
  )
}

function Export-Sheet {
  param(
    [hashtable]$SheetSpec,
    [string]$OutputDir,
    [string[]]$SkipIds = @()
  )

  $sheetPath = Join-Path $reviewDir $SheetSpec.File
  for ($i = 0; $i -lt $SheetSpec.Ids.Count; $i++) {
    $id = $SheetSpec.Ids[$i]
    if ($SkipIds -contains $id) {
      continue
    }
    [IconCropper]::ExportTile($sheetPath, $SheetSpec.Cols, $SheetSpec.Rows, $i, (Join-Path $OutputDir "$id.png"), 128)
  }
}

foreach ($sheet in $itemSheets) {
  Export-Sheet -SheetSpec $sheet -OutputDir $resourceOut -SkipIds $toolSheet
}

Export-Sheet -SheetSpec @{ File = 'tool-icons-v2.png'; Cols = 5; Rows = 4; Ids = $toolSheet } -OutputDir $resourceOut
Export-Sheet -SheetSpec $machineSheet -OutputDir $machineOut

Copy-Item -LiteralPath (Join-Path $resourceOut 'copperWire.png') -Destination (Join-Path $resourceOut 'conductiveWire.png') -Force
Copy-Item -LiteralPath (Join-Path $resourceOut 'tinCable.png') -Destination (Join-Path $machineOut 'tinCable.png') -Force
Copy-Item -LiteralPath (Join-Path $reviewDir 'factory-floor.png') -Destination (Join-Path $outRoot 'factory-floor-concept.png') -Force

Write-Output "Extracted resource icons: $((Get-ChildItem $resourceOut -Filter *.png).Count)"
Write-Output "Extracted machine icons: $((Get-ChildItem $machineOut -Filter *.png).Count)"

using Godot;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using Forge.Building;

namespace Forge.Vehicle;

/// <summary>
/// Save/load vehicles to JSON format.
/// Designed for future migration to MessagePack.
/// Panel attachment references frame edges, not raw coordinates.
/// </summary>
public static class VehicleSerializer
{
    /// <summary>Serialize a vehicle to JSON string.</summary>
    public static string Serialize(Vehicle vehicle)
    {
        var doc = new VehicleSaveData
        {
            Version = 1,
            Name = vehicle.Name,
        };

        // Serialize frames
        foreach (var edge in vehicle.FrameGraph.AllEdges)
        {
            var frame = new FrameSaveData
            {
                Id = $"f{edge.Id.Value:D4}",
                Type = edge.RibRadius > 0 ? "rib_curved" : edge.FrameType,
                Start = new[] { edge.StartNode.X, edge.StartNode.Y, edge.StartNode.Z },
                End = new[] { edge.EndNode.X, edge.EndNode.Y, edge.EndNode.Z },
                Material = edge.Material,
            };

            if (edge.RibRadius > 0 && !float.IsPositiveInfinity(edge.RibRadius))
            {
                frame.Radius = edge.RibRadius;
                frame.ArcDir = $"{edge.RibArcDirection.X:F1},{edge.RibArcDirection.Y:F1},{edge.RibArcDirection.Z:F1}";
            }

            doc.Frames.Add(frame);
        }

        // Serialize panels
        foreach (var panel in vehicle.Panels)
        {
            var panelData = new PanelSaveData
            {
                Id = panel.Id,
                Type = panel.MaterialType,
                Edges = new List<string>(),
                Material = panel.Material,
                Color = panel.Color,
            };
            foreach (var edgeId in panel.BoundaryEdges)
            {
                panelData.Edges.Add($"f{edgeId.Value:D4}");
            }
            doc.Panels.Add(panelData);
        }

        // Serialize bulkheads
        foreach (var bh in vehicle.Bulkheads)
        {
            var bhData = new BulkheadSaveData
            {
                Id = bh.Id,
                Material = bh.Material,
                FrameLoop = new List<string>(),
            };
            foreach (var edgeId in bh.FrameLoop)
            {
                bhData.FrameLoop.Add($"f{edgeId.Value:D4}");
            }
            doc.Bulkheads.Add(bhData);
        }

        return JsonSerializer.Serialize(doc, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        });
    }

    /// <summary>Save vehicle to a file path.</summary>
    public static void SaveToFile(Vehicle vehicle, string path)
    {
        string json = Serialize(vehicle);
        using var file = FileAccess.Open(path, FileAccess.ModeFlags.Write);
        file?.StoreString(json);
        GD.Print($"[FORGE] Vehicle saved to {path}");
    }

    /// <summary>Load vehicle from a file path.</summary>
    public static Vehicle? LoadFromFile(string path)
    {
        using var file = FileAccess.Open(path, FileAccess.ModeFlags.Read);
        if (file == null)
        {
            GD.PrintErr($"[FORGE] Cannot open file: {path}");
            return null;
        }

        string json = file.GetAsText();
        return Deserialize(json);
    }

    /// <summary>Deserialize a vehicle from JSON string.</summary>
    public static Vehicle? Deserialize(string json)
    {
        var doc = JsonSerializer.Deserialize<VehicleSaveData>(json, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        });

        if (doc == null) return null;

        var vehicle = new Vehicle { Name = doc.Name };

        // Restore frames
        foreach (var frame in doc.Frames)
        {
            var start = new Vector3I(frame.Start[0], frame.Start[1], frame.Start[2]);
            var end = new Vector3I(frame.End[0], frame.End[1], frame.End[2]);

            if (frame.Type == "rib_curved" && frame.Radius.HasValue)
            {
                Vector3 arcDir = Vector3.Up;
                if (!string.IsNullOrEmpty(frame.ArcDir))
                {
                    var parts = frame.ArcDir.Split(',');
                    if (parts.Length == 3)
                    {
                        arcDir = new Vector3(
                            float.Parse(parts[0], System.Globalization.CultureInfo.InvariantCulture),
                            float.Parse(parts[1], System.Globalization.CultureInfo.InvariantCulture),
                            float.Parse(parts[2], System.Globalization.CultureInfo.InvariantCulture)
                        );
                    }
                }
                vehicle.FrameGraph.AddRib(start, end, frame.Radius.Value, arcDir, frame.Type, frame.Material);
            }
            else
            {
                vehicle.FrameGraph.AddBeam(start, end, frame.Type, frame.Material);
            }
        }

        GD.Print($"[FORGE] Loaded vehicle '{vehicle.Name}' with {vehicle.FrameGraph.EdgeCount} frames");
        return vehicle;
    }

    // ── Save Data Structures ────────────────────────────────────────────

    private sealed class VehicleSaveData
    {
        public int Version { get; set; } = 1;
        public string Name { get; set; } = "";
        public List<FrameSaveData> Frames { get; set; } = new();
        public List<PanelSaveData> Panels { get; set; } = new();
        public List<BulkheadSaveData> Bulkheads { get; set; } = new();
    }

    private sealed class FrameSaveData
    {
        public string Id { get; set; } = "";
        public string Type { get; set; } = "";
        public int[] Start { get; set; } = new int[3];
        public int[] End { get; set; } = new int[3];
        public string Material { get; set; } = "";
        public float? Radius { get; set; }
        public string? ArcDir { get; set; }
    }

    private sealed class PanelSaveData
    {
        public string Id { get; set; } = "";
        public string Type { get; set; } = "";
        public List<string> Edges { get; set; } = new();
        public string Material { get; set; } = "";
        public string Color { get; set; } = "";
    }

    private sealed class BulkheadSaveData
    {
        public string Id { get; set; } = "";
        public string Material { get; set; } = "";
        public List<string> FrameLoop { get; set; } = new();
    }
}

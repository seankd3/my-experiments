using Godot;
using System.Collections.Generic;
using System.Linq;

namespace Forge.Data;

/// <summary>
/// Loads all part definitions from TOML files at startup.
/// Adding a new frame or panel type = adding a TOML file. Zero code changes.
/// </summary>
public sealed class PartRegistry
{
    private readonly Dictionary<string, PartDefinition> _parts = new();

    /// <summary>All loaded part definitions.</summary>
    public IReadOnlyDictionary<string, PartDefinition> All => _parts;

    /// <summary>All frame member definitions.</summary>
    public IEnumerable<PartDefinition> Frames => _parts.Values.Where(p => p.IsFrame);

    /// <summary>All panel definitions.</summary>
    public IEnumerable<PartDefinition> Panels => _parts.Values.Where(p => p.IsPanel);

    /// <summary>Get a part definition by ID. Returns null if not found.</summary>
    public PartDefinition? Get(string id) => _parts.GetValueOrDefault(id);

    /// <summary>
    /// Load all TOML part definitions from the data/parts directory.
    /// Call once at startup.
    /// </summary>
    public void LoadAll()
    {
        _parts.Clear();
        LoadFromDirectory("res://data/parts/frames");
        LoadFromDirectory("res://data/parts/panels");
        GD.Print($"[PartRegistry] Loaded {_parts.Count} part definitions ({Frames.Count()} frames, {Panels.Count()} panels)");
    }

    private void LoadFromDirectory(string path)
    {
        using var dir = DirAccess.Open(path);
        if (dir == null)
        {
            GD.PrintErr($"[PartRegistry] Cannot open directory: {path}");
            return;
        }

        dir.ListDirBegin();
        string fileName;
        while ((fileName = dir.GetNext()) != "")
        {
            if (fileName.EndsWith(".toml"))
            {
                LoadTomlFile($"{path}/{fileName}");
            }
        }
        dir.ListDirEnd();
    }

    private void LoadTomlFile(string filePath)
    {
        using var file = FileAccess.Open(filePath, FileAccess.ModeFlags.Read);
        if (file == null)
        {
            GD.PrintErr($"[PartRegistry] Cannot open file: {filePath}");
            return;
        }

        string content = file.GetAsText();
        var def = ParseToml(content);
        if (def != null && !string.IsNullOrEmpty(def.Id))
        {
            _parts[def.Id] = def;
        }
        else
        {
            GD.PrintErr($"[PartRegistry] Failed to parse: {filePath}");
        }
    }

    /// <summary>
    /// Simple TOML parser for our part definition format.
    /// Handles [section] headers and key = value pairs.
    /// Supports string, int, float, and bool values.
    /// </summary>
    private static PartDefinition? ParseToml(string content)
    {
        var def = new PartDefinition();
        string currentSection = "";

        foreach (string rawLine in content.Split('\n'))
        {
            string line = rawLine.Trim();
            if (string.IsNullOrEmpty(line) || line.StartsWith('#'))
                continue;

            // Section header
            if (line.StartsWith('[') && line.EndsWith(']'))
            {
                currentSection = line[1..^1].Trim();
                continue;
            }

            // Key = value
            int eqIdx = line.IndexOf('=');
            if (eqIdx < 0) continue;

            string key = line[..eqIdx].Trim();
            string value = line[(eqIdx + 1)..].Trim();

            // Strip inline comments
            int commentIdx = value.IndexOf('#');
            if (commentIdx > 0 && (value[commentIdx - 1] == ' ' || value[commentIdx - 1] == '\t'))
            {
                value = value[..commentIdx].Trim();
            }

            // Remove quotes from strings
            if (value.StartsWith('"') && value.EndsWith('"'))
                value = value[1..^1];

            SetField(def, currentSection, key, value);
        }

        return def;
    }

    private static void SetField(PartDefinition def, string section, string key, string value)
    {
        switch (section)
        {
            case "part":
                switch (key)
                {
                    case "id": def.Id = value; break;
                    case "display_name": def.DisplayName = value; break;
                    case "category": def.Category = value; break;
                    case "subcategory": def.Subcategory = value; break;
                    case "description": def.Description = value; break;
                    case "icon": def.Icon = value; break;
                }
                break;

            case "geometry":
                switch (key)
                {
                    case "cross_section": def.CrossSection = value; break;
                    case "width_mm": def.WidthMm = ParseFloat(value); break;
                    case "height_mm": def.HeightMm = ParseFloat(value); break;
                    case "wall_thickness_mm": def.WallThicknessMm = ParseFloat(value); break;
                    case "min_length_nodes": def.MinLengthNodes = ParseInt(value); break;
                    case "max_length_nodes": def.MaxLengthNodes = ParseInt(value); break;
                    case "thickness_mm": def.ThicknessMm = ParseFloat(value); break;
                    case "min_attachment_points": def.MinAttachmentPoints = ParseInt(value); break;
                    case "max_attachment_points": def.MaxAttachmentPoints = ParseInt(value); break;
                }
                break;

            case "physics":
                switch (key)
                {
                    case "mass_per_meter_kg": def.MassPerMeterKg = ParseFloat(value); break;
                    case "mass_per_sqmeter_kg": def.MassPerSqMeterKg = ParseFloat(value); break;
                    case "yield_strength_mpa": def.YieldStrengthMpa = ParseFloat(value); break;
                    case "watertight": def.Watertight = ParseBool(value); break;
                    case "material": def.PhysicsMaterial = value; break;
                }
                break;

            case "rendering":
                switch (key)
                {
                    case "color": def.Color = value; break;
                    case "metalness": def.Metalness = ParseFloat(value); break;
                    case "roughness": def.Roughness = ParseFloat(value); break;
                    case "opacity": def.Opacity = ParseFloat(value); break;
                }
                break;
        }
    }

    private static float ParseFloat(string v) => float.TryParse(v, System.Globalization.NumberStyles.Float,
        System.Globalization.CultureInfo.InvariantCulture, out float f) ? f : 0f;
    private static int ParseInt(string v) => int.TryParse(v, out int i) ? i : 0;
    private static bool ParseBool(string v) => v.ToLowerInvariant() is "true" or "1" or "yes";
}

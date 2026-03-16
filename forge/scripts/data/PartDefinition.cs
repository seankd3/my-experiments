using Godot;

namespace Forge.Data;

/// <summary>
/// Runtime representation of a part definition loaded from TOML.
/// Covers both frame members and panel types.
/// </summary>
public sealed class PartDefinition
{
    // ── Identity ────────────────────────────────────────────────────────

    /// <summary>Unique part ID matching the TOML filename (e.g. "spar", "thin_sheet").</summary>
    public string Id { get; set; } = "";

    /// <summary>Human-readable name for the palette UI.</summary>
    public string DisplayName { get; set; } = "";

    /// <summary>Top-level category: "Frame" or "Panel".</summary>
    public string Category { get; set; } = "";

    /// <summary>Subcategory for palette tabs (e.g. "Straight", "Sheet").</summary>
    public string Subcategory { get; set; } = "";

    /// <summary>Tooltip description.</summary>
    public string Description { get; set; } = "";

    /// <summary>Icon resource path.</summary>
    public string Icon { get; set; } = "";

    // ── Geometry ────────────────────────────────────────────────────────

    /// <summary>Cross-section profile type (frames only).</summary>
    public string CrossSection { get; set; } = "";

    /// <summary>Width of cross-section in mm (frames) or 0.</summary>
    public float WidthMm { get; set; }

    /// <summary>Height of cross-section in mm (frames) or 0.</summary>
    public float HeightMm { get; set; }

    /// <summary>Wall thickness in mm.</summary>
    public float WallThicknessMm { get; set; }

    /// <summary>Minimum beam length in grid nodes (frames only).</summary>
    public int MinLengthNodes { get; set; } = 1;

    /// <summary>Maximum beam length in grid nodes (frames only).</summary>
    public int MaxLengthNodes { get; set; } = 16;

    /// <summary>Panel thickness in mm (panels only).</summary>
    public float ThicknessMm { get; set; }

    /// <summary>Minimum panel attachment points (panels only).</summary>
    public int MinAttachmentPoints { get; set; } = 3;

    /// <summary>Maximum panel attachment points (panels only).</summary>
    public int MaxAttachmentPoints { get; set; } = 4;

    // ── Physics ─────────────────────────────────────────────────────────

    /// <summary>Mass per meter in kg (frames only).</summary>
    public float MassPerMeterKg { get; set; }

    /// <summary>Mass per square meter in kg (panels only).</summary>
    public float MassPerSqMeterKg { get; set; }

    /// <summary>Yield strength in MPa.</summary>
    public float YieldStrengthMpa { get; set; }

    /// <summary>Whether this panel is watertight (panels only).</summary>
    public bool Watertight { get; set; }

    /// <summary>Material identifier.</summary>
    public string PhysicsMaterial { get; set; } = "";

    // ── Rendering ───────────────────────────────────────────────────────

    /// <summary>Default color hex code.</summary>
    public string Color { get; set; } = "#888888";

    /// <summary>PBR metalness (0-1).</summary>
    public float Metalness { get; set; } = 0.3f;

    /// <summary>PBR roughness (0-1).</summary>
    public float Roughness { get; set; } = 0.6f;

    /// <summary>Panel opacity (0-1).</summary>
    public float Opacity { get; set; } = 1.0f;

    // ── Helpers ─────────────────────────────────────────────────────────

    /// <summary>Is this a frame member definition?</summary>
    public bool IsFrame => Category == "Frame";

    /// <summary>Is this a panel definition?</summary>
    public bool IsPanel => Category == "Panel";

    /// <summary>Cross-section width in meters.</summary>
    public float WidthM => WidthMm * 0.001f;

    /// <summary>Cross-section height in meters.</summary>
    public float HeightM => HeightMm * 0.001f;

    /// <summary>Parse a Godot Color from the hex string.</summary>
    public Color GetColor() => new(Color);
}

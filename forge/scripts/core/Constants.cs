using Godot;

namespace Forge.Core;

/// <summary>
/// Single source of truth for all physics, grid, and construction constants.
/// Never put magic numbers in code — reference this class or TOML data files.
/// </summary>
public static class Constants
{
    // ── Grid ────────────────────────────────────────────────────────────

    /// <summary>Primary grid spacing in meters (25cm).</summary>
    public const float GridSpacing = 0.25f;

    /// <summary>Detail sub-grid spacing for interior fittings (6.25cm).</summary>
    public const float DetailGridSpacing = 0.0625f;

    /// <summary>Grid bounds in nodes: 256×128×256 = 64m×32m×64m.</summary>
    public static readonly Vector3I GridBounds = new(256, 128, 256);

    /// <summary>World-space bounds in meters.</summary>
    public static readonly Vector3 WorldBounds = new(
        GridBounds.X * GridSpacing,
        GridBounds.Y * GridSpacing,
        GridBounds.Z * GridSpacing
    );

    // ── Camera ──────────────────────────────────────────────────────────

    public const float CameraOrbitSpeed = 0.005f;
    public const float CameraPanSpeed = 0.01f;
    public const float CameraZoomSpeed = 0.5f;
    public const float CameraMinDistance = 0.5f;
    public const float CameraMaxDistance = 100f;
    public const float CameraDefaultDistance = 8f;
    public const float CameraDefaultPitch = -0.4f; // radians, looking slightly down
    public const float CameraDefaultYaw = 0.8f;

    // ── Building ────────────────────────────────────────────────────────

    /// <summary>Maximum undo/redo history depth.</summary>
    public const int MaxUndoHistory = 200;

    /// <summary>Scale pulse on placement: starting scale.</summary>
    public const float PlacePulseStart = 0.95f;

    /// <summary>Scale pulse on placement: duration in seconds.</summary>
    public const float PlacePulseDuration = 0.08f;

    /// <summary>Node highlight sphere radius when cursor is near a grid node.</summary>
    public const float NodeHighlightRadius = 0.035f;

    /// <summary>Distance threshold for cursor snapping to nearest grid node (world units).</summary>
    public const float NodeSnapDistance = 0.15f;

    /// <summary>Ghost preview opacity.</summary>
    public const float GhostPreviewOpacity = 0.4f;

    // ── Rib Radius Presets ──────────────────────────────────────────────

    /// <summary>Available curved rib radius presets in meters. float.PositiveInfinity = flat/straight.</summary>
    public static readonly float[] RibRadiusPresets = { 0.5f, 1.0f, 2.0f, 4.0f, 8.0f, float.PositiveInfinity };

    // ── Subdivision ─────────────────────────────────────────────────────

    /// <summary>Catmull-Clark subdivision levels for panel rendering.</summary>
    public const int PanelSubdivisionLevels = 2;

    // ── Physics (stubs for future) ──────────────────────────────────────

    public const float DefaultMaterialDensity = 2700f; // kg/m³ aluminum
    public const float WaterDensity = 1025f; // kg/m³ seawater
    public const float AirDensity = 1.225f; // kg/m³ at sea level
    public const float Gravity = 9.81f;

    // ── Godot Groups ────────────────────────────────────────────────────

    public const string GroupFrameMembers = "frame_members";
    public const string GroupPanels = "panels";
    public const string GroupBulkheads = "bulkheads";
    public const string GroupComponents = "components";
}

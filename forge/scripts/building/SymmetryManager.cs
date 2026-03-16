using Godot;

namespace Forge.Building;

/// <summary>
/// Manages symmetry mode for the construction system.
/// Mirror plane at X=0 (vehicle centerline).
/// Every placement/deletion mirrors automatically when enabled.
/// On by default.
/// </summary>
public sealed class SymmetryManager
{
    /// <summary>Whether symmetry mode is active.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Mirror a grid coordinate across the X=0 plane.</summary>
    public static Vector3I Mirror(Vector3I coord)
    {
        return new Vector3I(-coord.X, coord.Y, coord.Z);
    }

    /// <summary>Check if a coordinate is on the centerline (X=0).</summary>
    public static bool IsOnCenterline(Vector3I coord)
    {
        return coord.X == 0;
    }

    /// <summary>Check if a beam crosses the centerline (one end positive X, other negative).</summary>
    public static bool CrossesCenterline(Vector3I start, Vector3I end)
    {
        return (start.X >= 0 && end.X <= 0) || (start.X <= 0 && end.X >= 0);
    }

    /// <summary>
    /// Check if a beam lies entirely on the centerline.
    /// Beams on the centerline should not be mirrored.
    /// </summary>
    public static bool IsOnCenterline(Vector3I start, Vector3I end)
    {
        return start.X == 0 && end.X == 0;
    }
}

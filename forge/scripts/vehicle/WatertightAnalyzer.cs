using Godot;
using System.Collections.Generic;
using Forge.Building;

namespace Forge.Vehicle;

/// <summary>
/// Analyzes a vehicle's skin panels for watertight integrity.
/// Uses flood-fill from exterior to detect gaps in panel coverage.
/// Highlights gap locations for the player to fix.
/// </summary>
public sealed class WatertightAnalyzer
{
    /// <summary>Locations where the hull has gaps (not watertight).</summary>
    public List<Vector3> GapLocations { get; } = new();

    /// <summary>Whether the analysis found the vehicle to be fully watertight.</summary>
    public bool IsWatertight => GapLocations.Count == 0;

    /// <summary>
    /// Run watertight analysis on the vehicle.
    /// TODO: implement flood-fill gap detection.
    /// </summary>
    public void Analyze(Vehicle vehicle)
    {
        GapLocations.Clear();
        // Stub — full implementation in Phase 5
    }
}

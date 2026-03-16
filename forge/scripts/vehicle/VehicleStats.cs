using Godot;
using System.Collections.Generic;
using System.Linq;
using Forge.Building;
using Forge.Data;

namespace Forge.Vehicle;

/// <summary>
/// Computes real-time vehicle statistics for the stats panel HUD.
/// Mass, center of mass, part counts, enclosed volume, watertight status.
/// </summary>
public sealed class VehicleStats
{
    public float TotalMass { get; private set; }
    public float FrameMass { get; private set; }
    public float PanelMass { get; private set; }
    public Vector3 CenterOfMass { get; private set; }
    public int FrameCount { get; private set; }
    public int PanelCount { get; private set; }
    public int BulkheadCount { get; private set; }
    public float EstimatedVolume { get; private set; }
    public bool IsWatertight { get; private set; }
    public List<string> Warnings { get; } = new();

    /// <summary>
    /// Recalculate all stats from the current vehicle state.
    /// </summary>
    public void Recalculate(Vehicle vehicle, PartRegistry? registry = null)
    {
        Warnings.Clear();

        // Frame stats
        FrameCount = vehicle.FrameGraph.EdgeCount;
        PanelCount = vehicle.Panels.Count;
        BulkheadCount = vehicle.Bulkheads.Count;

        float totalMass = 0;
        Vector3 weightedPos = Vector3.Zero;

        foreach (var edge in vehicle.FrameGraph.AllEdges)
        {
            float massPerMeter = registry?.Get(edge.FrameType)?.MassPerMeterKg ?? 5f;
            float mass = edge.Length * massPerMeter;
            totalMass += mass;

            Vector3 midpoint = (NodeGrid.GridToWorld(edge.StartNode) +
                               NodeGrid.GridToWorld(edge.EndNode)) * 0.5f;
            weightedPos += midpoint * mass;
        }
        FrameMass = totalMass;

        // TODO: add panel mass from panels list
        PanelMass = 0;
        TotalMass = FrameMass + PanelMass;

        CenterOfMass = TotalMass > 0 ? weightedPos / TotalMass : Vector3.Zero;

        // Warnings
        if (FrameCount == 0)
            Warnings.Add("No structure built");

        if (PanelCount == 0 && FrameCount > 0)
            Warnings.Add("No skin panels — frame only");

        // TODO: watertight analysis, enclosed volume calculation
        IsWatertight = false;
        EstimatedVolume = 0;
    }
}

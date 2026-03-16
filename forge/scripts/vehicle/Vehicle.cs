using Godot;
using System;
using System.Collections.Generic;
using Forge.Building;
using Forge.Commands;

namespace Forge.Vehicle;

/// <summary>
/// Root state for a single vehicle being constructed.
/// Owns the FrameGraph, panels list, bulkheads list, and CommandHistory.
/// </summary>
public sealed class Vehicle
{
    /// <summary>Display name of the vehicle.</summary>
    public string Name { get; set; } = "Untitled Vehicle";

    /// <summary>The structural frame graph (skeleton).</summary>
    public FrameGraph FrameGraph { get; } = new();

    /// <summary>Undo/redo history for all building operations on this vehicle.</summary>
    public CommandHistory CommandHistory { get; } = new();

    /// <summary>Panel definitions (references frame edges by ID).</summary>
    public List<PanelData> Panels { get; } = new();

    /// <summary>Bulkhead definitions.</summary>
    public List<BulkheadData> Bulkheads { get; } = new();

    // ── Computed Stats ──────────────────────────────────────────────────

    /// <summary>Total mass of all parts in kg.</summary>
    public float TotalMass { get; private set; }

    /// <summary>Center of mass in world coordinates.</summary>
    public Vector3 CenterOfMass { get; private set; }

    /// <summary>
    /// Recalculate derived stats (mass, CoM, etc).
    /// Call after any structural change.
    /// </summary>
    public void RecalculateStats()
    {
        float totalMass = 0;
        Vector3 weightedPos = Vector3.Zero;

        foreach (var edge in FrameGraph.AllEdges)
        {
            // TODO: look up mass_per_meter from PartRegistry based on edge.FrameType
            float massPerMeter = 5f; // placeholder
            float mass = edge.Length * massPerMeter;
            totalMass += mass;

            Vector3 midpoint = (NodeGrid.GridToWorld(edge.StartNode) + NodeGrid.GridToWorld(edge.EndNode)) * 0.5f;
            weightedPos += midpoint * mass;
        }

        // TODO: add panel mass, bulkhead mass, component mass

        TotalMass = totalMass;
        CenterOfMass = totalMass > 0 ? weightedPos / totalMass : Vector3.Zero;
    }
}

/// <summary>
/// Panel data stored in the vehicle. References frame edges by ID.
/// Panels auto-update when attached frame geometry changes.
/// </summary>
public sealed class PanelData
{
    public string Id { get; set; } = "";
    public string MaterialType { get; set; } = "sheet_standard";
    public string Material { get; set; } = "aluminum_2mm";

    /// <summary>Frame edge IDs that form this panel's boundary (3 or 4).</summary>
    public List<FrameGraph.EdgeId> BoundaryEdges { get; set; } = new();

    /// <summary>Attachment node coordinates (derived from edges).</summary>
    public List<Vector3I> AttachmentNodes { get; set; } = new();

    public string Color { get; set; } = "#C8D0D8";
}

/// <summary>
/// Bulkhead data — fills a closed frame loop.
/// </summary>
public sealed class BulkheadData
{
    public string Id { get; set; } = "";
    public string Material { get; set; } = "aluminum_2mm";

    /// <summary>Ordered frame edge IDs forming the closed loop.</summary>
    public List<FrameGraph.EdgeId> FrameLoop { get; set; } = new();
}

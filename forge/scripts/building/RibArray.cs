using Godot;
using System.Collections.Generic;
using Forge.Commands;

namespace Forge.Building;

/// <summary>
/// Rib Array tool — THE killer feature.
/// Build one complete rib cross-section, select it, specify count and spacing
/// along a chosen axis, preview N copies, confirm as single undo step.
/// Turns 20 minutes of repetitive clicking into 10 seconds.
/// </summary>
public sealed class RibArray
{
    /// <summary>
    /// Create an array of frame members along an axis.
    /// Returns a CompoundCommand that can be executed as a single undo step.
    /// </summary>
    /// <param name="graph">The frame graph to add copies to.</param>
    /// <param name="sourceEdgeIds">Edge IDs to duplicate.</param>
    /// <param name="axis">Axis to array along ('x', 'y', or 'z').</param>
    /// <param name="spacing">Spacing in grid nodes between copies.</param>
    /// <param name="count">Number of copies to create.</param>
    /// <param name="symmetry">Whether to mirror each copy.</param>
    /// <returns>CompoundCommand, or null if invalid.</returns>
    public static CompoundCommand? CreateArrayCommand(
        FrameGraph graph,
        List<FrameGraph.EdgeId> sourceEdgeIds,
        char axis,
        int spacing,
        int count,
        bool symmetry = false)
    {
        if (sourceEdgeIds.Count == 0 || count <= 0 || spacing <= 0)
            return null;

        var commands = new List<ICommand>();

        // Collect source edges
        var sourceEdges = new List<FrameGraph.FrameEdge>();
        foreach (var id in sourceEdgeIds)
        {
            var edge = graph.GetEdge(id);
            if (edge != null) sourceEdges.Add(edge);
        }

        if (sourceEdges.Count == 0) return null;

        // Create offset copies
        for (int i = 1; i <= count; i++)
        {
            Vector3I offset = axis switch
            {
                'x' => new Vector3I(spacing * i, 0, 0),
                'y' => new Vector3I(0, spacing * i, 0),
                'z' => new Vector3I(0, 0, spacing * i),
                _ => Vector3I.Zero,
            };

            foreach (var source in sourceEdges)
            {
                var newStart = source.StartNode + offset;
                var newEnd = source.EndNode + offset;

                if (source.RibRadius > 0 && !float.IsPositiveInfinity(source.RibRadius))
                {
                    commands.Add(new PlaceRibCommand(
                        graph, newStart, newEnd,
                        source.RibRadius, source.RibArcDirection,
                        source.FrameType, source.Material, symmetry
                    ));
                }
                else
                {
                    commands.Add(new PlaceFrameCommand(
                        graph, newStart, newEnd,
                        source.FrameType, source.Material, symmetry
                    ));
                }
            }
        }

        return new CompoundCommand($"Array {sourceEdges.Count} frames × {count}", commands);
    }

    /// <summary>
    /// Generate preview positions for array copies (for ghost rendering).
    /// Does not modify the graph.
    /// </summary>
    public static List<(Vector3I start, Vector3I end)> PreviewArray(
        FrameGraph graph,
        List<FrameGraph.EdgeId> sourceEdgeIds,
        char axis,
        int spacing,
        int count)
    {
        var previews = new List<(Vector3I, Vector3I)>();

        var sourceEdges = new List<FrameGraph.FrameEdge>();
        foreach (var id in sourceEdgeIds)
        {
            var edge = graph.GetEdge(id);
            if (edge != null) sourceEdges.Add(edge);
        }

        for (int i = 1; i <= count; i++)
        {
            Vector3I offset = axis switch
            {
                'x' => new Vector3I(spacing * i, 0, 0),
                'y' => new Vector3I(0, spacing * i, 0),
                'z' => new Vector3I(0, 0, spacing * i),
                _ => Vector3I.Zero,
            };

            foreach (var source in sourceEdges)
            {
                previews.Add((source.StartNode + offset, source.EndNode + offset));
            }
        }

        return previews;
    }
}

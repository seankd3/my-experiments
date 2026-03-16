using Godot;
using Forge.Building;

namespace Forge.Commands;

/// <summary>
/// Command to place a straight beam frame member.
/// Supports undo (removal) and redo (re-insertion).
/// </summary>
public sealed class PlaceFrameCommand : ICommand
{
    private readonly FrameGraph _graph;
    private readonly Vector3I _start;
    private readonly Vector3I _end;
    private readonly string _frameType;
    private readonly string _material;

    /// <summary>The edge that was created. Null before first Execute().</summary>
    private FrameGraph.FrameEdge? _edge;

    /// <summary>If symmetry was active, the mirrored edge.</summary>
    private FrameGraph.FrameEdge? _mirrorEdge;
    private readonly bool _symmetry;

    public string Description => $"Place {_frameType}";

    public PlaceFrameCommand(FrameGraph graph, Vector3I start, Vector3I end,
                              string frameType, string material, bool symmetry = false)
    {
        _graph = graph;
        _start = start;
        _end = end;
        _frameType = frameType;
        _material = material;
        _symmetry = symmetry;
    }

    public void Execute()
    {
        if (_edge == null)
        {
            _edge = _graph.AddBeam(_start, _end, _frameType, _material);
        }
        else
        {
            _graph.ReinsertEdge(_edge);
        }

        // Handle symmetry mirror
        if (_symmetry)
        {
            var mirrorStart = MirrorX(_start);
            var mirrorEnd = MirrorX(_end);
            // Don't mirror if the beam is on the centerline
            if (mirrorStart != _start || mirrorEnd != _end)
            {
                if (_mirrorEdge == null)
                {
                    _mirrorEdge = _graph.AddBeam(mirrorStart, mirrorEnd, _frameType, _material);
                }
                else
                {
                    _graph.ReinsertEdge(_mirrorEdge);
                }
            }
        }
    }

    public void Undo()
    {
        if (_edge != null)
            _graph.RemoveEdge(_edge.Id);
        if (_mirrorEdge != null)
            _graph.RemoveEdge(_mirrorEdge.Id);
    }

    private static Vector3I MirrorX(Vector3I coord)
    {
        // Mirror across X=0 (centerline). Grid coordinates are 0-indexed,
        // so X=0 is the left edge. For centerline symmetry, we negate X offset
        // from the center of the grid.
        return new Vector3I(-coord.X, coord.Y, coord.Z);
    }
}

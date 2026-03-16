using Godot;
using Forge.Building;

namespace Forge.Commands;

/// <summary>
/// Command to place a curved rib frame member.
/// </summary>
public sealed class PlaceRibCommand : ICommand
{
    private readonly FrameGraph _graph;
    private readonly Vector3I _start;
    private readonly Vector3I _end;
    private readonly float _radius;
    private readonly Vector3 _arcDirection;
    private readonly string _frameType;
    private readonly string _material;
    private readonly bool _symmetry;

    private FrameGraph.FrameEdge? _edge;
    private FrameGraph.FrameEdge? _mirrorEdge;

    public string Description => $"Place curved rib (r={_radius}m)";

    public PlaceRibCommand(FrameGraph graph, Vector3I start, Vector3I end,
                            float radius, Vector3 arcDirection,
                            string frameType, string material, bool symmetry = false)
    {
        _graph = graph;
        _start = start;
        _end = end;
        _radius = radius;
        _arcDirection = arcDirection;
        _frameType = frameType;
        _material = material;
        _symmetry = symmetry;
    }

    public void Execute()
    {
        if (_edge == null)
        {
            _edge = _graph.AddRib(_start, _end, _radius, _arcDirection, _frameType, _material);
        }
        else
        {
            _graph.ReinsertEdge(_edge);
        }

        if (_symmetry)
        {
            var mirrorStart = MirrorX(_start);
            var mirrorEnd = MirrorX(_end);
            var mirrorArc = new Vector3(-_arcDirection.X, _arcDirection.Y, _arcDirection.Z);

            if (mirrorStart != _start || mirrorEnd != _end)
            {
                if (_mirrorEdge == null)
                {
                    _mirrorEdge = _graph.AddRib(mirrorStart, mirrorEnd, _radius, mirrorArc, _frameType, _material);
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
        return new Vector3I(-coord.X, coord.Y, coord.Z);
    }
}

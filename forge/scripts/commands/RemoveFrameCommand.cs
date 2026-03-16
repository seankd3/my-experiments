using Forge.Building;

namespace Forge.Commands;

/// <summary>
/// Command to remove a frame member. Undo re-inserts it.
/// </summary>
public sealed class RemoveFrameCommand : ICommand
{
    private readonly FrameGraph _graph;
    private readonly FrameGraph.EdgeId _edgeId;
    private FrameGraph.FrameEdge? _removedEdge;

    public string Description => "Remove frame";

    public RemoveFrameCommand(FrameGraph graph, FrameGraph.EdgeId edgeId)
    {
        _graph = graph;
        _edgeId = edgeId;
    }

    public void Execute()
    {
        _removedEdge = _graph.RemoveEdge(_edgeId);
    }

    public void Undo()
    {
        if (_removedEdge != null)
        {
            _graph.ReinsertEdge(_removedEdge);
        }
    }
}

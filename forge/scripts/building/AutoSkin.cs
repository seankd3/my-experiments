using Godot;
using System.Collections.Generic;
using System.Linq;
using Forge.Commands;

namespace Forge.Building;

/// <summary>
/// Auto-skin system — identifies closed faces in the frame graph and
/// generates panel previews for all exterior faces.
/// Player can toggle individual previews off for windows/doors/openings
/// before confirming as a single undo step.
/// </summary>
public sealed class AutoSkin
{
    /// <summary>
    /// Candidate face for auto-skinning.
    /// Player can accept or reject each candidate individually.
    /// </summary>
    public sealed class SkinCandidate
    {
        public List<Vector3I> Nodes { get; set; } = new();
        public List<FrameGraph.EdgeId> EdgeIds { get; set; } = new();
        public bool Accepted { get; set; } = true;
        public bool IsExterior { get; set; } = true;
    }

    /// <summary>
    /// Find all closed faces in the frame graph suitable for skinning.
    /// Returns candidate faces for the player to review.
    /// </summary>
    public static List<SkinCandidate> FindCandidates(FrameGraph graph, HashSet<FrameGraph.EdgeId>? filterEdges = null)
    {
        var candidates = new List<SkinCandidate>();
        var faces = graph.FindClosedFaces(maxFaceSize: 4);

        foreach (var faceNodes in faces)
        {
            // Find the edges that form this face
            var edgeIds = new List<FrameGraph.EdgeId>();
            bool allEdgesExist = true;

            for (int i = 0; i < faceNodes.Count; i++)
            {
                var a = faceNodes[i];
                var b = faceNodes[(i + 1) % faceNodes.Count];
                var edge = graph.FindEdgeBetween(a, b);
                if (edge == null)
                {
                    allEdgesExist = false;
                    break;
                }
                edgeIds.Add(edge.Id);
            }

            if (!allEdgesExist) continue;

            // If filtering by selected edges, check that at least one edge is in the set
            if (filterEdges != null && !edgeIds.Any(id => filterEdges.Contains(id)))
                continue;

            // Determine if this face is exterior using face normal heuristic
            bool isExterior = ClassifyFaceOrientation(faceNodes, graph);

            candidates.Add(new SkinCandidate
            {
                Nodes = faceNodes,
                EdgeIds = edgeIds,
                Accepted = isExterior, // Default: accept exterior faces only
                IsExterior = isExterior,
            });
        }

        return candidates;
    }

    /// <summary>
    /// Simple heuristic to classify if a face points outward (exterior) or inward.
    /// Uses the face normal relative to the vehicle center of mass.
    /// </summary>
    private static bool ClassifyFaceOrientation(List<Vector3I> faceNodes, FrameGraph graph)
    {
        if (faceNodes.Count < 3) return true;

        // Compute face center
        Vector3 center = Vector3.Zero;
        foreach (var node in faceNodes)
        {
            center += NodeGrid.GridToWorld(node);
        }
        center /= faceNodes.Count;

        // Compute face normal
        Vector3 a = NodeGrid.GridToWorld(faceNodes[0]);
        Vector3 b = NodeGrid.GridToWorld(faceNodes[1]);
        Vector3 c = NodeGrid.GridToWorld(faceNodes[2]);
        Vector3 normal = (b - a).Cross(c - a).Normalized();

        // Compute approximate vehicle center (average of all graph nodes)
        Vector3 vehicleCenter = Vector3.Zero;
        int count = 0;
        foreach (var node in graph.AllNodes)
        {
            vehicleCenter += NodeGrid.GridToWorld(node);
            count++;
        }
        if (count > 0) vehicleCenter /= count;

        // Face is exterior if normal points away from vehicle center
        Vector3 toCenter = (vehicleCenter - center).Normalized();
        return normal.Dot(toCenter) < 0;
    }

    /// <summary>
    /// Create a CompoundCommand for all accepted candidates.
    /// This becomes a single undo step.
    /// </summary>
    public static CompoundCommand? CreateAutoSkinCommand(
        List<SkinCandidate> candidates,
        string panelMaterial = "standard_sheet")
    {
        var accepted = candidates.Where(c => c.Accepted).ToList();
        if (accepted.Count == 0) return null;

        var commands = new List<ICommand>();

        foreach (var candidate in accepted)
        {
            // TODO: create PlacePanelCommand for each accepted face
            // For now, just track the data structure
        }

        return new CompoundCommand($"Auto-skin {accepted.Count} panels", commands);
    }
}

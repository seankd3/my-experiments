using Godot;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Forge.Building;

/// <summary>
/// The vehicle's skeleton as a graph data structure.
/// Nodes = grid positions where frame endpoints meet (junctions).
/// Edges = frame members (beams, ribs, stringers) connecting two nodes.
///
/// This single graph is the structural skeleton, future routing network,
/// panel attachment surface, and future physics body definition.
/// </summary>
public sealed class FrameGraph
{
    // ── Edge Data ───────────────────────────────────────────────────────

    /// <summary>Unique frame member identifier.</summary>
    public readonly record struct EdgeId(int Value)
    {
        public override string ToString() => $"E{Value}";
    }

    /// <summary>
    /// A single frame member (edge) in the graph.
    /// Stores geometry, type, material, and panel attachment info.
    /// </summary>
    public sealed class FrameEdge
    {
        public EdgeId Id { get; }
        public Vector3I StartNode { get; }
        public Vector3I EndNode { get; }
        public string FrameType { get; set; } // e.g. "spar", "longeron", "stringer", "tube", "angle", "rail"
        public string Material { get; set; }   // e.g. "aluminum_6061"

        // Curved rib properties (null/0 for straight beams)
        public float RibRadius { get; set; }             // 0 = straight beam
        public Vector3 RibArcDirection { get; set; }     // Unit vector indicating arc bow direction

        /// <summary>World-space length of this member (computed).</summary>
        public float Length => RibRadius > 0
            ? ComputeArcLength()
            : NodeGrid.WorldDistance(StartNode, EndNode);

        public FrameEdge(EdgeId id, Vector3I start, Vector3I end, string frameType, string material)
        {
            Id = id;
            StartNode = start;
            EndNode = end;
            FrameType = frameType;
            Material = material;
        }

        /// <summary>Returns the other end node given one end.</summary>
        public Vector3I OtherNode(Vector3I node)
        {
            if (node == StartNode) return EndNode;
            if (node == EndNode) return StartNode;
            throw new ArgumentException($"Node {node} is not an endpoint of edge {Id}");
        }

        /// <summary>Check if this edge connects to the given node.</summary>
        public bool TouchesNode(Vector3I node) => node == StartNode || node == EndNode;

        /// <summary>
        /// Get an ordered pair key for this edge (lower node first) to avoid duplicates.
        /// </summary>
        public (long, long) CanonicalKey()
        {
            long a = NodeGrid.PackKey(StartNode);
            long b = NodeGrid.PackKey(EndNode);
            return a <= b ? (a, b) : (b, a);
        }

        private float ComputeArcLength()
        {
            float chordLength = NodeGrid.WorldDistance(StartNode, EndNode);
            if (RibRadius <= 0 || float.IsPositiveInfinity(RibRadius))
                return chordLength;

            // Arc length = 2 * R * arcsin(chord / (2R))
            float halfChord = chordLength * 0.5f;
            if (halfChord >= RibRadius) return Mathf.Pi * RibRadius; // Semicircle
            float angle = 2f * Mathf.Asin(halfChord / RibRadius);
            return RibRadius * angle;
        }
    }

    // ── Internal Storage ────────────────────────────────────────────────

    private int _nextEdgeId = 1;
    private readonly Dictionary<EdgeId, FrameEdge> _edges = new();
    private readonly Dictionary<long, HashSet<EdgeId>> _nodeToEdges = new();

    // ── Events ──────────────────────────────────────────────────────────

    /// <summary>Fired when an edge is added. Listeners should regenerate affected meshes.</summary>
    public event Action<FrameEdge>? EdgeAdded;

    /// <summary>Fired when an edge is removed. Listeners should regenerate affected meshes.</summary>
    public event Action<FrameEdge>? EdgeRemoved;

    /// <summary>Fired when a node becomes empty (all edges removed). For cleanup.</summary>
    public event Action<Vector3I>? NodeRemoved;

    // ── Queries ─────────────────────────────────────────────────────────

    /// <summary>Total number of edges in the graph.</summary>
    public int EdgeCount => _edges.Count;

    /// <summary>Total number of unique nodes (junctions) in the graph.</summary>
    public int NodeCount => _nodeToEdges.Count;

    /// <summary>All edges in the graph.</summary>
    public IEnumerable<FrameEdge> AllEdges => _edges.Values;

    /// <summary>All occupied node positions.</summary>
    public IEnumerable<Vector3I> AllNodes => _nodeToEdges.Keys.Select(NodeGrid.UnpackKey);

    /// <summary>Get an edge by its ID.</summary>
    public FrameEdge? GetEdge(EdgeId id) => _edges.GetValueOrDefault(id);

    /// <summary>Get all edges connected to a node.</summary>
    public IReadOnlyCollection<FrameEdge> GetEdgesAtNode(Vector3I node)
    {
        long key = NodeGrid.PackKey(node);
        if (!_nodeToEdges.TryGetValue(key, out var edgeIds))
            return Array.Empty<FrameEdge>();

        return edgeIds.Select(id => _edges[id]).ToList();
    }

    /// <summary>Get all nodes connected to a given node (neighbors).</summary>
    public IEnumerable<Vector3I> GetNeighbors(Vector3I node)
    {
        foreach (var edge in GetEdgesAtNode(node))
        {
            yield return edge.OtherNode(node);
        }
    }

    /// <summary>Check if an edge already exists between two nodes (any type).</summary>
    public bool HasEdgeBetween(Vector3I a, Vector3I b)
    {
        long keyA = NodeGrid.PackKey(a);
        if (!_nodeToEdges.TryGetValue(keyA, out var edgeIds))
            return false;

        foreach (var id in edgeIds)
        {
            var edge = _edges[id];
            if (edge.OtherNode(a) == b) return true;
        }
        return false;
    }

    /// <summary>Find the edge between two specific nodes, if it exists.</summary>
    public FrameEdge? FindEdgeBetween(Vector3I a, Vector3I b)
    {
        long keyA = NodeGrid.PackKey(a);
        if (!_nodeToEdges.TryGetValue(keyA, out var edgeIds))
            return null;

        foreach (var id in edgeIds)
        {
            var edge = _edges[id];
            if (edge.OtherNode(a) == b) return edge;
        }
        return null;
    }

    /// <summary>Check if a node exists (has at least one edge).</summary>
    public bool HasNode(Vector3I node) => _nodeToEdges.ContainsKey(NodeGrid.PackKey(node));

    /// <summary>Get the degree (number of connected edges) of a node.</summary>
    public int NodeDegree(Vector3I node)
    {
        long key = NodeGrid.PackKey(node);
        return _nodeToEdges.TryGetValue(key, out var edges) ? edges.Count : 0;
    }

    // ── Mutations ───────────────────────────────────────────────────────

    /// <summary>
    /// Add a straight beam between two grid nodes.
    /// Returns the new edge, or null if invalid/duplicate.
    /// </summary>
    public FrameEdge? AddBeam(Vector3I start, Vector3I end, string frameType, string material)
    {
        if (start == end) return null;
        if (!NodeGrid.IsInBounds(start) || !NodeGrid.IsInBounds(end)) return null;
        if (!NodeGrid.IsValidBeamAlignment(start, end)) return null;
        if (HasEdgeBetween(start, end)) return null;

        var id = new EdgeId(_nextEdgeId++);
        var edge = new FrameEdge(id, start, end, frameType, material);

        _edges[id] = edge;
        RegisterNodeEdge(start, id);
        RegisterNodeEdge(end, id);

        EdgeAdded?.Invoke(edge);
        return edge;
    }

    /// <summary>
    /// Add a curved rib between two grid nodes with a specified radius.
    /// </summary>
    public FrameEdge? AddRib(Vector3I start, Vector3I end, float radius, Vector3 arcDirection,
                              string frameType, string material)
    {
        if (start == end) return null;
        if (!NodeGrid.IsInBounds(start) || !NodeGrid.IsInBounds(end)) return null;
        if (HasEdgeBetween(start, end)) return null;

        var id = new EdgeId(_nextEdgeId++);
        var edge = new FrameEdge(id, start, end, frameType, material)
        {
            RibRadius = radius,
            RibArcDirection = arcDirection.Normalized(),
        };

        _edges[id] = edge;
        RegisterNodeEdge(start, id);
        RegisterNodeEdge(end, id);

        EdgeAdded?.Invoke(edge);
        return edge;
    }

    /// <summary>Remove an edge by ID. Returns the removed edge, or null if not found.</summary>
    public FrameEdge? RemoveEdge(EdgeId id)
    {
        if (!_edges.TryGetValue(id, out var edge))
            return null;

        _edges.Remove(id);
        UnregisterNodeEdge(edge.StartNode, id);
        UnregisterNodeEdge(edge.EndNode, id);

        EdgeRemoved?.Invoke(edge);
        return edge;
    }

    /// <summary>Remove all edges. Fires events for each removal.</summary>
    public void Clear()
    {
        var allEdges = _edges.Values.ToList();
        foreach (var edge in allEdges)
        {
            RemoveEdge(edge.Id);
        }
    }

    // ── Re-insertion (for undo/redo) ────────────────────────────────────

    /// <summary>
    /// Re-insert a previously removed edge with its original ID.
    /// Used by the undo system to restore exact state.
    /// </summary>
    public bool ReinsertEdge(FrameEdge edge)
    {
        if (_edges.ContainsKey(edge.Id)) return false;

        _edges[edge.Id] = edge;
        RegisterNodeEdge(edge.StartNode, edge.Id);
        RegisterNodeEdge(edge.EndNode, edge.Id);

        // Keep _nextEdgeId ahead of any reinserted IDs
        if (edge.Id.Value >= _nextEdgeId)
            _nextEdgeId = edge.Id.Value + 1;

        EdgeAdded?.Invoke(edge);
        return true;
    }

    // ── Graph Algorithms ────────────────────────────────────────────────

    /// <summary>
    /// Find all closed loops (faces) of length 3 (triangles) and 4 (quads) in the graph.
    /// Used by auto-skin to identify where panels should go.
    /// Returns lists of node sequences forming each face.
    /// </summary>
    public List<List<Vector3I>> FindClosedFaces(int maxFaceSize = 4)
    {
        var faces = new List<List<Vector3I>>();
        var visited = new HashSet<string>();

        foreach (var nodeKey in _nodeToEdges.Keys)
        {
            var nodeA = NodeGrid.UnpackKey(nodeKey);
            var neighborsA = GetNeighbors(nodeA).ToList();

            // Find triangles: A-B-C where all three pairs are connected
            for (int i = 0; i < neighborsA.Count; i++)
            {
                var nodeB = neighborsA[i];
                for (int j = i + 1; j < neighborsA.Count; j++)
                {
                    var nodeC = neighborsA[j];
                    if (HasEdgeBetween(nodeB, nodeC))
                    {
                        var face = OrderFace(nodeA, nodeB, nodeC);
                        var key = FaceKey(face);
                        if (visited.Add(key))
                        {
                            faces.Add(face);
                        }
                    }
                }

                // Find quads: A-B-D-C where A-B, B-D, D-C, C-A all exist
                if (maxFaceSize >= 4)
                {
                    var neighborsB = GetNeighbors(nodeB).ToList();
                    for (int j = i + 1; j < neighborsA.Count; j++)
                    {
                        var nodeC = neighborsA[j];
                        foreach (var nodeD in neighborsB)
                        {
                            if (nodeD == nodeA || nodeD == nodeC) continue;
                            if (HasEdgeBetween(nodeD, nodeC))
                            {
                                var face = OrderFace(nodeA, nodeB, nodeD, nodeC);
                                var key = FaceKey(face);
                                if (visited.Add(key))
                                {
                                    faces.Add(face);
                                }
                            }
                        }
                    }
                }
            }
        }

        return faces;
    }

    /// <summary>
    /// Flood-fill connected component from a starting node.
    /// Returns all nodes reachable from the start.
    /// </summary>
    public HashSet<Vector3I> FloodFill(Vector3I start)
    {
        var visited = new HashSet<Vector3I>();
        var queue = new Queue<Vector3I>();
        queue.Enqueue(start);
        visited.Add(start);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            foreach (var neighbor in GetNeighbors(current))
            {
                if (visited.Add(neighbor))
                {
                    queue.Enqueue(neighbor);
                }
            }
        }

        return visited;
    }

    // ── Private Helpers ─────────────────────────────────────────────────

    private void RegisterNodeEdge(Vector3I node, EdgeId edgeId)
    {
        long key = NodeGrid.PackKey(node);
        if (!_nodeToEdges.TryGetValue(key, out var edgeIds))
        {
            edgeIds = new HashSet<EdgeId>();
            _nodeToEdges[key] = edgeIds;
        }
        edgeIds.Add(edgeId);
    }

    private void UnregisterNodeEdge(Vector3I node, EdgeId edgeId)
    {
        long key = NodeGrid.PackKey(node);
        if (!_nodeToEdges.TryGetValue(key, out var edgeIds)) return;

        edgeIds.Remove(edgeId);
        if (edgeIds.Count == 0)
        {
            _nodeToEdges.Remove(key);
            NodeRemoved?.Invoke(node);
        }
    }

    /// <summary>Order face nodes canonically to avoid duplicate detection.</summary>
    private static List<Vector3I> OrderFace(params Vector3I[] nodes)
    {
        var list = nodes.ToList();
        // Rotate so the smallest packed key is first
        int minIdx = 0;
        long minKey = NodeGrid.PackKey(list[0]);
        for (int i = 1; i < list.Count; i++)
        {
            long k = NodeGrid.PackKey(list[i]);
            if (k < minKey) { minKey = k; minIdx = i; }
        }
        // Rotate
        var result = new List<Vector3I>(list.Count);
        for (int i = 0; i < list.Count; i++)
        {
            result.Add(list[(i + minIdx) % list.Count]);
        }
        return result;
    }

    /// <summary>Generate a unique string key for a face (set of nodes).</summary>
    private static string FaceKey(List<Vector3I> nodes)
    {
        var keys = nodes.Select(NodeGrid.PackKey).OrderBy(k => k);
        return string.Join(",", keys);
    }
}

using Godot;
using System.Collections.Generic;

namespace Forge.Mesh;

/// <summary>
/// Catmull-Clark subdivision surface implementation for smooth panel rendering.
/// Takes a coarse control mesh (3 or 4 point patches) and subdivides to produce
/// smooth surfaces. Cache subdivided meshes, only regenerate when control points move.
/// </summary>
public static class SubdivisionSurface
{
    /// <summary>
    /// Apply Catmull-Clark subdivision to a quad mesh.
    /// </summary>
    /// <param name="vertices">Control mesh vertex positions.</param>
    /// <param name="quads">Quad face indices (4 per face).</param>
    /// <param name="levels">Number of subdivision levels (default 2).</param>
    /// <returns>Subdivided mesh vertices and triangle indices.</returns>
    public static (Vector3[] vertices, int[] triangles) Subdivide(
        Vector3[] vertices, int[][] quads, int levels = 2)
    {
        var currentVerts = new List<Vector3>(vertices);
        var currentFaces = new List<int[]>(quads);

        for (int level = 0; level < levels; level++)
        {
            (currentVerts, currentFaces) = SubdivideOnce(currentVerts, currentFaces);
        }

        // Convert quads to triangles for rendering
        var triangles = new List<int>();
        foreach (var face in currentFaces)
        {
            if (face.Length == 4)
            {
                triangles.Add(face[0]); triangles.Add(face[1]); triangles.Add(face[2]);
                triangles.Add(face[0]); triangles.Add(face[2]); triangles.Add(face[3]);
            }
            else if (face.Length == 3)
            {
                triangles.Add(face[0]); triangles.Add(face[1]); triangles.Add(face[2]);
            }
        }

        return (currentVerts.ToArray(), triangles.ToArray());
    }

    private static (List<Vector3>, List<int[]>) SubdivideOnce(
        List<Vector3> vertices, List<int[]> faces)
    {
        var newVerts = new List<Vector3>(vertices);
        var newFaces = new List<int[]>();

        // Step 1: Compute face points (centroid of each face)
        var facePoints = new List<int>();
        foreach (var face in faces)
        {
            Vector3 centroid = Vector3.Zero;
            foreach (int vi in face) centroid += vertices[vi];
            centroid /= face.Length;
            facePoints.Add(newVerts.Count);
            newVerts.Add(centroid);
        }

        // Step 2: Compute edge midpoints
        // Build edge → face mapping
        var edgeFaces = new Dictionary<(int, int), List<int>>();
        var edgeMidpoints = new Dictionary<(int, int), int>();

        for (int fi = 0; fi < faces.Count; fi++)
        {
            var face = faces[fi];
            for (int i = 0; i < face.Length; i++)
            {
                int a = face[i];
                int b = face[(i + 1) % face.Length];
                var edgeKey = a < b ? (a, b) : (b, a);

                if (!edgeFaces.ContainsKey(edgeKey))
                    edgeFaces[edgeKey] = new List<int>();
                edgeFaces[edgeKey].Add(fi);
            }
        }

        foreach (var (edge, adjFaces) in edgeFaces)
        {
            Vector3 edgeMid = (vertices[edge.Item1] + vertices[edge.Item2]) * 0.5f;

            if (adjFaces.Count == 2)
            {
                // Interior edge: average of edge midpoint and adjacent face points
                Vector3 fp1 = newVerts[facePoints[adjFaces[0]]];
                Vector3 fp2 = newVerts[facePoints[adjFaces[1]]];
                Vector3 edgePoint = (edgeMid + (fp1 + fp2) * 0.5f) * 0.5f;
                edgeMidpoints[edge] = newVerts.Count;
                newVerts.Add(edgePoint);
            }
            else
            {
                // Boundary edge: just use midpoint
                edgeMidpoints[edge] = newVerts.Count;
                newVerts.Add(edgeMid);
            }
        }

        // Step 3: Update original vertex positions
        // (simplified — move toward average of adjacent face points and edge midpoints)
        // For MVP, skip vertex averaging to keep it simple

        // Step 4: Create new faces
        for (int fi = 0; fi < faces.Count; fi++)
        {
            var face = faces[fi];
            int fp = facePoints[fi];

            for (int i = 0; i < face.Length; i++)
            {
                int v = face[i];
                int nextV = face[(i + 1) % face.Length];
                int prevV = face[(i + face.Length - 1) % face.Length];

                var edgeNext = v < nextV ? (v, nextV) : (nextV, v);
                var edgePrev = prevV < v ? (prevV, v) : (v, prevV);

                int epNext = edgeMidpoints[edgeNext];
                int epPrev = edgeMidpoints[edgePrev];

                newFaces.Add(new[] { v, epNext, fp, epPrev });
            }
        }

        return (newVerts, newFaces);
    }
}

using Godot;
using System.Collections.Generic;
using Forge.Building;

namespace Forge.Mesh;

/// <summary>
/// Generates 3D meshes for skin panels.
/// Flat panels: triangulated quad or tri from attachment nodes.
/// Curved panels: interpolate between curved rib attachments, then subdivide.
/// Uses Catmull-Clark subdivision (2 levels) for smooth surfaces.
/// Cache subdivided meshes, only regenerate when control points move.
/// </summary>
public static class PanelMeshGenerator
{
    /// <summary>
    /// Generate a flat panel mesh from 3 or 4 attachment node positions.
    /// </summary>
    public static ArrayMesh GenerateFlatPanel(Vector3[] attachmentPoints)
    {
        if (attachmentPoints.Length < 3 || attachmentPoints.Length > 4)
            return new ArrayMesh();

        var vertices = new List<Vector3>();
        var normals = new List<Vector3>();
        var indices = new List<int>();

        // Add vertices
        foreach (var p in attachmentPoints)
            vertices.Add(p);

        if (attachmentPoints.Length == 3)
        {
            // Single triangle
            var normal = (attachmentPoints[1] - attachmentPoints[0])
                .Cross(attachmentPoints[2] - attachmentPoints[0]).Normalized();
            normals.Add(normal);
            normals.Add(normal);
            normals.Add(normal);
            indices.AddRange(new[] { 0, 1, 2 });

            // Double-sided: add reverse face
            vertices.Add(attachmentPoints[0]);
            vertices.Add(attachmentPoints[1]);
            vertices.Add(attachmentPoints[2]);
            normals.Add(-normal);
            normals.Add(-normal);
            normals.Add(-normal);
            indices.AddRange(new[] { 5, 4, 3 });
        }
        else
        {
            // Quad: two triangles, double-sided
            var normal = (attachmentPoints[1] - attachmentPoints[0])
                .Cross(attachmentPoints[3] - attachmentPoints[0]).Normalized();

            for (int i = 0; i < 4; i++) normals.Add(normal);
            indices.AddRange(new[] { 0, 1, 2, 0, 2, 3 });

            // Reverse face
            for (int i = 0; i < 4; i++)
            {
                vertices.Add(attachmentPoints[i]);
                normals.Add(-normal);
            }
            indices.AddRange(new[] { 6, 5, 4, 7, 6, 4 });
        }

        return BuildArrayMesh(vertices, normals, indices);
    }

    /// <summary>
    /// Generate a panel mesh from grid coordinates.
    /// Converts grid coords to world positions first.
    /// </summary>
    public static ArrayMesh GeneratePanelFromGrid(Vector3I[] gridNodes)
    {
        var worldPoints = new Vector3[gridNodes.Length];
        for (int i = 0; i < gridNodes.Length; i++)
        {
            worldPoints[i] = NodeGrid.GridToWorld(gridNodes[i]);
        }
        return GenerateFlatPanel(worldPoints);
    }

    /// <summary>
    /// Generate a curved panel by lofting between two rib arc paths.
    /// Each rib provides a sequence of points; the panel surface interpolates between them.
    /// </summary>
    public static ArrayMesh GenerateLoftedPanel(List<Vector3> ribA, List<Vector3> ribB)
    {
        if (ribA.Count < 2 || ribB.Count < 2)
            return new ArrayMesh();

        // Ensure both ribs have the same number of points (resample if needed)
        int segments = System.Math.Max(ribA.Count, ribB.Count);
        var sampledA = ResamplePath(ribA, segments);
        var sampledB = ResamplePath(ribB, segments);

        var vertices = new List<Vector3>();
        var normals = new List<Vector3>();
        var indices = new List<int>();

        // Create a grid of vertices between the two ribs
        for (int i = 0; i < segments; i++)
        {
            vertices.Add(sampledA[i]);
            vertices.Add(sampledB[i]);
        }

        // Triangulate: each pair of adjacent cross-rib lines forms a quad
        for (int i = 0; i < segments - 1; i++)
        {
            int a = i * 2;
            int b = i * 2 + 1;
            int c = (i + 1) * 2 + 1;
            int d = (i + 1) * 2;

            // Front face
            indices.Add(a); indices.Add(b); indices.Add(c);
            indices.Add(a); indices.Add(c); indices.Add(d);
        }

        // Compute normals
        var normalArray = new Vector3[vertices.Count];
        for (int i = 0; i < indices.Count; i += 3)
        {
            var v0 = vertices[indices[i]];
            var v1 = vertices[indices[i + 1]];
            var v2 = vertices[indices[i + 2]];
            var fn = (v1 - v0).Cross(v2 - v0).Normalized();
            normalArray[indices[i]] += fn;
            normalArray[indices[i + 1]] += fn;
            normalArray[indices[i + 2]] += fn;
        }
        for (int i = 0; i < normalArray.Length; i++)
        {
            normalArray[i] = normalArray[i].Normalized();
            normals.Add(normalArray[i]);
        }

        // Add back faces
        int offset = vertices.Count;
        for (int i = 0; i < offset; i++)
        {
            vertices.Add(vertices[i]);
            normals.Add(-normals[i]);
        }
        for (int i = 0; i < indices.Count; i += 3)
        {
            indices.Add(indices[i + 2] + offset);
            indices.Add(indices[i + 1] + offset);
            indices.Add(indices[i] + offset);
        }

        return BuildArrayMesh(vertices, normals, indices);
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private static List<Vector3> ResamplePath(List<Vector3> path, int targetCount)
    {
        if (path.Count == targetCount) return path;
        if (path.Count == 0) return new List<Vector3>();

        var result = new List<Vector3>(targetCount);

        // Calculate total length
        float totalLen = 0;
        for (int i = 1; i < path.Count; i++)
            totalLen += (path[i] - path[i - 1]).Length();

        float stepLen = totalLen / (targetCount - 1);
        result.Add(path[0]);

        float accum = 0;
        int pathIdx = 0;
        for (int i = 1; i < targetCount - 1; i++)
        {
            float targetDist = stepLen * i;
            while (pathIdx < path.Count - 2)
            {
                float segLen = (path[pathIdx + 1] - path[pathIdx]).Length();
                if (accum + segLen >= targetDist)
                {
                    float t = (targetDist - accum) / segLen;
                    result.Add(path[pathIdx].Lerp(path[pathIdx + 1], t));
                    break;
                }
                accum += segLen;
                pathIdx++;
            }
        }

        result.Add(path[^1]);
        return result;
    }

    private static ArrayMesh BuildArrayMesh(List<Vector3> vertices, List<Vector3> normals, List<int> indices)
    {
        var mesh = new ArrayMesh();
        var arrays = new Godot.Collections.Array();
        arrays.Resize((int)Godot.Mesh.ArrayType.Max);

        var packedVerts = new PackedVector3Array();
        var packedNormals = new PackedVector3Array();
        var packedIndices = new PackedInt32Array();

        foreach (var v in vertices) packedVerts.Append(v);
        foreach (var n in normals) packedNormals.Append(n);
        foreach (var idx in indices) packedIndices.Append(idx);

        arrays[(int)Godot.Mesh.ArrayType.Vertex] = packedVerts;
        arrays[(int)Godot.Mesh.ArrayType.Normal] = packedNormals;
        arrays[(int)Godot.Mesh.ArrayType.Index] = packedIndices;

        mesh.AddSurfaceFromArrays(Godot.Mesh.PrimitiveType.Triangles, arrays);
        return mesh;
    }
}

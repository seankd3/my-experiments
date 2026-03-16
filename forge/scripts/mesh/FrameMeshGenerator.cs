using Godot;
using System;
using System.Collections.Generic;
using Forge.Building;
using Forge.Core;

namespace Forge.Mesh;

/// <summary>
/// Generates 3D meshes for frame members by extruding cross-section profiles along beam axes.
/// Straight beams get simple extruded box/tube geometry.
/// Curved ribs get cross-section extruded along arc paths.
/// </summary>
public static class FrameMeshGenerator
{
    /// <summary>
    /// Generate an ArrayMesh for a straight beam.
    /// Extrudes a rectangular cross-section along the beam axis.
    /// </summary>
    public static ArrayMesh GenerateBeamMesh(Vector3I start, Vector3I end, float width, float height)
    {
        var startWorld = NodeGrid.GridToWorld(start);
        var endWorld = NodeGrid.GridToWorld(end);
        var direction = (endWorld - startWorld).Normalized();
        float length = (endWorld - startWorld).Length();

        if (length < 0.001f)
            return new ArrayMesh();

        // Build a local coordinate frame
        Vector3 up = Mathf.Abs(direction.Dot(Vector3.Up)) > 0.99f
            ? Vector3.Forward
            : Vector3.Up;
        Vector3 right = direction.Cross(up).Normalized();
        up = right.Cross(direction).Normalized();

        float hw = width * 0.5f;
        float hh = height * 0.5f;

        // 8 vertices of a box
        var vertices = new Vector3[8];
        vertices[0] = startWorld + (-right * hw) + (-up * hh);
        vertices[1] = startWorld + (right * hw) + (-up * hh);
        vertices[2] = startWorld + (right * hw) + (up * hh);
        vertices[3] = startWorld + (-right * hw) + (up * hh);
        vertices[4] = endWorld + (-right * hw) + (-up * hh);
        vertices[5] = endWorld + (right * hw) + (-up * hh);
        vertices[6] = endWorld + (right * hw) + (up * hh);
        vertices[7] = endWorld + (-right * hw) + (up * hh);

        // 12 triangles (6 faces × 2 tris)
        int[] indices =
        {
            // Front (start face)
            0, 2, 1, 0, 3, 2,
            // Back (end face)
            4, 5, 6, 4, 6, 7,
            // Bottom
            0, 1, 5, 0, 5, 4,
            // Top
            2, 3, 7, 2, 7, 6,
            // Left
            0, 4, 7, 0, 7, 3,
            // Right
            1, 2, 6, 1, 6, 5,
        };

        // Compute normals per-face
        var normals = ComputeNormals(vertices, indices);

        return BuildArrayMesh(vertices, normals, indices);
    }

    /// <summary>
    /// Generate an ArrayMesh for a tube-style frame member.
    /// </summary>
    public static ArrayMesh GenerateTubeMesh(Vector3I start, Vector3I end, float outerRadius, int segments = 8)
    {
        var startWorld = NodeGrid.GridToWorld(start);
        var endWorld = NodeGrid.GridToWorld(end);
        var direction = (endWorld - startWorld).Normalized();

        Vector3 up = Mathf.Abs(direction.Dot(Vector3.Up)) > 0.99f
            ? Vector3.Forward
            : Vector3.Up;
        Vector3 right = direction.Cross(up).Normalized();
        up = right.Cross(direction).Normalized();

        var vertices = new List<Vector3>();
        var indices = new List<int>();

        // Generate two rings of vertices
        for (int ring = 0; ring < 2; ring++)
        {
            Vector3 center = ring == 0 ? startWorld : endWorld;
            for (int i = 0; i < segments; i++)
            {
                float angle = (float)i / segments * Mathf.Tau;
                Vector3 offset = (right * Mathf.Cos(angle) + up * Mathf.Sin(angle)) * outerRadius;
                vertices.Add(center + offset);
            }
        }

        // Connect rings with quads (2 triangles each)
        for (int i = 0; i < segments; i++)
        {
            int next = (i + 1) % segments;
            int a = i;
            int b = next;
            int c = segments + next;
            int d = segments + i;

            indices.Add(a); indices.Add(b); indices.Add(c);
            indices.Add(a); indices.Add(c); indices.Add(d);
        }

        // Cap the ends
        int startCenter = vertices.Count;
        vertices.Add(startWorld);
        for (int i = 0; i < segments; i++)
        {
            int next = (i + 1) % segments;
            indices.Add(startCenter); indices.Add(next); indices.Add(i);
        }

        int endCenter = vertices.Count;
        vertices.Add(endWorld);
        for (int i = 0; i < segments; i++)
        {
            int next = (i + 1) % segments;
            indices.Add(endCenter); indices.Add(segments + i); indices.Add(segments + next);
        }

        var vertArray = vertices.ToArray();
        var idxArray = indices.ToArray();
        var normals = ComputeNormals(vertArray, idxArray);
        return BuildArrayMesh(vertArray, normals, idxArray);
    }

    /// <summary>
    /// Generate an ArrayMesh for a curved rib by extruding cross-section along an arc.
    /// </summary>
    public static ArrayMesh GenerateRibMesh(Vector3I start, Vector3I end, float radius,
                                             Vector3 arcDirection, float width, float height,
                                             int arcSegments = 16)
    {
        // Generate arc points
        var arcPoints = TessellateArc(start, end, radius, arcDirection, arcSegments);

        if (arcPoints.Count < 2)
            return new ArrayMesh();

        var vertices = new List<Vector3>();
        var indices = new List<int>();

        // For each arc segment, create a rectangular cross-section
        for (int i = 0; i < arcPoints.Count; i++)
        {
            Vector3 pos = arcPoints[i];
            Vector3 tangent;

            if (i == 0)
                tangent = (arcPoints[1] - arcPoints[0]).Normalized();
            else if (i == arcPoints.Count - 1)
                tangent = (arcPoints[i] - arcPoints[i - 1]).Normalized();
            else
                tangent = (arcPoints[i + 1] - arcPoints[i - 1]).Normalized();

            Vector3 up = Mathf.Abs(tangent.Dot(Vector3.Up)) > 0.99f
                ? Vector3.Forward
                : Vector3.Up;
            Vector3 right = tangent.Cross(up).Normalized();
            up = right.Cross(tangent).Normalized();

            float hw = width * 0.5f;
            float hh = height * 0.5f;

            vertices.Add(pos + (-right * hw) + (-up * hh));
            vertices.Add(pos + (right * hw) + (-up * hh));
            vertices.Add(pos + (right * hw) + (up * hh));
            vertices.Add(pos + (-right * hw) + (up * hh));
        }

        // Connect adjacent cross-sections
        for (int i = 0; i < arcPoints.Count - 1; i++)
        {
            int baseIdx = i * 4;
            for (int face = 0; face < 4; face++)
            {
                int a = baseIdx + face;
                int b = baseIdx + (face + 1) % 4;
                int c = baseIdx + 4 + (face + 1) % 4;
                int d = baseIdx + 4 + face;

                indices.Add(a); indices.Add(b); indices.Add(c);
                indices.Add(a); indices.Add(c); indices.Add(d);
            }
        }

        var vertArray = vertices.ToArray();
        var idxArray = indices.ToArray();
        var normals = ComputeNormals(vertArray, idxArray);
        return BuildArrayMesh(vertArray, normals, idxArray);
    }

    /// <summary>
    /// Tessellate a circular arc between two world positions.
    /// Returns a list of world-space points along the arc.
    /// </summary>
    public static List<Vector3> TessellateArc(Vector3I start, Vector3I end, float radius,
                                               Vector3 arcDirection, int segments = 16)
    {
        var startW = NodeGrid.GridToWorld(start);
        var endW = NodeGrid.GridToWorld(end);

        if (float.IsPositiveInfinity(radius) || radius <= 0)
        {
            // Straight line
            var straight = new List<Vector3>();
            for (int i = 0; i <= segments; i++)
            {
                float t = (float)i / segments;
                straight.Add(startW.Lerp(endW, t));
            }
            return straight;
        }

        Vector3 chord = endW - startW;
        float chordLen = chord.Length();
        if (chordLen < 0.001f) return new List<Vector3> { startW };

        Vector3 mid = (startW + endW) * 0.5f;
        Vector3 chordDir = chord / chordLen;

        // Perpendicular direction in the arc plane
        Vector3 perpDir = arcDirection.Normalized();
        // Ensure perpDir is perpendicular to chord
        perpDir = (perpDir - chordDir * perpDir.Dot(chordDir)).Normalized();
        if (perpDir.LengthSquared() < 0.001f)
        {
            // Fallback: use world up
            perpDir = Vector3.Up;
            perpDir = (perpDir - chordDir * perpDir.Dot(chordDir)).Normalized();
        }

        float halfChord = chordLen * 0.5f;
        if (halfChord > radius) radius = halfChord; // Clamp to semicircle

        float sagitta = radius - Mathf.Sqrt(Mathf.Max(0, radius * radius - halfChord * halfChord));
        float centerDist = radius - sagitta;

        Vector3 center = mid - perpDir * centerDist;

        // Vectors from center to start and end
        Vector3 toStart = (startW - center).Normalized() * radius;
        Vector3 toEnd = (endW - center).Normalized() * radius;

        // Angle between them
        float angle = toStart.AngleTo(toEnd);
        Vector3 axis = toStart.Cross(toEnd).Normalized();
        if (axis.LengthSquared() < 0.001f)
        {
            axis = chordDir.Cross(perpDir).Normalized();
        }

        var points = new List<Vector3>();
        for (int i = 0; i <= segments; i++)
        {
            float t = (float)i / segments;
            Vector3 rotated = toStart.Rotated(axis, angle * t);
            points.Add(center + rotated);
        }

        return points;
    }

    // ── Private Helpers ─────────────────────────────────────────────────

    private static Vector3[] ComputeNormals(Vector3[] vertices, int[] indices)
    {
        var normals = new Vector3[vertices.Length];

        for (int i = 0; i < indices.Length; i += 3)
        {
            var v0 = vertices[indices[i]];
            var v1 = vertices[indices[i + 1]];
            var v2 = vertices[indices[i + 2]];
            var faceNormal = (v1 - v0).Cross(v2 - v0).Normalized();

            normals[indices[i]] += faceNormal;
            normals[indices[i + 1]] += faceNormal;
            normals[indices[i + 2]] += faceNormal;
        }

        for (int i = 0; i < normals.Length; i++)
        {
            normals[i] = normals[i].Normalized();
        }

        return normals;
    }

    private static ArrayMesh BuildArrayMesh(Vector3[] vertices, Vector3[] normals, int[] indices)
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

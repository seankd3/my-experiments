using Godot;
using System;
using Forge.Core;

namespace Forge.Building;

/// <summary>
/// 3D lattice of nodes at regular intervals (0.25m).
/// Frame pieces snap endpoint-to-endpoint at grid nodes.
/// Panels attach between frame members.
/// Nodes are invisible by default; highlight on cursor proximity.
/// </summary>
public sealed class NodeGrid
{
    // ── Conversion ──────────────────────────────────────────────────────

    /// <summary>Convert integer grid coordinates to world-space position.</summary>
    public static Vector3 GridToWorld(Vector3I gridCoord)
    {
        return new Vector3(
            gridCoord.X * Constants.GridSpacing,
            gridCoord.Y * Constants.GridSpacing,
            gridCoord.Z * Constants.GridSpacing
        );
    }

    /// <summary>Convert world-space position to nearest grid coordinates.</summary>
    public static Vector3I WorldToGrid(Vector3 worldPos)
    {
        return new Vector3I(
            Mathf.RoundToInt(worldPos.X / Constants.GridSpacing),
            Mathf.RoundToInt(worldPos.Y / Constants.GridSpacing),
            Mathf.RoundToInt(worldPos.Z / Constants.GridSpacing)
        );
    }

    /// <summary>Snap a world-space position to the nearest grid node position.</summary>
    public static Vector3 SnapToGrid(Vector3 worldPos)
    {
        return GridToWorld(WorldToGrid(worldPos));
    }

    // ── Bounds Checking ─────────────────────────────────────────────────

    /// <summary>Check if grid coordinates are within the valid grid bounds.</summary>
    public static bool IsInBounds(Vector3I gridCoord)
    {
        return gridCoord.X >= 0 && gridCoord.X < Constants.GridBounds.X
            && gridCoord.Y >= 0 && gridCoord.Y < Constants.GridBounds.Y
            && gridCoord.Z >= 0 && gridCoord.Z < Constants.GridBounds.Z;
    }

    // ── Beam Alignment Validation ───────────────────────────────────────

    /// <summary>
    /// Check if a beam between two nodes follows a valid grid alignment.
    /// Valid alignments: axis-aligned, face-diagonal (45°), or body-diagonal.
    /// </summary>
    public static bool IsValidBeamAlignment(Vector3I a, Vector3I b)
    {
        int dx = Math.Abs(b.X - a.X);
        int dy = Math.Abs(b.Y - a.Y);
        int dz = Math.Abs(b.Z - a.Z);

        // Count non-zero deltas
        int nonZero = (dx > 0 ? 1 : 0) + (dy > 0 ? 1 : 0) + (dz > 0 ? 1 : 0);

        if (nonZero == 0) return false; // Same node
        if (nonZero == 1) return true;  // Axis-aligned

        // Face diagonal: two non-zero deltas must be equal
        if (nonZero == 2)
        {
            if (dx > 0 && dy > 0) return dx == dy;
            if (dx > 0 && dz > 0) return dx == dz;
            return dy == dz;
        }

        // Body diagonal: all three must be equal
        return dx == dy && dy == dz;
    }

    /// <summary>Distance between two grid nodes in node units.</summary>
    public static float GridDistance(Vector3I a, Vector3I b)
    {
        Vector3I d = b - a;
        return Mathf.Sqrt(d.X * d.X + d.Y * d.Y + d.Z * d.Z);
    }

    /// <summary>World-space distance between two grid nodes in meters.</summary>
    public static float WorldDistance(Vector3I a, Vector3I b)
    {
        return (GridToWorld(b) - GridToWorld(a)).Length();
    }

    // ── Raycast Grid Intersection ───────────────────────────────────────

    /// <summary>
    /// Find the nearest grid node to a ray (from camera).
    /// Returns the node if within snap distance, null otherwise.
    /// </summary>
    /// <param name="rayOrigin">World-space ray origin.</param>
    /// <param name="rayDir">Normalized world-space ray direction.</param>
    /// <param name="maxDistance">Maximum raycast distance.</param>
    /// <returns>Nearest grid node coordinates, or null if none within snap distance.</returns>
    public static Vector3I? FindNearestNodeToRay(Vector3 rayOrigin, Vector3 rayDir, float maxDistance = 50f)
    {
        // Step along the ray at half-grid-spacing intervals and find the closest node
        float stepSize = Constants.GridSpacing * 0.5f;
        int steps = (int)(maxDistance / stepSize);

        Vector3I? bestNode = null;
        float bestDist = Constants.NodeSnapDistance;

        for (int i = 0; i < steps; i++)
        {
            Vector3 samplePos = rayOrigin + rayDir * (stepSize * i);
            Vector3I gridPos = WorldToGrid(samplePos);

            if (!IsInBounds(gridPos)) continue;

            Vector3 nodeWorldPos = GridToWorld(gridPos);
            // Distance from the ray to this node
            Vector3 toNode = nodeWorldPos - rayOrigin;
            float along = toNode.Dot(rayDir);
            if (along < 0) continue;

            Vector3 closest = rayOrigin + rayDir * along;
            float dist = (nodeWorldPos - closest).Length();

            if (dist < bestDist)
            {
                bestDist = dist;
                bestNode = gridPos;
            }
        }

        return bestNode;
    }

    /// <summary>
    /// Find the nearest grid node to a world position on a construction plane.
    /// Used when the ray hits a reference plane (ground, custom work plane).
    /// </summary>
    public static Vector3I? FindNearestNodeOnPlane(Vector3 hitPoint)
    {
        Vector3I gridPos = WorldToGrid(hitPoint);
        if (!IsInBounds(gridPos)) return null;

        Vector3 snapped = GridToWorld(gridPos);
        float dist = (snapped - hitPoint).Length();

        return dist <= Constants.NodeSnapDistance ? gridPos : null;
    }

    // ── Unique Key ──────────────────────────────────────────────────────

    /// <summary>Pack grid coordinates into a single long for use as dictionary key.</summary>
    public static long PackKey(Vector3I coord)
    {
        // Each axis fits in 16 bits (max 65535, we only use up to 256)
        return ((long)(coord.X & 0xFFFF) << 32)
             | ((long)(coord.Y & 0xFFFF) << 16)
             | (long)(coord.Z & 0xFFFF);
    }

    /// <summary>Unpack a key back to grid coordinates.</summary>
    public static Vector3I UnpackKey(long key)
    {
        int x = (int)((key >> 32) & 0xFFFF);
        int y = (int)((key >> 16) & 0xFFFF);
        int z = (int)(key & 0xFFFF);
        return new Vector3I(x, y, z);
    }
}

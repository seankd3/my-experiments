using Godot;
using System;

namespace Forge.Core;

/// <summary>
/// Central input handler for Build Mode. Routes input to the active tool,
/// manages tool switching via keyboard shortcuts, and provides cursor raycast state.
/// </summary>
public partial class InputManager : Node
{
    /// <summary>Current cursor ray from camera through mouse position.</summary>
    public Vector3 CursorRayOrigin { get; private set; }
    public Vector3 CursorRayDirection { get; private set; }

    /// <summary>Current cursor hit point on the construction plane (Y=0 by default).</summary>
    public Vector3? CursorHitPoint { get; private set; }

    /// <summary>Currently hovered grid node (nearest to cursor ray).</summary>
    public Vector3I? HoveredNode { get; private set; }

    /// <summary>Screen-space mouse position.</summary>
    public Vector2 MousePosition { get; private set; }

    /// <summary>Active tool identifier.</summary>
    public string ActiveTool { get; set; } = "select";

    /// <summary>Whether symmetry mode is active (mirror across X=0).</summary>
    public bool SymmetryEnabled { get; set; } = true;

    /// <summary>Whether X-ray mode is active.</summary>
    public bool XRayEnabled { get; set; }

    // Events
    public event Action<Vector3I>? NodeClicked;
    public event Action<Vector3I>? NodeHovered;
    public event Action? ClickedEmpty;
    public event Action<string>? ToolChanged;

    private EditorCamera? _camera;

    public override void _Ready()
    {
        // Camera will be set by the editor main scene
    }

    /// <summary>Set the camera reference for raycasting.</summary>
    public void SetCamera(EditorCamera camera)
    {
        _camera = camera;
    }

    public override void _UnhandledInput(InputEvent @event)
    {
        if (@event is InputEventMouseMotion mouseMotion)
        {
            MousePosition = mouseMotion.Position;
            UpdateCursorRay();
        }
        else if (@event is InputEventMouseButton mouseButton)
        {
            if (mouseButton.ButtonIndex == MouseButton.Left && mouseButton.Pressed)
            {
                HandleLeftClick();
            }
        }
        else if (@event is InputEventKey key && key.Pressed && !key.Echo)
        {
            HandleKeyPress(key);
        }
    }

    public override void _Process(double delta)
    {
        UpdateCursorRay();
    }

    private void UpdateCursorRay()
    {
        if (_camera == null) return;

        var (origin, direction) = _camera.GetRayFromScreen(MousePosition);
        CursorRayOrigin = origin;
        CursorRayDirection = direction;

        // Intersect with Y=0 plane (ground/construction plane)
        if (Mathf.Abs(direction.Y) > 0.001f)
        {
            float t = -origin.Y / direction.Y;
            if (t > 0)
            {
                CursorHitPoint = origin + direction * t;
            }
            else
            {
                CursorHitPoint = null;
            }
        }

        // Find nearest grid node
        var nearestNode = Building.NodeGrid.FindNearestNodeToRay(origin, direction);
        if (nearestNode != HoveredNode)
        {
            HoveredNode = nearestNode;
            if (nearestNode.HasValue)
            {
                NodeHovered?.Invoke(nearestNode.Value);
            }
        }
    }

    private void HandleLeftClick()
    {
        if (HoveredNode.HasValue)
        {
            NodeClicked?.Invoke(HoveredNode.Value);
        }
        else
        {
            ClickedEmpty?.Invoke();
        }
    }

    private void HandleKeyPress(InputEventKey key)
    {
        // Tool switching shortcuts (only when no modifier keys)
        if (!key.CtrlPressed && !key.AltPressed && !key.MetaPressed)
        {
            string? newTool = key.Keycode switch
            {
                Key.Q => "select",
                Key.Key1 => "stringer",
                Key.Key2 => "longeron",
                Key.Key3 => "spar",
                Key.Key4 => "tube",
                Key.Key5 => "angle",
                Key.Key6 => "rail",
                Key.R => "rib",
                Key.P => "panel",
                Key.X when !key.ShiftPressed => null, // X-ray toggle handled via input map
                _ => null,
            };

            if (newTool != null && newTool != ActiveTool)
            {
                ActiveTool = newTool;
                ToolChanged?.Invoke(newTool);
            }
        }
    }
}

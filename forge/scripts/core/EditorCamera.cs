using Godot;
using Forge.Core;

namespace Forge.Core;

/// <summary>
/// Orbit camera for Build Mode.
/// Right-drag orbits around vehicle center of mass.
/// Middle-drag pans the view.
/// Scroll wheel zooms in/out.
/// Double-click surface snaps camera perpendicular to that face.
/// Camera can clip through panels to see inside.
/// </summary>
public partial class EditorCamera : Camera3D
{
    /// <summary>The point the camera orbits around.</summary>
    private Vector3 _target = Vector3.Zero;

    /// <summary>Orbit angles (yaw, pitch) in radians.</summary>
    private float _yaw = Constants.CameraDefaultYaw;
    private float _pitch = Constants.CameraDefaultPitch;

    /// <summary>Distance from target.</summary>
    private float _distance = Constants.CameraDefaultDistance;

    /// <summary>Whether right mouse is held for orbiting.</summary>
    private bool _orbiting;

    /// <summary>Whether middle mouse is held for panning.</summary>
    private bool _panning;

    /// <summary>Last mouse position for delta calculation.</summary>
    private Vector2 _lastMousePos;

    public override void _Ready()
    {
        UpdateTransform();
    }

    public override void _UnhandledInput(InputEvent @event)
    {
        if (@event is InputEventMouseButton mouseButton)
        {
            HandleMouseButton(mouseButton);
        }
        else if (@event is InputEventMouseMotion mouseMotion)
        {
            HandleMouseMotion(mouseMotion);
        }
    }

    private void HandleMouseButton(InputEventMouseButton ev)
    {
        switch (ev.ButtonIndex)
        {
            // Right-click: orbit
            case MouseButton.Right:
                _orbiting = ev.Pressed;
                _lastMousePos = ev.Position;
                break;

            // Middle-click: pan
            case MouseButton.Middle:
                _panning = ev.Pressed;
                _lastMousePos = ev.Position;
                break;

            // Scroll: zoom
            case MouseButton.WheelUp:
                _distance = Mathf.Max(Constants.CameraMinDistance,
                    _distance - Constants.CameraZoomSpeed * _distance * 0.1f);
                UpdateTransform();
                break;

            case MouseButton.WheelDown:
                _distance = Mathf.Min(Constants.CameraMaxDistance,
                    _distance + Constants.CameraZoomSpeed * _distance * 0.1f);
                UpdateTransform();
                break;
        }
    }

    private void HandleMouseMotion(InputEventMouseMotion ev)
    {
        Vector2 delta = ev.Position - _lastMousePos;
        _lastMousePos = ev.Position;

        if (_orbiting)
        {
            _yaw -= delta.X * Constants.CameraOrbitSpeed;
            _pitch -= delta.Y * Constants.CameraOrbitSpeed;
            _pitch = Mathf.Clamp(_pitch, -Mathf.Pi * 0.49f, Mathf.Pi * 0.49f);
            UpdateTransform();
        }
        else if (_panning)
        {
            // Pan in the camera's local XY plane
            Vector3 right = GlobalTransform.Basis.X;
            Vector3 up = GlobalTransform.Basis.Y;
            float panScale = _distance * Constants.CameraPanSpeed;
            _target -= right * delta.X * panScale * 0.001f;
            _target += up * delta.Y * panScale * 0.001f;
            UpdateTransform();
        }
    }

    /// <summary>
    /// Snap the camera to look perpendicular to a given surface normal at a position.
    /// Used for double-click snap-to-face.
    /// </summary>
    public void SnapToFace(Vector3 position, Vector3 normal)
    {
        _target = position;
        // Calculate yaw and pitch from the normal direction
        Vector3 dir = -normal.Normalized();
        _yaw = Mathf.Atan2(dir.X, dir.Z);
        _pitch = -Mathf.Asin(Mathf.Clamp(dir.Y, -1f, 1f));
        _distance = Mathf.Max(Constants.CameraMinDistance, 2f);
        UpdateTransform();
    }

    /// <summary>Reset camera to default position.</summary>
    public void ResetView()
    {
        _target = Vector3.Zero;
        _yaw = Constants.CameraDefaultYaw;
        _pitch = Constants.CameraDefaultPitch;
        _distance = Constants.CameraDefaultDistance;
        UpdateTransform();
    }

    /// <summary>Set the orbit target (e.g., to vehicle center of mass).</summary>
    public void SetTarget(Vector3 target)
    {
        _target = target;
        UpdateTransform();
    }

    /// <summary>Get a ray from the camera through a screen point.</summary>
    public (Vector3 origin, Vector3 direction) GetRayFromScreen(Vector2 screenPos)
    {
        Vector3 origin = ProjectRayOrigin(screenPos);
        Vector3 direction = ProjectRayNormal(screenPos);
        return (origin, direction);
    }

    private void UpdateTransform()
    {
        // Spherical to Cartesian
        float x = _distance * Mathf.Cos(_pitch) * Mathf.Sin(_yaw);
        float y = _distance * Mathf.Sin(_pitch);
        float z = _distance * Mathf.Cos(_pitch) * Mathf.Cos(_yaw);

        Vector3 cameraPos = _target + new Vector3(x, y, z);
        GlobalPosition = cameraPos;
        LookAt(_target, Vector3.Up);
    }
}

using Godot;
using Forge.Building;
using Forge.Commands;
using Forge.Core;
using Forge.Data;
using Forge.Mesh;

namespace Forge.Building;

/// <summary>
/// Root node for the Build Mode editor scene.
/// Initializes the vehicle, part registry, and wires up input → commands → mesh updates.
/// Manages the construction work plane, node highlighting, and ghost previews.
/// </summary>
public partial class EditorMain : Node3D
{
    // ── Core State ──────────────────────────────────────────────────────

    private Vehicle.Vehicle _vehicle = new();
    private PartRegistry _partRegistry = new();
    private EditorCamera _camera = null!;
    private InputManager _inputManager = null!;

    // ── Placement State ─────────────────────────────────────────────────

    private Vector3I? _placementStartNode;
    private bool _isPlacing;
    private string _activeFrameType = "longeron";

    // ── Visual Nodes ────────────────────────────────────────────────────

    private MeshInstance3D? _nodeHighlight;
    private MeshInstance3D? _ghostPreview;
    private Node3D _frameVisuals = null!;
    private StandardMaterial3D _highlightMaterial = null!;
    private StandardMaterial3D _ghostMaterial = null!;
    private StandardMaterial3D _frameMaterial = null!;

    // ── Center of Mass Indicator ────────────────────────────────────────

    private MeshInstance3D? _comIndicator;

    public override void _Ready()
    {
        // Load part definitions
        _partRegistry.LoadAll();

        // Get references to child nodes (set up in the .tscn)
        _camera = GetNode<EditorCamera>("EditorCamera");
        _inputManager = GetNode<InputManager>("InputManager");
        _inputManager.SetCamera(_camera);

        // Container for frame member visuals
        _frameVisuals = new Node3D { Name = "FrameVisuals" };
        AddChild(_frameVisuals);

        // Create materials
        _highlightMaterial = new StandardMaterial3D
        {
            AlbedoColor = new Color("#FFCC00"),
            Transparency = BaseMaterial3D.TransparencyEnum.Alpha,
            AlbedoColor = new Color(1, 0.8f, 0, 0.7f),
            ShadingMode = BaseMaterial3D.ShadingModeEnum.Unshaded,
        };

        _ghostMaterial = new StandardMaterial3D
        {
            AlbedoColor = new Color(0.3f, 0.9f, 0.3f, Constants.GhostPreviewOpacity),
            Transparency = BaseMaterial3D.TransparencyEnum.Alpha,
            ShadingMode = BaseMaterial3D.ShadingModeEnum.Unshaded,
        };

        _frameMaterial = new StandardMaterial3D
        {
            AlbedoColor = new Color("#556677"),
            Metallic = 0.3f,
            Roughness = 0.7f,
        };

        // Create node highlight sphere
        _nodeHighlight = new MeshInstance3D
        {
            Mesh = new SphereMesh { Radius = Constants.NodeHighlightRadius, Height = Constants.NodeHighlightRadius * 2 },
            MaterialOverride = _highlightMaterial,
            Visible = false,
        };
        AddChild(_nodeHighlight);

        // Create center of mass indicator
        _comIndicator = new MeshInstance3D
        {
            Mesh = new SphereMesh { Radius = 0.06f, Height = 0.12f },
            MaterialOverride = new StandardMaterial3D
            {
                AlbedoColor = new Color(1, 0.2f, 0.2f, 0.8f),
                Transparency = BaseMaterial3D.TransparencyEnum.Alpha,
                ShadingMode = BaseMaterial3D.ShadingModeEnum.Unshaded,
            },
            Visible = false,
        };
        AddChild(_comIndicator);

        // Wire up input events
        _inputManager.NodeHovered += OnNodeHovered;
        _inputManager.NodeClicked += OnNodeClicked;
        _inputManager.ClickedEmpty += OnClickedEmpty;
        _inputManager.ToolChanged += OnToolChanged;

        // Wire up frame graph events for mesh regeneration
        _vehicle.FrameGraph.EdgeAdded += OnEdgeAdded;
        _vehicle.FrameGraph.EdgeRemoved += OnEdgeRemoved;

        GD.Print("[FORGE] Editor initialized. Ready to build.");
    }

    public override void _UnhandledInput(InputEvent @event)
    {
        if (@event.IsActionPressed("undo"))
        {
            _vehicle.CommandHistory.Undo();
            GetViewport().SetInputAsHandled();
        }
        else if (@event.IsActionPressed("redo"))
        {
            _vehicle.CommandHistory.Redo();
            GetViewport().SetInputAsHandled();
        }
        else if (@event.IsActionPressed("toggle_symmetry"))
        {
            _inputManager.SymmetryEnabled = !_inputManager.SymmetryEnabled;
            GD.Print($"[FORGE] Symmetry: {(_inputManager.SymmetryEnabled ? "ON" : "OFF")}");
        }
        else if (@event is InputEventKey key && key.Pressed && !key.Echo)
        {
            if (key.Keycode == Key.Escape)
            {
                CancelPlacement();
            }
            else if (key.Keycode == Key.Delete || key.Keycode == Key.Backspace)
            {
                // TODO: delete selected part
            }
        }
    }

    // ── Input Callbacks ─────────────────────────────────────────────────

    private void OnNodeHovered(Vector3I node)
    {
        if (_nodeHighlight != null)
        {
            _nodeHighlight.Visible = true;
            _nodeHighlight.GlobalPosition = NodeGrid.GridToWorld(node);
        }

        UpdateGhostPreview(node);
    }

    private void OnNodeClicked(Vector3I node)
    {
        string tool = _inputManager.ActiveTool;

        // Frame placement tools
        if (tool is "stringer" or "longeron" or "spar" or "tube" or "angle" or "rail")
        {
            _activeFrameType = tool;
            HandleFramePlacement(node);
        }
        else if (tool == "rib")
        {
            HandleRibPlacement(node);
        }
    }

    private void OnClickedEmpty()
    {
        CancelPlacement();
    }

    private void OnToolChanged(string tool)
    {
        CancelPlacement();
        GD.Print($"[FORGE] Tool: {tool}");
    }

    // ── Frame Placement ─────────────────────────────────────────────────

    private void HandleFramePlacement(Vector3I node)
    {
        if (!_isPlacing)
        {
            _placementStartNode = node;
            _isPlacing = true;
        }
        else
        {
            // Complete the placement
            if (_placementStartNode.HasValue && _placementStartNode.Value != node)
            {
                var partDef = _partRegistry.Get(_activeFrameType);
                string material = partDef?.PhysicsMaterial ?? "aluminum_6061_t6";

                var cmd = new PlaceFrameCommand(
                    _vehicle.FrameGraph,
                    _placementStartNode.Value,
                    node,
                    _activeFrameType,
                    material,
                    _inputManager.SymmetryEnabled
                );
                _vehicle.CommandHistory.Execute(cmd);
                UpdateStats();
            }

            _isPlacing = false;
            _placementStartNode = null;
            ClearGhostPreview();
        }
    }

    private void HandleRibPlacement(Vector3I node)
    {
        if (!_isPlacing)
        {
            _placementStartNode = node;
            _isPlacing = true;
        }
        else
        {
            if (_placementStartNode.HasValue && _placementStartNode.Value != node)
            {
                // Default rib: 2m radius, arc in XZ plane (+Y direction)
                float radius = Constants.RibRadiusPresets[2]; // 2.0m
                Vector3 arcDir = Vector3.Up;

                var cmd = new PlaceRibCommand(
                    _vehicle.FrameGraph,
                    _placementStartNode.Value,
                    node,
                    radius,
                    arcDir,
                    "rib",
                    "aluminum_2024_t3",
                    _inputManager.SymmetryEnabled
                );
                _vehicle.CommandHistory.Execute(cmd);
                UpdateStats();
            }

            _isPlacing = false;
            _placementStartNode = null;
            ClearGhostPreview();
        }
    }

    private void CancelPlacement()
    {
        _isPlacing = false;
        _placementStartNode = null;
        ClearGhostPreview();
    }

    // ── Ghost Preview ───────────────────────────────────────────────────

    private void UpdateGhostPreview(Vector3I hoveredNode)
    {
        if (!_isPlacing || !_placementStartNode.HasValue) return;

        ClearGhostPreview();

        var partDef = _partRegistry.Get(_activeFrameType);
        float width = partDef?.WidthM ?? 0.03f;
        float height = partDef?.HeightM ?? 0.03f;

        ArrayMesh mesh;
        string tool = _inputManager.ActiveTool;

        if (tool is "rib")
        {
            float radius = Constants.RibRadiusPresets[2];
            mesh = FrameMeshGenerator.GenerateRibMesh(
                _placementStartNode.Value, hoveredNode,
                radius, Vector3.Up, width, height
            );
        }
        else if (partDef?.CrossSection == "round_hollow")
        {
            mesh = FrameMeshGenerator.GenerateTubeMesh(
                _placementStartNode.Value, hoveredNode, width * 0.5f
            );
        }
        else
        {
            mesh = FrameMeshGenerator.GenerateBeamMesh(
                _placementStartNode.Value, hoveredNode, width, height
            );
        }

        _ghostPreview = new MeshInstance3D
        {
            Mesh = mesh,
            MaterialOverride = _ghostMaterial,
        };
        AddChild(_ghostPreview);
    }

    private void ClearGhostPreview()
    {
        if (_ghostPreview != null)
        {
            _ghostPreview.QueueFree();
            _ghostPreview = null;
        }
    }

    // ── Mesh Regeneration on Graph Changes ──────────────────────────────

    private void OnEdgeAdded(FrameGraph.FrameEdge edge)
    {
        var partDef = _partRegistry.Get(edge.FrameType);
        float width = partDef?.WidthM ?? 0.03f;
        float height = partDef?.HeightM ?? 0.03f;

        ArrayMesh mesh;
        if (edge.RibRadius > 0 && !float.IsPositiveInfinity(edge.RibRadius))
        {
            mesh = FrameMeshGenerator.GenerateRibMesh(
                edge.StartNode, edge.EndNode,
                edge.RibRadius, edge.RibArcDirection, width, height
            );
        }
        else if (partDef?.CrossSection == "round_hollow")
        {
            mesh = FrameMeshGenerator.GenerateTubeMesh(
                edge.StartNode, edge.EndNode, width * 0.5f
            );
        }
        else
        {
            mesh = FrameMeshGenerator.GenerateBeamMesh(
                edge.StartNode, edge.EndNode, width, height
            );
        }

        var material = new StandardMaterial3D
        {
            AlbedoColor = partDef != null ? partDef.GetColor() : new Color("#556677"),
            Metallic = partDef?.Metalness ?? 0.3f,
            Roughness = partDef?.Roughness ?? 0.7f,
        };

        var meshInstance = new MeshInstance3D
        {
            Name = $"Frame_{edge.Id}",
            Mesh = mesh,
            MaterialOverride = material,
        };
        meshInstance.AddToGroup(Constants.GroupFrameMembers);
        _frameVisuals.AddChild(meshInstance);
    }

    private void OnEdgeRemoved(FrameGraph.FrameEdge edge)
    {
        var node = _frameVisuals.GetNodeOrNull($"Frame_{edge.Id}");
        node?.QueueFree();
    }

    // ── Stats ───────────────────────────────────────────────────────────

    private void UpdateStats()
    {
        _vehicle.RecalculateStats();

        if (_comIndicator != null && _vehicle.TotalMass > 0)
        {
            _comIndicator.Visible = true;
            _comIndicator.GlobalPosition = _vehicle.CenterOfMass;
        }
    }
}

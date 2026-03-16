using Godot;
using System.Collections.Generic;

namespace Forge.Vehicle;

/// <summary>
/// Future architecture stubs. Interfaces and classes exist so the architecture
/// supports future features without refactoring. No logic yet.
/// </summary>

// ── Routing — future pipe/wire/shaft system ─────────────────────────

/// <summary>Every frame junction implements IRoutingNode.</summary>
public interface IRoutingNode
{
    Vector3I GridPosition { get; }
    List<RoutingChannel> Channels { get; }
}

public sealed class RoutingChannel
{
    public string ChannelType { get; set; } = ""; // "pipe", "wire", "shaft"
    public float Diameter { get; set; }
}

// ── Components — future engines, wheels, propellers ─────────────────

public interface IComponent
{
    string PartId { get; }
    Vector3I AttachNode { get; }
    Dictionary<string, Port> Ports { get; }
}

public sealed class Port
{
    public string PortType { get; set; } = ""; // "power", "fluid", "signal"
    public Vector3 Direction { get; set; }
}

// ── Physics Assembly — future compound rigid body ───────────────────

public interface IAssemblyMember
{
    int AssemblyId { get; set; }
    float Mass { get; }
    Shape3D? CollisionShape { get; }
}

// ── Enclosed Volume — future fuel tanks, ballast, crew spaces ───────

public interface IEnclosure
{
    float Volume { get; }
    bool IsWatertight { get; }
    EnclosureRole Role { get; }
}

public enum EnclosureRole
{
    None,
    FuelTank,
    BallastTank,
    CrewSpace,
    PressureHull,
    CargoBay,
}

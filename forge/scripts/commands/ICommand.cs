namespace Forge.Commands;

/// <summary>
/// Command pattern interface for undo/redo.
/// Every user-facing building action implements this.
/// </summary>
public interface ICommand
{
    /// <summary>Human-readable description for the undo/redo menu.</summary>
    string Description { get; }

    /// <summary>Execute the command (first time or redo).</summary>
    void Execute();

    /// <summary>Reverse the command (undo).</summary>
    void Undo();
}

using System.Collections.Generic;

namespace Forge.Commands;

/// <summary>
/// Wraps multiple commands into a single undo step.
/// Used for array operations, auto-skin, and bulk operations.
/// </summary>
public sealed class CompoundCommand : ICommand
{
    private readonly List<ICommand> _commands;

    public string Description { get; }

    public CompoundCommand(string description, List<ICommand> commands)
    {
        Description = description;
        _commands = commands;
    }

    public void Execute()
    {
        foreach (var cmd in _commands)
        {
            cmd.Execute();
        }
    }

    public void Undo()
    {
        // Undo in reverse order
        for (int i = _commands.Count - 1; i >= 0; i--)
        {
            _commands[i].Undo();
        }
    }
}

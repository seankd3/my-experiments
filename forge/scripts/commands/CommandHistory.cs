using System;
using System.Collections.Generic;
using Forge.Core;

namespace Forge.Commands;

/// <summary>
/// Manages the undo/redo stack for all building operations.
/// Every user action goes through here. 200-step history.
/// Array operations and auto-skin are single undo steps.
/// </summary>
public sealed class CommandHistory
{
    private readonly List<ICommand> _undoStack = new();
    private readonly List<ICommand> _redoStack = new();

    /// <summary>Fired after any command execution, undo, or redo.</summary>
    public event Action? HistoryChanged;

    /// <summary>Number of commands available to undo.</summary>
    public int UndoCount => _undoStack.Count;

    /// <summary>Number of commands available to redo.</summary>
    public int RedoCount => _redoStack.Count;

    /// <summary>Whether an undo operation is available.</summary>
    public bool CanUndo => _undoStack.Count > 0;

    /// <summary>Whether a redo operation is available.</summary>
    public bool CanRedo => _redoStack.Count > 0;

    /// <summary>Description of the next undo operation, or null.</summary>
    public string? NextUndoDescription =>
        _undoStack.Count > 0 ? _undoStack[^1].Description : null;

    /// <summary>Description of the next redo operation, or null.</summary>
    public string? NextRedoDescription =>
        _redoStack.Count > 0 ? _redoStack[^1].Description : null;

    /// <summary>
    /// Execute a command and push it to the undo stack.
    /// Clears the redo stack (new action invalidates redo history).
    /// </summary>
    public void Execute(ICommand command)
    {
        command.Execute();
        _undoStack.Add(command);
        _redoStack.Clear();

        // Enforce max history depth
        while (_undoStack.Count > Constants.MaxUndoHistory)
        {
            _undoStack.RemoveAt(0);
        }

        HistoryChanged?.Invoke();
    }

    /// <summary>Undo the most recent command.</summary>
    public void Undo()
    {
        if (!CanUndo) return;

        var command = _undoStack[^1];
        _undoStack.RemoveAt(_undoStack.Count - 1);
        command.Undo();
        _redoStack.Add(command);

        HistoryChanged?.Invoke();
    }

    /// <summary>Redo the most recently undone command.</summary>
    public void Redo()
    {
        if (!CanRedo) return;

        var command = _redoStack[^1];
        _redoStack.RemoveAt(_redoStack.Count - 1);
        command.Execute();
        _undoStack.Add(command);

        HistoryChanged?.Invoke();
    }

    /// <summary>Clear all history.</summary>
    public void Clear()
    {
        _undoStack.Clear();
        _redoStack.Clear();
        HistoryChanged?.Invoke();
    }
}

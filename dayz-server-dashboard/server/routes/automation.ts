// Automation/scheduling routes

import express from 'express';
import { queryAll, queryOne, run } from '../db';
import { authenticate, requireFeature } from '../middleware/auth';
import { scheduleTask, unscheduleTask, runTaskNow } from '../services/scheduler';
import { ServerRow, ScheduledTaskRow, CreateTaskRequest, UpdateTaskRequest } from '../types';

export const router = express.Router();

router.use(authenticate);
router.use(requireFeature('automation'));

// Helper: verify server ownership
function verifyServer(serverId: number, userId: number): ServerRow | null {
  return queryOne<ServerRow>(
    'SELECT * FROM servers WHERE id = ? AND user_id = ?',
    [serverId, userId]
  ) || null;
}

// GET /api/servers/:id/tasks - list scheduled tasks
router.get('/:id/tasks', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const tasks = queryAll<ScheduledTaskRow>(
      'SELECT * FROM scheduled_tasks WHERE server_id = ? AND user_id = ? ORDER BY created_at DESC',
      [serverId, req.user!.userId]
    );

    const parsed = tasks.map(t => ({
      ...t,
      payload: JSON.parse(t.payload),
      is_active: !!t.is_active,
    }));

    res.json(parsed);
  } catch (error: any) {
    console.error('List tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/servers/:id/tasks - create scheduled task
router.post('/:id/tasks', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const { type, payload, cron_expression, specific_time } = req.body as CreateTaskRequest;

    if (!type) {
      return res.status(400).json({ error: 'Task type is required' });
    }

    if (!['message', 'restart', 'command'].includes(type)) {
      return res.status(400).json({ error: 'Invalid task type. Must be: message, restart, or command' });
    }

    if (!cron_expression && !specific_time) {
      return res.status(400).json({ error: 'Either cron_expression or specific_time is required' });
    }

    const result = run(
      `INSERT INTO scheduled_tasks (server_id, user_id, type, payload, cron_expression, specific_time, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [serverId, req.user!.userId, type, JSON.stringify(payload || {}), cron_expression || null, specific_time || null]
    );

    const task = queryOne<ScheduledTaskRow>(
      'SELECT * FROM scheduled_tasks WHERE id = ?',
      [result.lastInsertRowid]
    );

    if (task) {
      scheduleTask(task);
    }

    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user!.userId, serverId, 'task_created', JSON.stringify({ taskId: task?.id, type })]
    );

    res.status(201).json({
      ...task,
      payload: JSON.parse(task!.payload),
      is_active: !!task!.is_active,
    });
  } catch (error: any) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/servers/:id/tasks/:taskId - update task
router.put('/:id/tasks/:taskId', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const taskId = parseInt(req.params.taskId);

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const task = queryOne<ScheduledTaskRow>(
      'SELECT * FROM scheduled_tasks WHERE id = ? AND server_id = ? AND user_id = ?',
      [taskId, serverId, req.user!.userId]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { type, payload, cron_expression, specific_time, is_active } = req.body as UpdateTaskRequest;

    if (type && !['message', 'restart', 'command'].includes(type)) {
      return res.status(400).json({ error: 'Invalid task type' });
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (type !== undefined) { updates.push('type = ?'); params.push(type); }
    if (payload !== undefined) { updates.push('payload = ?'); params.push(JSON.stringify(payload)); }
    if (cron_expression !== undefined) { updates.push('cron_expression = ?'); params.push(cron_expression); }
    if (specific_time !== undefined) { updates.push('specific_time = ?'); params.push(specific_time); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    if (updates.length > 0) {
      params.push(taskId);
      run(`UPDATE scheduled_tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updated = queryOne<ScheduledTaskRow>(
      'SELECT * FROM scheduled_tasks WHERE id = ?',
      [taskId]
    );

    // Re-schedule or unschedule
    if (updated) {
      if (updated.is_active) {
        scheduleTask(updated);
      } else {
        unscheduleTask(updated.id);
      }
    }

    res.json({
      ...updated,
      payload: JSON.parse(updated!.payload),
      is_active: !!updated!.is_active,
    });
  } catch (error: any) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/servers/:id/tasks/:taskId - delete task
router.delete('/:id/tasks/:taskId', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const taskId = parseInt(req.params.taskId);

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const task = queryOne<ScheduledTaskRow>(
      'SELECT * FROM scheduled_tasks WHERE id = ? AND server_id = ? AND user_id = ?',
      [taskId, serverId, req.user!.userId]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    unscheduleTask(taskId);
    run('DELETE FROM scheduled_tasks WHERE id = ?', [taskId]);

    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user!.userId, serverId, 'task_deleted', JSON.stringify({ taskId, type: task.type })]
    );

    res.json({ message: 'Task deleted' });
  } catch (error: any) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/servers/:id/tasks/:taskId/toggle - enable/disable task
router.post('/:id/tasks/:taskId/toggle', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const taskId = parseInt(req.params.taskId);

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const task = queryOne<ScheduledTaskRow>(
      'SELECT * FROM scheduled_tasks WHERE id = ? AND server_id = ? AND user_id = ?',
      [taskId, serverId, req.user!.userId]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const newActive = task.is_active ? 0 : 1;
    run('UPDATE scheduled_tasks SET is_active = ? WHERE id = ?', [newActive, taskId]);

    const updated = queryOne<ScheduledTaskRow>('SELECT * FROM scheduled_tasks WHERE id = ?', [taskId]);

    if (updated) {
      if (updated.is_active) {
        scheduleTask(updated);
      } else {
        unscheduleTask(updated.id);
      }
    }

    res.json({
      ...updated,
      payload: JSON.parse(updated!.payload),
      is_active: !!updated!.is_active,
    });
  } catch (error: any) {
    console.error('Toggle task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/servers/:id/tasks/:taskId/run - manually run task now
router.post('/:id/tasks/:taskId/run', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const taskId = parseInt(req.params.taskId);

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const task = queryOne<ScheduledTaskRow>(
      'SELECT * FROM scheduled_tasks WHERE id = ? AND server_id = ? AND user_id = ?',
      [taskId, serverId, req.user!.userId]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const result = await runTaskNow(taskId);
    res.json({ message: result });
  } catch (error: any) {
    console.error('Run task error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

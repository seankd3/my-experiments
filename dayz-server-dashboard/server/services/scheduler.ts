// Task scheduler service using node-cron

import cron from 'node-cron';
import { queryAll, queryOne, run } from '../db';
import { ScheduledTaskRow } from '../types';
import { getConnection } from '../rcon/client';

interface ScheduledJob {
  taskId: number;
  cronTask: cron.ScheduledTask;
}

const activeJobs = new Map<number, ScheduledJob>();

/**
 * Start the scheduler: loads all active tasks from DB and schedules them.
 */
export function startScheduler(): void {
  console.log('Starting task scheduler...');
  loadActiveTasks();
}

/**
 * Stop the scheduler: destroys all cron jobs.
 */
export function stopScheduler(): void {
  console.log('Stopping task scheduler...');
  for (const [taskId, job] of activeJobs) {
    job.cronTask.stop();
    activeJobs.delete(taskId);
  }
}

/**
 * Load all active scheduled tasks from DB and register cron jobs.
 */
export function loadActiveTasks(): void {
  const tasks = queryAll<ScheduledTaskRow>(
    'SELECT * FROM scheduled_tasks WHERE is_active = 1'
  );

  for (const task of tasks) {
    scheduleTask(task);
  }

  console.log(`  Loaded ${tasks.length} scheduled tasks`);
}

/**
 * Schedule a single task.
 */
export function scheduleTask(task: ScheduledTaskRow): void {
  // Remove existing job if any
  unscheduleTask(task.id);

  if (!task.cron_expression && !task.specific_time) {
    return; // Nothing to schedule
  }

  let cronExpression = task.cron_expression;

  // If specific_time is set and no cron, convert to a one-time check
  // We use a per-minute cron and check if the specific time has passed
  if (!cronExpression && task.specific_time) {
    const specificDate = new Date(task.specific_time);
    const minute = specificDate.getMinutes();
    const hour = specificDate.getHours();
    const day = specificDate.getDate();
    const month = specificDate.getMonth() + 1;
    cronExpression = `${minute} ${hour} ${day} ${month} *`;
  }

  if (!cronExpression || !cron.validate(cronExpression)) {
    console.warn(`Invalid cron expression for task ${task.id}: ${cronExpression}`);
    return;
  }

  const cronTask = cron.schedule(cronExpression, async () => {
    await executeTask(task);
  });

  activeJobs.set(task.id, { taskId: task.id, cronTask });

  // Calculate and store next run time
  updateNextRun(task.id, cronExpression);
}

/**
 * Unschedule (remove) a task.
 */
export function unscheduleTask(taskId: number): void {
  const job = activeJobs.get(taskId);
  if (job) {
    job.cronTask.stop();
    activeJobs.delete(taskId);
  }
}

/**
 * Execute a scheduled task immediately.
 */
export async function executeTask(task: ScheduledTaskRow): Promise<string> {
  const payload = JSON.parse(task.payload);
  let result = '';

  try {
    const rcon = getConnection(task.server_id);

    switch (task.type) {
      case 'message': {
        const message = payload.message || 'Scheduled message';
        if (rcon && rcon.isConnected()) {
          await rcon.sendGlobalMessage(message);
          result = `Sent global message: ${message}`;
        } else {
          result = 'RCON not connected, message not sent';
        }
        break;
      }

      case 'restart': {
        const delay = payload.delay || 0;
        if (rcon && rcon.isConnected()) {
          // Send warning messages before restart
          if (delay > 0) {
            const warnings = [300, 120, 60, 30, 10].filter(w => w <= delay);
            for (const warning of warnings) {
              if (warning <= delay) {
                await rcon.sendGlobalMessage(`Server restarting in ${warning} seconds!`);
              }
            }
          }
          await rcon.restartServer(delay);
          result = `Server restart initiated with ${delay}s delay`;
        } else {
          result = 'RCON not connected, restart not executed';
        }
        break;
      }

      case 'command': {
        const command = payload.command || '';
        if (rcon && rcon.isConnected()) {
          const output = await rcon.sendCommand(command);
          result = `Command executed: ${command} -> ${output}`;
        } else {
          result = 'RCON not connected, command not executed';
        }
        break;
      }

      default:
        result = `Unknown task type: ${task.type}`;
    }

    // Update last_run
    run(
      'UPDATE scheduled_tasks SET last_run = datetime(\'now\') WHERE id = ?',
      [task.id]
    );

    // Update next_run
    if (task.cron_expression) {
      updateNextRun(task.id, task.cron_expression);
    } else if (task.specific_time) {
      // One-time task: deactivate after execution
      run('UPDATE scheduled_tasks SET is_active = 0 WHERE id = ?', [task.id]);
      unscheduleTask(task.id);
    }

    // Log to audit log
    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [
        task.user_id,
        task.server_id,
        'task_executed',
        JSON.stringify({ taskId: task.id, type: task.type, result }),
      ]
    );

    console.log(`Task ${task.id} executed: ${result}`);
  } catch (error: any) {
    result = `Error executing task ${task.id}: ${error.message}`;
    console.error(result);

    // Log error to audit log
    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [
        task.user_id,
        task.server_id,
        'task_error',
        JSON.stringify({ taskId: task.id, type: task.type, error: error.message }),
      ]
    );
  }

  return result;
}

/**
 * Run a task by its ID immediately (manual trigger).
 */
export async function runTaskNow(taskId: number): Promise<string> {
  const task = queryOne<ScheduledTaskRow>(
    'SELECT * FROM scheduled_tasks WHERE id = ?',
    [taskId]
  );

  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  return executeTask(task);
}

/**
 * Update the next_run timestamp based on cron expression.
 */
function updateNextRun(taskId: number, cronExpression: string): void {
  try {
    // Simple next-run calculation: add the interval to now
    // For accurate next-run, we'd use a cron parser, but for simplicity
    // we store an approximate next run
    const now = new Date();
    run(
      'UPDATE scheduled_tasks SET next_run = ? WHERE id = ?',
      [now.toISOString(), taskId]
    );
  } catch {
    // Ignore errors in next_run calculation
  }
}

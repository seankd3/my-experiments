import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  RotateCcw,
  MessageSquare,
  Terminal,
  RefreshCw,
  CalendarClock,
  Zap,
  X,
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useServerStore } from '../store/serverStore';
import {
  useScheduledTasks,
  useCreateTask,
  useToggleTask,
  useDeleteTask,
  useRunTask,
  useUpdateTask,
} from '../api/hooks';
import { useToastStore } from '../store/toastStore';
import type { ScheduledTask } from '../types';

const taskTypeIcons: Record<string, React.ReactNode> = {
  message: <MessageSquare className="w-4 h-4 text-blue-400" />,
  restart: <RefreshCw className="w-4 h-4 text-red-400" />,
  command: <Terminal className="w-4 h-4 text-accent-400" />,
};

const cronPresets = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 2 hours', value: '0 */2 * * *' },
  { label: 'Every 4 hours', value: '0 */4 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Custom', value: 'custom' },
];

interface TaskForm {
  name: string;
  type: 'message' | 'restart' | 'command';
  message: string;
  command: string;
  target: string;
  warningMinutes: string;
  cronExpression: string;
  cronPreset: string;
}

const defaultForm: TaskForm = {
  name: '',
  type: 'message',
  message: '',
  command: '',
  target: 'global',
  warningMinutes: '5',
  cronExpression: '0 * * * *',
  cronPreset: '0 * * * *',
};

export default function Automation() {
  const { activeServer } = useServerStore();
  const { data: tasks, isLoading } = useScheduledTasks(activeServer?.id);
  const createTask = useCreateTask(activeServer?.id);
  const toggleTask = useToggleTask(activeServer?.id);
  const deleteTask = useDeleteTask(activeServer?.id);
  const runTask = useRunTask(activeServer?.id);
  const updateTask = useUpdateTask(activeServer?.id);
  const { addToast } = useToastStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [form, setForm] = useState<TaskForm>(defaultForm);

  const openCreateModal = () => {
    setForm(defaultForm);
    setEditingTask(null);
    setShowCreateModal(true);
  };

  const openEditModal = (task: ScheduledTask) => {
    setEditingTask(task);
    setForm({
      name: task.name,
      type: task.type,
      message: task.config.message || '',
      command: task.config.command || '',
      target: task.config.target || 'global',
      warningMinutes: String(task.config.warningMinutes || 5),
      cronExpression: task.cronExpression,
      cronPreset: cronPresets.find((p) => p.value === task.cronExpression)
        ? task.cronExpression
        : 'custom',
    });
    setShowCreateModal(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      addToast('error', 'Task name is required');
      return;
    }

    const config: Record<string, unknown> = {};
    if (form.type === 'message') {
      config.message = form.message;
      config.target = form.target;
    } else if (form.type === 'restart') {
      config.message = form.message;
      config.warningMinutes = parseInt(form.warningMinutes);
    } else if (form.type === 'command') {
      config.command = form.command;
    }

    const data = {
      name: form.name,
      type: form.type,
      config,
      cronExpression: form.cronExpression,
      isActive: true,
    };

    if (editingTask) {
      updateTask.mutate(
        { taskId: editingTask.id, data },
        {
          onSuccess: () => {
            addToast('success', 'Task updated');
            setShowCreateModal(false);
          },
          onError: () => addToast('error', 'Failed to update task'),
        }
      );
    } else {
      createTask.mutate(data, {
        onSuccess: () => {
          addToast('success', 'Task created');
          setShowCreateModal(false);
        },
        onError: () => addToast('error', 'Failed to create task'),
      });
    }
  };

  const handleToggle = (taskId: string) => {
    toggleTask.mutate(taskId, {
      onError: () => addToast('error', 'Failed to toggle task'),
    });
  };

  const handleDelete = (taskId: string) => {
    deleteTask.mutate(taskId, {
      onSuccess: () => addToast('success', 'Task deleted'),
      onError: () => addToast('error', 'Failed to delete task'),
    });
  };

  const handleRunNow = (taskId: string) => {
    runTask.mutate(taskId, {
      onSuccess: () => addToast('success', 'Task executed'),
      onError: () => addToast('error', 'Failed to run task'),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Automation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Schedule tasks and automate server management
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={openCreateModal}
        >
          Create Task
        </Button>
      </div>

      {/* Task Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardBody>
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-surface-700 rounded w-2/3" />
                  <div className="h-3 bg-surface-700 rounded w-1/2" />
                  <div className="h-3 bg-surface-700 rounded w-3/4" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : tasks && tasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <Card key={task.id} hover>
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {taskTypeIcons[task.type]}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-200">
                        {task.name}
                      </h3>
                      <Badge
                        variant={
                          task.type === 'restart'
                            ? 'danger'
                            : task.type === 'message'
                            ? 'info'
                            : 'accent'
                        }
                        size="sm"
                      >
                        {task.type}
                      </Badge>
                    </div>
                  </div>

                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => handleToggle(task.id)}
                    className={`
                      relative w-10 h-5 rounded-full transition-colors
                      ${task.isActive ? 'bg-primary-600' : 'bg-surface-600'}
                    `}
                  >
                    <span
                      className={`
                        absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
                        ${task.isActive ? 'left-5.5 translate-x-0' : 'left-0.5'}
                      `}
                      style={{
                        left: task.isActive ? '22px' : '2px',
                      }}
                    />
                  </button>
                </div>

                {/* Task Details */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-gray-400">
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span className="font-mono">{task.cronExpression}</span>
                  </div>
                  {task.config.message && (
                    <p className="text-gray-500 truncate pl-5">
                      "{task.config.message}"
                    </p>
                  )}
                  {task.config.command && (
                    <p className="text-gray-500 font-mono truncate pl-5">
                      $ {task.config.command}
                    </p>
                  )}
                  {task.nextRun && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      Next: {new Date(task.nextRun).toLocaleString()}
                    </div>
                  )}
                  {task.lastRun && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <RotateCcw className="w-3.5 h-3.5" />
                      Last: {new Date(task.lastRun).toLocaleString()}
                    </div>
                  )}
                </div>
              </CardBody>
              <CardFooter className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Zap className="w-3.5 h-3.5" />}
                  onClick={() => handleRunNow(task.id)}
                >
                  Run Now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Edit className="w-3.5 h-3.5" />}
                  onClick={() => openEditModal(task)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => handleDelete(task.id)}
                  className="text-danger-400 hover:text-danger-300 ml-auto"
                >
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-16">
            <Clock className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">
              No Scheduled Tasks
            </h3>
            <p className="text-sm text-gray-500 mb-4 max-w-md text-center">
              Create automated tasks to manage your server. Schedule messages,
              restarts, and RCON commands.
            </p>
            <Button icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
              Create Your First Task
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingTask ? 'Edit Task' : 'Create Task'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={createTask.isPending || updateTask.isPending}
            >
              {editingTask ? 'Update Task' : 'Create Task'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Task Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Restart warning, Hourly message..."
          />

          <Select
            label="Task Type"
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as TaskForm['type'] })
            }
            options={[
              { value: 'message', label: 'Broadcast Message' },
              { value: 'restart', label: 'Server Restart' },
              { value: 'command', label: 'RCON Command' },
            ]}
          />

          {/* Type-specific fields */}
          {form.type === 'message' && (
            <>
              <Textarea
                label="Message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Enter the message to broadcast..."
              />
              <Select
                label="Target"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
                options={[
                  { value: 'global', label: 'Global (All Players)' },
                ]}
              />
            </>
          )}

          {form.type === 'restart' && (
            <>
              <Textarea
                label="Warning Message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Server restarting in {minutes} minutes..."
              />
              <Input
                label="Warning Time (minutes)"
                type="number"
                value={form.warningMinutes}
                onChange={(e) =>
                  setForm({ ...form, warningMinutes: e.target.value })
                }
                hint="How many minutes before restart to send warning"
              />
            </>
          )}

          {form.type === 'command' && (
            <Input
              label="RCON Command"
              value={form.command}
              onChange={(e) => setForm({ ...form, command: e.target.value })}
              placeholder="e.g., #shutdown, #lock, etc."
            />
          )}

          {/* Schedule */}
          <div className="border-t border-surface-700/50 pt-4">
            <Select
              label="Schedule"
              value={form.cronPreset}
              onChange={(e) => {
                const val = e.target.value;
                setForm({
                  ...form,
                  cronPreset: val,
                  cronExpression: val === 'custom' ? form.cronExpression : val,
                });
              }}
              options={cronPresets.map((p) => ({
                value: p.value,
                label: p.label,
              }))}
            />
            {form.cronPreset === 'custom' && (
              <div className="mt-3">
                <Input
                  label="Cron Expression"
                  value={form.cronExpression}
                  onChange={(e) =>
                    setForm({ ...form, cronExpression: e.target.value })
                  }
                  placeholder="* * * * *"
                  hint="Minute Hour Day Month DayOfWeek"
                />
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

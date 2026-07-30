import React, { useState, useEffect } from 'react';
import { FiCheckSquare, FiPlus, FiX, FiTrash2, FiUserPlus, FiChevronDown, FiChevronUp, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE = '/api/organizations';
const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('aether_token')}` } });

const STATUS_COLORS = {
  planning: 'text-slate-400 bg-slate-900 border-white/5',
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  on_hold: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  completed: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  cancelled: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
};

const PRIORITY_COLORS = {
  low: 'text-slate-400',
  medium: 'text-amber-400',
  high: 'text-rose-400',
  urgent: 'text-red-400 font-bold',
};

const OrgProjects = ({ organizationId, canManage }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', priority: 'medium' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium' });
  const [showTaskForm, setShowTaskForm] = useState(null);

  useEffect(() => { fetchProjects(); }, [organizationId]);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/${organizationId}/projects`, getAuthHeaders());
      setProjects(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    try {
      await axios.post(`${API_BASE}/${organizationId}/projects`, form, getAuthHeaders());
      toast.success('Project created');
      setForm({ name: '', description: '', priority: 'medium' });
      setShowForm(false);
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/${organizationId}/projects/${id}`, getAuthHeaders());
      toast.success('Project deleted');
      if (expanded === id) setExpanded(null);
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await axios.put(`${API_BASE}/${organizationId}/projects/${id}`, { status }, getAuthHeaders());
      toast.success(`Project ${status}`);
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  };

  const handleAddTask = async (e, projectId) => {
    e.preventDefault();
    if (!taskForm.title.trim()) { toast.error('Task title is required'); return; }
    try {
      await axios.post(`${API_BASE}/${organizationId}/projects/${projectId}/tasks`, taskForm, getAuthHeaders());
      toast.success('Task added');
      setTaskForm({ title: '', description: '', priority: 'medium' });
      setShowTaskForm(null);
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add task');
    }
  };

  const handleTaskStatus = async (projectId, taskId, status) => {
    try {
      await axios.put(`${API_BASE}/${organizationId}/projects/${projectId}/tasks/${taskId}`, { status }, getAuthHeaders());
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (projectId, taskId) => {
    try {
      await axios.delete(`${API_BASE}/${organizationId}/projects/${projectId}/tasks/${taskId}`, getAuthHeaders());
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete task');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Projects ({projects.length})</h3>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="py-1 px-2 bg-emerald-500 text-slate-950 rounded-lg text-[9px] font-bold flex items-center gap-1 cursor-pointer">
            <FiPlus size={10} /> New Project
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-display">Create Project</h4>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"><FiX size={14} /></button>
          </div>
          <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Project name..." className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none" />
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description..." rows={2} className="w-full bg-slate-900 border border-white/5 rounded-xl p-2.5 text-xs text-slate-200 focus:border-emerald-500/20 outline-none resize-none" />
          <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-emerald-500/20 outline-none">
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent</option>
          </select>
          <button type="submit" className="w-full py-2 bg-emerald-500 text-slate-950 rounded-xl text-[10px] font-bold cursor-pointer">CREATE PROJECT</button>
        </form>
      )}

      <div className="space-y-2">
        {projects.map(project => (
          <div key={project._id} className="bg-slate-900/20 border border-white/5 rounded-xl overflow-hidden">
            <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === project._id ? null : project._id)}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <FiCheckSquare size={14} className="text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-200 truncate">{project.name}</h4>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold border ${STATUS_COLORS[project.status] || STATUS_COLORS.planning}`}>{project.status}</span>
                    <span className={`text-[8px] ${PRIORITY_COLORS[project.priority] || ''}`}>{project.priority}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5">{project.tasks?.length || 0} tasks • {project.progress || 0}% complete</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage && (
                  <div className="flex gap-1">
                    {['active', 'completed', 'on_hold'].map(s => (
                      <button key={s} onClick={e => { e.stopPropagation(); handleUpdateStatus(project._id, s); }}
                        className={`text-[8px] px-1.5 py-0.5 rounded font-bold border cursor-pointer ${project.status === s ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'text-slate-500 border-white/5 hover:text-white'}`}>{s}</button>
                    ))}
                    <button onClick={e => { e.stopPropagation(); handleDelete(project._id); }} className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"><FiTrash2 size={11} /></button>
                  </div>
                )}
                {expanded === project._id ? <FiChevronUp size={14} className="text-slate-500" /> : <FiChevronDown size={14} className="text-slate-500" />}
              </div>
            </div>

            {expanded === project._id && (
              <div className="border-t border-white/5 p-3 space-y-3">
                {project.description && <p className="text-[10px] text-slate-400">{project.description}</p>}

                <div className="flex items-center gap-3 text-[9px] text-slate-500">
                  <span>Progress: {project.progress || 0}%</span>
                  <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden max-w-xs">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${project.progress || 0}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h5 className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Tasks ({project.tasks?.length || 0})</h5>
                  <button onClick={() => setShowTaskForm(showTaskForm === project._id ? null : project._id)} className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer flex items-center gap-1">
                    <FiPlus size={10} /> Add Task
                  </button>
                </div>

                {showTaskForm === project._id && (
                  <form onSubmit={e => handleAddTask(e, project._id)} className="p-3 bg-slate-950/40 border border-white/5 rounded-lg space-y-2">
                    <input type="text" required value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder="Task title..." className="w-full bg-slate-900 border border-white/5 rounded-lg py-1.5 px-2.5 text-[10px] text-slate-200 focus:border-emerald-500/20 outline-none" />
                    <input type="text" value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} placeholder="Description..." className="w-full bg-slate-900 border border-white/5 rounded-lg py-1.5 px-2.5 text-[10px] text-slate-200 focus:border-emerald-500/20 outline-none" />
                    <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))} className="w-full bg-slate-900 border border-white/5 rounded-lg py-1.5 px-2.5 text-[10px] text-slate-200 outline-none">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <button type="submit" className="w-full py-1.5 bg-emerald-500 text-slate-950 rounded-lg text-[9px] font-bold cursor-pointer">ADD TASK</button>
                  </form>
                )}

                <div className="space-y-1.5">
                  {(project.tasks || []).map(task => (
                    <div key={task._id} className="flex items-center gap-2 p-2 bg-slate-950/30 border border-white/5 rounded-lg group">
                      <button onClick={() => handleTaskStatus(project._id, task._id, task.status === 'done' ? 'todo' : 'done')}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-900 border-white/10'}`}>
                        {task.status === 'done' && <FiCheckSquare size={10} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className={`text-[10px] ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{task.title}</span>
                        {task.description && <span className="text-[8px] text-slate-600 ml-2">{task.description}</span>}
                      </div>
                      <span className={`text-[8px] ${PRIORITY_COLORS[task.priority] || ''}`}>{task.priority}</span>
                      <button onClick={() => handleDeleteTask(project._id, task._id)} className="p-0.5 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"><FiTrash2 size={9} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {projects.length === 0 && !showForm && (
          <div className="text-center py-6 text-xs text-slate-500 italic bg-white/[0.005] border border-dashed border-white/5 rounded-xl">No projects yet. Create projects to track team progress.</div>
        )}
      </div>
    </div>
  );
};

export default OrgProjects;

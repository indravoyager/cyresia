import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Archive, CheckCircle2, Circle, CheckSquare, Square, 
  ListTodo, Trash2, Plus, X, Clock, Copy, RotateCcw, Settings, 
  AlertTriangle, Save, Upload, BookOpen, Hash, Edit2, Check, 
  AlignLeft, Moon, Sun, ChevronDown, ChevronUp, BrainCircuit, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Import Study Room ---
import { StudyRoom } from './StudyRoom';

// --- Utility Spells ---
const getDaysDifference = (d1, d2) => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  const diffTime = date2 - date1;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getProgress = (start, end) => {
  const today = getTodayString();
  const total = getDaysDifference(start, end);
  const passed = getDaysDifference(start, today);

  if (total <= 0) return passed >= 0 ? 100 : 0;
  if (passed <= 0) return 0;
  if (passed >= total) return 100;
  
  return Math.round((passed / total) * 100);
};

// LocalStorage Hook for Persistence
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Storage spell failed:", error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error("Storage spell failed:", error);
      }
      return valueToStore;
    });
  };

  return [storedValue, setValue];
}

const getTodayString = () => new Date().toLocaleDateString('en-CA');

// --- Sub-Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-300 group ${
      active 
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50' 
        : danger 
          ? 'text-red-500 hover:bg-red-50/50 dark:hover:bg-red-900/20'
          : 'text-slate-600 hover:bg-white/50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-indigo-400'
    }`}
  >
    <Icon size={16} className={active ? 'animate-pulse' : 'group-hover:scale-110 transition-transform duration-300'} />
    <span className="font-semibold text-[13px] tracking-wide">{label}</span>
  </button>
);

// --- Smooth Animation Variants ---
const taskVariants = {
  hidden: { opacity: 0, height: 0, marginBottom: 0, scale: 0.95, overflow: 'hidden' },
  visible: { 
    opacity: 1, 
    height: 'auto', 
    marginBottom: 12, // Dikurangi dari 16
    scale: 1,
    transitionEnd: { overflow: 'visible' },
    transition: { type: "spring", stiffness: 400, damping: 30 } 
  },
  exit: { 
    opacity: 0, 
    height: 0, 
    marginBottom: 0, 
    scale: 0.95, 
    overflow: 'hidden',
    transition: { opacity: { duration: 0.2 }, height: { duration: 0.25 } } 
  }
};

// --- Main Views ---

const ScheduleView = ({ schedules, setSchedules, isDarkMode }) => {
  const [courseName, setCourseName] = useState("");
  const [session, setSession] = useState("");
  const [note, setNote] = useState("");
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [sortOrder, setSortOrder] = useState('nearest');

  const [collapsedTasks, setCollapsedTasks] = useState({});

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ courseName: '', session: '', note: '', startDate: '', endDate: '', subtasks: [] });
  const [newSubtask, setNewSubtask] = useState("");

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    
    const newItem = {
      id: crypto.randomUUID(),
      courseName,
      session,
      note,
      startDate,
      endDate,
      completed: false,
      archived: false,
      subtasks: [],
    };
    
    setSchedules(prev => [newItem, ...prev]);
    setCourseName("");
    setSession("");
    setNote("");
  };

  const toggleComplete = (id) => {
    setSchedules(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const duplicateTask = (id) => {
    setSchedules(prev => {
      const idx = prev.findIndex(item => item.id === id);
      if (idx === -1) return prev;
      const copy = { 
        ...prev[idx], 
        id: crypto.randomUUID(), 
        completed: false, 
        archived: false,
        subtasks: prev[idx].subtasks ? prev[idx].subtasks.map(st => ({ ...st, id: crypto.randomUUID(), completed: false })) : []
      };
      const newSchedules = [...prev];
      newSchedules.splice(idx + 1, 0, copy);
      return newSchedules;
    });
  };

  const deleteTask = (id) => {
    setSchedules(prev => prev.filter(item => item.id !== id));
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditForm({
      courseName: task.courseName,
      session: task.session || "",
      note: task.note || "",
      startDate: task.startDate,
      endDate: task.endDate,
      subtasks: task.subtasks || []
    });
    setNewSubtask("");
    setCollapsedTasks(prev => ({ ...prev, [task.id]: false }));
  };

  const cancelEditing = () => setEditingId(null);

  const saveEditing = (id) => {
    if (!editForm.courseName.trim()) return;
    setSchedules(prev => prev.map(item => 
      item.id === id ? { ...item, ...editForm } : item
    ));
    setEditingId(null);
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setSchedules(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks.map(st =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          )
        };
      }
      return task;
    }));
  };

  const handleAddSubtaskEdit = (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    setEditForm(prev => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), { id: crypto.randomUUID(), text: newSubtask, completed: false }]
    }));
    setNewSubtask("");
  };

  const removeSubtaskEdit = (subtaskId, e) => {
    e.preventDefault();
    setEditForm(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter(st => st.id !== subtaskId)
    }));
  };

  const toggleCollapse = (taskId, isCurrentlyCollapsed) => {
    setCollapsedTasks(prev => ({ ...prev, [taskId]: !isCurrentlyCollapsed }));
  };

  const activeSchedules = schedules.filter(s => !s.archived);

  const sortedSchedules = [...activeSchedules].sort((a, b) => {
    const diffA = getDaysDifference(getTodayString(), a.endDate);
    const diffB = getDaysDifference(getTodayString(), b.endDate);
    return sortOrder === 'nearest' ? diffA - diffB : diffB - diffA;
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 pb-6 px-3 md:px-0 mt-4 md:mt-0 relative z-10">
      <header className="flex justify-between items-end mb-3 pt-6 md:pt-0">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-indigo-950'}`}>Active Schedule</h1>
          <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-slate-400' : 'text-indigo-800/70'}`}>Structure your time to seek the truth efficiently.</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shadow-sm transition-colors backdrop-blur-xl ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/40 border-white/60 shadow-[0_4px_15px_rgba(0,0,0,0.02)]'}`}>
          <span className={`text-[11px] font-medium hidden md:inline ${isDarkMode ? 'text-slate-400' : 'text-indigo-800/70'}`}>Sort:</span>
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-transparent border-none outline-none text-xs font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer"
          >
            <option value="nearest">Nearest</option>
            <option value="furthest">Furthest</option>
          </select>
        </div>
      </header>

      <form onSubmit={handleAddTask} className={`p-4 rounded-2xl shadow-lg border space-y-3 transition-colors relative z-10 backdrop-blur-2xl ${isDarkMode ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white/40 border-white/60 shadow-[0_8px_32px_0_rgba(199,210,254,0.3)]'}`}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl focus-within:ring-2 focus-within:ring-indigo-400 transition-all border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white/50 border-white/60 shadow-sm'}`}>
            <BookOpen size={16} className={isDarkMode ? 'text-slate-500' : 'text-indigo-400'} flex-shrink-0 />
            <input
              type="text"
              placeholder="Course Name"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className={`bg-transparent border-none outline-none text-sm w-full font-bold ${isDarkMode ? 'text-slate-100 placeholder-slate-600' : 'text-indigo-950 placeholder-indigo-300'}`}
              required
            />
          </div>
          <div className={`md:w-32 flex items-center gap-2 px-3 py-2.5 rounded-xl focus-within:ring-2 focus-within:ring-indigo-400 transition-all border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white/50 border-white/60 shadow-sm'}`}>
            <Hash size={16} className={isDarkMode ? 'text-slate-500' : 'text-indigo-400'} flex-shrink-0 />
            <input
              type="text"
              placeholder="Session"
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className={`bg-transparent border-none outline-none text-sm w-full font-bold ${isDarkMode ? 'text-slate-100 placeholder-slate-600' : 'text-indigo-950 placeholder-indigo-300'}`}
            />
          </div>
        </div>

        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl focus-within:ring-2 focus-within:ring-indigo-400 transition-all border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white/50 border-white/60 shadow-sm'}`}>
          <AlignLeft size={16} className={isDarkMode ? 'text-slate-500' : 'text-indigo-400'} flex-shrink-0 />
          <input
            type="text"
            placeholder="Additional Notes (Optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`bg-transparent border-none outline-none text-sm w-full font-medium ${isDarkMode ? 'text-slate-100 placeholder-slate-600' : 'text-indigo-950 placeholder-indigo-300'}`}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className={`flex-1 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white/50 border-white/60 shadow-sm'}`}>
            <Calendar size={16} className={isDarkMode ? 'text-slate-500' : 'text-indigo-400'} />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`bg-transparent border-none outline-none text-sm w-full cursor-pointer font-medium ${isDarkMode ? 'text-slate-100 [color-scheme:dark]' : 'text-indigo-950 [color-scheme:light]'}`}
            />
          </div>
          <span className={`font-black text-[10px] hidden md:block uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-indigo-300'}`}>to</span>
          <div className={`flex-1 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white/50 border-white/60 shadow-sm'}`}>
            <Clock size={16} className={isDarkMode ? 'text-slate-500' : 'text-indigo-400'} />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`bg-transparent border-none outline-none text-sm w-full cursor-pointer font-medium ${isDarkMode ? 'text-slate-100 [color-scheme:dark]' : 'text-indigo-950 [color-scheme:light]'}`}
            />
          </div>
          <button type="submit" className="w-full md:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 text-sm font-bold flex items-center justify-center gap-1.5 flex-shrink-0">
            <Plus size={16} /> Add
          </button>
        </div>
      </form>

      <div className="pt-2 relative z-10 space-y-3">
        <AnimatePresence initial={false}>
          {sortedSchedules.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className={`text-center py-8 text-sm italic rounded-2xl border backdrop-blur-xl ${isDarkMode ? 'text-slate-400 bg-slate-800/40 border-slate-700/60' : 'text-indigo-400 bg-white/40 border-white/60 shadow-sm'}`}
            >
              No active schedules. The boundary is quiet... for now.
            </motion.div>
          ) : (
            sortedSchedules.map(task => {
              if (editingId === task.id) {
                return (
                  <motion.div
                    layout
                    variants={taskVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    key={`edit-${task.id}`}
                    style={{ originY: 0 }}
                  >
                    <div className={`flex flex-col gap-3 p-4 rounded-2xl border w-full shadow-xl relative z-20 backdrop-blur-2xl ${isDarkMode ? 'bg-slate-800 border-indigo-800/70' : 'bg-white/60 border-white/80 shadow-[0_8px_32px_0_rgba(199,210,254,0.4)]'}`}>
                      <div className="flex flex-col md:flex-row gap-3">
                        <input 
                          type="text" 
                          value={editForm.courseName}
                          onChange={e => setEditForm({...editForm, courseName: e.target.value})}
                          className={`flex-1 px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-bold transition-colors border ${isDarkMode ? 'bg-slate-900/60 border-slate-700 text-slate-100' : 'bg-white/60 border-white/60 text-indigo-950 shadow-sm'}`}
                          placeholder="Course Name"
                          autoFocus
                        />
                        <input 
                          type="text" 
                          value={editForm.session}
                          onChange={e => setEditForm({...editForm, session: e.target.value})}
                          className={`w-full md:w-24 px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-bold transition-colors border ${isDarkMode ? 'bg-slate-900/60 border-slate-700 text-slate-100' : 'bg-white/60 border-white/60 text-indigo-950 shadow-sm'}`}
                          placeholder="Session"
                        />
                      </div>
                      
                      <input 
                        type="text" 
                        value={editForm.note}
                        onChange={e => setEditForm({...editForm, note: e.target.value})}
                        className={`w-full px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-medium transition-colors border ${isDarkMode ? 'bg-slate-900/60 border-slate-700 text-slate-100' : 'bg-white/60 border-white/60 text-indigo-950 shadow-sm'}`}
                        placeholder="Notes (Optional)"
                      />

                      <div className={`flex flex-col gap-2 p-3 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-700/80' : 'bg-white/40 border-white/60'}`}>
                        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-indigo-500'}`}>
                          <ListTodo size={12} /> Sub-Tasks
                        </div>
                        {editForm.subtasks && editForm.subtasks.map(st => (
                          <div key={st.id} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-colors hover:shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-700/70' : 'bg-white/60 border-white/80 hover:border-indigo-200'}`}>
                            <span className={`text-[13px] font-medium truncate pr-3 ${isDarkMode ? 'text-slate-200' : 'text-indigo-900'}`}>{st.text}</span>
                            <button onClick={(e) => removeSubtaskEdit(st.id, e)} className="text-pink-400 hover:text-red-500 transition-colors"><X size={14} /></button>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            value={newSubtask}
                            onChange={e => setNewSubtask(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddSubtaskEdit(e); }}
                            className={`flex-1 px-3 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-[13px] font-medium transition-colors border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white/60 border-white/80 text-indigo-950'}`}
                            placeholder="New item..."
                          />
                          <button onClick={handleAddSubtaskEdit} className={`px-4 py-1.5 font-bold text-[13px] rounded-lg transition-colors shadow-sm ${isDarkMode ? 'bg-indigo-950/60 text-indigo-400 hover:bg-indigo-900/60' : 'bg-indigo-100/80 text-indigo-700 hover:bg-indigo-200'}`}>
                            Add
                          </button>
                        </div>
                      </div>

                      <div className={`flex flex-col md:flex-row gap-3 items-center pt-3 mt-1 border-t ${isDarkMode ? 'border-slate-700/70' : 'border-white/60'}`}>
                        <input 
                          type="date" 
                          value={editForm.startDate}
                          onChange={e => setEditForm({...editForm, startDate: e.target.value})}
                          className={`flex-1 w-full px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-medium border ${isDarkMode ? 'bg-slate-900/60 border-slate-700 text-slate-100 [color-scheme:dark]' : 'bg-white/60 border-white/60 text-indigo-950 [color-scheme:light]'}`}
                        />
                        <span className={`font-black text-[10px] uppercase tracking-widest hidden md:block ${isDarkMode ? 'text-slate-400' : 'text-indigo-400'}`}>to</span>
                        <input 
                          type="date" 
                          value={editForm.endDate}
                          onChange={e => setEditForm({...editForm, endDate: e.target.value})}
                          className={`flex-1 w-full px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-medium border ${isDarkMode ? 'bg-slate-900/60 border-slate-700 text-slate-100 [color-scheme:dark]' : 'bg-white/60 border-white/60 text-indigo-950 [color-scheme:light]'}`}
                        />
                        <div className="flex justify-end gap-2 w-full md:w-auto">
                          <button onClick={cancelEditing} className={`px-3 py-2 rounded-xl font-semibold text-[13px] flex items-center gap-1 transition-colors ${isDarkMode ? 'text-slate-300 hover:bg-red-950/60 hover:text-red-400' : 'text-slate-600 hover:bg-red-50 hover:text-red-500'}`} title="Cancel">
                            <X size={14} /> Cancel
                          </button>
                          <button onClick={() => saveEditing(task.id)} className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-500/30 flex items-center gap-1 text-[13px] font-bold" title="Save Changes">
                            <Check size={14} /> Save
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              }
              
              const daysLeft = getDaysDifference(getTodayString(), task.endDate);
              const daysUntilStart = getDaysDifference(getTodayString(), task.startDate);
              const progress = getProgress(task.startDate, task.endDate);
              const isFuture = daysUntilStart > 0;
              const isUrgent = daysLeft <= 2 && !isFuture;
              const isOverdue = daysLeft < 0;

              const isCollapsed = collapsedTasks[task.id] !== undefined ? collapsedTasks[task.id] : isFuture;
              
              let statusText = `${daysLeft} days left!`;
              if (isFuture) statusText = `Starts in ${daysUntilStart} days`;
              else if (daysLeft === 0) statusText = "Due TODAY!";
              else if (daysLeft === 1) statusText = "1 day left!";
              else if (isOverdue) statusText = `OVERDUE by ${Math.abs(daysLeft)} days!`;

              return (
                <motion.div
                  layout
                  variants={taskVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  key={task.id}
                  style={{ originY: 0 }}
                >
                  <div className={`flex items-start gap-3 p-4 rounded-2xl border group transition-all duration-300 relative overflow-hidden backdrop-blur-xl ${
                    isOverdue ? (isDarkMode ? 'border-red-500 bg-red-950/40 text-red-200' : 'border-red-400 bg-red-50/60 text-red-900') : 
                    isUrgent ? (isDarkMode ? 'border-red-900/60 bg-red-950/40' : 'border-pink-300 bg-pink-50/60') : 
                    (isDarkMode ? 'border-slate-700 bg-slate-800 hover:shadow-slate-900/70 hover:border-indigo-800/80' : 'border-white/60 bg-white/50 hover:shadow-[0_4px_20px_0_rgba(199,210,254,0.3)] hover:border-white/80 hover:bg-white/70')
                  }`}>
                    <button onClick={() => toggleComplete(task.id)} className={`flex-shrink-0 mt-0.5 transition-colors ${task.completed ? 'text-green-500' : isUrgent ? 'text-pink-400 hover:text-pink-500' : (isDarkMode ? 'text-slate-500 hover:text-indigo-400' : 'text-indigo-300 hover:text-indigo-500')}`}>
                      {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 pr-6">
                          <p className={`font-extrabold text-lg truncate transition-all ${task.completed ? 'line-through opacity-50' : ''} ${isDarkMode ? 'text-slate-50' : 'text-indigo-950'}`}>
                            {task.courseName}
                          </p>
                          {task.session && (
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg ${
                              isOverdue ? 'bg-red-600 text-white' : 
                              isUrgent ? (isDarkMode ? 'bg-red-900/60 text-red-300' : 'bg-pink-200/50 text-pink-700') : 
                              isFuture ? (isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-white/60 text-indigo-400 border border-white/60') : 
                              (isDarkMode ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-100/50 text-indigo-700 border border-white/60')
                            }`}>
                              SES {task.session}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 flex-shrink-0 absolute top-3 right-3">
                          <div className={`flex flex-row items-center opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-xl border backdrop-blur-md ${isDarkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white/60 border-white/80 shadow-sm'}`}>
                            <button onClick={() => startEditing(task)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-900/40' : 'text-indigo-400 hover:text-indigo-600 hover:bg-white/80'}`} title="Edit">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => duplicateTask(task.id)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-900/40' : 'text-indigo-400 hover:text-indigo-600 hover:bg-white/80'}`} title="Duplicate">
                              <Copy size={14} />
                            </button>
                            <button onClick={() => deleteTask(task.id)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-950/60' : 'text-pink-400 hover:text-red-500 hover:bg-white/80'}`} title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <button 
                            onClick={() => toggleCollapse(task.id, isCollapsed)}
                            className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'text-slate-500 hover:text-indigo-400 hover:bg-slate-700/50' : 'text-indigo-400 hover:text-indigo-600 hover:bg-white/50'}`}
                          >
                            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                          </button>
                        </div>
                      </div>
                      
                      <div className={`flex items-center gap-1.5 mt-1 pb-1.5 border-b mb-2 ${isDarkMode ? 'border-slate-700/50' : 'border-indigo-100/50'}`}>
                        <Calendar size={12} className={isDarkMode ? 'text-slate-500' : 'text-indigo-400'} />
                        <p className={`text-[13px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-indigo-800/70'}`}>
                          {task.startDate} <span className={`mx-1 font-bold opacity-70 ${isDarkMode ? 'text-slate-600' : 'text-indigo-300'}`}>→</span> {task.endDate}
                        </p>
                        {isCollapsed && (
                          <span className={`ml-auto text-[10px] font-black uppercase tracking-wide ${isUrgent ? 'text-pink-500' : isFuture ? (isDarkMode ? 'text-slate-500' : 'text-indigo-300') : 'text-indigo-600'}`}>
                            {statusText}
                          </span>
                        )}
                      </div>

                      <AnimatePresence initial={false}>
                        {!isCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            {task.note && (
                              <div className={`mt-2 p-3 rounded-xl border flex items-start gap-2 ${isDarkMode ? 'bg-slate-900/60 border-slate-700/70' : 'bg-white/50 border-white/60'}`}>
                                <AlignLeft size={14} className={`mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-indigo-400'}`} />
                                <p className={`text-[13px] font-medium italic leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-indigo-900'}`}>
                                  {task.note}
                                </p>
                              </div>
                            )}

                            {task.subtasks && task.subtasks.length > 0 && (
                              <div className={`mt-3 space-y-1.5 pl-2 border-l-2 ml-1 py-0.5 ${isDarkMode ? 'border-indigo-900/70' : 'border-pink-200'}`}>
                                {task.subtasks.map(st => (
                                  <div key={st.id} className="flex items-start gap-2 group/subtask ml-1.5">
                                    <button
                                      onClick={() => toggleSubtask(task.id, st.id)}
                                      className={`mt-0.5 flex-shrink-0 transition-colors ${st.completed ? 'text-indigo-500' : (isDarkMode ? 'text-slate-600 hover:text-indigo-400' : 'text-indigo-300 hover:text-indigo-500')}`}
                                    >
                                      {st.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>
                                    <span className={`text-[13px] leading-relaxed transition-all font-medium ${st.completed ? (isDarkMode ? 'line-through text-slate-500' : 'line-through text-indigo-400/70') : (isDarkMode ? 'text-slate-100' : 'text-indigo-950')}`}>
                                      {st.text}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="mt-4 pr-1">
                              <div className="flex justify-between items-end mb-1.5">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isUrgent ? 'text-pink-500' : isFuture ? (isDarkMode ? 'text-slate-500' : 'text-indigo-400') : 'text-indigo-600'}`}>
                                  {statusText}
                                </span>
                                <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-indigo-400'}`}>{progress}% elapsed</span>
                              </div>
                              <div className={`w-full h-2 rounded-full overflow-hidden shadow-inner relative ${isDarkMode ? 'bg-slate-700' : 'bg-white/60'}`}>
                                <div 
                                  className={`h-full rounded-full transition-all duration-700 ease-out relative z-10 ${isOverdue ? 'bg-red-500' : isUrgent ? 'bg-pink-400' : isFuture ? (isDarkMode ? 'bg-slate-600' : 'bg-indigo-200') : 'bg-indigo-500'}`}
                                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                                ></div>
                                <div className={`absolute inset-0 w-full ${isDarkMode ? 'bg-indigo-900/30' : 'bg-pink-100/30'}`}></div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const ArchiveView = ({ schedules, setSchedules, isDarkMode }) => {
  const archivedSchedules = schedules.filter(s => s.archived);

  const restoreTask = (id) => {
    setSchedules(prev => prev.map(item => 
      item.id === id ? { ...item, archived: false, completed: false } : item
    ));
  };

  const permanentDeleteTask = (id) => {
    setSchedules(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-3 pb-6 px-3 md:px-0 mt-5 md:mt-0 relative z-10">
      <header className="mb-4 pt-4 md:pt-0">
        <h1 className={`text-2xl font-bold tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-indigo-950'}`}>Archive</h1>
        <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-slate-400' : 'text-indigo-800/70'}`}>Memories and completed tasks residing in the boundary of history.</p>
      </header>

      <div className="space-y-2.5 opacity-95">
        <AnimatePresence initial={false}>
          {archivedSchedules.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-center py-8 text-sm italic rounded-2xl border backdrop-blur-xl ${isDarkMode ? 'text-slate-400 bg-slate-800/40 border-slate-700/60' : 'text-indigo-400 bg-white/40 border-white/60 shadow-sm'}`}>
              The archive is empty. History has yet to be written.
            </motion.div>
          ) : (
            archivedSchedules.map(task => (
              <motion.div
                layout
                variants={taskVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                key={task.id}
                style={{ originY: 0 }}
              >
                <div className={`flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-2xl border group transition-all relative overflow-hidden backdrop-blur-xl ${isDarkMode ? 'bg-slate-800/90 border-slate-700/70 hover:border-indigo-900/70' : 'bg-white/50 border-white/60 hover:border-white/80 hover:bg-white/70 hover:shadow-[0_4px_15px_0_rgba(199,210,254,0.3)]'}`}>
                  <div className={`absolute inset-0 z-0 opacity-70 ${isDarkMode ? 'bg-slate-900/30' : 'bg-white/30'}`}></div>
                  <div className="flex items-center gap-3 relative z-10 flex-1 min-w-0">
                    <div className={`flex-shrink-0 transition-colors group-hover:text-green-500 ${isDarkMode ? 'text-slate-500' : 'text-indigo-300'}`}>
                      {task.completed ? <CheckCircle2 size={20} /> : <Archive size={20} />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold truncate line-through opacity-70 group-hover:opacity-100 group-hover:no-underline transition-all ${isDarkMode ? 'text-slate-200 group-hover:text-slate-50' : 'text-indigo-900 group-hover:text-indigo-950'}`}>
                          {task.courseName}
                        </p>
                        {task.session && (
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider border ${isDarkMode ? 'bg-slate-700 text-slate-400 border-transparent' : 'bg-white/60 text-indigo-500 border-white/60'}`}>
                            SES {task.session}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] mt-0.5 font-medium flex items-center gap-1 opacity-90 ${isDarkMode ? 'text-slate-400' : 'text-indigo-800/60'}`}>
                        <Calendar size={11} className={isDarkMode ? 'text-slate-400' : 'text-indigo-400'}/> Ended: {task.endDate}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-1.5 relative z-10 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 ${isDarkMode ? 'border-slate-700/60' : 'border-indigo-100/50'}`}>
                    <button onClick={() => restoreTask(task.id)} className={`flex-1 md:flex-initial flex items-center justify-center gap-1 px-3 py-2 text-[11px] rounded-lg transition-colors font-bold shadow-sm ${isDarkMode ? 'bg-indigo-950/60 text-indigo-400 hover:bg-indigo-900' : 'bg-white/60 text-indigo-600 border border-white/60 hover:bg-white/80'}`}>
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button onClick={() => permanentDeleteTask(task.id)} className={`flex-1 md:flex-initial flex items-center justify-center gap-1 px-3 py-2 text-[11px] rounded-lg transition-colors font-bold shadow-sm ${isDarkMode ? 'bg-red-950/40 text-red-400 hover:bg-red-900/60' : 'bg-white/60 text-pink-500 border border-white/60 hover:bg-pink-50'}`}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Modals ---

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isDarkMode }) => {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md ${isDarkMode ? 'bg-slate-950/70' : 'bg-indigo-900/20'}`}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`rounded-2xl p-5 max-w-sm w-full shadow-2xl border relative overflow-hidden backdrop-blur-xl ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white/80 border-white/80'}`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-pink-500/80"></div>
        <div className="flex items-center gap-2.5 text-pink-500 mb-3">
          <AlertTriangle size={20} />
          <h2 className={`text-lg font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-indigo-950'}`}>{title}</h2>
        </div>
        <p className={`text-[13px] mb-5 leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-indigo-900'}`}>{message}</p>
        <div className={`flex justify-end gap-2 pt-3 border-t ${isDarkMode ? 'border-slate-700/70' : 'border-indigo-100'}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-colors ${isDarkMode ? 'text-slate-300 hover:bg-slate-700/70' : 'text-indigo-800 hover:bg-white/60'}`}>
            Cancel
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[13px] font-bold shadow-lg shadow-pink-500/30 transition-colors">
            Purge Data
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [activeView, setActiveView] = useState('exam'); 
  const [schedules, setSchedules] = useLocalStorage('mh_schedules_v3', []);
  const [isDarkMode, setIsDarkMode] = useLocalStorage('mh_theme_dark', false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Apply Dark Mode Class to HTML/Body on mount and change
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    // ✦ Warna solid backup biar kalau animasi belum load tetep sesuai tema ✦
    document.documentElement.style.backgroundColor = isDarkMode ? '#030712' : '#fdf2f8'; 
    return () => { document.documentElement.style.backgroundColor = ''; };
  }, [isDarkMode]);

  useEffect(() => {
    const today = getTodayString();
    let hasChanges = false;
    
    const updatedSchedules = schedules.map(task => {
      if (!task.archived) {
        if (task.completed || task.endDate < today) {
          hasChanges = true;
          return { ...task, archived: true };
        }
      }
      return task;
    });

    if (hasChanges) {
      const timer = setTimeout(() => {
        setSchedules(updatedSchedules);
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [schedules, setSchedules]);

  const handleSaveData = () => {
    const backupData = {
      schedules: schedules
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = `cyresia_backup_${getTodayString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          setSchedules(data);
        } else if (data.schedules) {
          setSchedules(data.schedules);
        }
        window.location.reload(); 
      } catch (error) {
        console.error("Mantra pemulihan gagal. Segel Cyresia tidak valid:", error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleClearAllData = () => {
    setSchedules([]);
    window.localStorage.removeItem('mh_schedules_v3');
    window.location.reload(); 
  };

  return (
    <div className={`${isDarkMode ? 'dark' : ''} min-h-[100dvh] w-full relative overflow-hidden bg-transparent transition-colors duration-500`}>
      
      {/* ✦ GLOBAL BACKGROUND ✦ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {isDarkMode ? (
          <>
            <div className={`absolute inset-0 bg-stars-1 opacity-100`}></div>
            <div className={`absolute inset-0 bg-stars-2 opacity-100`}></div>
            <div className="absolute top-1/4 left-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] nebula-float-1"></div>
            <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[110px] nebula-float-2"></div>
          </>
        ) : (
          <div className="absolute inset-0 bg-cyresia-light opacity-100"></div>
        )}
      </div>

      {/* ✦ TOMBOL HAMBURGER MELAYANG DI MOBILE ✦ */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={`md:hidden fixed top-3 right-3 z-[60] p-2 rounded-xl backdrop-blur-xl border shadow-lg transition-all active:scale-95 ${isDarkMode ? 'bg-slate-900/50 border-slate-700/50 text-white' : 'bg-white/50 border-white/60 text-indigo-950'}`}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={`relative z-10 min-h-[100dvh] flex flex-col md:flex-row font-sans selection:bg-pink-200 ${isDarkMode ? 'text-slate-100 dark:selection:bg-indigo-900/60' : 'text-indigo-950'}`}>
        
        {/* Sidebar Navigation */}
        <nav className={`
          ${isMobileMenuOpen ? 'fixed inset-0 z-50 flex pt-16' : 'hidden'}
          md:flex w-full md:w-64 md:relative border-r flex-col shrink-0 transition-all duration-500 shadow-2xl md:shadow-none backdrop-blur-2xl
          ${isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white/40 border-white/50 shadow-[4px_0_24px_rgba(199,210,254,0.3)]'}
        `}>
          <div className="flex items-center gap-2.5 mb-5 px-4 md:pt-4">
             <div className="relative">
                <div className={`absolute -inset-1.5 blur-md opacity-40 rounded-full ${isDarkMode ? 'bg-indigo-500' : 'bg-pink-400'}`}></div>
                <img src="/faviconcy.jpg" alt="Cyresia" className={`w-10 h-10 rounded-xl object-cover shadow-lg relative z-10 transition-all hover:rotate-12 ${isDarkMode ? 'shadow-indigo-300/50' : 'shadow-pink-300/50'}`} />
             </div>
            <div>
              <h2 className="font-black text-lg tracking-tight leading-none">Cyresia</h2>
              <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-indigo-500'}`}>Exam Companion</p>
            </div>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto flex-1 px-2.5 scrollbar-thin">
            <SidebarItem icon={BrainCircuit} label="Exam Room" active={activeView === 'exam'} onClick={() => { setActiveView('exam'); setIsMobileMenuOpen(false); }} />
            <SidebarItem icon={Calendar} label="Active Schedule" active={activeView === 'schedule'} onClick={() => { setActiveView('schedule'); setIsMobileMenuOpen(false); }} />
            <SidebarItem icon={Archive} label="Archive" active={activeView === 'archive'} onClick={() => { setActiveView('archive'); setIsMobileMenuOpen(false); }} />
          </div>

          <div className={`mt-6 md:mt-auto pt-4 pb-4 px-2.5 border-t space-y-1.5 ${isDarkMode ? 'border-slate-800/80' : 'border-white/60'}`}>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-2 px-2 ${isDarkMode ? 'text-slate-500' : 'text-indigo-400'}`}>System Settings</p>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all group border ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 border-transparent hover:border-slate-700/50' : 'text-indigo-800 bg-white/40 border-white/60 hover:bg-white/70 shadow-sm'}`}
            >
              <div className="flex items-center gap-2.5">
                {isDarkMode ? <Sun size={14} className="group-hover:rotate-90 text-amber-400 transition-transform duration-500" /> : <Moon size={14} className="group-hover:-rotate-12 text-indigo-500 transition-transform duration-500" />}
                <span className="font-bold text-[11px] tracking-wide">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </div>
              <div className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-300 ${isDarkMode ? 'bg-indigo-600' : 'bg-pink-400'}`}>
                <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${isDarkMode ? 'translate-x-3' : 'translate-x-0'}`}></div>
              </div>
            </button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleLoadData} className="hidden" />
            <SidebarItem icon={Upload} label="Load Backup" onClick={() => fileInputRef.current?.click()} />
            <SidebarItem icon={Save} label="Save Backup" onClick={handleSaveData} />
            <div className={`pt-1.5 mt-1.5 border-t ${isDarkMode ? 'border-slate-800/60' : 'border-white/60'}`}>
                <SidebarItem icon={Settings} label="Clear Data" danger onClick={() => setIsClearModalOpen(true)} />
            </div>
          </div>
        </nav>

        {/* Main Content Area: Padding dirapatkan di sini */}
        <main className={`flex-1 overflow-y-auto relative h-[100dvh] scroll-smooth flex-col ${activeView === 'exam' ? 'p-0' : 'p-2 md:p-4'}`}>
          {activeView === 'exam' && <StudyRoom isDarkMode={isDarkMode} />}
          {activeView === 'schedule' && <ScheduleView schedules={schedules} setSchedules={setSchedules} isDarkMode={isDarkMode} />}
          {activeView === 'archive' && <ArchiveView schedules={schedules} setSchedules={setSchedules} isDarkMode={isDarkMode} />}
        </main>

        <ConfirmModal 
          isOpen={isClearModalOpen} 
          onClose={() => setIsClearModalOpen(false)}
          onConfirm={handleClearAllData}
          title="Clear System Data?"
          message="This spell will permanently delete ALL your academic schedules, exam history, and preferences from LocalStorage. This action CANNOT be undone, darling! ✦"
          isDarkMode={isDarkMode}
        />
        
      </div>
    </div>
  );
}
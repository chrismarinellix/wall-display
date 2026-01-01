import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, GripVertical, Check, Trash2, Calendar, DollarSign, Clock, FileText, ChevronDown, ChevronUp, X, Hammer, Home, Car, Paintbrush, Wrench, Package, Sparkles, User, HardHat, Pencil, Save } from 'lucide-react';
import { getProjects, addProject, updateProject, deleteProject, reorderProjects, subscribeToProjects, Project } from '../../services/supabase';
import { format, differenceInDays, startOfYear, endOfYear, isWithinInterval, addMonths } from 'date-fns';

interface DragState {
  isDragging: boolean;
  dragIndex: number | null;
  dragOverIndex: number | null;
}

export function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragIndex: null,
    dragOverIndex: null,
  });

  // Form state for adding
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newWhen, setNewWhen] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState<'Chris' | 'Contractor'>('Chris');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWhen, setEditWhen] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState<'Chris' | 'Contractor'>('Chris');

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      const data = await getProjects();
      setProjects(data);
      setIsLoading(false);
    };
    loadProjects();

    // Subscribe to realtime changes
    const unsubscribe = subscribeToProjects(setProjects);
    return () => unsubscribe?.();
  }, []);

  // Separate pending and completed projects
  const pendingProjects = useMemo(() => projects.filter(p => p.status !== 'completed'), [projects]);
  const completedProjects = useMemo(() => projects.filter(p => p.status === 'completed'), [projects]);

  // Calculate budget by month for floating widget
  const budgetByMonth = useMemo(() => {
    const monthlyBudget: { [key: string]: { total: number; projects: Project[] } } = {};
    let undatedTotal = 0;
    const undatedProjects: Project[] = [];

    pendingProjects.forEach(p => {
      if (p.cost && p.cost > 0) {
        if (p.target_date) {
          const monthKey = format(new Date(p.target_date), 'MMM yyyy');
          if (!monthlyBudget[monthKey]) {
            monthlyBudget[monthKey] = { total: 0, projects: [] };
          }
          monthlyBudget[monthKey].total += p.cost;
          monthlyBudget[monthKey].projects.push(p);
        } else {
          undatedTotal += p.cost;
          undatedProjects.push(p);
        }
      }
    });

    return { monthlyBudget, undatedTotal, undatedProjects };
  }, [pendingProjects]);

  const totalBudget = useMemo(() => pendingProjects.reduce((sum, p) => sum + (p.cost || 0), 0), [pendingProjects]);

  // Handle add project
  const handleAddProject = async () => {
    if (!newTitle.trim()) return;

    await addProject({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      when: newWhen.trim() || undefined,
      cost: newCost ? parseFloat(newCost) : undefined,
      target_date: newDate || undefined,
      assigned_to: newAssignedTo,
      status: 'pending',
    });

    // Reset form
    setNewTitle('');
    setNewDescription('');
    setNewWhen('');
    setNewCost('');
    setNewDate('');
    setNewAssignedTo('Chris');
    setShowAddForm(false);

    // Refresh
    const updated = await getProjects();
    setProjects(updated);
  };

  // Start editing a project
  const handleStartEdit = (project: Project) => {
    setEditingId(project.id);
    setEditTitle(project.title);
    setEditDescription(project.description || '');
    setEditWhen(project.when || '');
    setEditCost(project.cost?.toString() || '');
    setEditDate(project.target_date || '');
    setEditAssignedTo(project.assigned_to || 'Chris');
  };

  // Save edits
  const handleSaveEdit = async (id: string) => {
    await updateProject(id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      when: editWhen.trim() || undefined,
      cost: editCost ? parseFloat(editCost) : undefined,
      target_date: editDate || undefined,
      assigned_to: editAssignedTo,
    });

    setEditingId(null);
    const updated = await getProjects();
    setProjects(updated);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Handle status toggle
  const handleToggleStatus = async (project: Project) => {
    const newStatus = project.status === 'completed' ? 'pending' :
                      project.status === 'pending' ? 'in_progress' : 'completed';

    await updateProject(project.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : undefined,
    });

    const updated = await getProjects();
    setProjects(updated);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    await deleteProject(id);
    const updated = await getProjects();
    setProjects(updated);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDragState({ isDragging: true, dragIndex: index, dragOverIndex: null });
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragState.dragIndex !== index) {
      setDragState(prev => ({ ...prev, dragOverIndex: index }));
    }
  };

  const handleDragEnd = async () => {
    if (dragState.dragIndex !== null && dragState.dragOverIndex !== null && dragState.dragIndex !== dragState.dragOverIndex) {
      const newProjects = [...projects];
      const [removed] = newProjects.splice(dragState.dragIndex, 1);
      newProjects.splice(dragState.dragOverIndex, 0, removed);

      setProjects(newProjects);
      await reorderProjects(newProjects.map(p => p.id));
    }
    setDragState({ isDragging: false, dragIndex: null, dragOverIndex: null });
  };

  // Touch drag handlers for mobile
  const touchStartY = useRef<number>(0);
  const touchCurrentIndex = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentIndex.current = index;
    setDragState({ isDragging: true, dragIndex: index, dragOverIndex: null });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragState.isDragging) return;

    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const projectElement = elements.find(el => el.getAttribute('data-project-index'));

    if (projectElement) {
      const index = parseInt(projectElement.getAttribute('data-project-index') || '-1');
      if (index !== -1 && index !== dragState.dragIndex) {
        setDragState(prev => ({ ...prev, dragOverIndex: index }));
      }
    }
  };

  const handleTouchEnd = async () => {
    await handleDragEnd();
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'completed': return '#5a8a5a';
      case 'in_progress': return '#d4a84b';
      default: return '#999';
    }
  };

  const getStatusLabel = (status: Project['status']) => {
    switch (status) {
      case 'completed': return 'Done';
      case 'in_progress': return 'In Progress';
      default: return 'Pending';
    }
  };

  if (isLoading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f6' }}>
        <div style={{ fontSize: 14, color: '#888' }}>Loading projects...</div>
      </div>
    );
  }

  // Check if there are projects with dates for showing timeline
  const hasTimelineProjects = projects.some(p => p.target_date && p.status !== 'completed');

  return (
    <div style={{
      height: '100%',
      background: '#faf9f6',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '2px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
      }}>
        <div>
          <h1 style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '0.05em',
            margin: 0,
            color: '#1a1a1a',
          }}>
            Projects
          </h1>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            {pendingProjects.length} active, {completedProjects.length} completed
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: '#1a1a1a',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} />
          Add Project
        </button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>New Project</h2>
              <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} color="#666" />
              </button>
            </div>

            {/* Guidance Box */}
            <div style={{
              background: '#f0f7ff',
              border: '1px solid #d0e3ff',
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 16,
              fontSize: 12,
              lineHeight: 1.5,
              color: '#1a4a7a',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Be specific and actionable</div>
              <div style={{ color: '#4a6a8a' }}>
                Break big ideas into small, completable tasks. Instead of "renovate bathroom", add specific items like "paint bathroom ceiling" or "replace tap washers".
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: '#6a8aaa' }}>
                Good: "Paint the laundry floor" • Bad: "Fix up the house"
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  What specifically needs doing? *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Paint the laundry floor"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 14,
                    outline: 'none',
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <FileText size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Steps / Materials / Notes
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Buy floor paint from Bunnings. Clean surface first. Apply 2 coats, 24hrs between each."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 14,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    When
                  </label>
                  <input
                    type="text"
                    value={newWhen}
                    onChange={(e) => setNewWhen(e.target.value)}
                    placeholder="This weekend, Next month..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <DollarSign size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Cost
                  </label>
                  <input
                    type="number"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Calendar size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <User size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Who's doing it?
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setNewAssignedTo('Chris')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: `2px solid ${newAssignedTo === 'Chris' ? '#1a1a1a' : '#ddd'}`,
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: newAssignedTo === 'Chris' ? 600 : 400,
                        background: newAssignedTo === 'Chris' ? '#1a1a1a' : '#fff',
                        color: newAssignedTo === 'Chris' ? '#fff' : '#666',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <User size={12} /> Chris
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAssignedTo('Contractor')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: `2px solid ${newAssignedTo === 'Contractor' ? '#1a1a1a' : '#ddd'}`,
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: newAssignedTo === 'Contractor' ? 600 : 400,
                        background: newAssignedTo === 'Contractor' ? '#1a1a1a' : '#fff',
                        color: newAssignedTo === 'Contractor' ? '#fff' : '#666',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <HardHat size={12} /> Contractor
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddProject}
                disabled={!newTitle.trim()}
                style={{
                  padding: '12px',
                  background: newTitle.trim() ? '#1a1a1a' : '#ccc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                  marginTop: 8,
                }}
              >
                Add Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Budget Widget */}
      {totalBudget > 0 && (
        <div style={{
          position: 'absolute',
          top: 70,
          right: 16,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 12,
          padding: '14px 16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.06)',
          zIndex: 50,
          minWidth: 180,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Budget Estimate
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>
            ${totalBudget.toLocaleString()}
          </div>

          {/* Monthly breakdown */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 10 }}>
            {Object.entries(budgetByMonth.monthlyBudget)
              .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
              .slice(0, 4)
              .map(([month, data]) => (
                <div key={month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#666' }}>{month}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>${data.total.toLocaleString()}</span>
                </div>
              ))}
            {budgetByMonth.undatedTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>Unscheduled</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#888' }}>${budgetByMonth.undatedTotal.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project List */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '12px 16px',
        paddingRight: totalBudget > 0 ? 210 : 16, // Make room for floating widget
      }}>
        {pendingProjects.length === 0 && completedProjects.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 40,
            color: '#888',
          }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No projects yet</div>
            <div style={{ fontSize: 12 }}>Add your first project to get started</div>
          </div>
        ) : (
          <>
            {/* Active Projects */}
            <div style={{ marginBottom: 24 }}>
              {pendingProjects.map((project, index) => (
                <div
                  key={project.id}
                  data-project-index={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e5e5',
                    borderRadius: 8,
                    marginBottom: 8,
                    overflow: 'hidden',
                    opacity: dragState.isDragging && dragState.dragIndex === index ? 0.5 : 1,
                    transform: dragState.dragOverIndex === index ? 'translateY(4px)' : 'none',
                    transition: 'transform 0.15s ease, opacity 0.15s ease',
                    boxShadow: dragState.dragOverIndex === index ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {/* Main Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 14px',
                    gap: 12,
                  }}>
                    {/* Drag Handle */}
                    <div style={{ cursor: 'grab', touchAction: 'none', color: '#ccc' }}>
                      <GripVertical size={18} />
                    </div>

                    {/* Priority Number */}
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#1a1a1a',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      {index + 1}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#1a1a1a',
                        marginBottom: 4,
                      }}>
                        {project.title}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {project.when && (
                          <span style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={10} /> {project.when}
                          </span>
                        )}
                        {project.target_date && (
                          <span style={{ fontSize: 11, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={10} /> {format(new Date(project.target_date), 'MMM d')}
                          </span>
                        )}
                        {project.cost !== undefined && project.cost > 0 && (
                          <span style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <DollarSign size={10} /> ${project.cost.toLocaleString()}
                          </span>
                        )}
                        {project.assigned_to && (
                          <span style={{
                            fontSize: 10,
                            color: project.assigned_to === 'Contractor' ? '#7b5d2e' : '#2e5d7b',
                            background: project.assigned_to === 'Contractor' ? '#fff8e8' : '#e8f4ff',
                            padding: '2px 6px',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            fontWeight: 500,
                          }}>
                            {project.assigned_to === 'Contractor' ? <HardHat size={10} /> : <User size={10} />}
                            {project.assigned_to}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <button
                      onClick={() => handleToggleStatus(project)}
                      style={{
                        padding: '4px 10px',
                        background: `${getStatusColor(project.status)}20`,
                        color: getStatusColor(project.status),
                        border: `1px solid ${getStatusColor(project.status)}40`,
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {getStatusLabel(project.status)}
                    </button>

                    {/* Expand Button */}
                    <button
                      onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                        color: '#888',
                      }}
                    >
                      {expandedId === project.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>

                  {/* Expanded Details / Edit Form */}
                  {expandedId === project.id && (
                    <div style={{
                      padding: '12px 14px 14px',
                      paddingLeft: 68,
                      borderTop: '1px solid #f0f0f0',
                      background: '#fafafa',
                    }}>
                      {editingId === project.id ? (
                        /* Edit Form */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase' }}>Title</label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase' }}>Details</label>
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={2}
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, fontFamily: 'inherit' }}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase' }}>When</label>
                              <input
                                type="text"
                                value={editWhen}
                                onChange={(e) => setEditWhen(e.target.value)}
                                placeholder="This weekend..."
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase' }}>Cost ($)</label>
                              <input
                                type="number"
                                value={editCost}
                                onChange={(e) => setEditCost(e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase' }}>Target Date</label>
                              <input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase' }}>Assigned To</label>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => setEditAssignedTo('Chris')}
                                  style={{
                                    flex: 1,
                                    padding: '8px',
                                    border: `2px solid ${editAssignedTo === 'Chris' ? '#1a1a1a' : '#ddd'}`,
                                    borderRadius: 4,
                                    fontSize: 11,
                                    background: editAssignedTo === 'Chris' ? '#1a1a1a' : '#fff',
                                    color: editAssignedTo === 'Chris' ? '#fff' : '#666',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Chris
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditAssignedTo('Contractor')}
                                  style={{
                                    flex: 1,
                                    padding: '8px',
                                    border: `2px solid ${editAssignedTo === 'Contractor' ? '#1a1a1a' : '#ddd'}`,
                                    borderRadius: 4,
                                    fontSize: 11,
                                    background: editAssignedTo === 'Contractor' ? '#1a1a1a' : '#fff',
                                    color: editAssignedTo === 'Contractor' ? '#fff' : '#666',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Contractor
                                </button>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <button
                              onClick={() => handleSaveEdit(project.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '8px 14px',
                                background: '#1a1a1a',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 500,
                                color: '#fff',
                                cursor: 'pointer',
                              }}
                            >
                              <Save size={12} /> Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '8px 14px',
                                background: '#fff',
                                border: '1px solid #ddd',
                                borderRadius: 4,
                                fontSize: 12,
                                color: '#666',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <>
                          {project.description && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                How / Details
                              </div>
                              <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>
                                {project.description}
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button
                              onClick={() => handleStartEdit(project)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 10px',
                                background: '#1a1a1a',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: 11,
                                color: '#fff',
                                cursor: 'pointer',
                              }}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(project.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 10px',
                                background: '#fff',
                                border: '1px solid #ddd',
                                borderRadius: 4,
                                fontSize: 11,
                                color: '#c44',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Completed Projects */}
            {completedProjects.length > 0 && (
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#888',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Completed ({completedProjects.length})
                </div>
                {completedProjects.map((project) => (
                  <div
                    key={project.id}
                    style={{
                      background: '#f8f8f8',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      marginBottom: 6,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#5a8a5a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Check size={14} color="#fff" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 13,
                        color: '#888',
                        textDecoration: 'line-through',
                      }}>
                        {project.title}
                      </div>
                      {project.completed_at && (
                        <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                          Completed {format(new Date(project.completed_at), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleStatus(project)}
                      style={{
                        background: 'none',
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: 10,
                        color: '#888',
                        cursor: 'pointer',
                      }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 4,
                        color: '#ccc',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed Bottom Section - Timeline */}
      <div style={{
        flexShrink: 0,
        background: '#fff',
        borderTop: '2px solid #1a1a1a',
      }}>
        {/* Timeline Progress Bar - Always visible */}
        <TimelineBar projects={projects} />
      </div>
    </div>
  );
}

// Get icon for project based on title keywords
function getProjectIcon(title: string) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('window') || lowerTitle.includes('glass') || lowerTitle.includes('door')) return Home;
  if (lowerTitle.includes('car') || lowerTitle.includes('vehicle')) return Car;
  if (lowerTitle.includes('paint') || lowerTitle.includes('color')) return Paintbrush;
  if (lowerTitle.includes('fix') || lowerTitle.includes('repair')) return Wrench;
  if (lowerTitle.includes('build') || lowerTitle.includes('construct')) return Hammer;
  if (lowerTitle.includes('clean') || lowerTitle.includes('tidy')) return Sparkles;
  return Package;
}

// Timeline component showing projects over time
function TimelineBar({ projects }: { projects: Project[] }) {
  const [hoveredProject, setHoveredProject] = useState<Project | null>(null);

  // Get projects with dates
  const projectsWithDates = useMemo(() => {
    return projects.filter(p => p.target_date && p.status !== 'completed');
  }, [projects]);

  if (projectsWithDates.length === 0) {
    return null;
  }

  // Calculate timeline range (from now to 12 months ahead)
  const now = new Date();
  const timelineStart = now;
  const timelineEnd = addMonths(now, 12);
  const totalDays = differenceInDays(timelineEnd, timelineStart);

  // Month markers
  const months = [];
  for (let i = 0; i <= 12; i++) {
    const monthDate = addMonths(now, i);
    months.push({
      label: format(monthDate, 'MMM'),
      position: (differenceInDays(monthDate, timelineStart) / totalDays) * 100,
    });
  }

  // Calculate project positions
  const projectPositions = projectsWithDates.map(project => {
    const projectDate = new Date(project.target_date!);
    const daysFromStart = differenceInDays(projectDate, timelineStart);
    const position = Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
    const Icon = getProjectIcon(project.title);
    return { project, position, Icon, isPast: projectDate < now };
  });

  return (
    <div style={{
      padding: '16px 20px 12px',
      borderTop: '1px solid #e5e5e5',
      background: '#fff',
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: '#888',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        Timeline
      </div>

      {/* Timeline track */}
      <div style={{
        position: 'relative',
        height: 56,
        marginBottom: 4,
      }}>
        {/* Background track */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 14,
          height: 4,
          background: '#e5e5e5',
          borderRadius: 2,
        }} />

        {/* Today marker */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 14,
          transform: 'translate(-50%, -50%)',
          width: 8,
          height: 8,
          background: '#1a1a1a',
          borderRadius: '50%',
          zIndex: 5,
        }} />

        {/* Project dots */}
        {projectPositions.map(({ project, position, Icon, isPast }) => (
          <div
            key={project.id}
            onMouseEnter={() => setHoveredProject(project)}
            onMouseLeave={() => setHoveredProject(null)}
            style={{
              position: 'absolute',
              left: `${position}%`,
              top: 0,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              zIndex: hoveredProject?.id === project.id ? 10 : 1,
            }}
          >
            {/* The dot */}
            <div style={{
              width: 28,
              height: 28,
              background: isPast ? '#ffebee' : project.status === 'in_progress' ? '#fff8e1' : '#fff',
              border: `2px solid ${isPast ? '#e57373' : project.status === 'in_progress' ? '#ffb74d' : '#1a1a1a'}`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              boxShadow: hoveredProject?.id === project.id ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
            }}>
              <Icon size={12} color={isPast ? '#e57373' : project.status === 'in_progress' ? '#ff8f00' : '#1a1a1a'} />
            </div>

            {/* Cost label under dot */}
            {project.cost && project.cost > 0 && (
              <div style={{
                marginTop: 4,
                fontSize: 9,
                fontWeight: 600,
                color: isPast ? '#e57373' : '#4a7a4a',
                background: isPast ? '#ffebee' : '#e8f5e9',
                padding: '2px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
              }}>
                ${project.cost >= 1000 ? `${(project.cost / 1000).toFixed(1)}k` : project.cost}
              </div>
            )}

            {/* Tooltip */}
            {hoveredProject?.id === project.id && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 8,
                background: '#1a1a1a',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: 11,
                whiteSpace: 'nowrap',
                zIndex: 100,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{project.title}</div>
                <div style={{ opacity: 0.8 }}>
                  {format(new Date(project.target_date!), 'MMM d, yyyy')}
                  {project.cost ? ` - $${project.cost.toLocaleString()}` : ''}
                </div>
                {/* Arrow */}
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid #1a1a1a',
                }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Month labels */}
      <div style={{
        position: 'relative',
        height: 16,
        marginTop: 4,
      }}>
        {months.filter((_, i) => i % 2 === 0 || months.length <= 6).map((month, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${month.position}%`,
              transform: 'translateX(-50%)',
              fontSize: 9,
              color: '#aaa',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {month.label}
          </div>
        ))}
      </div>
    </div>
  );
}

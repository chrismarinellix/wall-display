import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, GripVertical, Check, Trash2, Calendar, DollarSign, Clock, FileText, ChevronDown, ChevronUp, X, Hammer, Home, Car, Paintbrush, Wrench, Package, Sparkles, User, HardHat, Pencil, Save, Star, Flag, AlertCircle, ShoppingCart, CalendarCheck, FileCheck, Ban, MapPin } from 'lucide-react';
import { getProjects, addProject, updateProject, deleteProject, reorderProjects, subscribeToProjects, Project, PROJECT_ROOMS, ProjectRoom } from '../../services/supabase';
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
  const [newRoom, setNewRoom] = useState<ProjectRoom | ''>('');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWhen, setEditWhen] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState<'Chris' | 'Contractor'>('Chris');
  const [editRoom, setEditRoom] = useState<ProjectRoom | ''>('');
  const [editChrisPriority, setEditChrisPriority] = useState(false);
  const [editCarolinePriority, setEditCarolinePriority] = useState(false);
  const [editNeedsQuote, setEditNeedsQuote] = useState(false);
  const [editQuoteReceived, setEditQuoteReceived] = useState(false);
  const [editMaterialsNeeded, setEditMaterialsNeeded] = useState(false);
  const [editMaterialsOrdered, setEditMaterialsOrdered] = useState(false);
  const [editScheduled, setEditScheduled] = useState(false);
  const [editBlocked, setEditBlocked] = useState(false);
  const [editRequiresPermit, setEditRequiresPermit] = useState(false);
  const [editPermitApproved, setEditPermitApproved] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [roomFilter, setRoomFilter] = useState<ProjectRoom | 'all'>('all');

  // Current user (for tracking who made changes)
  const [currentUser, setCurrentUser] = useState<'Chris' | 'Caroline'>('Chris');

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

  // Separate pending and completed projects, filtered by room
  const pendingProjects = useMemo(() => {
    let filtered = projects.filter(p => p.status !== 'completed');
    if (roomFilter !== 'all') {
      filtered = filtered.filter(p => p.room === roomFilter);
    }
    return filtered;
  }, [projects, roomFilter]);

  const completedProjects = useMemo(() => {
    let filtered = projects.filter(p => p.status === 'completed');
    if (roomFilter !== 'all') {
      filtered = filtered.filter(p => p.room === roomFilter);
    }
    return filtered;
  }, [projects, roomFilter]);

  // Get unique rooms from projects for filter dropdown
  const usedRooms = useMemo(() => {
    const rooms = new Set(projects.map(p => p.room).filter(Boolean));
    return Array.from(rooms) as ProjectRoom[];
  }, [projects]);

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
      room: newRoom || undefined,
      status: 'pending',
    });

    // Reset form
    setNewTitle('');
    setNewDescription('');
    setNewWhen('');
    setNewCost('');
    setNewDate('');
    setNewAssignedTo('Chris');
    setNewRoom('');
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
    setEditRoom(project.room || '');
    setEditChrisPriority(project.chris_priority || false);
    setEditCarolinePriority(project.caroline_priority || false);
    setEditNeedsQuote(project.needs_quote || false);
    setEditQuoteReceived(project.quote_received || false);
    setEditMaterialsNeeded(project.materials_needed || false);
    setEditMaterialsOrdered(project.materials_ordered || false);
    setEditScheduled(project.scheduled || false);
    setEditBlocked(project.blocked || false);
    setEditRequiresPermit(project.requires_permit || false);
    setEditPermitApproved(project.permit_approved || false);
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
      room: editRoom || undefined,
      updated_by: currentUser,
      chris_priority: editChrisPriority,
      caroline_priority: editCarolinePriority,
      needs_quote: editNeedsQuote,
      quote_received: editQuoteReceived,
      materials_needed: editMaterialsNeeded,
      materials_ordered: editMaterialsOrdered,
      scheduled: editScheduled,
      blocked: editBlocked,
      requires_permit: editRequiresPermit,
      permit_approved: editPermitApproved,
    });

    setEditingId(null);
    const updated = await getProjects();
    setProjects(updated);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Handle project date update from timeline drag
  const handleUpdateProjectDate = async (projectId: string, newDate: string) => {
    await updateProject(projectId, {
      target_date: newDate,
    });

    const updated = await getProjects();
    setProjects(updated);
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

  // Month colors for visual grouping
  const getMonthColor = (dateStr?: string) => {
    if (!dateStr) return { bg: '#f8f8f8', border: '#e0e0e0', label: 'No date' };
    const month = new Date(dateStr).getMonth();
    const colors = [
      { bg: '#e3f2fd', border: '#2196f3', label: 'Jan' },  // January - Blue
      { bg: '#fce4ec', border: '#e91e63', label: 'Feb' },  // February - Pink
      { bg: '#e8f5e9', border: '#4caf50', label: 'Mar' },  // March - Green
      { bg: '#fff3e0', border: '#ff9800', label: 'Apr' },  // April - Orange
      { bg: '#f3e5f5', border: '#9c27b0', label: 'May' },  // May - Purple
      { bg: '#e0f7fa', border: '#00bcd4', label: 'Jun' },  // June - Cyan
      { bg: '#fff8e1', border: '#ffc107', label: 'Jul' },  // July - Amber
      { bg: '#ffebee', border: '#f44336', label: 'Aug' },  // August - Red
      { bg: '#e8eaf6', border: '#3f51b5', label: 'Sep' },  // September - Indigo
      { bg: '#fbe9e7', border: '#ff5722', label: 'Oct' },  // October - Deep Orange
      { bg: '#eceff1', border: '#607d8b', label: 'Nov' },  // November - Blue Grey
      { bg: '#efebe9', border: '#795548', label: 'Dec' },  // December - Brown
    ];
    return colors[month];
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
        padding: '12px 20px',
        borderBottom: '2px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
        flexWrap: 'wrap',
        gap: 10,
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Room Filter */}
          {usedRooms.length > 0 && (
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value as ProjectRoom | 'all')}
              style={{
                padding: '8px 12px',
                fontSize: 12,
                border: '1px solid #d1d5db',
                borderRadius: 6,
                background: roomFilter !== 'all' ? '#eef2ff' : '#fff',
                color: roomFilter !== 'all' ? '#4f46e5' : '#374151',
                fontWeight: roomFilter !== 'all' ? 600 : 400,
                cursor: 'pointer',
                minWidth: 120,
              }}
            >
              <option value="all">All Rooms</option>
              {usedRooms.map(room => (
                <option key={room} value={room}>{room}</option>
              ))}
            </select>
          )}

          {/* User Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Editing as:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setCurrentUser('Chris')}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: currentUser === 'Chris' ? 600 : 400,
                  background: currentUser === 'Chris' ? '#3b82f6' : '#f3f4f6',
                  color: currentUser === 'Chris' ? '#fff' : '#6b7280',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Chris
              </button>
              <button
                onClick={() => setCurrentUser('Caroline')}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: currentUser === 'Caroline' ? 600 : 400,
                  background: currentUser === 'Caroline' ? '#dc2626' : '#f3f4f6',
                  color: currentUser === 'Caroline' ? '#fff' : '#6b7280',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Caroline
              </button>
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

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <MapPin size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Room / Location
                </label>
                <select
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value as ProjectRoom)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 14,
                    outline: 'none',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select a room...</option>
                  {PROJECT_ROOMS.map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </select>
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
              {pendingProjects.map((project, index) => {
                // Determine priority border color
                const priorityBorder = project.caroline_priority
                  ? '4px solid #e74c3c'
                  : project.chris_priority
                    ? '4px solid #3498db'
                    : 'none';
                const monthColor = project.target_date ? getMonthColor(project.target_date) : null;

                return (
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
                    borderRadius: 10,
                    marginBottom: 10,
                    overflow: 'hidden',
                    opacity: dragState.isDragging && dragState.dragIndex === index ? 0.5 : 1,
                    transform: dragState.dragOverIndex === index ? 'translateY(4px)' : 'none',
                    transition: 'transform 0.15s ease, opacity 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    borderLeft: priorityBorder,
                  }}
                >
                  {/* Main Row - Clean and spacious */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 16px',
                    gap: 14,
                  }}>
                    {/* Complete Checkbox - Larger touch target */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(project);
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: project.status === 'in_progress'
                          ? '2px solid #f59e0b'
                          : '2px solid #22c55e',
                        background: project.status === 'completed'
                          ? '#22c55e'
                          : project.status === 'in_progress'
                            ? '#fef3c7'
                            : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                      title={project.status === 'pending' ? 'Start task' : project.status === 'in_progress' ? 'Mark complete' : 'Completed'}
                    >
                      {project.status === 'completed' && <Check size={18} color="#fff" strokeWidth={3} />}
                      {project.status === 'in_progress' && <Clock size={16} color="#f59e0b" strokeWidth={2} />}
                    </div>

                    {/* Drag Handle - Larger */}
                    <div style={{
                      cursor: 'grab',
                      touchAction: 'none',
                      color: '#d1d5db',
                      padding: 4,
                    }}>
                      <GripVertical size={20} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title row with room */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 6,
                      }}>
                        <div style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: '#1a1a1a',
                          flex: 1,
                        }}>
                          {project.title}
                        </div>
                        {/* Room badge - prominent */}
                        {project.room && (
                          <span style={{
                            fontSize: 11,
                            color: '#6366f1',
                            background: '#eef2ff',
                            padding: '4px 10px',
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 500,
                            flexShrink: 0,
                          }}>
                            <MapPin size={12} />
                            {project.room}
                          </span>
                        )}
                      </div>

                      {/* Metadata row - simplified */}
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Date with month color */}
                        {project.target_date && (
                          <span style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: monthColor?.border,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}>
                            <Calendar size={13} />
                            {format(new Date(project.target_date), 'MMM d')}
                          </span>
                        )}
                        {/* Cost */}
                        {project.cost !== undefined && project.cost > 0 && (
                          <span style={{
                            fontSize: 12,
                            color: '#059669',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            <DollarSign size={13} />
                            {project.cost.toLocaleString()}
                          </span>
                        )}
                        {/* Assigned */}
                        {project.assigned_to && (
                          <span style={{
                            fontSize: 11,
                            color: project.assigned_to === 'Contractor' ? '#b45309' : '#1e40af',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            {project.assigned_to === 'Contractor' ? <HardHat size={13} /> : <User size={13} />}
                            {project.assigned_to}
                          </span>
                        )}
                        {/* Status indicators */}
                        {project.blocked && (
                          <span style={{ fontSize: 11, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Ban size={12} /> Blocked
                          </span>
                        )}
                        {project.scheduled && !project.blocked && (
                          <span style={{ fontSize: 11, color: '#059669', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <CalendarCheck size={12} /> Scheduled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand Button - Larger touch target */}
                    <button
                      onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
                      style={{
                        background: expandedId === project.id ? '#f3f4f6' : 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        padding: 10,
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 44,
                        minHeight: 44,
                      }}
                    >
                      {expandedId === project.id ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                    </button>
                  </div>

                  {/* Expanded Details / Edit Form */}
                  {expandedId === project.id && (
                    <div style={{
                      padding: '16px 20px',
                      borderTop: '1px solid #e5e7eb',
                      background: '#f9fafb',
                    }}>
                      {editingId === project.id ? (
                        /* Edit Form - Streamlined */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {/* Core Fields */}
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Title</label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Notes / Details</label>
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={2}
                              placeholder="Steps, materials, notes..."
                              style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                            />
                          </div>

                          {/* Two-column layout for key fields */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                                <Calendar size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                Target Date
                              </label>
                              <input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                                <DollarSign size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                Estimated Cost
                              </label>
                              <input
                                type="number"
                                value={editCost}
                                onChange={(e) => setEditCost(e.target.value)}
                                placeholder="0"
                                style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                                <MapPin size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                Room / Location
                              </label>
                              <select
                                value={editRoom}
                                onChange={(e) => setEditRoom(e.target.value as ProjectRoom)}
                                style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' }}
                              >
                                <option value="">Select room...</option>
                                {PROJECT_ROOMS.map(room => (
                                  <option key={room} value={room}>{room}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                                <User size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                Assigned To
                              </label>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => setEditAssignedTo('Chris')}
                                  style={{
                                    flex: 1,
                                    padding: '12px',
                                    border: editAssignedTo === 'Chris' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    background: editAssignedTo === 'Chris' ? '#eff6ff' : '#fff',
                                    color: editAssignedTo === 'Chris' ? '#1d4ed8' : '#6b7280',
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
                                    padding: '12px',
                                    border: editAssignedTo === 'Contractor' ? '2px solid #f59e0b' : '1px solid #d1d5db',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    background: editAssignedTo === 'Contractor' ? '#fffbeb' : '#fff',
                                    color: editAssignedTo === 'Contractor' ? '#b45309' : '#6b7280',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Contractor
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Priority Toggles - Inline */}
                          <div style={{ display: 'flex', gap: 16, padding: '12px 0', borderTop: '1px solid #e5e7eb' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={editChrisPriority}
                                onChange={(e) => setEditChrisPriority(e.target.checked)}
                                style={{ width: 20, height: 20, accentColor: '#3b82f6' }}
                              />
                              <span style={{ fontSize: 13, color: editChrisPriority ? '#1d4ed8' : '#6b7280', fontWeight: 500 }}>
                                Chris Priority
                              </span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={editCarolinePriority}
                                onChange={(e) => setEditCarolinePriority(e.target.checked)}
                                style={{ width: 20, height: 20, accentColor: '#dc2626' }}
                              />
                              <span style={{ fontSize: 13, color: editCarolinePriority ? '#dc2626' : '#6b7280', fontWeight: 600 }}>
                                Caroline Priority
                              </span>
                            </label>
                          </div>

                          {/* Collapsible Advanced Options */}
                          <div>
                            <button
                              type="button"
                              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '10px 0',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#6b7280',
                              }}
                            >
                              {showAdvancedOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              Project Status Options
                            </button>

                            {showAdvancedOptions && (
                              <div style={{ padding: '12px', background: '#f3f4f6', borderRadius: 8, marginTop: 8 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="checkbox" checked={editNeedsQuote} onChange={(e) => setEditNeedsQuote(e.target.checked)} style={{ width: 18, height: 18 }} />
                                    Needs Quote
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="checkbox" checked={editQuoteReceived} onChange={(e) => setEditQuoteReceived(e.target.checked)} style={{ width: 18, height: 18 }} />
                                    Quote Received
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="checkbox" checked={editMaterialsNeeded} onChange={(e) => setEditMaterialsNeeded(e.target.checked)} style={{ width: 18, height: 18 }} />
                                    Materials Needed
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="checkbox" checked={editMaterialsOrdered} onChange={(e) => setEditMaterialsOrdered(e.target.checked)} style={{ width: 18, height: 18 }} />
                                    Materials Ordered
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="checkbox" checked={editScheduled} onChange={(e) => setEditScheduled(e.target.checked)} style={{ width: 18, height: 18 }} />
                                    Scheduled
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: editBlocked ? '#dc2626' : 'inherit' }}>
                                    <input type="checkbox" checked={editBlocked} onChange={(e) => setEditBlocked(e.target.checked)} style={{ width: 18, height: 18 }} />
                                    Blocked
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="checkbox" checked={editRequiresPermit} onChange={(e) => setEditRequiresPermit(e.target.checked)} style={{ width: 18, height: 18 }} />
                                    Requires Permit
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="checkbox" checked={editPermitApproved} onChange={(e) => setEditPermitApproved(e.target.checked)} style={{ width: 18, height: 18 }} />
                                    Permit Approved
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons - Larger */}
                          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button
                              onClick={() => handleSaveEdit(project.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                padding: '14px 24px',
                                background: '#1a1a1a',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#fff',
                                cursor: 'pointer',
                                minHeight: 48,
                              }}
                            >
                              <Save size={16} /> Save Changes
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                padding: '14px 24px',
                                background: '#fff',
                                border: '1px solid #d1d5db',
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#6b7280',
                                cursor: 'pointer',
                                minHeight: 48,
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(project.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                padding: '14px 20px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#dc2626',
                                cursor: 'pointer',
                                minHeight: 48,
                                marginLeft: 'auto',
                              }}
                            >
                              <Trash2 size={16} /> Delete
                            </button>
                          </div>

                          {/* Last updated info */}
                          {project.updated_by && (
                            <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
                              Last updated by {project.updated_by}
                              {project.updated_at && ` on ${format(new Date(project.updated_at), 'MMM d, h:mm a')}`}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* View Mode */
                        <>
                          {project.description && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                                Notes / Details
                              </div>
                              <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                                {project.description}
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 12 }}>
                            <button
                              onClick={() => handleStartEdit(project)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                padding: '12px 20px',
                                background: '#1a1a1a',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#fff',
                                cursor: 'pointer',
                                minHeight: 44,
                              }}
                            >
                              <Pencil size={16} /> Edit Project
                            </button>
                            <button
                              onClick={() => handleDelete(project.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                padding: '12px 20px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#dc2626',
                                cursor: 'pointer',
                                minHeight: 44,
                              }}
                            >
                              <Trash2 size={16} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
              })}
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
        {/* Timeline Progress Bar - Always visible, drag to reschedule */}
        <TimelineBar projects={projects} onUpdateProjectDate={handleUpdateProjectDate} />
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
function TimelineBar({ projects, onUpdateProjectDate }: { projects: Project[]; onUpdateProjectDate: (projectId: string, newDate: string) => Promise<void> }) {
  const [hoveredProject, setHoveredProject] = useState<Project | null>(null);
  const [draggingProject, setDraggingProject] = useState<Project | null>(null);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'year' | number>(0); // 'year' or month index (0-11)
  const timelineRef = useRef<HTMLDivElement>(null);

  // Get projects with dates
  const projectsWithDates = useMemo(() => {
    return projects.filter(p => p.target_date && p.status !== 'completed');
  }, [projects]);

  if (projectsWithDates.length === 0) {
    return null;
  }

  const now = new Date();
  const currentMonth = now.getMonth();

  // Calculate timeline range based on view mode
  const isMonthView = viewMode !== 'year';
  const viewMonthIndex = isMonthView ? viewMode as number : 0;
  const viewMonth = isMonthView ? addMonths(now, viewMonthIndex) : now;

  const timelineStart = isMonthView
    ? new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    : now;
  const timelineEnd = isMonthView
    ? new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
    : addMonths(now, 12);
  const totalDays = differenceInDays(timelineEnd, timelineStart) || 1;

  // Month colors
  const monthColors = [
    '#2196f3', '#e91e63', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4',
    '#ffc107', '#f44336', '#3f51b5', '#ff5722', '#607d8b', '#795548',
  ];

  // Month markers with colors
  const months = [];
  for (let i = 0; i <= 12; i++) {
    const monthDate = addMonths(now, i);
    const monthIndex = monthDate.getMonth();
    months.push({
      label: format(monthDate, 'MMM'),
      position: (differenceInDays(monthDate, timelineStart) / totalDays) * 100,
      color: monthColors[monthIndex],
      width: i < 12 ? (differenceInDays(addMonths(monthDate, 1), monthDate) / totalDays) * 100 : 0,
    });
  }

  // Calculate project positions based on view mode
  const projectPositions = projectsWithDates.map(project => {
    const projectDate = new Date(project.target_date!);
    let position: number;

    if (isMonthView) {
      // For month view, position within the month
      const dayOfMonth = projectDate.getDate();
      const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
      position = ((dayOfMonth - 1) / (daysInMonth - 1)) * 100;
    } else {
      // For year view, position across 12 months
      const daysFromStart = differenceInDays(projectDate, timelineStart);
      position = Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
    }

    const Icon = getProjectIcon(project.title);
    const isInView = !isMonthView || (
      projectDate.getMonth() === viewMonth.getMonth() &&
      projectDate.getFullYear() === viewMonth.getFullYear()
    );
    return { project, position, Icon, isPast: projectDate < now, isInView };
  }).filter(p => p.isInView);

  // Convert position percentage to date
  const positionToDate = (positionPercent: number): Date => {
    if (isMonthView) {
      const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
      const day = Math.round((positionPercent / 100) * (daysInMonth - 1)) + 1;
      return new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    } else {
      const daysFromStart = (positionPercent / 100) * totalDays;
      const newDate = new Date(timelineStart);
      newDate.setDate(newDate.getDate() + Math.round(daysFromStart));
      return newDate;
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingProject(project);

    const rect = timelineRef.current?.getBoundingClientRect();
    if (rect) {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const position = ((clientX - rect.left) / rect.width) * 100;
      setDragPosition(Math.max(0, Math.min(100, position)));
    }
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingProject || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const position = ((clientX - rect.left) / rect.width) * 100;
    setDragPosition(Math.max(0, Math.min(100, position)));
  };

  const handleDragEnd = async () => {
    if (!draggingProject || dragPosition === null) {
      setDraggingProject(null);
      setDragPosition(null);
      return;
    }

    const newDate = positionToDate(dragPosition);
    const dateString = format(newDate, 'yyyy-MM-dd');

    await onUpdateProjectDate(draggingProject.id, dateString);

    setDraggingProject(null);
    setDragPosition(null);
  };

  // Month options for picker
  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const m = addMonths(now, i);
    const projectCount = projectsWithDates.filter(p => {
      const d = new Date(p.target_date!);
      return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
    }).length;
    monthOptions.push({
      index: i,
      label: format(m, 'MMM'),
      fullLabel: format(m, 'MMMM yyyy'),
      count: projectCount,
    });
  }

  return (
    <div style={{
      padding: '12px 20px 10px',
      borderTop: '1px solid #e5e7eb',
      background: '#fff',
    }}>
      {/* Header with view toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {isMonthView ? format(viewMonth, 'MMMM yyyy') : 'Year Overview'}
        </div>

        {/* View toggle */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: '#f3f4f6',
          borderRadius: 6,
          padding: 2,
        }}>
          <button
            onClick={() => setViewMode('year')}
            style={{
              padding: '4px 8px',
              fontSize: 9,
              fontWeight: 600,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: viewMode === 'year' ? '#fff' : 'transparent',
              color: viewMode === 'year' ? '#000' : '#6b7280',
              boxShadow: viewMode === 'year' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Year
          </button>
          {monthOptions.filter(m => m.count > 0).slice(0, 6).map(m => (
            <button
              key={m.index}
              onClick={() => setViewMode(m.index)}
              style={{
                padding: '4px 6px',
                fontSize: 9,
                fontWeight: 600,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: viewMode === m.index ? '#fff' : 'transparent',
                color: viewMode === m.index ? '#000' : '#6b7280',
                boxShadow: viewMode === m.index ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
              title={`${m.count} project${m.count !== 1 ? 's' : ''}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline track */}
      <div
        ref={timelineRef}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{
          position: 'relative',
          height: isMonthView ? 50 : 55,
          marginBottom: 6,
          cursor: draggingProject ? 'grabbing' : 'default',
        }}
      >
        {/* Month color sections - only in year view */}
        {!isMonthView && months.slice(0, 12).map((month, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${month.position}%`,
              width: `${month.width}%`,
              top: 14,
              height: 6,
              background: month.color,
              opacity: 0.3,
              borderRadius: i === 0 ? '3px 0 0 3px' : i === 11 ? '0 3px 3px 0' : 0,
            }}
          />
        ))}

        {/* Background track */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 15,
          height: 4,
          background: '#e5e7eb',
          borderRadius: 2,
        }} />

        {/* Today marker */}
        {!isMonthView && (
          <div style={{
            position: 'absolute',
            left: 0,
            top: 17,
            transform: 'translate(-50%, -50%)',
            width: 10,
            height: 10,
            background: '#1a1a1a',
            borderRadius: '50%',
            zIndex: 5,
            border: '2px solid #fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }} />
        )}

        {/* Project dots - compact, draggable */}
        {projectPositions.map(({ project, position, Icon, isPast }) => {
          const isDragging = draggingProject?.id === project.id;
          const displayPosition = isDragging && dragPosition !== null ? dragPosition : position;
          const dotSize = isMonthView ? 28 : 22;

          return (
            <div
              key={project.id}
              onMouseDown={(e) => handleDragStart(e, project)}
              onTouchStart={(e) => handleDragStart(e, project)}
              onClick={() => !draggingProject && setHoveredProject(hoveredProject?.id === project.id ? null : project)}
              onMouseEnter={() => !draggingProject && setHoveredProject(project)}
              onMouseLeave={() => !draggingProject && setHoveredProject(null)}
              style={{
                position: 'absolute',
                left: `${displayPosition}%`,
                top: 0,
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: isDragging ? 100 : (hoveredProject?.id === project.id ? 10 : 1),
                padding: '2px',
                opacity: isDragging ? 0.9 : 1,
                transition: isDragging ? 'none' : 'left 0.15s ease',
              }}
            >
              {/* The dot - smaller */}
              <div style={{
                width: dotSize,
                height: dotSize,
                background: isDragging ? '#3b82f6' : (isPast ? '#fef2f2' : project.status === 'in_progress' ? '#fffbeb' : '#fff'),
                border: `2px solid ${isDragging ? '#2563eb' : (isPast ? '#f87171' : project.status === 'in_progress' ? '#f59e0b' : '#6b7280')}`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: isDragging ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease',
                transform: isDragging ? 'scale(1.2)' : (hoveredProject?.id === project.id ? 'scale(1.1)' : 'scale(1)'),
                boxShadow: isDragging ? '0 4px 12px rgba(59, 130, 246, 0.4)' : (hoveredProject?.id === project.id ? '0 3px 8px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.08)'),
              }}>
                <Icon size={isMonthView ? 12 : 10} strokeWidth={2} color={isDragging ? '#fff' : (isPast ? '#f87171' : project.status === 'in_progress' ? '#d97706' : '#374151')} />
              </div>

            {/* Cost label under dot - only in month view */}
            {isMonthView && project.cost && project.cost > 0 && (
              <div style={{
                marginTop: 2,
                fontSize: 8,
                fontWeight: 600,
                color: isPast ? '#ef4444' : '#059669',
                background: isPast ? '#fef2f2' : '#ecfdf5',
                padding: '2px 5px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
              }}>
                ${project.cost >= 1000 ? `${(project.cost / 1000).toFixed(0)}k` : project.cost}
              </div>
            )}

            {/* Tooltip */}
            {hoveredProject?.id === project.id && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 6,
                background: '#1f2937',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: 11,
                whiteSpace: 'nowrap',
                zIndex: 100,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}>
                <div style={{ fontWeight: 600 }}>{project.title}</div>
                <div style={{ opacity: 0.8, fontSize: 10, marginTop: 2 }}>
                  {format(new Date(project.target_date!), 'MMM d')}
                  {project.cost ? ` • $${project.cost >= 1000 ? `${(project.cost / 1000).toFixed(0)}k` : project.cost}` : ''}
                </div>
              </div>
            )}

            {/* Drag date indicator */}
            {isDragging && dragPosition !== null && (
              <div style={{
                position: 'absolute',
                top: -28,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#3b82f6',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
              }}>
                {format(positionToDate(dragPosition), 'MMM d')}
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Month labels - only in year view */}
      {!isMonthView && (
        <div style={{
          position: 'relative',
          height: 16,
          marginTop: 4,
        }}>
          {months.filter((_, i) => i % 2 === 0).map((month, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${month.position}%`,
                transform: 'translateX(-50%)',
                fontSize: 9,
                fontWeight: 500,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              {month.label}
            </div>
          ))}
        </div>
      )}

      {/* Day markers for month view */}
      {isMonthView && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
          padding: '0 2px',
        }}>
          {[1, 8, 15, 22, 29].map(day => {
            const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
            if (day > daysInMonth) return null;
            return (
              <span key={day} style={{ fontSize: 9, color: '#9ca3af' }}>
                {day}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

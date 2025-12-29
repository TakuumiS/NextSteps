import { useState, useEffect } from 'react'
import './App.css'
import { arrayMove } from '@dnd-kit/sortable';
import { type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import { scanEmails, verifyToken, getJobs, createJob, updateJob, deleteJob } from './api';
import { Board } from './components/Board';
import { ProfileModal } from './components/ProfileModal';
import { JobModal } from './components/JobModal';
import { AnalyticsView } from './components/AnalyticsView';
import { useToast } from './contexts/ToastContext';
import { CustomSelect } from './components/CustomSelect';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  // Job State
  const [jobs, setJobs] = useState<any[]>([]);
  const [modalJob, setModalJob] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL"); // ALL, 30, 7

  // View State
  const [currentView, setCurrentView] = useState<'board' | 'analytics'>('board');
  const [dragStartStatus, setDragStartStatus] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const checkToken = async (tokenToCheck: string) => {
      try {
        await verifyToken(tokenToCheck);
        setToken(tokenToCheck);
        localStorage.setItem('google_access_token', tokenToCheck);
        loadJobs();
      } catch (e) {
        console.error("Token invalid:", e);
        localStorage.removeItem('google_access_token');
        setToken(null);
        // Clear param from URL if invalid
        const url = new URL(window.location.href);
        if (url.searchParams.get('token')) {
          url.searchParams.delete('token');
          window.history.replaceState({}, document.title, url.toString());
        }
      }
    };

    const query = new URLSearchParams(window.location.search);
    const tokenParam = query.get('token');

    if (tokenParam) {
      // Validate token param
      checkToken(tokenParam).then(() => {
        // Clean URL after validation
        window.history.replaceState({}, document.title, "/");
      });
    } else {
      const storedToken = localStorage.getItem('google_access_token');
      if (storedToken) {
        // Validate stored token
        checkToken(storedToken);
      }
    }
  }, []);

  const loadJobs = async () => {
    try {
      const res = await getJobs();
      setJobs(res.data);
    } catch (e) {
      console.error("Failed to load jobs", e);
      showToast("Failed to load jobs", 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('google_access_token');
    setToken(null);
    setScanResult(null);
    window.location.href = "/";
  };

  const handleLogin = () => {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    window.location.href = `${API_URL}/auth/login`;
  };

  const handleScan = async () => {
    if (!token) return;
    setLoading(true);
    setScanResult(null); // Clear previous results
    try {
      const response = await scanEmails(token);
      if (response.data.processed > 0) {
        showToast(`Scanned ${response.data.processed} emails!`, 'success');
      } else {
        showToast('No new relevant emails found.', 'info');
      }
      loadJobs(); // Reload jobs after scan
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.detail || error.message || "Unknown error";

      if (error.response?.status === 401) {
        showToast(`Session expired. Please Logout and Login again.`, 'error');
      } else {
        showToast(`Error scanning emails: ${errorMsg}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Job Management Handlers ---

  const openCreateModal = () => {
    setModalJob(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (job: any) => {
    setModalJob(job);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSaveJob = async (jobData: any) => {
    setIsModalOpen(false);

    if (modalMode === 'create') {
      try {
        const res = await createJob(jobData);
        setJobs([...jobs, res.data]);
        showToast('Job added successfully', 'success');
      } catch (e) {
        console.error("Failed to create job", e);
        showToast('Failed to add job', 'error');
      }
    } else {
      // Edit mode
      const id = modalJob.id;
      setJobs(jobs.map(j => j.id === id ? { ...j, ...jobData } : j));
      try {
        await updateJob(id, jobData);
        showToast('Job updated successfully', 'success');
      } catch (e) {
        console.error("Failed to update job", e);
        showToast('Failed to update job', 'error');
        loadJobs(); // Revert optimistic update
      }
    }
  };

  const handleDeleteJob = async (id: number) => {
    // Immediate delete without confirmation popup as requested
    const jobToDelete = jobs.find(j => j.id === id);
    if (!jobToDelete) return;

    // 1. Optimistic Delete
    setJobs(prev => prev.filter(j => j.id !== id));

    // 2. Set timeout for actual delete (wait 3.5s to allow Undo)
    const deleteTimer = setTimeout(async () => {
      try {
        await deleteJob(id);
        // Silent success, user already thinks it's gone.
      } catch (e) {
        console.error("Failed to delete job on server", e);
        showToast('Failed to delete job', 'error');
        // If server delete fails, might want to restore UI, but simpler to just warn for now.
      }
    }, 3500);

    // 3. Show Toast with Undo action
    showToast('Job deleted', 'success', {
      label: 'Undo',
      onClick: () => {
        clearTimeout(deleteTimer);
        setJobs(prev => [...prev, jobToDelete]); // Restore locally
        // Ideally we'd restore to the exact same index, but appending is safe enough for now.
      }
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const job = jobs.find(j => j.id === event.active.id);
    if (job) setDragStartStatus(job.status);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = jobs.find(j => j.id === activeId);
    const isOverTask = jobs.find(j => j.id === overId);

    if (!isActiveTask) return;

    // Implemented based on dnd-kit sortable example
    const validStatuses = ['APPLIED', 'INTERVIEWING', 'REJECTED', 'OFFER'];

    // 1. Dropping over a column (empty or not)
    if (validStatuses.includes(overId as string)) {
      const newStatus = overId as string;
      if (isActiveTask.status !== newStatus) {
        setJobs((items) => {
          const activeIndex = items.findIndex((j) => j.id === activeId);
          const updated = [...items];
          updated[activeIndex] = { ...updated[activeIndex], status: newStatus };
          // Optional: move to top/bottom of that status group?
          // For simplified logic, we just update status which appends to list usually or keeps relative index
          return arrayMove(updated, activeIndex, activeIndex);
        });
      }
    }
    // 2. Dropping over another task
    else if (isOverTask) {
      if (isActiveTask.status !== isOverTask.status) {
        // Dragging to different column
        setJobs((items) => {
          const activeIndex = items.findIndex((j) => j.id === activeId);
          const overIndex = items.findIndex((j) => j.id === overId);

          if (activeIndex === -1 || overIndex === -1) return items;

          // Change status to match over task
          items[activeIndex].status = isOverTask.status;

          // Reorder
          return arrayMove(items, activeIndex, overIndex);
        });
      } else {
        // Dragging within same column (Sorting)
        setJobs((items) => {
          const activeIndex = items.findIndex((j) => j.id === activeId);
          const overIndex = items.findIndex((j) => j.id === overId);
          if (activeIndex === -1 || overIndex === -1) return items;
          return arrayMove(items, activeIndex, overIndex);
        });
      }
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;

    // Determine new status
    let newStatus = null; // Start null
    const overId = over.id;
    const validStatuses = ['APPLIED', 'INTERVIEWING', 'REJECTED', 'OFFER'];

    if (validStatuses.includes(overId)) {
      newStatus = overId;
    } else {
      const overJob = jobs.find(j => j.id === overId);
      if (overJob) newStatus = overJob.status;
    }

    // Use dragStartStatus (captured before optimistic updates) to compare
    if (newStatus && dragStartStatus && newStatus !== dragStartStatus) {
      try {
        await updateJob(active.id, { status: newStatus });
        showToast(`Job moved to ${newStatus}`, 'success');
      } catch (e) {
        console.error("Failed to update status", e);
        showToast("Failed to move job", 'error');
        loadJobs(); // Revert local state if API fails
      }
    }
    setDragStartStatus(null);
  };

  // --- Filtering ---
  const filteredJobs = jobs.filter(job => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      job.company_name.toLowerCase().includes(q) ||
      job.job_title.toLowerCase().includes(q) ||
      (job.notes && job.notes.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (dateFilter !== "ALL") {
      const days = parseInt(dateFilter);
      const jobDate = new Date(job.date_applied);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - jobDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > days) return false;
    }
    return true;
  });

  return (
    <>
      <div className="app-container">
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="white" fillOpacity="0" />
                <path fillRule="evenodd" clipRule="evenodd" d="M19 5V19H5V15H9V11H13V7H19V5Z" fill="white" />
              </svg>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#111827', letterSpacing: '-0.025em' }}>Next Steps</h1>
          </div>
          {token && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={handleScan}
                disabled={loading}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.95rem'
                }}
              >
                {loading ? 'Scanning...' : 'Scan Jobs'}
              </button>
              <button
                onClick={openCreateModal}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#fff',
                  fontWeight: 600,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                <span>+</span> Add Application
              </button>

              <button
                onClick={() => setShowProfile(true)}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.95rem'
                }}
              >
                Settings
              </button>
              <button
                onClick={handleLogout}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.95rem'
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Stats Row */}
        {token && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
            {/* Total Jobs Pill */}
            <div style={{
              background: '#fff',
              border: '1px solid var(--bg-tertiary)',
              borderRadius: '10px',
              padding: '1rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'start',
              boxShadow: 'var(--shadow-sm)',
              minWidth: '160px'
            }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>Total Applications</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{jobs.length}</span>
            </div>

            {/* View Tabs */}
            <div style={{
              background: '#f3f4f6',
              padding: '4px',
              borderRadius: '8px',
              display: 'flex',
              gap: '4px'
            }}>
              <button
                onClick={() => setCurrentView('board')}
                style={{
                  background: currentView === 'board' ? '#fff' : 'transparent',
                  border: currentView === 'board' ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  color: currentView === 'board' ? 'var(--accent-primary)' : '#6b7280',
                  fontWeight: 600,
                  boxShadow: currentView === 'board' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  fontSize: '0.9rem',
                  margin: 0,
                  cursor: 'pointer'
                }}>
                Board
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                style={{
                  background: currentView === 'analytics' ? '#fff' : 'transparent',
                  border: currentView === 'analytics' ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  color: currentView === 'analytics' ? 'var(--accent-primary)' : '#6b7280',
                  fontWeight: 600,
                  boxShadow: currentView === 'analytics' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  fontSize: '0.9rem',
                  margin: 0,
                  cursor: 'pointer'
                }}>
                Analytics
              </button>
            </div>
          </div>
        )}

        {/* Toolbar Row - Only show on Board view */}
        {token && currentView === 'board' && (
          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginBottom: '2rem' }}>
            <div style={{ flex: 1, maxWidth: '600px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>🔍</span>
              <input
                type="text"
                placeholder="Search for roles or companies"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#111827',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <CustomSelect
                label="Date:"
                value={dateFilter}
                onChange={setDateFilter}
                options={[
                  { value: "ALL", label: "Any time" },
                  { value: "30", label: "Last 30 Days" },
                  { value: "7", label: "Last 7 Days" }
                ]}
              />
            </div>
          </div>
        )}

        <div className="card header-card" style={{ background: 'transparent', padding: 0, border: 'none', boxShadow: 'none' }}>
          {token ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {scanResult && (
                <div style={{ marginBottom: '20px', marginTop: '0px' }}>
                  <div style={{ background: '#000', borderRadius: '8px', padding: '1rem', border: '1px solid #333' }}>
                    <p style={{ whiteSpace: 'pre-wrap', textAlign: 'left', margin: 0, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {scanResult}
                    </p>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '0px', width: '100%' }}>
                {currentView === 'board' ? (
                  <Board
                    jobs={filteredJobs}
                    onEditJob={openEditModal}
                    onDeleteJob={handleDeleteJob}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                  />
                ) : (
                  <AnalyticsView />
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '80px', background: '#fff', borderRadius: '12px', textAlign: 'center', border: '1px solid #e5e7eb', maxWidth: '600px', margin: '0 auto' }}>
              <h2 style={{ marginBottom: '1rem', color: '#111827' }}>Welcome to Next Steps</h2>
              <p style={{ marginBottom: '30px', color: '#6b7280' }}>
                Connect your Gmail to automatically find and track job applications, or manage them manually.
              </p>
              <button onClick={handleLogin} style={{ fontSize: '1rem', padding: '0.8rem 1.5rem', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#4285F4' }}>G</span> Login with Google
              </button>
            </div>
          )}
        </div>

        {isModalOpen && (
          <JobModal
            job={modalJob}
            mode={modalMode}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveJob}
          />
        )}

        {showProfile && token && (
          <ProfileModal token={token} onClose={() => setShowProfile(false)} />
        )}
      </div>
    </>
  )
}

export default App

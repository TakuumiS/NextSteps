import { useState } from 'react';
import { DndContext, rectIntersection, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable, type DragEndEvent, type DragStartEvent, type DragOverEvent, type UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface Job {
  id: number;
  company_name: string;
  job_title: string;
  status: string;
  date_applied: string;
  email_thread_link?: string;
  notes?: string;
}

interface SortableItemProps {
  id: number;
  job: Job;
  onDelete: (id: number) => void;
  onEdit: (job: Job) => void;
}

const JobCard = ({ job, onDelete, onEdit, isOverlay = false }: { job: Job, onDelete?: (id: number) => void, onEdit?: (job: Job) => void, isOverlay?: boolean }) => {
  return (
    <div
      className={`kanban-card ${isOverlay ? 'dragging' : ''}`}
      onDoubleClick={() => onEdit && onEdit(job)}
      style={isOverlay ? { cursor: 'grabbing' } : {}}
    >
      <div style={{ marginBottom: '8px' }}>
        <strong>{job.company_name}</strong>
        <div className="job-title">{job.job_title}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--bg-tertiary)', paddingTop: '8px' }}>
        <span>{new Date(job.date_applied).toLocaleDateString()}</span>
        {job.email_thread_link && (
          <a
            href={job.email_thread_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}
            onMouseDown={e => e.stopPropagation()} // Prevent drag start
          >
            Open Email ↗
          </a>
        )}
      </div>

      {!isOverlay && onDelete && onEdit && (
        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '12px' }}>
          <button
            className="edit-btn"
            onMouseDown={e => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(job);
            }}
            style={{
              background: 'var(--bg-secondary)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              padding: 0
            }}
            title="Edit"
          >
            ✎
          </button>
          <button
            className="delete-btn"
            onMouseDown={e => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(job.id);
            }}
            style={{
              background: 'var(--bg-secondary)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              padding: 0
            }}
            title="Delete"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

const SortableItem = ({ id, job, onDelete, onEdit }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1, // Lower opacity for the original item while dragging
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <JobCard job={job} onDelete={onDelete} onEdit={onEdit} />
    </div>
  );
};

interface DroppableColumnProps {
  id: string;
  title: string;
  items: Job[];
  onDeleteJob: (id: number) => void;
  onEditJob: (job: Job) => void;
}

const DroppableColumn = ({ id, title, items, onDeleteJob, onEditJob }: DroppableColumnProps) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="kanban-column" ref={setNodeRef} data-id={id} style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
      <h3>{title} ({items.length})</h3>
      <SortableContext items={items.map(j => j.id)} strategy={verticalListSortingStrategy}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map((job) => (
            <SortableItem key={job.id} id={job.id} job={job} onDelete={onDeleteJob} onEdit={onEditJob} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

interface BoardProps {
  jobs: Job[];
  onDragEnd: (event: DragEndEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragStart?: (event: DragStartEvent) => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (id: number) => void;
}

export const Board = ({ jobs, onDragEnd, onDragOver, onDragStart, onEditJob, onDeleteJob }: BoardProps) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columns: Record<string, Job[]> = {
    'APPLIED': jobs.filter(j => j.status === 'APPLIED'),
    'INTERVIEWING': jobs.filter(j => j.status === 'INTERVIEWING'),
    'REJECTED': jobs.filter(j => j.status === 'REJECTED'),
    'OFFER': jobs.filter(j => j.status === 'OFFER'),
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    if (onDragStart) onDragStart(event);
  };

  const handleDragEndInternal = (event: DragEndEvent) => {
    const { over } = event;
    setActiveId(null);
    if (over) {
      onDragEnd(event);
    }
  };

  return (
    <div className="kanban-board">
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={onDragOver}
        onDragEnd={handleDragEndInternal}
      >
        {Object.keys(columns).map(status => (
          <DroppableColumn key={status} id={status} title={status} items={columns[status]} onDeleteJob={onDeleteJob} onEditJob={onEditJob} />
        ))}
        <DragOverlay>
          {activeId ? (
            <div style={{ cursor: 'grabbing' }}>
              <JobCard job={jobs.find(j => j.id === activeId)!} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

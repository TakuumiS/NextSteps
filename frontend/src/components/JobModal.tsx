import { useState, type FormEvent } from 'react';
import type { Job } from './Board';

interface JobFormData {
    company_name: string;
    job_title: string;
    notes: string;
    status: string;
    date_applied: string;
}

interface JobModalProps {
    job?: Job | null;
    mode: 'create' | 'edit';
    onClose: () => void;
    onSave: (data: JobFormData) => void;
}

export const JobModal = ({ job, mode, onClose, onSave }: JobModalProps) => {
    const [formData, setFormData] = useState<JobFormData>({
        company_name: job?.company_name || '',
        job_title: job?.job_title || '',
        notes: job?.notes || '',
        status: job?.status || 'APPLIED', // Default for new jobs
        date_applied: job?.date_applied ? new Date(job.date_applied).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px',
                width: '400px', border: '1px solid var(--bg-tertiary)',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                    {mode === 'create' ? 'Add New Job' : 'Edit Job'}
                </h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Company</label>
                        <input
                            required
                            value={formData.company_name}
                            onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--bg-tertiary)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Job Title</label>
                        <input
                            required
                            value={formData.job_title}
                            onChange={e => setFormData({ ...formData, job_title: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--bg-tertiary)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    {mode === 'create' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Status</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--bg-tertiary)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            >
                                <option value="APPLIED">Applied</option>
                                <option value="INTERVIEWING">Interviewing</option>
                                <option value="OFFER">Offer</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Date Applied</label>
                        <input
                            type="date"
                            required
                            value={formData.date_applied}
                            onChange={e => setFormData({ ...formData, date_applied: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--bg-tertiary)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            rows={4}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--bg-tertiary)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--text-secondary)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" style={{ background: 'var(--accent-primary)', border: 'none', color: '#000', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            {mode === 'create' ? 'Add Job' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

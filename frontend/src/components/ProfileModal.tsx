import React, { useState, useEffect } from 'react';
import { getUserProfile, updateUserProfile } from '../api';

interface ProfileModalProps {
    token: string;
    onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ token, onClose }) => {
    const [ignoredEmails, setIgnoredEmails] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const res = await getUserProfile(token);
            setIgnoredEmails(res.data.ignored_emails || '');
        } catch (e) {
            console.error("Failed to load profile", e);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateUserProfile(token, ignoredEmails);
            setMsg("Saved!");
            setTimeout(() => setMsg(''), 2000);
        } catch (e) {
            setMsg("Error saving.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px',
                width: '450px', border: '1px solid var(--bg-tertiary)',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Settings</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Ignored Senders (Emails)</label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 0 }}>
                            Emails from these senders will be skipped during scanning. Separate with commas.
                        </p>
                        <textarea
                            value={ignoredEmails}
                            onChange={e => setIgnoredEmails(e.target.value)}
                            placeholder="recruiter@spam.com, newsletter@company.com"
                            rows={5}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--bg-tertiary)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                        {msg && <span style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{msg}</span>}
                        <button type="button" onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--text-secondary)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
                        <button type="submit" disabled={loading} style={{ background: 'var(--accent-primary)', border: 'none', color: '#000', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            {loading ? 'Saving...' : 'Save Preferences'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

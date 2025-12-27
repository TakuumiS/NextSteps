import React, { useEffect, useState } from 'react';
import { getAnalytics } from '../api';

interface AnalyticsData {
    summary: {
        total: number;
        active: number;
        offers: number;
        response_rate: string;
    };
    funnel_counts: Record<string, number>;
    weekly_activity: { week: string; count: number }[];
}

export const AnalyticsView: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await getAnalytics();
            setData(res.data);
        } catch (e) {
            console.error("Failed to load analytics", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading analytics...</div>;
    if (!data) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Failed to load data.</div>;

    const { summary, funnel_counts, weekly_activity } = data;

    // Helper for Activity Chart
    const maxWeekly = Math.max(...weekly_activity.map(d => d.count), 1); // Avoid div/0

    return (
        <div style={{ padding: '1rem 0 4rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Analytics Dashboard</h2>
                <button
                    onClick={async () => {
                        try {
                            const response = await import('../api').then(m => m.exportJobsCsv());
                            // Create blob link to download
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', 'job_applications.csv');
                            document.body.appendChild(link);
                            link.click();
                            link.parentNode?.removeChild(link);
                        } catch (e) {
                            console.error('Failed to export CSV', e);
                            alert('Failed to export CSV');
                        }
                    }}
                    style={{
                        padding: '0.6rem 1.2rem',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                    }}
                >
                    Export CSV ⬇
                </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <SummaryCard title="Total Applications" value={summary.total} />
                <SummaryCard title="Active Processes" value={summary.active} color="var(--accent-primary)" />
                <SummaryCard title="Offers Received" value={summary.offers} color="var(--status-offer)" />
                <SummaryCard title="Response Rate" value={summary.response_rate} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>

                {/* Funnel / Status Distribution */}
                <div className="card" style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--bg-tertiary)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem' }}>Application Status</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <FunnelBar label="Applied" count={funnel_counts['APPLIED']} total={summary.total} color="var(--status-applied)" />
                        <FunnelBar label="Interviewing" count={funnel_counts['INTERVIEWING']} total={summary.total} color="var(--status-interviewing)" />
                        <FunnelBar label="Rejected" count={funnel_counts['REJECTED']} total={summary.total} color="var(--status-rejected)" />
                        <FunnelBar label="Offers" count={funnel_counts['OFFER']} total={summary.total} color="var(--status-offer)" />
                    </div>
                </div>

                {/* Weekly Activity Chart */}
                <div className="card" style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--bg-tertiary)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem' }}>Last 12 Weeks Activity</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '300px', gap: '6px', paddingTop: '1rem' }}>
                        {weekly_activity.map((week, idx) => (
                            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', height: '100%' }}>
                                <div style={{
                                    width: '100%',
                                    background: week.count > 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                    opacity: week.count > 0 ? 0.8 : 0.3,
                                    borderRadius: '4px 4px 0 0',
                                    height: `${(week.count / maxWeekly) * 75}%`,
                                    transition: 'height 0.3s ease',
                                    minHeight: '2px'
                                }} title={`${week.week}: ${week.count} applications`} />
                                {/* Always render label to maintain baseline alignment, hide if not every 2nd week (since 12 bars is less crowded) */}
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'var(--text-secondary)',
                                    visibility: idx % 2 === 0 ? 'visible' : 'hidden',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {parseInt(week.week.split('-')[1])}/{parseInt(week.week.split('-')[2])}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

const SummaryCard = ({ title, value, color }: { title: string, value: string | number, color?: string }) => (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
        <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{title}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: color || 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        </div>
    </div>
);

const FunnelBar = ({ label, count, total, color }: { label: string, count: number, total: number, color: string }) => {
    const defaultTotal = total || 1;
    const percentage = Math.round((count / defaultTotal) * 100);
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem', listStyle: 'none' }}>
                <span style={{ fontWeight: 500 }}>{label}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{count} ({percentage}%)</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.5s ease-out' }} />
            </div>
        </div>
    );
};

import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
});

export const scanEmails = async (token: string) => {
    return api.post('/scan/', {}, {
        headers: {
            'token': token,
            'Authorization': `Bearer ${token}`
        }
    });
};

export const createJob = async (jobData: any) => {
    return api.post('/jobs/', jobData);
};

export const getJobs = async () => {
    return api.get('/jobs/');
};

export const updateJob = async (id: number, updates: any) => {
    return api.put(`/jobs/${id}`, updates);
};

// Keep deprecated for backward compat if needed, or just replace usage
export const updateJobStatus = async (id: number, status: string) => {
    return updateJob(id, { status });
};

export const deleteJob = (id: number) => api.delete(`/jobs/${id}`);

export const getAnalytics = () => api.get('/analytics/stats');

export const exportJobsCsv = () => api.get('/analytics/export', { responseType: 'blob' });

export const getUserProfile = async (token: string) => {
    return api.get('/users/me', {
        headers: { 'token': token }
    });
};

export const updateUserProfile = async (token: string, ignored_emails: string) => {
    return api.put('/users/me', { ignored_emails }, {
        headers: { 'token': token }
    });
};

export const verifyToken = async (token: string) => {
    return api.get('/auth/verify', {
        headers: { 'token': token }
    });
};



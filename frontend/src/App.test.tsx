import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './contexts/ToastContext';

describe('App', () => {
    it('renders without crashing', () => {
        render(
            <ToastProvider>
                <MemoryRouter>
                    <App />
                </MemoryRouter>
            </ToastProvider>
        );
    });
});

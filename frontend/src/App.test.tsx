import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import App from './App';
import { ToastProvider } from './contexts/ToastContext';

describe('App', () => {
    it('renders without crashing', () => {
        render(
            <ToastProvider>
                <App />
            </ToastProvider>
        );
    });
});

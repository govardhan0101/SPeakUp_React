import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';
import * as db from '../services/storage';

// Mock Services
vi.mock('../services/storage', async () => {
    const actual = await vi.importActual('../services/storage');
    return {
        ...actual,
        loginOrRegisterUser: vi.fn().mockImplementation((email, role) => Promise.resolve({
            id: '123',
            name: 'Test User',
            email,
            role
        }))
    }
});

describe('App Routing & Integration', () => {
    
    it('renders login screen initially', () => {
        render(<App />);
        expect(screen.getByText('SPeakUp')).toBeInTheDocument();
    });

    it('navigates to Student Dashboard on successful login', async () => {
        render(<App />);
        // Click splash screen
        fireEvent.click(screen.getByText('SPeakUp'));
        
        // Fill form
        const input = screen.getByPlaceholderText('e.g. mba.rohan@spjimr.org');
        fireEvent.change(input, { target: { value: 'student.test@spjimr.org' }});
        
        fireEvent.click(screen.getByText('Authenticate'));

        await waitFor(() => {
            expect(screen.getByText('Hi, student')).toBeInTheDocument();
        });
    });

    it('navigates to Counselor Dashboard', async () => {
        render(<App />);
        fireEvent.click(screen.getByText('SPeakUp'));
        
        const input = screen.getByPlaceholderText('e.g. mba.rohan@spjimr.org');
        fireEvent.change(input, { target: { value: 'counselor@spjimr.org' }});
        
        fireEvent.click(screen.getByText('Authenticate'));

        await waitFor(() => {
            expect(screen.getByText('Command Center')).toBeInTheDocument();
        });
    });

    it('navigates to Admin Dashboard', async () => {
        render(<App />);
        fireEvent.click(screen.getByText('SPeakUp'));
        
        const input = screen.getByPlaceholderText('e.g. mba.rohan@spjimr.org');
        fireEvent.change(input, { target: { value: 'admin@spjimr.org' }});
        
        fireEvent.click(screen.getByText('Authenticate'));

        await waitFor(() => {
            expect(screen.getByText(/HR & Dean View/i)).toBeInTheDocument();
        });
    });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import LoginScreen from '../components/LoginScreen';
import * as db from '../services/storage';

vi.mock('../services/storage');

describe('LoginScreen Component', () => {
    const mockOnLogin = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows splash screen first', () => {
        render(<LoginScreen onLogin={mockOnLogin} />);
        expect(screen.getByText('Tap to Begin')).toBeInTheDocument();
    });

    it('validates email domain', async () => {
        render(<LoginScreen onLogin={mockOnLogin} />);
        fireEvent.click(screen.getByText('Tap to Begin'));
        
        const input = screen.getByPlaceholderText('e.g. mba.rohan@spjimr.org');
        fireEvent.change(input, { target: { value: 'bad@gmail.com' }});
        fireEvent.click(screen.getByText('Authenticate'));

        expect(await screen.findByText('Please use your official @spjimr.org email.')).toBeInTheDocument();
    });

    it('calls onLogin with correct role for student', async () => {
        (db.loginOrRegisterUser as any).mockResolvedValue({ id: '1', role: 'student', email: 's.t@spjimr.org' });
        
        render(<LoginScreen onLogin={mockOnLogin} />);
        fireEvent.click(screen.getByText('Tap to Begin'));
        
        const input = screen.getByPlaceholderText('e.g. mba.rohan@spjimr.org');
        fireEvent.change(input, { target: { value: 's.t@spjimr.org' }});
        fireEvent.click(screen.getByText('Authenticate'));

        await waitFor(() => {
            expect(mockOnLogin).toHaveBeenCalledWith('student', 's.t@spjimr.org', '1');
        });
    });
});

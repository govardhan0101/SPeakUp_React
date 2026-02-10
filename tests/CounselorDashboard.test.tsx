import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import CounselorDashboard from '../components/CounselorDashboard';
import * as storage from '../services/storage';

vi.mock('../services/storage');
vi.mock('recharts', () => {
    const OriginalModule = vi.importActual('recharts');
    return {
        ...OriginalModule,
        ResponsiveContainer: ({ children }: any) => <div style={{ width: 800, height: 800 }}>{children}</div>,
        AreaChart: () => <div>MockChart</div>,
    };
});

describe('CounselorDashboard', () => {
    beforeEach(() => {
        (storage.getSlots as any).mockResolvedValue([]);
        (storage.getCounselorConversations as any).mockResolvedValue([]);
        (storage.getSlots as any).mockResolvedValue([]);
    });

    it('renders correctly', async () => {
        render(<CounselorDashboard />);
        expect(await screen.findByText('Command Center')).toBeInTheDocument();
    });

    it('opens scheduling modal', async () => {
        render(<CounselorDashboard />);
        const scheduleBtn = screen.getByText('Schedule Session');
        fireEvent.click(scheduleBtn);
        
        expect(await screen.findByText('Publish Slot')).toBeInTheDocument();
    });

    it('creates a slot', async () => {
        render(<CounselorDashboard />);
        fireEvent.click(screen.getByText('Schedule Session'));
        
        // Select time
        const timeBtn = screen.getByText('5:00 PM');
        fireEvent.click(timeBtn);
        
        // Publish
        fireEvent.click(screen.getByText('Publish Slot'));

        await waitFor(() => {
            expect(storage.createSlot).toHaveBeenCalled();
        });
    });
});

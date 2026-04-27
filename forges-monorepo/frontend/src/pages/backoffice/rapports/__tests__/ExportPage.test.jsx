import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ExportPage from '../ExportPage';
import { dashboardApi } from '../../../../api/dashboard.api';

vi.mock('../../../../hooks/useApi', () => ({
  useApi: () => ({
    execute: vi.fn(),
    isLoading: false,
  }),
}));

describe('ExportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(dashboardApi, 'exportRapportCSV').mockResolvedValue(new Blob(['a,b'], { type: 'text/csv' }));
    vi.spyOn(dashboardApi, 'exportRapportPDF').mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    Object.defineProperty(globalThis.URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:mock'),
      writable: true,
    });
    Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
      value: vi.fn(),
      writable: true,
    });
  });

  it('déclenche les exports runtime', async () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Export de Rapports')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => {
      expect(dashboardApi.exportRapportCSV).toHaveBeenCalled();
      expect(screen.getByText('Export CSV téléchargé')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /export pdf/i }));

    await waitFor(() => {
      expect(dashboardApi.exportRapportPDF).toHaveBeenCalled();
      expect(screen.getByText('Export PDF téléchargé')).toBeInTheDocument();
    });
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeedbacksAdmin from '../FeedbacksAdmin';

describe('FeedbacksAdmin', () => {
  it('affiche une indisponibilité runtime', () => {
    render(<FeedbacksAdmin />);

    expect(screen.getByText('Feedbacks formations')).toBeInTheDocument();
    expect(screen.getByText('Feedbacks figés')).toBeInTheDocument();
  });
});

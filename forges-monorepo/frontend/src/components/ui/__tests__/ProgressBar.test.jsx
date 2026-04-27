import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from '../ProgressBar';

describe('ProgressBar', () => {
  it('affiche le label avec current/max et pourcentage', () => {
    render(<ProgressBar current={7} max={10} showLabel={true} />);

    expect(screen.getByText('7 / 10')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('calcule correctement le pourcentage', () => {
    const { container } = render(<ProgressBar current={5} max={10} />);

    const progressBar = container.querySelector('.h-full');
    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  it('limite le pourcentage à 100% maximum', () => {
    const { container } = render(<ProgressBar current={15} max={10} />);

    const progressBar = container.querySelector('.h-full');
    expect(progressBar).toHaveStyle({ width: '100%' });
  });

  it('affiche 0% si max est 0', () => {
    render(<ProgressBar current={5} max={0} showLabel={true} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('applique le variant success', () => {
    const { container } = render(<ProgressBar current={5} max={10} variant="success" />);

    const progressBar = container.querySelector('.h-full');
    expect(progressBar).toHaveClass('bg-success');
  });

  it('applique le variant danger', () => {
    const { container } = render(<ProgressBar current={5} max={10} variant="danger" />);

    const progressBar = container.querySelector('.h-full');
    expect(progressBar).toHaveClass('bg-danger');
  });

  it('cache le label si showLabel=false', () => {
    render(<ProgressBar current={5} max={10} showLabel={false} />);

    expect(screen.queryByText('5 / 10')).not.toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });
});

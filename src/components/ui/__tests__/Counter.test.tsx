import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from '../form';

describe('Counter', () => {
  it('soma e subtrai respeitando min e max', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<Counter label="Adultos" value={1} min={1} max={2} onChange={onChange} />);
    expect(screen.getByRole('button', { name: '− Adultos' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: '+ Adultos' }));
    expect(onChange).toHaveBeenLastCalledWith(2);

    rerender(<Counter label="Adultos" value={2} min={1} max={2} onChange={onChange} />);
    expect(screen.getByRole('button', { name: '+ Adultos' })).toBeDisabled();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('pode esconder o valor quando ele já aparece ao lado', () => {
    render(<Counter label="Pessoas" value={4} semValor onChange={() => {}} />);
    expect(screen.queryByText('4')).not.toBeInTheDocument();
  });
});

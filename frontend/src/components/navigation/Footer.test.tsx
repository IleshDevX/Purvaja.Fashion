import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newsletterService } from '../../services/api/newsletterService.js';
import { Footer } from './Footer.js';

vi.mock('../../services/api/newsletterService.js',()=>({newsletterService:{subscribe:vi.fn()}}));

describe('Footer newsletter consent',()=>{
  beforeEach(()=>vi.clearAllMocks());
  it('reports persisted consent without claiming provider delivery',async()=>{
    vi.mocked(newsletterService.subscribe).mockResolvedValue({status:'PENDING_PROVIDER',consentedAt:new Date().toISOString(),deliveryEnabled:false});
    render(<MemoryRouter><Footer /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'shopper@example.test'}});
    fireEvent.click(screen.getByLabelText('Subscribe to newsletter'));
    await waitFor(()=>expect(newsletterService.subscribe).toHaveBeenCalledWith('shopper@example.test'));
    expect(screen.getByRole('status')).toHaveTextContent('preference is saved');
    expect(screen.getByRole('status')).toHaveTextContent('provider is enabled');
  });
  it('keeps the entered address available for retry after failure',async()=>{
    vi.mocked(newsletterService.subscribe).mockRejectedValue(new Error('Subscription could not be saved.'));
    render(<MemoryRouter><Footer /></MemoryRouter>);
    const input=screen.getByLabelText('Email address');
    fireEvent.change(input,{target:{value:'retry@example.test'}}); fireEvent.submit(input.closest('form')!);
    await screen.findByText('Subscription could not be saved.');
    expect(input).toHaveValue('retry@example.test');
  });
});

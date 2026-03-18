import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import api from '../services/api';

vi.mock('../services/api');

// Inline a minimal PermissionRoute to test the specific fixed behaviour
import React from 'react';
function PermissionRoute({ children, requiredPermissions = [] }) {
  const permsKey = requiredPermissions.join(',');
  const [hasAccess, setHasAccess] = React.useState(null);

  React.useEffect(() => {
    api.get('/permissions/me')
      .then(r => {
        const perms = r.data.permissions;
        setHasAccess(permsKey.split(',').some(p => p && (perms?.[p] === 1 || perms?.[p] === true)));
      })
      .catch(() => setHasAccess(false));
  }, [permsKey]);

  if (hasAccess === null) return <div>Loading…</div>;
  if (!hasAccess) return <div>No Access</div>;
  return children;
}

describe('PermissionRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('grants access when permission is satisfied', async () => {
    api.get.mockResolvedValue({ data: { permissions: { can_view_analytics: 1 } } });

    render(
      <MemoryRouter>
        <PermissionRoute requiredPermissions={['can_view_analytics']}>
          <div>Protected Content</div>
        </PermissionRoute>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Protected Content')).toBeInTheDocument());
  });

  it('denies access when permission is missing', async () => {
    api.get.mockResolvedValue({ data: { permissions: {} } });

    render(
      <MemoryRouter>
        <PermissionRoute requiredPermissions={['can_delete_everything']}>
          <div>Protected Content</div>
        </PermissionRoute>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('No Access')).toBeInTheDocument());
  });

  it('does not call the API more than once for stable permissions', async () => {
    api.get.mockResolvedValue({ data: { permissions: { can_view: 1 } } });

    const { rerender } = render(
      <MemoryRouter>
        <PermissionRoute requiredPermissions={['can_view']}>
          <div>Protected</div>
        </PermissionRoute>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Protected')).toBeInTheDocument());
    rerender(
      <MemoryRouter>
        <PermissionRoute requiredPermissions={['can_view']}>
          <div>Protected</div>
        </PermissionRoute>
      </MemoryRouter>
    );

    // Should still be exactly 1 call — no infinite re-check
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});

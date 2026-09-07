'use client';

import { useActionState } from 'react';
import { Input } from '@/lib/ui/Input';
import { Button } from '@/lib/ui/Button';
import { changePasswordAction, type ChangePasswordState } from './actions';

const initial: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initial);

  return (
    <form action={formAction} key={state.ok ? 'done' : 'edit'}>
      <div className="crm-authform__fields">
        <Input
          label="Current password"
          name="currentPassword"
          type="password"
          required
          placeholder="••••••••"
          autoComplete="current-password"
        />
        <Input
          label="New password"
          name="newPassword"
          type="password"
          required
          placeholder="At least 6 characters"
          autoComplete="new-password"
        />
        <Input
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          required
          placeholder="Re-enter new password"
          autoComplete="new-password"
        />
      </div>

      {state.error ? <p className="crm-authform__error">{state.error}</p> : null}
      {state.ok ? (
        <p className="crm-authform__ok">Password updated. Use your new password next time you log in.</p>
      ) : null}

      <Button type="submit" variant="primary" fullWidth disabled={pending} className="crm-authform__submit">
        {pending ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  );
}

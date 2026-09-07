import { useLocation, useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '@crm/design-system';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <EmptyState
      title="This route does not exist"
      description={`No screen is mapped to ${location.pathname}. Check 05_ROUTE_AND_STATE_CONVENTIONS.md for the routes this prototype defines.`}
      actions={
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      }
    />
  );
}

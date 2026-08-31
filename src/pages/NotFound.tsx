import { ButtonLink, Card, EmptyState } from '@/components/ui';

export function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        title="Page not found"
        description="The page you were looking for does not exist, or the link is out of date."
        action={
          <ButtonLink to="/dashboard" size="sm">
            Go to dashboard
          </ButtonLink>
        }
      />
    </Card>
  );
}

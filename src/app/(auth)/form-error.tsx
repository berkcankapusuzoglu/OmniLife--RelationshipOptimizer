/**
 * Server-action error for auth forms. `role="alert"` announces it when it
 * appears; inputs reference it through `aria-describedby`.
 */
export function FormError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {error}
    </p>
  );
}

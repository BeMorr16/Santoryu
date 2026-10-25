/** An example's caption: what a screen reader announces for it, its accessible name and role. */
export function Announced({ name, role }: { name: string; role: string }) {
  return (
    <p>
      Announced as: “{name}, {role}”
    </p>
  );
}

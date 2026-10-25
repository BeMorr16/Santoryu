import { CodeBlock } from "@/components/CodeBlock";

const code = `import { Button } from "@/components/Button";

export function Save() {
  return <Button variant="primary">Save changes</Button>;
}`;

export function CodeBlockExample() {
  return (
    <CodeBlock label="Save.tsx" language="tsx">
      {code}
    </CodeBlock>
  );
}

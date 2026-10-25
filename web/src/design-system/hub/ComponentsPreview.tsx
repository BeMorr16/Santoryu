import { Button } from "../../components/Button/Button.tsx";
import { Separator } from "../../components/Separator/Separator.tsx";
import { Stack } from "../../components/Stack/Stack.tsx";
import { TextField } from "../../components/TextField/TextField.tsx";
import { Preview } from "./Preview.tsx";

/** Real library components at their small sizes (ds-hub R3.2, design §10). */
export function ComponentsPreview() {
  return (
    <Preview>
      <Stack gap="sm">
        <Stack direction="horizontal" gap="sm" align="center">
          <Button variant="primary" size="sm">
            Button
          </Button>
        </Stack>
        <Separator />
        <TextField label="Email" type="email" size="sm" />
      </Stack>
    </Preview>
  );
}

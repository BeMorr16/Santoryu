import { TextField } from "@/components/TextField";

export function TextFieldExample() {
  return (
    <TextField
      label="Email"
      type="email"
      hint="Only used to reply to you."
      autoComplete="email"
      required
    />
  );
}

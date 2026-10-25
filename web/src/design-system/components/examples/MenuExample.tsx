import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/Menu";

export function MenuExample() {
  return (
    <Menu>
      <MenuTrigger iconEnd="chevron-down">Project actions</MenuTrigger>
      <MenuPopup>
        <MenuItem icon="copy">Copy link</MenuItem>
        <MenuItem>Download</MenuItem>
        <MenuItem disabled>Delete</MenuItem>
      </MenuPopup>
    </Menu>
  );
}

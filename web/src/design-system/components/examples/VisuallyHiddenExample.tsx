import { Link } from "@/components/Link";
import { VisuallyHidden } from "@/components/VisuallyHidden";

export function VisuallyHiddenExample() {
  return (
    <p>
      <Link href="/design-system/tokens">
        Read more <VisuallyHidden>about design tokens</VisuallyHidden>
      </Link>
    </p>
  );
}

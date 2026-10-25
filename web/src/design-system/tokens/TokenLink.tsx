import { useContext, type ReactNode } from "react";
import { Link } from "../../components/Link/Link.tsx";
import { tokenRowId } from "./reference-ids.ts";
import { TokenTargetContext } from "./TokenTargetContext.tsx";

/**
 * A link to a token's row. In the tokens page's reference, it opens the row's group before the
 * click's own fragment navigation runs, so the browser scrolls to a laid-out row (R7.1). `page`
 * makes it a link from another page, which opens the group on load instead.
 */
export function TokenLink({
  token,
  page = "",
  children = token,
}: {
  token: string;
  page?: string | undefined;
  children?: ReactNode;
}) {
  const reveal = useContext(TokenTargetContext);
  const id = tokenRowId(token);
  return (
    <Link
      href={`${page}#${id}`}
      onClick={() => {
        reveal(id);
      }}
    >
      {children}
    </Link>
  );
}

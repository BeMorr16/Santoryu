import { Link } from "@/components/Link";

export function LinkExample() {
  return (
    <>
      <p>
        Every color and size on this site comes from a{" "}
        <Link href="/design-system/tokens">design token</Link>.
      </p>
      <p>
        <Link href="https://github.com/BeMorr16/Santoryu" newTab>
          Source code on GitHub
        </Link>
      </p>
    </>
  );
}

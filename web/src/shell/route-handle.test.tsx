import { render, screen } from "@testing-library/react";
import { Outlet, createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { isRouteHandle, useRouteHandle } from "./route-handle.ts";

function RootAside() {
  return <p>Root aside</p>;
}

function LeafAside() {
  return <p>Leaf aside</p>;
}

/** Renders what the merged handle holds, so the tests read it as a user would. */
function HandleReport() {
  const { Aside, backToTop } = useRouteHandle();
  return (
    <>
      {Aside ? <Aside /> : <p>No aside</p>}
      <p>{`Back to top: ${String(backToTop)}`}</p>
    </>
  );
}

function renderWith(rootHandle: unknown, leafHandle: unknown) {
  const Stub = createRoutesStub([
    {
      path: "/",
      handle: rootHandle,
      Component: () => (
        <>
          <HandleReport />
          <Outlet />
        </>
      ),
      children: [{ path: "leaf", handle: leafHandle, Component: () => null }],
    },
  ]);
  render(<Stub initialEntries={["/leaf"]} />);
}

describe("useRouteHandle", () => {
  it("is empty when no route has a handle", async () => {
    renderWith(undefined, undefined);

    expect(await screen.findByText("No aside")).toBeInTheDocument();
    expect(screen.getByText("Back to top: undefined")).toBeInTheDocument();
  });

  it("merges handles root to leaf, so the deepest route wins", async () => {
    renderWith({ Aside: RootAside, backToTop: true }, { Aside: LeafAside, backToTop: false });

    expect(await screen.findByText("Leaf aside")).toBeInTheDocument();
    expect(screen.queryByText("Root aside")).not.toBeInTheDocument();
    expect(screen.getByText("Back to top: false")).toBeInTheDocument();
  });

  it("keeps a parent's field the leaf doesn't set", async () => {
    renderWith({ Aside: RootAside }, { backToTop: false });

    expect(await screen.findByText("Root aside")).toBeInTheDocument();
    expect(screen.getByText("Back to top: false")).toBeInTheDocument();
  });

  it.each([
    ["a string", "aside"],
    ["a number", 1],
    ["null", null],
    ["a wrongly typed field", { backToTop: "no" }],
  ])("ignores a handle that is %s", async (_kind, leafHandle) => {
    renderWith({ Aside: RootAside, backToTop: true }, leafHandle);

    expect(await screen.findByText("Root aside")).toBeInTheDocument();
    expect(screen.getByText("Back to top: true")).toBeInTheDocument();
  });
});

describe("isRouteHandle", () => {
  it.each([{}, { Aside: RootAside }, { backToTop: false }, { other: 1 }])(
    "accepts %o",
    (handle) => {
      expect(isRouteHandle(handle)).toBe(true);
    },
  );

  it.each([undefined, null, "aside", 1, { Aside: "RootAside" }, { backToTop: "false" }])(
    "rejects %o",
    (handle) => {
      expect(isRouteHandle(handle)).toBe(false);
    },
  );
});

import { useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "../../components/Button/Button.tsx";
import { customThemeOf, readPreference } from "../../theme/preference.ts";
import { TokenSearch } from "../tokens/TokenSearch.tsx";
import { CategorySection } from "./CategorySection.tsx";
import { ChainPanel } from "./ChainPanel.tsx";
import { DraftDispatch, TraceTarget } from "./context.ts";
import { DraftToolbar } from "./DraftToolbar.tsx";
import { componentByName } from "./model/builtin.ts";
import { traceChain, type TraceId } from "./model/chain.ts";
import { sectionOf, sections } from "./model/controls.ts";
import { defaultKeys } from "./model/derive.ts";
import {
  draftFrom,
  draftReducer,
  emptySource,
  readDraft,
  readSource,
  startKeys,
  startLabel,
  storeDraft,
  type Draft,
} from "./model/draft.ts";
import { resolveTheme } from "./model/resolve.ts";
import { disclosureId, editorMatches, type DisclosureId } from "./model/search.ts";
import { SaveDialogs } from "./SaveDialogs.tsx";
import styles from "./ThemeCreator.module.css";
import { ThemeLibrary } from "./ThemeLibrary.tsx";
import { ThemePreview } from "./ThemePreview.tsx";
import { useThemeActions } from "./useThemeActions.ts";

/** The 3b worked example's semantic: traced before anything else is (R8.5). */
const firstTrace = "color.action.background";

/** The measured toolbar height, read by the sticky aside and the root's scroll padding. */
const toolbarSizeProperty = "--theme-creator-toolbar-block-size";

/** How long after the last change the draft is written (design §10). */
const draftDelayMs = 300;

/**
 * The draft on arrival (design §10): a stored one, else the custom theme the site is using (so
 * "Edit themes…" lands on it), else Light. Read once: the editor mounts after hydration.
 */
function initialDraft(): Draft {
  const stored = readDraft();
  if (stored) return stored;
  const active = customThemeOf(readPreference());
  const source = active && readSource(active.source);
  if (active && source) {
    return draftFrom({ label: active.name, name: active.name, editing: active.id, source });
  }
  return draftFrom({ label: "Light", name: "", editing: null, source: emptySource("light") });
}

/**
 * The theme creator (theme-creator design §8.2): the draft in a reducer, resolved in the render
 * that changed it so the preview follows a drag (R4.4), with the contrast count and chain panel on
 * a deferred copy. Effects only for storage and focus.
 */
export function ThemeCreator() {
  const [draft, dispatch] = useReducer(draftReducer, undefined, initialDraft);
  const theme = useMemo(() => resolveTheme(draft.source), [draft.source]);
  const deferred = useDeferredValue(theme);
  const [traced, setTraced] = useState<TraceId>(firstTrace);
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  // The row "Edit <token>" asked for, focused once it has rendered.
  const pendingFocus = useRef<string | null>(null);
  const [asideOpen, setAsideOpen] = useState(false);
  const creatorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const libraryHeadingRef = useRef<HTMLHeadingElement>(null);
  const actions = useThemeActions({
    draft,
    theme,
    deferredTheme: deferred,
    dispatch,
    libraryHeadingRef,
  });
  const matches = editorMatches(query);

  const keys = { ...defaultKeys(draft.source.base), ...draft.source.keys };
  const resetKeys = startKeys(draft);

  // Drafts survive a reload (R11.1): written once changes pause; an unchanged one is removed.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      storeDraft(draft);
    }, draftDelayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [draft]);

  // The toolbar's height, however its rows wrap (theme-creator-controls design §5.3). On the root,
  // as SiteShell sets the header's: the root's scroll padding reads it, as well as the aside.
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(([entry]) => {
      const blockSize = entry?.borderBoxSize[0]?.blockSize ?? toolbar.offsetHeight;
      root.style.setProperty(toolbarSizeProperty, `${String(blockSize)}px`);
    });
    observer.observe(toolbar, { box: "border-box" });
    return () => {
      observer.disconnect();
      root.style.removeProperty(toolbarSizeProperty);
    };
  }, []);

  // WebKit leaves a focused text field where it is when the pinned bars cover part of it, and
  // doesn't always scroll one in from above: it skips the root's scroll padding, which buttons
  // respect. scrollIntoView does respect it, so focus is kept clear (WCAG 2.4.11). The toolbar is
  // pinned itself, and dialogs and menus sit in the top layer, so those are left alone.
  useEffect(() => {
    const creator = creatorRef.current;
    if (!creator) return;
    const keepClear = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (toolbarRef.current?.contains(target) || target.closest("dialog, [popover]")) return;
      const line = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
      if (target.getBoundingClientRect().top < (Number.isNaN(line) ? 0 : line) - 0.5) {
        target.scrollIntoView({ block: "nearest" });
      }
    };
    creator.addEventListener("focusin", keepClear);
    return () => {
      creator.removeEventListener("focusin", keepClear);
    };
  }, []);

  // "Edit <token>" (R3.3): once its disclosure has rendered the row, focus its control.
  useEffect(() => {
    const token = pendingFocus.current;
    if (token === null) return;
    pendingFocus.current = null;
    document
      .querySelector(`[data-token="${token}"]`)
      ?.querySelector<HTMLElement>("input, button")
      ?.focus();
  });

  function onOpenChange(id: DisclosureId, open: boolean) {
    setOpenIds((current) => {
      if (current.has(id) === open) return current;
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // A new query opens exactly the disclosures with matches; an empty one closes them (R4.3).
  function onQueryChange(next: string) {
    setQuery(next);
    setOpenIds(new Set(editorMatches(next)?.disclosures));
  }

  function editToken(token: string) {
    const component = componentByName.get(token);
    const section = sectionOf(component?.aliases ?? token);
    if (section === null) return;
    setQuery("");
    setOpenIds((current) =>
      new Set(current).add(disclosureId(section, component ? "component" : "semantic")),
    );
    pendingFocus.current = token;
  }

  return (
    <DraftDispatch value={dispatch}>
      <TraceTarget value={setTraced}>
        <div ref={creatorRef} className={styles.creator}>
          <ThemeLibrary
            actions={actions}
            editingId={draft.editing}
            headingRef={libraryHeadingRef}
          />
          <DraftToolbar ref={toolbarRef} actions={actions} startedFrom={draft.start.label} />
          <div className={styles.workspace}>
            <div className={styles.editor}>
              <TokenSearch
                query={query}
                resultQuery={query}
                count={matches?.rows.size ?? null}
                onQueryChange={onQueryChange}
              />
              {sections.map(({ id, title }) => (
                <CategorySection
                  key={id}
                  id={id}
                  title={title}
                  keys={keys}
                  startKeys={resetKeys}
                  startLabel={startLabel(draft)}
                  theme={theme}
                  openIds={openIds}
                  matches={matches?.rows ?? null}
                  onOpenChange={onOpenChange}
                />
              ))}
            </div>
            {/* After the editor in reading and Tab order (R15.1); narrow CSS shows it first. */}
            <div className={styles.aside}>
              <div className={styles.asideBar}>
                <p className={styles.asideTitle} aria-hidden="true">
                  Preview
                </p>
                {/* The toolbar scrolls away here, so Save stays in reach (theme-creator-controls R5.5). */}
                <Button
                  variant="primary"
                  size="sm"
                  className={styles.asideSave}
                  onClick={actions.save}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  iconEnd="chevron-down"
                  className={styles.asideToggle}
                  aria-expanded={asideOpen}
                  aria-controls="theme-creator-aside"
                  onClick={() => {
                    setAsideOpen(!asideOpen);
                  }}
                >
                  {asideOpen ? "Hide preview" : "Show preview"}
                </Button>
              </div>
              <div id="theme-creator-aside" className={styles.asidePanel} hidden={!asideOpen}>
                <ThemePreview theme={theme} />
                <ChainPanel chain={traceChain(traced, deferred)} theme={deferred} />
              </div>
            </div>
          </div>
          <SaveDialogs {...actions.dialogs} onEditToken={editToken} />
        </div>
      </TraceTarget>
    </DraftDispatch>
  );
}

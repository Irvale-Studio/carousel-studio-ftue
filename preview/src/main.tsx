import "@canva/app-ui-kit/styles.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { TestAppUiProvider, Box, Columns, Column, Rows, Text, Title, Button, Select } from "@canva/app-ui-kit";
import { MoreHorizontalIcon } from "@canva/app-ui-kit/icons";
import { CarouselStudio, type OpenUrl, type Plan, type Step, type Version } from "./App";

/**
 * Canva's own "You are about to leave Canva" dialog (captured on the Engyne Figma board, screen 42).
 * Canva draws it, not the app, every time the app calls requestOpenExternalUrl; Cancel resolves
 * "aborted", Continue opens the URL in a new tab and resolves "completed". The overlay is preview
 * host chrome, like #header, so it is positioned with plain styles; the dialog uses kit components.
 */
type Pending = { url: string; resolve: (s: "completed" | "aborted") => void };
let showLeaveDialog: (p: Pending) => void = () => {};
const openViaCanvaDialog: OpenUrl = (url) => new Promise((resolve) => showLeaveDialog({ url, resolve }));

function LeaveCanvaDialog() {
  const [pending, setPending] = useState<Pending | null>(null);
  showLeaveDialog = setPending;
  if (!pending) return null;
  const close = (status: "completed" | "aborted") => {
    if (status === "completed") window.open(pending.url, "_blank", "noopener,noreferrer");
    pending.resolve(status);
    setPending(null);
  };
  // No TestAppUiProvider here: the portal inherits the app's provider, and a second provider
  // strips the kit theme classes off <html> when it unmounts (every button lost its colour).
  return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label="You are about to leave Canva"
        style={{
          position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center",
          justifyContent: "center", background: "rgba(13, 18, 22, 0.45)", padding: 16,
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          <Box background="elevationSurfaceRaised" borderRadius="large" padding="3u">
            <Rows spacing="2u">
              <Title size="small">You are about to leave Canva</Title>
              <Text>
                <Text tagName="span" variant="bold">Carousel Studio</Text>
                {" wants to open "}
                <Text tagName="span" variant="bold">{pending.url}</Text>
                {" in a new tab."}
              </Text>
              <Columns spacing="1u" align="end">
                <Column width="content">
                  <Button variant="secondary" onClick={() => close("aborted")}>Cancel</Button>
                </Column>
                <Column width="content">
                  <Button variant="primary" onClick={() => close("completed")}>Continue</Button>
                </Column>
              </Columns>
            </Rows>
          </Box>
        </div>
      </div>,
    document.body,
  );
}

// Preview host only. Canva draws the panel header (app name, feedback, more) above the app iframe;
// #header stands in for it. #version is the prototype version switch, outside the panel.
// ?v=1|2|3|4, ?tab=customize|learn, ?step=connect|review|success|checkout and ?plan=free|pro
// open those states. ?credits=N sets the balance (the account's with ?plan, the starter balance without).
const q = new URLSearchParams(location.search);
const plan = q.get("plan") as Plan | null;
const account = plan ? { plan, credits: Number(q.get("credits") ?? (plan === "pro" ? 500 : 38)) } : undefined;

createRoot(document.getElementById("header")!).render(
  <TestAppUiProvider>
    <Box paddingX="2u" paddingTop="1u">
      <Columns spacing="1u" alignY="center">
        <Column><Text variant="bold">Carousel Studio</Text></Column>
        <Column width="content">
          <Button variant="tertiary" icon={MoreHorizontalIcon} ariaLabel="More options" onClick={() => {}} />
        </Column>
      </Columns>
    </Box>
  </TestAppUiProvider>
);

// Newest first; the newest is the default.
const VERSIONS: { value: Version; label: string }[] = [
  { value: "v4", label: "V4 - Credit limit paywall flow" },
  { value: "v3", label: "V3 - Credits straight away, prompt for Pro after" },
  { value: "v2", label: "V2 - Credits straight away, prompt for Google after" },
  { value: "v1", label: "V1 - No credits until login" },
];

function Preview() {
  const [version, setVersion] = useState<Version>(
    VERSIONS.find((o) => o.value === `v${q.get("v")}`)?.value ?? VERSIONS[0].value,
  );
  const choose = (v: Version) => {
    const url = new URL(location.href);
    url.searchParams.set("v", v.slice(1));
    history.replaceState(null, "", url);
    setVersion(v);
  };
  return (
    <>
      {createPortal(
        <TestAppUiProvider>
          <Box background="elevationSurface" border="ui" borderRadius="large" padding="2u">
            <Rows spacing="1u">
              <Title size="small">Prototype version</Title>
              <Select stretch value={version} onChange={choose} options={VERSIONS} />
            </Rows>
          </Box>
        </TestAppUiProvider>,
        document.getElementById("version")!,
      )}
      <CarouselStudio
        version={version}
        initialTab={q.get("tab") ?? "create"}
        initialStep={(q.get("step") as Step) ?? "create"}
        initialAccount={account}
        initialCredits={!plan && q.has("credits") ? Number(q.get("credits")) : undefined}
        openUrl={openViaCanvaDialog}
      />
      <LeaveCanvaDialog />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <TestAppUiProvider>
    <Preview />
  </TestAppUiProvider>
);

// Preview QA only: ?demo=claim (home) or ?demo=login (with ?step=review) walks login -> Connect.
const demo = q.get("demo");
if (demo) {
  const press = (label: string) =>
    [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === label)?.click();
  setTimeout(() => press(demo === "claim" ? "Claim free credits" : "Log in to create design"), 600);
  setTimeout(() => press("Connect"), 1200);
}

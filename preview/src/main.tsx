import "@canva/app-ui-kit/styles.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { TestAppUiProvider, Box, Columns, Column, Rows, Text, Title, Button, Select } from "@canva/app-ui-kit";
import { MoreHorizontalIcon } from "@canva/app-ui-kit/icons";
import { CarouselStudio, type Plan, type Step, type Version } from "./App";

// Preview host only. Canva draws the panel header (app name, feedback, more) above the app iframe;
// #header stands in for it. #version is the prototype version switch, outside the panel.
// ?v=1|2|3, ?tab=customize|learn, ?step=connect|review|success and ?plan=free|pro open those states.
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
      />
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

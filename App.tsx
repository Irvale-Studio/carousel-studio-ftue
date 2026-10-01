/**
 * Carousel Studio FTUE fix, built strictly with @canva/app-ui-kit (5.14.3).
 * Only real kit components and kit icons are used. No custom components, no custom CSS.
 *
 * The fix: nobody reaches the credit-gated render without credits.
 *  - Logged out: the top slot leads with claiming free credits (Box + Button),
 *    replacing the account-setup Alert. Creating a carousel first is still free
 *    up to the render, where the app's own Connect screen appears in place.
 *  - Logged in: the top slot shows the account, the credit balance and a link to
 *    the account. Generating runs straight through.
 *  - The trial offer sits on the finished carousel, not behind a re-login.
 *
 * Credit economy (from the dev app): new accounts get 50 credits, a render costs 12,
 * outlines are free.
 *
 * TODO (wire to the real app): auth + credits from the app backend, the recent list
 * from the user's carousels, design creation via the Canva Apps SDK, the real theme
 * picker in place of the Theme Box, and requestOpenExternalUrl on links.
 */
import "@canva/app-ui-kit/styles.css";
import {
  AppUiProvider, Rows, Columns, Column, Box, Text, Title, Button, Alert, Badge,
  Tabs, TabList, Tab, TabPanels, TabPanel, FormField, MultilineInput, NumberInput,
  TextInput, Select, RadioGroup, Checkbox, FileInput, Swatch, Link, LinkButton,
  ProgressBar, Avatar, SurfaceHeader, Scrollable, ImageCard, LoadingIndicator, Carousel, Grid, ColorSelector,
} from "@canva/app-ui-kit";
import {
  ArrowLeftIcon, ArrowRightIcon, CheckIcon, CogIcon, LightBulbIcon, PlusIcon, PremiumAppsProgramProFilledGoldIcon, SearchIcon, StarFilledIcon, StarIcon,
} from "@canva/app-ui-kit/icons";
import { useEffect, useState, type ReactNode } from "react";

// The dev app's own logomark asset; the preview serves it from public/.
const LOGO_URL = "/carousel-studio-logomark.svg";

const RENDER_COST = 12;
const FREE_CREDITS = 50;
/** V2 and V3: every Canva user starts with these, before connecting Google or paying. */
const V2_START_CREDITS = 15;

/**
 * v1 = No credits until login: credits arrive only when the user connects Google.
 * v2 = Credits straight away, prompt for Google after: the user starts on Free with
 *      V2_START_CREDITS; running low or short pushes them to connect Google for FREE_CREDITS more.
 * v3 = Credits straight away, prompt for Pro after: the same start; running low or short
 *      pushes them to upgrade to Pro instead.
 * v4 = Credit limit paywall flow: the user starts with 0 credits and the app never says so.
 *      No credit row on Create and no credit costs in the AI model picker. Outlines are free; on
 *      Review the only CTA is Start free trial (design cost underneath), which goes straight to
 *      the website checkout. The panel waits and returns the user to Review with the trial credits.
 * v5 = Template quick pick: v4, plus a Templates row at the top of Create (sideways scroll + See all,
 *      the Canva way). Picking a template opens it on the canvas.
 */
export type Version = "v1" | "v2" | "v3" | "v4" | "v5";
/** v4 and v5 share the credit limit paywall flow. */
const paywallFlow = (v: Version) => v === "v4" || v === "v5";

// Never translate credits into "N carousels": the cost varies with slides, model and images.

export type Step =
  | "create" | "connect" | "genOutline" | "review" | "genSlides" | "success" | "recent" | "checkout" | "templates";

/**
 * v5 templates. The artwork here is preview stand-in art; in the app the list and thumbnails come
 * from the backend. Paths are string literals so the one-file build can inline them.
 */
export type Template = { id: string; title: string; thumbnailUrl: string; theme: ThemeStyle };
const TEMPLATES: Template[] = [
  { id: "branding", title: "Branding is more than just looks", thumbnailUrl: "/templates/branding.svg", theme: { background: "#ECE4D6", text: "#111111", accent: "#E1663C", headingFont: "archivo-black", bodyFont: "inter" } },
  { id: "focus", title: "How to stay focused in a distracted world", thumbnailUrl: "/templates/focus.svg", theme: { background: "#F2EEE4", text: "#141414", accent: "#D7E66A", headingFont: "montserrat", bodyFont: "inter" } },
  { id: "niche", title: "How to find your niche", thumbnailUrl: "/templates/niche.svg", theme: { background: "#FFFFFF", text: "#1F2A5A", accent: "#2B3FA0", headingFont: "anton", bodyFont: "inter" } },
  { id: "mindset", title: "Mindset shifts that will accelerate your career", thumbnailUrl: "/templates/mindset.svg", theme: { background: "#4E5BC4", text: "#FFFFFF", accent: "#EDA88A", headingFont: "playfair", bodyFont: "inter" } },
  { id: "healthy", title: "Healthy lifestyle tips", thumbnailUrl: "/templates/healthy.svg", theme: { background: "#46512F", text: "#FFFFFF", accent: "#E4F25A", headingFont: "archivo-black", bodyFont: "lora" } },
  { id: "habits", title: "5 habits that changed my life", thumbnailUrl: "/templates/habits.svg", theme: { background: "#F7E3E6", text: "#3A2A30", accent: "#3D5AFE", headingFont: "montserrat", bodyFont: "lora" } },
  { id: "timeblock", title: "Time blocking tips for business owners", thumbnailUrl: "/templates/timeblock.svg", theme: { background: "#B4824A", text: "#FFFFFF", accent: "#F7D66B", headingFont: "playfair", bodyFont: "montserrat" } },
  { id: "simple", title: "Simple ways I show up for myself", thumbnailUrl: "/templates/simple.svg", theme: { background: "#3F6E57", text: "#FFFFFF", accent: "#9ED8CC", headingFont: "dm-serif", bodyFont: "inter" } },
];
/** How many templates the quick-pick row shows before See all. */
const QUICK_TEMPLATES = 6;
/** Instagram portrait, 1080 x 1350. */
const TEMPLATE_ASPECT = 1080 / 1350;
type Recent = { title: string; date: string };

const INSPIRE = [
  "Lessons I have learned at 30: choose relationships over money, find your purpose, learn to let things go",
  "5 productivity habits that changed how I work",
  "3 things I wish I knew before starting my business",
];

const SEED_RECENTS: Recent[] = [
  { title: "5 quick productivity tips for busy founders", date: "Friday, September 11" },
  { title: "5 productivity tips for busy founders", date: "Tuesday, September 8" },
  { title: "How I plan a week of content in one hour", date: "Tuesday, September 8" },
];

const COURSES = [
  { title: "Authority builder", description: "Build your authority and become a thought leader in your industry" },
  { title: "Conversion engine", description: "Convert your audience into customers" },
  { title: "Audience growth", description: "Grow your audience and expand your reach on Instagram" },
  { title: "Expert positioning", description: "Position yourself as the go-to expert in your niche" },
];

const DAYS = [
  "3 things I wish I knew before starting",
  "My origin story: how I got here",
  "My most controversial opinion",
  "Behind the scenes of how I work",
  "The framework I use to get results for my clients",
  "A client transformation story",
  "My vision: where I am taking this community",
];

const FONTS = [
  { value: "archivo-black", label: "Archivo Black" },
  { value: "anton", label: "Anton" },
  { value: "montserrat", label: "Montserrat" },
  { value: "inter", label: "Inter" },
  { value: "playfair", label: "Playfair Display" },
  { value: "dm-serif", label: "DM Serif Display" },
  { value: "libre-baskerville", label: "Libre Baskerville" },
  { value: "lora", label: "Lora" },
];

/** A carousel theme: three colours and a font pairing (font ids from FONTS). */
export type ThemeStyle = { background: string; text: string; accent: string; headingFont: string; bodyFont: string };
export type Theme = ThemeStyle & { id: string; name: string };

const THEMES: Theme[] = [
  { id: "cream", name: "Classic cream", background: "#EFE7DA", text: "#161616", accent: "#E1663C", headingFont: "archivo-black", bodyFont: "inter" },
  { id: "midnight", name: "Midnight", background: "#141B34", text: "#FFFFFF", accent: "#F5C451", headingFont: "anton", bodyFont: "inter" },
  { id: "glow", name: "Creator glow", background: "#A020F0", text: "#FFFFFF", accent: "#ECEC7F", headingFont: "montserrat", bodyFont: "inter" },
  { id: "blush", name: "Blush", background: "#F7E3E6", text: "#3A2A30", accent: "#3D5AFE", headingFont: "playfair", bodyFont: "lora" },
  { id: "forest", name: "Forest", background: "#213D30", text: "#F3EEDF", accent: "#B7E36A", headingFont: "dm-serif", bodyFont: "inter" },
];
/** A picked template starts on its own look, offered as the first theme. */
const templateTheme = (t: Template): Theme => ({ id: "template", name: "Template", ...t.theme });

// Pro plan, from carouselstudio.design/pricing: $10 a month, 500 credits a month, 3-day free trial.
const TRIAL_CREDITS = 50;
const PRO_REASONS = [
  "500 credits every month",
  "Premium AI models and AI images",
  "All Pro themes, no Carousel Studio branding",
];

export type Plan = "free" | "pro";
export type Account = { plan: Plan; credits: number };

const PRICING_URL = "https://carouselstudio.design/en/pricing";
/**
 * v4 checkout link. Canva prints the whole URL in its leave-Canva dialog, so it must be short:
 * today's link carries the user's JWT in the query string, which fills the dialog with a wall of
 * characters. Instead the backend issues a short one-time code (here 7Kx2Qp); the website swaps it
 * for a session and redirects to the trial checkout.
 */
const TRIAL_URL = "https://carouselstudio.design/trial/7Kx2Qp";
const BILLING_URL = "https://carouselstudio.design/en/settings?tab=billing";
// Billing settings is also where users buy extra credit bundles.
const TOPUP_URL = BILLING_URL;
/** Pro users see the top-up button below this balance. */
const PRO_LOW_CREDITS = 50;

/**
 * Opens a URL in a new browser tab. Inside Canva this must go through
 * requestOpenExternalUrl (new tab on desktop, browser sheet on mobile); plain links and
 * window.open are blocked in the app iframe. Outside Canva (local preview) it uses window.open.
 */
/**
 * Canva shows its "You are about to leave Canva" dialog with the full URL before opening it,
 * and resolves "aborted" if the user presses Cancel. openUrl mirrors that result.
 */
export type OpenUrl = (url: string) => Promise<"completed" | "aborted">;
const openInNewTab: OpenUrl = async (url) => {
  window.open(url, "_blank", "noopener,noreferrer");
  return "completed";
};
// @canva/platform reads Canva's runtime at import time, so load it only when running inside Canva.
const openInCanva: OpenUrl = async (url) => {
  const { requestOpenExternalUrl } = await import("@canva/platform");
  return (await requestOpenExternalUrl({ url })).status;
};
let openUrl: OpenUrl = openInNewTab;
const openExternal = (url: string) => openUrl(url);

// TODO (wire to the real app): add the template's pages to the design via the Canva Apps SDK.
const openTemplateInDesign = (_t: Template) => {};
// TODO (wire to the real app): restyle the design's pages with the theme, and send it with generation.
const applyThemeToDesign = (_t: Theme) => {};

export function App() {
  return (
    <AppUiProvider>
      <CarouselStudio openUrl={openInCanva} onOpenTemplate={openTemplateInDesign} onThemeChange={applyThemeToDesign} />
    </AppUiProvider>
  );
}

/** Canva gives the app the full panel height; content scrolls inside it. */
export function CarouselStudio({
  version = "v5", initialTab = "create", initialStep = "create", initialAccount, initialCredits, openUrl: open = openInNewTab,
  onOpenTemplate = () => {}, onThemeChange = () => {},
}: {
  version?: Version; initialTab?: string; initialStep?: Step; initialAccount?: Account; initialCredits?: number;
  openUrl?: OpenUrl; onOpenTemplate?: (t: Template) => void; onThemeChange?: (t: Theme) => void;
}) {
  openUrl = open;
  return (
    <Screens
      key={version}
      version={version}
      initialTab={initialTab}
      initialStep={initialStep}
      initialAccount={initialAccount}
      initialCredits={initialCredits}
      onOpenTemplate={onOpenTemplate}
      onThemeChange={onThemeChange}
    />
  );
}

/**
 * The panel layout: content scrolls inside the kit Scrollable. With a footer (v4), the footer sits
 * below the scroll area, so the main CTA stays visible however short the panel is.
 */
function Panel({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <Box height="full" display="flex" flexDirection="column">
      <Scrollable indicator={footer ? { background: "surface" } : undefined}>
        <Box height="full" paddingX="2u" paddingY="2u">{children}</Box>
      </Scrollable>
      {footer && <Box paddingX="2u" paddingY="2u">{footer}</Box>}
    </Box>
  );
}

function Screens({
  version, initialTab, initialStep, initialAccount, initialCredits, onOpenTemplate, onThemeChange,
}: {
  version: Version; initialTab: string; initialStep: Step; initialAccount?: Account; initialCredits?: number;
  onOpenTemplate: (t: Template) => void; onThemeChange: (t: Theme) => void;
}) {
  const starter = version === "v2" || version === "v3"; // v2 and v3 start every user with credits
  const [loggedIn, setLoggedIn] = useState(initialAccount !== undefined);
  const [plan, setPlan] = useState<Plan>(initialAccount?.plan ?? "free");
  // True while on the Pro free trial: the trial's credits are a starter amount, not a low balance.
  const [trial, setTrial] = useState(false);
  const [credits, setCredits] = useState(
    initialAccount?.credits ?? initialCredits ?? (starter ? V2_START_CREDITS : 0),
  );
  // Balance before new credits landed (Google connect or trial); drives the count-up. null = nothing to show.
  const [creditedFrom, setCreditedFrom] = useState<number | null>(null);
  const [creditedNote, setCreditedNote] = useState(`${FREE_CREDITS} free credits added to your account.`);
  const [topicError, setTopicError] = useState(false);
  const [step, setStep] = useState<Step>(initialStep);
  const [tab, setTab] = useState(initialTab);
  // Where Connect and checkout return to.
  const [connectReturn, setConnectReturn] = useState<Step>(
    initialStep === "checkout" ? "review" : "create",
  );
  const [topic, setTopic] = useState("");
  const [inspireIndex, setInspireIndex] = useState(0);
  const [slides, setSlides] = useState(5);
  const [model, setModel] = useState("auto");
  const [visuals, setVisuals] = useState("stock");
  const [recents, setRecents] = useState<Recent[]>(initialAccount ? SEED_RECENTS : []);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const template = TEMPLATES.find((t) => t.id === templateId);
  const [theme, setTheme] = useState<Theme>(THEMES[0]);
  useEffect(() => onThemeChange(theme), [theme, onThemeChange]);
  const pickTemplate = (t: Template) => { setTemplateId(t.id); setTheme(templateTheme(t)); onOpenTemplate(t); };
  // One theme, edited from Create, Customize or Review.
  const themePicker = (
    <ThemePicker theme={theme} fromTemplate={template && templateTheme(template)} onChange={setTheme} />
  );

  // outline and slide generation auto-advance, matching the live app
  useEffect(() => {
    if (step === "genOutline") { const t = setTimeout(() => setStep("review"), 1600); return () => clearTimeout(t); }
    if (step === "genSlides") {
      const t = setTimeout(() => {
        setRecents((r) => [{ title: topic, date: "Today" }, ...r]);
        setStep("success");
      }, 1700);
      return () => clearTimeout(t);
    }
  }, [step, topic]);

  function connect() {
    setLoggedIn(true);
    setCreditedFrom(credits); // plays the credit delivery on the screen the user returns to
    setCreditedNote(`${FREE_CREDITS} free credits added to your account.`);
    setCredits(credits + FREE_CREDITS);
    setStep(connectReturn);
  }

  function goConnect(from: Step) {
    setConnectReturn(from);
    setStep("connect");
  }

  // Opens the paywall. In the app the plan change arrives from the backend after checkout;
  // the preview applies it straight away.
  function startTrial() {
    openExternal(PRICING_URL);
    setLoggedIn(true);
    setPlan("pro");
    setTrial(true);
    setCredits((c) => c + TRIAL_CREDITS);
  }

  // v4: every upgrade entry point goes straight to website checkout and the panel waits.
  const upgradeFrom = (from: Step) =>
    paywallFlow(version) ? () => { setConnectReturn(from); openCheckout(); } : startTrial;

  // v4 checkout: the website opens in a new tab and the panel waits. In the app the trial arrives
  // from the backend (poll or webhook); the preview's "I've started my trial" stands in for it.
  function openCheckout() {
    void openExternal(TRIAL_URL).then((status) => { if (status === "completed") setStep("checkout"); });
  }
  function trialStarted() {
    setLoggedIn(true);
    setPlan("pro");
    setTrial(true);
    setCreditedFrom(credits);
    setCreditedNote(`Your Pro trial has started. ${TRIAL_CREDITS} credits added.`);
    setCredits(credits + TRIAL_CREDITS);
    setStep(connectReturn);
  }

  function inspire() {
    setTopic(INSPIRE[inspireIndex % INSPIRE.length]);
    setTopicError(false);
    setInspireIndex(inspireIndex + 1);
  }

  // v4 pins the main CTA (Generate outline, Start free trial / Create design) to the bottom of the panel.
  const sticky = paywallFlow(version);
  const generateOutline = (
    <Button variant="primary" stretch onClick={() => (topic.trim() === "" ? setTopicError(true) : setStep("genOutline"))}>
      Generate outline
    </Button>
  );
  const reviewCta = (
    <ReviewCta
      version={version}
      loggedIn={loggedIn}
      plan={plan}
      credits={credits}
      justCredited={creditedFrom !== null}
      creditedNote={creditedNote}
      onDismissCredited={() => setCreditedFrom(null)}
      onLogin={() => goConnect("review")}
      onUpgrade={upgradeFrom("review")}
      onCreate={() => { setCredits(credits - RENDER_COST); setCreditedFrom(null); setStep("genSlides"); }}
    />
  );
  const footer = !sticky ? undefined
    : step === "review" ? reviewCta
    : step === "create" && tab === "create" ? generateOutline
    : undefined;

  const body = (() => {
  if (step === "connect") {
    return (
      <ConnectScreen
        onConnect={connect}
        onCancel={() => setStep(connectReturn)}
      />
    );
  }
  if (step === "checkout") {
    return (
      <Checkout
        outlineSaved={connectReturn === "review"}
        onTrialStarted={trialStarted}
        onReopen={() => void openExternal(TRIAL_URL)}
        onCancel={() => setStep(connectReturn)}
      />
    );
  }
  if (step === "genOutline") {
    return <Generating title={`“${topic}”`} status="Researching topic..." progress={40} onCancel={() => setStep("create")} />;
  }
  if (step === "genSlides") {
    return <Generating title={`“${topic}”`} status="Designing your slides..." progress={70} onCancel={() => setStep("review")} />;
  }
  if (step === "review") {
    return (
      <Review
        slideCount={slides}
        visuals={visuals}
        onVisuals={setVisuals}
        onBack={() => setStep("create")}
        theme={themePicker}
        cta={sticky ? undefined : reviewCta}
      />
    );
  }
  if (step === "success") {
    return (
      <Success
        plan={plan}
        offerConnect={version === "v2" && !loggedIn}
        onConnect={() => goConnect("create")}
        onStartTrial={upgradeFrom("create")}
        onRestart={() => { setTopic(""); setStep("create"); }}
      />
    );
  }
  if (step === "recent") return <RecentList recents={recents} onBack={() => setStep("create")} />;
  if (step === "templates") {
    return <TemplateBrowser selectedId={templateId} onPick={pickTemplate} onBack={() => setStep("create")} />;
  }

  return (
    <Rows spacing="2u">
      {loggedIn ? (
        <AccountRow
          plan={plan}
          trial={trial}
          credits={credits}
          deliverFrom={creditedFrom}
          deliveredNote={creditedNote}
          onDelivered={() => setCreditedFrom(null)}
          onUpgrade={upgradeFrom("create")}
        />
      ) : paywallFlow(version) ? null : starter ? (
        <StarterCredits
          credits={credits}
          prompt={version === "v3" ? "pro" : "google"}
          onConnect={() => goConnect("create")}
          onUpgrade={upgradeFrom("create")}
        />
      ) : (
        <ClaimCredits onClaim={() => goConnect("create")} />
      )}

      {/* Controlled kit Tabs never call onSelect on a click (its own setter is a no-op), so each Tab sets the tab. */}
      <Tabs activeId={tab}>
        <TabList>
          <Tab id="create" onClick={setTab}>Create</Tab>
          <Tab id="customize" onClick={setTab}>Customize</Tab>
          <Tab id="learn" onClick={setTab}>Learn</Tab>
        </TabList>
        <TabPanels>
          <TabPanel id="create">
            <Box paddingTop="2u">
              <Rows spacing="2u">
                {version === "v5" && (
                  <TemplateRow selectedId={templateId} onPick={pickTemplate} onSeeAll={() => setStep("templates")} />
                )}

                <FormField
                  label="What's your carousel about?"
                  error={topicError ? "Add a topic to generate an outline" : undefined}
                  control={(props) => (
                    <MultilineInput
                      {...props}
                      value={topic}
                      onChange={(v) => { setTopic(v); setTopicError(false); }}
                      minRows={5}
                      placeholder="e.g. 5 productivity habits that changed how I work"
                      footer={
                        <Button variant="tertiary" icon={LightBulbIcon} onClick={inspire}>
                          Inspire me
                        </Button>
                      }
                    />
                  )}
                />

                {themePicker}

                <FormField
                  label="Number of slides"
                  control={(props) => (
                    <NumberInput
                      {...props}
                      value={slides}
                      min={3}
                      max={10}
                      onChange={(v) => setSlides(v ?? 5)}
                      hasSpinButtons
                      incrementAriaLabel="Add a slide"
                      decrementAriaLabel="Remove a slide"
                    />
                  )}
                />

                <FormField
                  label="AI model"
                  control={(props) => (
                    <Select {...props} stretch value={model} onChange={setModel} options={paywallFlow(version) ? AI_MODELS_NO_COST : AI_MODELS} />
                  )}
                />

                {!sticky && generateOutline}

                {recents.length > 0 && (
                  <Rows spacing="1u">
                    <Columns spacing="1u" alignY="center">
                      <Column><Text variant="bold">Recently created</Text></Column>
                      <Column width="content">
                        <LinkButton onClick={() => setStep("recent")}>See all</LinkButton>
                      </Column>
                    </Columns>
                    {recents.slice(0, 3).map((r, i) => (
                      <Button key={i} variant="secondary" stretch onClick={() => {}}>{r.title}</Button>
                    ))}
                  </Rows>
                )}
              </Rows>
            </Box>
          </TabPanel>

          <TabPanel id="customize">
            <Box paddingTop="2u">
              <Customize visuals={visuals} onVisuals={setVisuals} theme={themePicker} />
            </Box>
          </TabPanel>

          <TabPanel id="learn">
            <Box paddingTop="2u">
              <Learn onStart={(day1) => { setTopic(day1); setTab("create"); }} />
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Rows>
  );
  })();

  return <Panel footer={footer}>{body}</Panel>;
}

/** Logged-out top slot: the free-credit offer, in the kit's blue info Alert (Box has no blue fill). */
function ClaimCredits({ onClaim }: { onClaim: () => void }) {
  return (
    <Alert tone="info">
      <Rows spacing="1.5u">
        <Rows spacing="0.5u">
          <Title size="xsmall">{`🎁 ${FREE_CREDITS} free credits are waiting`}</Title>
          <Text size="small">Sign in with Google to claim them. No card needed.</Text>
        </Rows>
        <Button variant="primary" stretch onClick={onClaim}>Claim free credits</Button>
      </Rows>
    </Alert>
  );
}

/**
 * V2/V3 top slot before the user has an account: the starter credits on the Free plan.
 * While the balance covers a design the only action is small; once it does not, the row
 * says Running low and the prompt becomes the full-width primary action. V2 prompts to
 * connect Google for more credits, V3 prompts to upgrade to Pro.
 */
function StarterCredits({
  credits, prompt, onConnect, onUpgrade,
}: { credits: number; prompt: "google" | "pro"; onConnect: () => void; onUpgrade: () => void }) {
  const [welcome, setWelcome] = useState(credits === V2_START_CREDITS);
  const low = credits < RENDER_COST;
  return (
    <Box border="ui" borderRadius="large" padding="1.5u">
      <Rows spacing="1.5u">
        <Columns spacing="1.5u" alignY="center">
          <Column>
            <Rows spacing="0.5u">
              <Text variant="bold">{`${credits} credits`}</Text>
              <Columns spacing="0.5u" alignY="center">
                <Column width="content"><Badge tone="info" text="Free" /></Column>
                {low && (
                  <Column width="content">
                    <Text size="small" tone="critical">Running low</Text>
                  </Column>
                )}
              </Columns>
            </Rows>
          </Column>
          {!low && (
            <Column width="content">
              {prompt === "pro" ? (
                <Button variant="secondary" size="small" icon={PremiumAppsProgramProFilledGoldIcon} onClick={onUpgrade}>
                  Upgrade
                </Button>
              ) : (
                <Button variant="secondary" size="small" onClick={onConnect}>Get more</Button>
              )}
            </Column>
          )}
        </Columns>

        {low && prompt === "google" && (
          <Button variant="primary" stretch onClick={onConnect}>{`Connect Google for ${FREE_CREDITS} free credits`}</Button>
        )}
        {low && prompt === "pro" && (
          <Button variant="primary" stretch icon={PremiumAppsProgramProFilledGoldIcon} onClick={onUpgrade}>
            Upgrade for more credits
          </Button>
        )}
        {welcome && !low && (
          <Alert tone="positive" onDismiss={() => setWelcome(false)}>
            {`🎁 ${V2_START_CREDITS} free credits to get you started.`}
          </Alert>
        )}
      </Rows>
    </Box>
  );
}

/**
 * Logged-in top slot. The credit balance is the figure that matters, so it leads, with
 * the plan underneath. One action: free users get Upgrade, Pro users get a settings
 * button for their account. When a free user can no longer afford a carousel, the row
 * shows Running low and the upgrade becomes a full-width primary button. Pro users under
 * PRO_LOW_CREDITS get Running low and a full-width Purchase extra credits button instead.
 * Right after connecting, the balance counts up while the kit ProgressBar fills, then a
 * positive Alert confirms. The kit has no confetti or glow component.
 */
function AccountRow({
  plan, trial = false, credits, deliverFrom, deliveredNote, onDelivered, onUpgrade,
}: {
  plan: Plan; trial?: boolean; credits: number; deliverFrom: number | null; deliveredNote: string;
  onDelivered: () => void; onUpgrade: () => void;
}) {
  const [from] = useState(deliverFrom ?? 0);
  const [shown, setShown] = useState(deliverFrom ?? credits);
  const [phase, setPhase] = useState<"filling" | "done" | "idle">(deliverFrom !== null ? "filling" : "idle");

  useEffect(() => {
    if (phase !== "filling") { setShown(credits); return; }
    if (shown >= credits) { setPhase("done"); onDelivered(); return; }
    const t = setTimeout(() => setShown((n) => Math.min(credits, n + 2)), 40);
    return () => clearTimeout(t);
  }, [phase, shown, credits, onDelivered]);

  // A trial starts below PRO_LOW_CREDITS, so it counts as low only once a design no longer fits.
  const low = plan === "free" || trial ? credits < RENDER_COST : credits < PRO_LOW_CREDITS;

  return (
    <Box border="ui" borderRadius="large" padding="1.5u">
      <Rows spacing="1.5u">
        <Columns spacing="1.5u" alignY="center">
          <Column width="content">
            <Avatar name="Jacob Horgan" backgroundSeed="Jacob Horgan" />
          </Column>
          <Column>
            <Rows spacing="0.5u">
              <Text variant="bold">{`${shown} credits`}</Text>
              <Columns spacing="0.5u" alignY="center">
                <Column width="content">
                  {plan === "pro" ? <Badge tone="assist" text={trial ? "Pro trial" : "Pro"} /> : <Badge tone="info" text="Free" />}
                </Column>
                {low && (
                  <Column width="content">
                    <Text size="small" tone="critical">Running low</Text>
                  </Column>
                )}
              </Columns>
            </Rows>
          </Column>
          <Column width="content">
            {plan === "pro" ? (
              <Button
                variant="tertiary"
                icon={CogIcon}
                ariaLabel="Manage account"
                tooltipLabel="Manage account"
                onClick={() => openExternal(BILLING_URL)}
              />
            ) : (
              !low && (
                <Button variant="secondary" size="small" icon={PremiumAppsProgramProFilledGoldIcon} onClick={onUpgrade}>
                  Upgrade
                </Button>
              )
            )}
          </Column>
        </Columns>

        {low && plan === "free" && (
          <Button variant="primary" stretch icon={PremiumAppsProgramProFilledGoldIcon} onClick={onUpgrade}>
            Get 500 credits with Pro
          </Button>
        )}
        {low && plan === "pro" && (
          <Button variant="primary" stretch icon={PlusIcon} onClick={() => openExternal(TOPUP_URL)}>
            Purchase extra credits
          </Button>
        )}

        {phase === "filling" && (
          <ProgressBar size="small" value={Math.round(((shown - from) / (credits - from)) * 100)} ariaLabel="Adding your credits" />
        )}
        {phase === "done" && (
          <Alert tone="positive" onDismiss={() => setPhase("idle")}>{deliveredNote}</Alert>
        )}
      </Rows>
    </Box>
  );
}

/** The app's own connect screen, as it looks today, plus a Cancel back to where the user was. */
function ConnectScreen({ onConnect, onCancel }: { onConnect: () => void; onCancel: () => void }) {
  return (
    <Box height="full" display="flex" flexDirection="column" justifyContent="center">
      <Rows spacing="3u">
        <Rows spacing="1u">
          <Title size="medium" alignment="center">Carousel Studio wants to connect your account</Title>
          <Text tone="secondary" alignment="center">{`Sign in with Google to get ${FREE_CREDITS} free credits.`}</Text>
        </Rows>
        <Box display="flex" justifyContent="center">
          <ImageCard thumbnailUrl={LOGO_URL} alt="Carousel Studio" thumbnailHeight={96} thumbnailPadding="2u" />
        </Box>
        <Rows spacing="1u">
          <Button variant="primary" stretch onClick={onConnect}>Connect</Button>
          <Button variant="tertiary" stretch onClick={onCancel}>Cancel</Button>
        </Rows>
      </Rows>
    </Box>
  );
}

/** Generating screen, as in the live app: logomark, the prompt in quotes, progress, Cancel. */
function Generating({
  title, status, progress, onCancel,
}: { title: string; status: string; progress: number; onCancel: () => void }) {
  return (
    <Box height="full" display="flex" flexDirection="column" justifyContent="center">
      <Rows spacing="2u">
        <Box display="flex" justifyContent="center">
          <ImageCard thumbnailUrl={LOGO_URL} alt="Carousel Studio" thumbnailHeight={56} />
        </Box>
        <Text size="large" alignment="center">{title}</Text>
        <Rows spacing="1u">
          <ProgressBar value={progress} ariaLabel={status} />
          <Text tone="secondary" alignment="center">{status}</Text>
        </Rows>
        <Button variant="secondary" stretch onClick={onCancel}>Cancel</Button>
      </Rows>
    </Box>
  );
}

const OUTLINE = [
  { heading: "WHEN YOUR INPUT IS NOISE", subheading: "Your output will be noise too.", body: "Here's a 60 second way to turn a messy ask into something anyone can answer.", cta: "SWIPE →" },
  { heading: "1. NAME THE DECISION", subheading: "What needs to be decided?", body: "Write the one decision you need, in a single sentence.", cta: "" },
  { heading: "2. GIVE THE CONTEXT", subheading: "Only what they need.", body: "Two or three facts that change the answer. Cut the rest.", cta: "" },
  { heading: "3. SAY WHAT YOU THINK", subheading: "Lead with your answer.", body: "Propose an option so people can react instead of starting cold.", cta: "" },
  { heading: "SAVE THIS FOR LATER", subheading: "Decision, context, proposal.", body: "Use it on your next message and see how fast the replies come.", cta: "Follow for more" },
];

const AI_MODELS = [
  { value: "auto", label: "Auto (2 credits)", description: "Picks a model that fits your topic" },
  { value: "gpt5", label: "GPT-5 (2 credits)", description: "Highest quality, slower" },
  { value: "gpt5mini", label: "GPT-5 Mini (1 credit)", description: "Fast, good for quick drafts" },
  { value: "gptoss", label: "GPT OSS 120B (1 credit)", description: "Fastest, plainer writing" },
  { value: "opus", label: "Claude Opus 4 (5 credits)", description: "Deep reasoning for complex topics" },
];
/** v4 hides credit costs until the user reaches the trial. */
const AI_MODELS_NO_COST = AI_MODELS.map((m) => ({ ...m, label: m.label.replace(/ \(\d+ credits?\)$/, "") }));

/** Review screen, matching the live app. The CTA (ReviewCta) sits at the end, or in the pinned footer in v4. */
function Review({
  slideCount, visuals, onVisuals, onBack, theme, cta,
}: {
  slideCount: number; visuals: string; onVisuals: (v: string) => void; onBack: () => void; theme: ReactNode; cta?: ReactNode;
}) {
  const [slides, setSlides] = useState(() =>
    Array.from({ length: slideCount }, (_, i) => OUTLINE[Math.min(i, OUTLINE.length - 1)]),
  );
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const edit = (field: keyof (typeof OUTLINE)[number]) => (value: string) =>
    setSlides(slides.map((s, i) => (i === index ? { ...s, [field]: value } : s)));

  return (
    <Rows spacing="2u">
      <SurfaceHeader title="Review your carousel" divider start={{ ariaLabel: "Back", onClick: onBack }} />

      <Box background="neutralSubtle" borderRadius="large" padding="2u">
        <Rows spacing="1.5u">
          <Text variant="bold">{`Slide ${index + 1} of ${slides.length}`}</Text>
          <FormField
            label="Heading"
            control={(props) => <MultilineInput {...props} value={slide.heading} onChange={edit("heading")} minRows={2} />}
          />
          <FormField
            label="Subheading"
            control={(props) => <MultilineInput {...props} value={slide.subheading} onChange={edit("subheading")} minRows={2} />}
          />
          <FormField
            label="Body"
            control={(props) => <MultilineInput {...props} value={slide.body} onChange={edit("body")} minRows={3} />}
          />
          <FormField
            label="Call to action"
            control={(props) => (
              <MultilineInput {...props} value={slide.cta} onChange={edit("cta")} minRows={2} placeholder="e.g. Swipe, Follow for more" />
            )}
          />
          <Columns spacing="1u" alignY="center">
            <Column width="content">
              <Button variant="tertiary" icon={ArrowLeftIcon} ariaLabel="Previous slide" disabled={index === 0} onClick={() => setIndex(index - 1)} />
            </Column>
            <Column><Text tone="secondary" alignment="center">{`${index + 1} / ${slides.length}`}</Text></Column>
            <Column width="content">
              <Button variant="tertiary" icon={ArrowRightIcon} ariaLabel="Next slide" disabled={index === slides.length - 1} onClick={() => setIndex(index + 1)} />
            </Column>
          </Columns>
        </Rows>
      </Box>

      <Rows spacing="1u">
        <Text variant="bold">Images</Text>
        <Text tone="secondary">This carousel doesn't use any images.</Text>
      </Rows>

      <FormField label="Visuals" control={() => <VisualsRadios value={visuals} onChange={onVisuals} />} />

      {theme}

      {cta}
    </Rows>
  );
}

/**
 * The Review CTA, by account state: logged in = Create design; logged out = log in first, which
 * returns here; short of credits = the version's prompt.
 */
function ReviewCta({
  version, loggedIn, plan, credits, justCredited, creditedNote, onDismissCredited, onLogin, onUpgrade, onCreate,
}: {
  version: Version; loggedIn: boolean; plan: Plan; credits: number; justCredited: boolean; creditedNote: string;
  onDismissCredited: () => void; onLogin: () => void; onUpgrade: () => void; onCreate: () => void;
}) {
  const enough = credits >= RENDER_COST;
  // v1 needs an account to create; v2 and v3 create on starter credits and prompt only when short
  // (v2: connect Google, v3: upgrade to Pro). v4 starts on 0 credits: Start free trial, straight to checkout.
  const cta: "create" | "login" | "connect" | "upgrade" | "trial" | "topup" =
    enough && (loggedIn || version !== "v1") ? "create"
    : paywallFlow(version) && plan === "free" ? "trial"
    : !loggedIn ? (version === "v2" ? "connect" : version === "v3" ? "upgrade" : "login")
    : plan === "pro" ? "topup" : "upgrade";
  const shortBy = `A design uses ${RENDER_COST} credits. You have ${credits}.`;
  return (
      <Rows spacing="1u">
        {justCredited && (
          <Alert tone="positive" onDismiss={onDismissCredited}>{creditedNote}</Alert>
        )}
        {cta === "create" && (
          <>
            <Button variant="primary" stretch onClick={onCreate}>Create design</Button>
            <Text size="small" tone="secondary" alignment="center">
              {`Use ${RENDER_COST} of ${credits} Carousel Studio credits.`}
            </Text>
          </>
        )}
        {cta === "login" && (
          <>
            <Button variant="primary" stretch onClick={onLogin}>Log in to create design</Button>
            <Text size="small" tone="secondary" alignment="center">{`New accounts get ${FREE_CREDITS} free credits.`}</Text>
          </>
        )}
        {cta === "connect" && (
          <>
            <Button variant="primary" stretch onClick={onLogin}>{`Connect Google for ${FREE_CREDITS} free credits`}</Button>
            <Text size="small" tone="secondary" alignment="center">{shortBy}</Text>
          </>
        )}
        {cta === "upgrade" && (
          <>
            <Button variant="primary" stretch icon={PremiumAppsProgramProFilledGoldIcon} onClick={onUpgrade}>
              {version === "v3" ? "Upgrade for more credits" : "Get 500 credits with Pro"}
            </Button>
            <Text size="small" tone="secondary" alignment="center">{shortBy}</Text>
          </>
        )}
        {cta === "trial" && (
          <>
            <Button variant="primary" stretch icon={PremiumAppsProgramProFilledGoldIcon} onClick={onUpgrade}>
              Start free trial
            </Button>
            <Text size="small" tone="secondary" alignment="center">
              {`Uses ${RENDER_COST} Carousel Studio credits.`}
            </Text>
          </>
        )}
        {cta === "topup" && (
          <>
            <Button variant="primary" stretch icon={PlusIcon} onClick={() => openExternal(TOPUP_URL)}>
              Purchase extra credits
            </Button>
            <Text size="small" tone="secondary" alignment="center">{shortBy}</Text>
          </>
        )}
      </Rows>
  );
}

/**
 * v4 waiting state while checkout is open in the other tab. The panel stays here so the user has
 * somewhere to come back to; once the trial lands it returns them to where they hit the limit.
 */
function Checkout({
  outlineSaved, onTrialStarted, onReopen, onCancel,
}: { outlineSaved: boolean; onTrialStarted: () => void; onReopen: () => void; onCancel: () => void }) {
  return (
    <Box height="full" display="flex" flexDirection="column" justifyContent="center">
      <Rows spacing="3u">
        <Box display="flex" justifyContent="center">
          <ImageCard thumbnailUrl={LOGO_URL} alt="Carousel Studio" thumbnailHeight={56} />
        </Box>
        <Rows spacing="1u">
          <Title size="small" alignment="center">Finish checkout in the new tab</Title>
          <Text tone="secondary" alignment="center">
            {outlineSaved
              ? "Then come back here. Your outline is ready to create."
              : "Then come back here. Your credits show up straight away."}
          </Text>
        </Rows>
        <Box display="flex" justifyContent="center">
          <LoadingIndicator />
        </Box>
        <Rows spacing="1u">
          <Button variant="primary" stretch onClick={onTrialStarted}>I've started my trial</Button>
          <Button variant="secondary" stretch onClick={onReopen}>Reopen checkout</Button>
          <Button variant="tertiary" stretch onClick={onCancel}>Cancel</Button>
        </Rows>
      </Rows>
    </Box>
  );
}

/** Success screen, matching the live app, plus the Pro offer for free users on the finished carousel. */
function Success({
  plan, offerConnect, onConnect, onStartTrial, onRestart,
}: { plan: Plan; offerConnect: boolean; onConnect: () => void; onStartTrial: () => void; onRestart: () => void }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <Rows spacing="3u">
      <Alert tone="positive">
        Hooray! You just saved ~45 mins by creating this carousel with Carousel Studio.
      </Alert>

      <Rows spacing="2u">
        <Rows spacing="1u">
          <Title size="small" alignment="center">Your carousel is ready! 🎉</Title>
          <Text tone="secondary" alignment="center">
            Click the button below to publish it directly to your Instagram account.
          </Text>
        </Rows>
        <Button variant="primary" stretch onClick={() => {}}>Publish</Button>
        <Button variant="secondary" stretch onClick={() => {}}>Shuffle colors</Button>
        <Button variant="secondary" stretch onClick={onRestart}>Create another</Button>
      </Rows>

      {offerConnect && (
        <Box background="neutralSubtle" borderRadius="large" padding="2u">
          <Rows spacing="2u">
            <Rows spacing="0.5u">
              <Title size="xsmall">{`🎁 Get ${FREE_CREDITS} more free credits`}</Title>
              <Text size="small" tone="secondary">Connect your Google account to keep creating. No card needed.</Text>
            </Rows>
            <Button variant="primary" stretch onClick={onConnect}>Connect Google account</Button>
          </Rows>
        </Box>
      )}

      {!offerConnect && plan === "free" && (
        <Box background="neutralSubtle" borderRadius="large" padding="2u">
          <Rows spacing="2u">
            <Rows spacing="0.5u">
              <Title size="xsmall">Try Pro free for 3 days</Title>
              <Text size="small" tone="secondary">Then $10 a month. Cancel anytime.</Text>
            </Rows>
            <Rows spacing="1u">
              {PRO_REASONS.map((reason) => (
                <Columns key={reason} spacing="1u" alignY="center">
                  <Column width="content"><CheckIcon /></Column>
                  <Column><Text size="small">{reason}</Text></Column>
                </Columns>
              ))}
            </Rows>
            <Button variant="primary" stretch onClick={onStartTrial}>Start free trial</Button>
          </Rows>
        </Box>
      )}

      {sent ? (
        <Alert tone="positive">Thanks for your feedback.</Alert>
      ) : (
        <Rows spacing="2u">
          <Rows spacing="1u">
            <Text variant="bold">What do you like about the carousel?</Text>
            <Columns spacing="0.5u">
              {[1, 2, 3, 4, 5].map((n) => (
                <Column key={n} width="content">
                  <Button
                    variant="tertiary"
                    icon={n <= rating ? StarFilledIcon : StarIcon}
                    ariaLabel={`${n} of 5 stars`}
                    onClick={() => setRating(n)}
                  />
                </Column>
              ))}
            </Columns>
          </Rows>
          <FormField
            label="What could be better? (Optional)"
            control={(props) => (
              <MultilineInput
                {...props}
                value={feedback}
                onChange={(v) => setFeedback(v)}
                minRows={3}
                placeholder="e.g., Add more themes, improve image generation, etc."
              />
            )}
          />
          <Button variant="secondary" stretch onClick={() => setSent(true)}>
            Share feedback
          </Button>
        </Rows>
      )}
    </Rows>
  );
}

/** "See all" from Recently created: the full list grouped by date. */
function RecentList({ recents, onBack }: { recents: Recent[]; onBack: () => void }) {
  const dates = [...new Set(recents.map((r) => r.date))];
  return (
    <Rows spacing="2u">
      <SurfaceHeader title="Recent carousels" start={{ ariaLabel: "Back", onClick: onBack }} />
      {dates.map((d) => (
        <Rows key={d} spacing="1u">
          <Text size="xsmall" tone="tertiary" capitalization="uppercase">{d}</Text>
          {recents.filter((r) => r.date === d).map((r, i) => (
            <Button key={i} variant="secondary" stretch onClick={() => {}}>{r.title}</Button>
          ))}
        </Rows>
      ))}
    </Rows>
  );
}

function VisualsRadios({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <RadioGroup
      value={value}
      onChange={onChange}
      options={[
        {
          value: "stock",
          label: (
            <Text tagName="span">
              Use stock images (Powered by{" "}
              <Link href="https://www.pexels.com" requestOpenExternalUrl={() => openExternal("https://www.pexels.com")}>Pexels</Link>)
            </Text>
          ),
        },
        { value: "placeholder", label: "Use image placeholders" },
        { value: "ai", label: "Generate with AI" },
      ]}
    />
  );
}

const THEME_COLORS: { key: "background" | "text" | "accent"; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "text", label: "Text" },
  { key: "accent", label: "Accent" },
];

/**
 * The carousel theme: preset themes as one Swatch each (background, text, accent; the picked
 * template's own look comes first), then each colour and both fonts are editable. Any edit makes
 * the theme Custom. Shared by Create, Customize and Review.
 */
function ThemePicker({
  theme, fromTemplate, onChange,
}: { theme: Theme; fromTemplate?: Theme; onChange: (t: Theme) => void }) {
  const edit = (patch: Partial<ThemeStyle>) => onChange({ ...theme, ...patch, id: "custom", name: "Custom" });
  const presets = fromTemplate ? [fromTemplate, ...THEMES] : THEMES;
  return (
    <Rows spacing="2u">
      <Rows spacing="1u">
        <Columns spacing="1u" alignY="center">
          <Column><Text variant="bold">Theme</Text></Column>
          <Column width="content"><Text size="small" tone="secondary">{theme.name}</Text></Column>
        </Columns>
        <Columns spacing="1u">
          {presets.map((p) => (
            <Column key={p.id} width="content">
              <Swatch
                fill={[p.background, p.text, p.accent]}
                tooltipLabel={p.name}
                active={p.id === theme.id}
                onClick={() => onChange(p)}
              />
            </Column>
          ))}
        </Columns>
      </Rows>

      <FormField
        label="Colors"
        control={() => (
          <Columns spacing="2u">
            {THEME_COLORS.map(({ key, label }) => (
              <Column key={key} width="content">
                <Rows spacing="0.5u" align="center">
                  <ColorSelector color={theme[key]} onChange={(c) => edit({ [key]: c })} />
                  <Text size="xsmall" tone="secondary">{label}</Text>
                </Rows>
              </Column>
            ))}
          </Columns>
        )}
      />

      <FormField
        label="Heading font"
        control={(props) => (
          <Select {...props} stretch value={theme.headingFont} onChange={(v) => edit({ headingFont: v })} options={FONTS} />
        )}
      />
      <FormField
        label="Body font"
        control={(props) => (
          <Select {...props} stretch value={theme.bodyFont} onChange={(v) => edit({ bodyFont: v })} options={FONTS} />
        )}
      />
    </Rows>
  );
}

/** Customize tab, matching the dev app: theme, fonts, visuals, branding, instructions, settings. */
function Customize({
  visuals, onVisuals, theme,
}: { visuals: string; onVisuals: (v: string) => void; theme: ReactNode }) {
  const [showTip, setShowTip] = useState(true);
  const [alternate, setAlternate] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [showBranding, setShowBranding] = useState("none");
  const [position, setPosition] = useState("bottom-right");
  const [instructions, setInstructions] = useState("");

  return (
    <Rows spacing="2u">
      {showTip && (
        <Alert tone="info" onDismiss={() => setShowTip(false)}>
          Start from curated font pairings and colors, or create your own.
        </Alert>
      )}

      {theme}

      <Checkbox
        label="Alternate colors every other slide"
        checked={alternate}
        onChange={(_, checked) => setAlternate(checked)}
      />

      <Button variant="secondary" stretch onClick={() => {}}>Apply to design</Button>

      <FormField label="Visuals" control={() => <VisualsRadios value={visuals} onChange={onVisuals} />} />

      <Rows spacing="0.5u">
        <Text variant="bold">Branding</Text>
        <Text size="small" tone="secondary">Choose what appears on every slide, and where.</Text>
      </Rows>

      <FormField
        label="Your name"
        control={(props) => <TextInput {...props} value={name} onChange={setName} placeholder="Carousel Studio" />}
      />
      <FormField
        label="Your social media handle"
        control={(props) => <TextInput {...props} value={handle} onChange={setHandle} placeholder="@username" />}
      />
      <FormField
        label="Your profile photo"
        control={(props) => <FileInput id={props.id} accept={["image/*"]} stretchButton />}
      />
      <FormField
        label="Your company logo"
        control={(props) => <FileInput id={props.id} accept={["image/*"]} stretchButton />}
      />
      <FormField
        label="Show branding"
        control={(props) => (
          <Select
            {...props}
            stretch
            value={showBranding}
            onChange={setShowBranding}
            options={[
              { value: "none", label: "None" },
              { value: "name", label: "Name" },
              { value: "handle", label: "Social media handle" },
              { value: "logo", label: "Company logo" },
            ]}
          />
        )}
      />
      <FormField
        label="Branding position"
        description={showBranding === "none" ? "Pick a branding type above to set its position" : undefined}
        control={(props) => (
          <Select
            {...props}
            stretch
            disabled={showBranding === "none"}
            value={position}
            onChange={setPosition}
            options={[
              { value: "top-left", label: "Top left" },
              { value: "top-right", label: "Top right" },
              { value: "bottom-left", label: "Bottom left" },
              { value: "bottom-right", label: "Bottom right" },
            ]}
          />
        )}
      />

      <FormField
        label="Global Instructions"
        control={(props) => (
          <MultilineInput
            {...props}
            value={instructions}
            onChange={(v) => setInstructions(v)}
            minRows={3}
            placeholder="e.g. Write in a friendly, direct tone"
          />
        )}
      />

      <Rows spacing="0.5u">
        <Text variant="bold">Settings</Text>
        <Text size="small" tone="secondary">Manage your plan and account.</Text>
      </Rows>
      <Rows spacing="1u" align="center">
        <Link href={BILLING_URL} requestOpenExternalUrl={() => openExternal(BILLING_URL)}>
          Manage plan and credits
        </Link>
        <Link href="https://carouselstudio.design/help" requestOpenExternalUrl={() => openExternal("https://carouselstudio.design/help")}>
          Get help
        </Link>
      </Rows>
    </Rows>
  );
}

/** Learn tab: mini-course list, then the 7-day plan for the chosen course. */
function Learn({ onStart }: { onStart: (firstTopic: string) => void }) {
  const [course, setCourse] = useState<string | null>(null);

  if (course) {
    return (
      <Rows spacing="2u">
        <SurfaceHeader title={`${course} (7 lessons)`} start={{ ariaLabel: "Back", onClick: () => setCourse(null) }} />
        {DAYS.map((d, i) => (
          <Box key={i} border="ui" borderRadius="large" padding="1.5u">
            <Rows spacing="0.5u">
              <Text size="small" variant="bold">{`Day ${i + 1}`}</Text>
              <Text size="small" tone="secondary">{d}</Text>
            </Rows>
          </Box>
        ))}
        <Button variant="primary" stretch onClick={() => onStart(DAYS[0])}>Start</Button>
      </Rows>
    );
  }

  return (
    <Rows spacing="2u">
      <Text size="small" tone="secondary">Pick a mini-course that fits your content goals.</Text>
      {COURSES.map((c) => (
        <Box key={c.title} border="ui" borderRadius="large" padding="2u">
          <Rows spacing="1u">
            <Text variant="bold">{`${c.title} (7 lessons)`}</Text>
            <Text size="small" tone="secondary">{c.description}</Text>
            <Button variant="secondary" onClick={() => setCourse(c.title)}>View</Button>
          </Rows>
        </Box>
      ))}
    </Rows>
  );
}

/** v5 Create tab: a sideways-scrolling quick pick of templates, with See all for the full list. */
function TemplateRow({
  selectedId, onPick, onSeeAll,
}: { selectedId: string | null; onPick: (t: Template) => void; onSeeAll: () => void }) {
  return (
    <Rows spacing="1u">
      <Columns spacing="1u" alignY="center">
        <Column><Text variant="bold">Templates</Text></Column>
        <Column width="content">
          <LinkButton onClick={onSeeAll}>See all</LinkButton>
        </Column>
      </Columns>
      <Carousel>
        {TEMPLATES.slice(0, QUICK_TEMPLATES).map((t) => (
          <ImageCard
            key={t.id}
            thumbnailUrl={t.thumbnailUrl}
            alt={t.title}
            ariaLabel={`Open template: ${t.title}`}
            thumbnailHeight={136}
            thumbnailAspectRatio={TEMPLATE_ASPECT}
            borderRadius="standard"
            selectable
            selected={t.id === selectedId}
            onClick={() => onPick(t)}
          />
        ))}
      </Carousel>
    </Rows>
  );
}

/** v5 See all: every template in a two-column grid, with search. Picking one keeps the user here. */
function TemplateBrowser({
  selectedId, onPick, onBack,
}: { selectedId: string | null; onPick: (t: Template) => void; onBack: () => void }) {
  const [query, setQuery] = useState("");
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = TEMPLATES.filter((t) => words.every((w) => t.title.toLowerCase().includes(w)));
  return (
    <Rows spacing="2u">
      <SurfaceHeader title="Templates" start={{ ariaLabel: "Back", onClick: onBack }} />
      <TextInput value={query} onChange={setQuery} placeholder="Search templates" start={<SearchIcon />} />
      {shown.length === 0 ? (
        <Text tone="secondary" alignment="center">No templates match your search.</Text>
      ) : (
        <Grid columns={2} spacing="1u">
          {shown.map((t) => (
            <ImageCard
              key={t.id}
              thumbnailUrl={t.thumbnailUrl}
              alt={t.title}
              ariaLabel={`Open template: ${t.title}`}
              thumbnailAspectRatio={TEMPLATE_ASPECT}
              borderRadius="standard"
              selectable
              selected={t.id === selectedId}
              onClick={() => onPick(t)}
            />
          ))}
        </Grid>
      )}
    </Rows>
  );
}

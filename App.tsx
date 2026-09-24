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
  ProgressBar, Avatar, SurfaceHeader, Scrollable, ImageCard,
} from "@canva/app-ui-kit";
import {
  ArrowLeftIcon, ArrowRightIcon, CheckIcon, CogIcon, LightBulbIcon, PlusIcon, PremiumAppsProgramProFilledGoldIcon, StarFilledIcon, StarIcon,
} from "@canva/app-ui-kit/icons";
import { useEffect, useState } from "react";

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
 */
export type Version = "v1" | "v2" | "v3";

// Never translate credits into "N carousels": the cost varies with slides, model and images.

export type Step = "create" | "connect" | "genOutline" | "review" | "genSlides" | "success" | "recent";
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
  { value: "libre-baskerville", label: "Libre Baskerville" },
  { value: "lora", label: "Lora" },
  { value: "inter", label: "Inter" },
  { value: "playfair", label: "Playfair Display" },
  { value: "montserrat", label: "Montserrat" },
];

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
type OpenUrl = (url: string) => void;
const openInNewTab: OpenUrl = (url) => { window.open(url, "_blank", "noopener,noreferrer"); };
// @canva/platform reads Canva's runtime at import time, so load it only when running inside Canva.
const openInCanva: OpenUrl = (url) => {
  void import("@canva/platform").then(({ requestOpenExternalUrl }) => requestOpenExternalUrl({ url }));
};
let openUrl: OpenUrl = openInNewTab;
const openExternal = (url: string) => openUrl(url);

export function App() {
  return (
    <AppUiProvider>
      <CarouselStudio openUrl={openInCanva} />
    </AppUiProvider>
  );
}

/** Canva gives the app the full panel height; content scrolls inside it. */
export function CarouselStudio({
  version = "v3", initialTab = "create", initialStep = "create", initialAccount, openUrl: open = openInNewTab,
}: { version?: Version; initialTab?: string; initialStep?: Step; initialAccount?: Account; openUrl?: OpenUrl }) {
  openUrl = open;
  return (
    <Box height="full">
      <Scrollable>
        <Box height="full" paddingX="2u" paddingY="2u">
          <Screens key={version} version={version} initialTab={initialTab} initialStep={initialStep} initialAccount={initialAccount} />
        </Box>
      </Scrollable>
    </Box>
  );
}

function Screens({
  version, initialTab, initialStep, initialAccount,
}: { version: Version; initialTab: string; initialStep: Step; initialAccount?: Account }) {
  const starter = version !== "v1"; // v2 and v3 start every user with credits
  const [loggedIn, setLoggedIn] = useState(initialAccount !== undefined);
  const [plan, setPlan] = useState<Plan>(initialAccount?.plan ?? "free");
  const [credits, setCredits] = useState(initialAccount?.credits ?? (starter ? V2_START_CREDITS : 0));
  // Balance before the Google connect credits landed; drives the count-up. null = nothing to show.
  const [creditedFrom, setCreditedFrom] = useState<number | null>(null);
  const [topicError, setTopicError] = useState(false);
  const [step, setStep] = useState<Step>(initialStep);
  const [tab, setTab] = useState(initialTab);
  const [connectReturn, setConnectReturn] = useState<Step>("create");
  const [topic, setTopic] = useState("");
  const [inspireIndex, setInspireIndex] = useState(0);
  const [slides, setSlides] = useState(5);
  const [model, setModel] = useState("auto");
  const [visuals, setVisuals] = useState("stock");
  const [recents, setRecents] = useState<Recent[]>(initialAccount ? SEED_RECENTS : []);

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
    setCredits((c) => c + TRIAL_CREDITS);
  }

  function inspire() {
    setTopic(INSPIRE[inspireIndex % INSPIRE.length]);
    setTopicError(false);
    setInspireIndex(inspireIndex + 1);
  }

  if (step === "connect") {
    return (
      <ConnectScreen
        onConnect={connect}
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
        version={version}
        loggedIn={loggedIn}
        plan={plan}
        credits={credits}
        slideCount={slides}
        visuals={visuals}
        onVisuals={setVisuals}
        justCredited={creditedFrom !== null}
        onDismissCredited={() => setCreditedFrom(null)}
        onBack={() => setStep("create")}
        onLogin={() => goConnect("review")}
        onUpgrade={startTrial}
        onCreate={() => { setCredits(credits - RENDER_COST); setCreditedFrom(null); setStep("genSlides"); }}
      />
    );
  }
  if (step === "success") {
    return (
      <Success
        plan={plan}
        offerConnect={version === "v2" && !loggedIn}
        onConnect={() => goConnect("create")}
        onStartTrial={startTrial}
        onRestart={() => { setTopic(""); setStep("create"); }}
      />
    );
  }
  if (step === "recent") return <RecentList recents={recents} onBack={() => setStep("create")} />;

  return (
    <Rows spacing="2u">
      {loggedIn ? (
        <AccountRow
          plan={plan}
          credits={credits}
          deliverFrom={creditedFrom}
          onDelivered={() => setCreditedFrom(null)}
          onUpgrade={startTrial}
        />
      ) : starter ? (
        <StarterCredits
          credits={credits}
          prompt={version === "v3" ? "pro" : "google"}
          onConnect={() => goConnect("create")}
          onUpgrade={startTrial}
        />
      ) : (
        <ClaimCredits onClaim={() => goConnect("create")} />
      )}

      <Tabs activeId={tab} onSelect={(id) => setTab(id)}>
        <TabList>
          <Tab id="create">Create</Tab>
          <Tab id="customize">Customize</Tab>
          <Tab id="learn">Learn</Tab>
        </TabList>
        <TabPanels>
          <TabPanel id="create">
            <Box paddingTop="2u">
              <Rows spacing="2u">
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

                <FormField
                  label="Theme"
                  control={() => (
                    <Box background="neutralSubtle" border="ui" borderRadius="large" padding="1u">
                      <Box width="full" borderRadius="standard" padding="4u" background="elevationSurfaceRaised" />
                    </Box>
                  )}
                />

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
                  control={(props) => <Select {...props} stretch value={model} onChange={setModel} options={AI_MODELS} />}
                />

                <Button
                  variant="primary"
                  stretch
                  onClick={() => (topic.trim() === "" ? setTopicError(true) : setStep("genOutline"))}
                >
                  Generate outline
                </Button>

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
              <Customize visuals={visuals} onVisuals={setVisuals} />
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
  plan, credits, deliverFrom, onDelivered, onUpgrade,
}: { plan: Plan; credits: number; deliverFrom: number | null; onDelivered: () => void; onUpgrade: () => void }) {
  const [from] = useState(deliverFrom ?? 0);
  const [shown, setShown] = useState(deliverFrom ?? credits);
  const [phase, setPhase] = useState<"filling" | "done" | "idle">(deliverFrom !== null ? "filling" : "idle");

  useEffect(() => {
    if (phase !== "filling") { setShown(credits); return; }
    if (shown >= credits) { setPhase("done"); onDelivered(); return; }
    const t = setTimeout(() => setShown((n) => Math.min(credits, n + 2)), 40);
    return () => clearTimeout(t);
  }, [phase, shown, credits, onDelivered]);

  const low = plan === "free" ? credits < RENDER_COST : credits < PRO_LOW_CREDITS;

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
                  {plan === "pro" ? <Badge tone="assist" text="Pro" /> : <Badge tone="info" text="Free" />}
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
          <ProgressBar size="small" value={Math.round(((shown - from) / (credits - from)) * 100)} ariaLabel="Adding your free credits" />
        )}
        {phase === "done" && (
          <Alert tone="positive" onDismiss={() => setPhase("idle")}>
            {`${FREE_CREDITS} free credits added to your account.`}
          </Alert>
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

/** Review screen, matching the live app. The CTA depends on the account state:
 *  logged in = Create design; logged out = log in first, which returns here. */
function Review({
  version, loggedIn, plan, credits, slideCount, visuals, onVisuals, justCredited, onDismissCredited,
  onBack, onLogin, onUpgrade, onCreate,
}: {
  version: Version; loggedIn: boolean; plan: Plan; credits: number; slideCount: number;
  visuals: string; onVisuals: (v: string) => void; justCredited: boolean; onDismissCredited: () => void;
  onBack: () => void; onLogin: () => void; onUpgrade: () => void; onCreate: () => void;
}) {
  const enough = credits >= RENDER_COST;
  // v1 needs an account to create; v2 and v3 create on starter credits and prompt only when short
  // (v2: connect Google, v3: upgrade to Pro).
  const cta: "create" | "login" | "connect" | "upgrade" | "topup" =
    enough && (loggedIn || version !== "v1") ? "create"
    : !loggedIn ? (version === "v2" ? "connect" : version === "v3" ? "upgrade" : "login")
    : plan === "pro" ? "topup" : "upgrade";
  const shortBy = `A design uses ${RENDER_COST} credits. You have ${credits}.`;
  const [slides, setSlides] = useState(() =>
    Array.from({ length: slideCount }, (_, i) => OUTLINE[Math.min(i, OUTLINE.length - 1)]),
  );
  const [index, setIndex] = useState(0);
  const [headingFont, setHeadingFont] = useState("libre-baskerville");
  const [bodyFont, setBodyFont] = useState("lora");
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

      <FormField
        label="Heading font"
        control={(props) => <Select {...props} stretch value={headingFont} onChange={setHeadingFont} options={FONTS} />}
      />
      <FormField
        label="Body font"
        control={(props) => <Select {...props} stretch value={bodyFont} onChange={setBodyFont} options={FONTS} />}
      />

      <FormField label="Colors" control={() => <ThemeSwatches />} />

      <Rows spacing="1u">
        {justCredited && (
          <Alert tone="positive" onDismiss={onDismissCredited}>
            {`${FREE_CREDITS} free credits added to your account.`}
          </Alert>
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
        {cta === "topup" && (
          <>
            <Button variant="primary" stretch icon={PlusIcon} onClick={() => openExternal(TOPUP_URL)}>
              Purchase extra credits
            </Button>
            <Text size="small" tone="secondary" alignment="center">{shortBy}</Text>
          </>
        )}
      </Rows>
    </Rows>
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

function ThemeSwatches() {
  return (
    <Columns spacing="1u">
      <Column width="content"><Swatch fill={["#FFFFFF"]} variant="outline" /></Column>
      <Column width="content"><Swatch fill={["#8B3DFF"]} /></Column>
      <Column width="content"><Swatch fill={["#D9C2FF"]} /></Column>
    </Columns>
  );
}

/** Customize tab, matching the dev app: theme, fonts, visuals, branding, instructions, settings. */
function Customize({ visuals, onVisuals }: { visuals: string; onVisuals: (v: string) => void }) {
  const [showTip, setShowTip] = useState(true);
  const [headingFont, setHeadingFont] = useState("libre-baskerville");
  const [bodyFont, setBodyFont] = useState("lora");
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

      <Rows spacing="1u">
        <Columns spacing="1u" alignY="center">
          <Column><Text variant="bold">Themes</Text></Column>
          <Column width="content"><LinkButton onClick={() => {}}>See all</LinkButton></Column>
        </Columns>
        <Box background="neutralSubtle" border="ui" borderRadius="large" padding="1u">
          <Box width="full" borderRadius="standard" padding="4u" background="elevationSurfaceRaised" />
        </Box>
      </Rows>

      <FormField label="Colors" control={() => <ThemeSwatches />} />

      <FormField
        label="Heading font"
        control={(props) => <Select {...props} stretch value={headingFont} onChange={setHeadingFont} options={FONTS} />}
      />
      <FormField
        label="Body font"
        control={(props) => <Select {...props} stretch value={bodyFont} onChange={setBodyFont} options={FONTS} />}
      />

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

# Signal Frame

## Website design system and homepage improvement plan

Status: Active reference specification; homepage implemented July 17, 2026<br>
Applies to: MyLivingPage website and product interface<br>
Does not apply to: the rendered Living Pages or their theme-owned output

---

## 1. Executive direction

MyLivingPage should use one coherent website system called **Signal Frame**.

The idea is simple:

> The interface is structured for systems. The person's page is expressive for people.

The website should feel precise, calm, legible, and intentional. Sharp rectangular geometry supports the product story: MyLivingPage organizes a person's real experience so software can read it and people can remember it. The Living Page itself remains the visual release valve—the place where personality, theme, color, and different creative treatments belong.

The homepage should stop behaving primarily like a feature list. It should let a visitor watch one familiar résumé become three useful outputs:

1. A role-tailored, ATS-ready PDF
2. A memorable Living Page
3. A matching Share Card and QR code

The conversion story is:

> Recognize yourself → see the transformation → understand the value → remove risk → start from your résumé

The product story is:

> One truthful source → shaped for the moment → readable by software → memorable to people → easy to share

The primary homepage promise remains:

> **Make your experience easier to understand and harder to forget.**
>
> Build one living professional page. Shape it for the moment. Share it anywhere.

The primary action across the homepage should be:

> **Build from my résumé — free**

### Why this conversion model fits the product

The strongest identity products tend to make the payoff personal, visible, and fast. Signal Frame applies those lessons without turning MyLivingPage into a social feed:

- **Self-recognition:** Visitors begin with their own existing résumé, not an abstract blank template.
- **Immediate identity reward:** The first meaningful preview should appear as early as possible after import.
- **Visible transformation:** The homepage demonstrates a before-and-after result instead of asking visitors to imagine it.
- **Personal control:** Users choose the moment, emphasis, theme, and final edits; the product assists without taking authorship away.
- **A shareable object:** A Living Page, Share Card, and QR code have practical value beyond the editor itself.
- **Low commitment:** Upload or paste, review, publish, and download—free, without payment friction.
- **Return value:** A page can be updated, reshaped, and shared again as the user's goals change.
- **Useful feedback:** Page-view signals create a reason to return without introducing follower counts or popularity mechanics.

The visual system supports this by reducing unfamiliarity and visual noise around one memorable product demonstration. Strong hierarchy, familiar controls, aligned structure, and progressive disclosure make the page easier to understand quickly; the personalized output provides the emotional reward.

---

## 2. Non-negotiable decisions

These decisions keep future pages from drifting back into one-off design choices.

### 2.1 Sharp geometry

The website radius token is `0px`.

The following website elements are always sharp rectangles:

- Buttons and icon buttons
- Text inputs, textareas, selects, and upload areas
- Cards, panels, alerts, banners, and stat blocks
- Tabs, badges, chips, filters, and segmented controls
- Dialogs, drawers, menus, popovers, tooltips, and toasts
- Navigation items and selection tiles
- Progress bars, steppers, skeletons, switches, and checkboxes
- User-image frames and website avatars

Do not use 2–4px radii as a compromise. A clear rule will look more deliberate and be easier to maintain.

Permitted circular shapes are limited to intrinsic data or motion marks, such as chart points, a donut chart, a status dot, or a loading spinner. Their surrounding controls remain rectangular.

### 2.2 One website type family

Use **DM Sans** as the primary typeface everywhere in the website interface. It is already part of the product, reads well at both marketing and application sizes, and provides enough warmth to keep the sharp system from feeling cold.

- Use DM Sans for display text, headings, body copy, navigation, buttons, labels, forms, tables, and metrics.
- Load weights 400, 500, 600, and 700 explicitly.
- Use tabular numerals for analytics and numeric comparisons.
- Reserve DM Mono only for literal code, technical identifiers, or raw values in admin tools.
- Retire Playfair Display from the website, dashboard, auth, admin, legal, and marketing interface.
- Keep Playfair and all other theme fonts available inside Living Page themes.

The wordmark may remain a logo asset. It is not a precedent for interface typography.

### 2.3 One semantic color system

Use midnight navy as the foundation, clear white text, and one blue action color. Green, amber, and red are reserved for semantic status.

Do not name a blue token `gold`, and do not introduce colors by writing new one-off hex or `rgba()` values in components.

Signal Frame is a single dark website theme for this release. Do not build a parallel light interface until there is a clear product need and a complete token/contrast design for it. Living Page themes remain free to use light, dark, or mixed palettes.

### 2.4 One obvious next action

Every screen and section should have one visually dominant next action. Secondary actions may be available, but they should not compete with the primary action.

### 2.5 Familiar controls, innovative demonstration

Navigation, forms, dialogs, and dashboard controls should behave predictably. Innovation belongs in the résumé-to-output transformation, ATS explanation, theme preview, and sharing story—not in hidden navigation or unfamiliar form behavior.

### 2.6 Motion explains change

Animation should explain what transformed, what was selected, or what became available. It should not make every surface float, glow, or move continuously.

---

## 3. Scope and isolation boundary

### Signal Frame applies to

- Homepage and all marketing pages
- Examples, free/pricing, guides, resources, and legal pages
- Login, signup, password recovery, and account deletion
- Résumé import, onboarding, create, and editing controls
- Dashboard, analytics, ATS tools, sharing controls, and settings
- Admin pages
- Feedback widgets, notifications, dialogs, and toasts
- Owner toolbars and product controls displayed around a public page
- The frame, controls, labels, and captions surrounding any preview

### Signal Frame does not apply to

- The rendered public Living Page
- Anything inside the `.resume-theme` or equivalent rendered-output boundary
- The content inside `ThemeCanvas` and theme thumbnails/previews
- Theme-owned typography, colors, spacing, borders, and corner treatments
- The content of the generated ATS PDF
- Theme-matched Share Card artwork and generated social/preview artwork

The website frame around an output remains sharp and uses Signal Frame. The output inside it remains theme-owned.

### Implementation boundary

Do not globally redefine Tailwind radius utilities and do not use a blanket descendant rule such as `border-radius: 0 !important`. Theme renderers use the same CSS environment, so a global reset would damage Living Pages and previews.

Instead:

- Mark website roots with an explicit boundary such as `data-site-ui`.
- Mark rendered product outputs with a boundary such as `data-living-output` in addition to the existing `.resume-theme` root.
- Put sharp geometry into source-owned website primitives.
- Migrate routes component family by component family.
- Keep the website background in website layouts rather than forcing it onto every rendered output globally.

---

## 4. Current-state audit

The audit confirms that the redesign should begin with a system rather than page-by-page cosmetic edits.

- The website currently contains approximately **511 radius utility uses across 63 in-scope files**, excluding the public Living Page/theme layer.
- The dominant language is currently rounded pills and soft cards: `rounded-full`, `rounded-xl`, and `rounded-2xl` account for most uses.
- Website UI contains dozens of unique hex colors and hundreds of unique `rgba()` declarations.
- Root CSS and Tailwind color values have drifted, and blue is still represented by misleading names such as `gold`.
- The interface uses Playfair, DM Sans, and DM Mono broadly, with hundreds of uppercase and custom-tracking treatments.
- Many muted text treatments use low white opacity and need a contrast review.
- There are over 100 raw buttons and dozens of raw form controls, but almost no shared UI primitive layer.
- Marketing, application, admin, guides, and legal areas repeat separate headers and navigation implementations.
- Focus styles are inconsistent, and some outline removal is not paired with a clear `focus-visible` replacement.

High-impact migration areas include the homepage, create flow, analytics, settings, editor fields, ATS tools, admin operations, and share/download controls.

---

## 5. Design foundations

### 5.1 Color tokens

Recommended starting tokens:

```css
:root {
  --site-canvas: #060e1c;
  --site-canvas-alt: #081525;
  --site-surface: #0d1b2e;
  --site-surface-raised: #11243b;
  --site-surface-selected: #16304d;

  --site-border: #2d4059;
  --site-border-strong: #4a6684;

  --site-text: #f4f7fc;
  --site-text-secondary: #b8c4d4;
  --site-text-muted: #8493a8;

  --site-action: #78adff;
  --site-action-hover: #9ac3ff;
  --site-action-active: #5b95ea;
  --site-action-ink: #06101f;
  --site-action-soft: rgb(120 173 255 / 12%);

  --site-success: #69d99a;
  --site-warning: #f4c56b;
  --site-danger: #ff8491;
  --site-focus: #a9ccff;

  --site-radius: 0px;
}
```

Token values should be validated in their actual foreground/background pairings before implementation is considered complete.

#### Color usage rules

- Bright blue means action, link, focus, or selected state.
- Filled blue buttons use dark navy text for strong small-text contrast.
- Green means successful completion—not “free.”
- Amber means warning or pending.
- Red means error or destructive action.
- Status always includes text or an icon; color is never the only signal.
- Aim for roughly 80% dark neutral, 15% text/borders, and 5% action color in an ordinary product view.
- Avoid gradient text.
- Deprecate `gold`, `deep-purple`, and other hue-specific legacy aliases after migration.

The homepage may retain the cosmic identity in a controlled way. Product, admin, guide, and legal pages should use quieter opaque surfaces.

### 5.2 Typography scale

| Role | Size | Weight | Line height | Use |
|---|---:|---:|---:|---|
| Marketing display | `clamp(44px, 6vw, 84px)` | 600 | 0.98 | Homepage hero only |
| Page H1 | `clamp(36px, 4vw, 56px)` | 600 | 1.04 | Marketing and major route titles |
| Section H2 | `clamp(28px, 3vw, 42px)` | 600 | 1.10 | Major sections |
| H3 / panel title | 22–24px | 600 | 1.25 | Panels and subsections |
| Large body | 18px | 400 | 1.60 | Marketing support copy |
| Default body | 16px | 400 | 1.60 | Forms, settings, legal, guides |
| Compact UI body | 14px | 400–500 | 1.50 | Tables and dense interfaces |
| Label / button | 14px | 600 | 1.25 | Controls |
| Caption / eyebrow | 12px minimum | 500–600 | 1.40 | Metadata and short eyebrows |

#### Type formatting rules

- Use sentence case for headings, navigation, tabs, buttons, fields, and statuses.
- Use uppercase only for short eyebrows; track them at `0.10–0.12em`.
- Keep prose at a 60–70 character measure.
- Keep forms and product screens left-aligned.
- Center alignment is reserved for a focused hero or final CTA.
- Avoid weight 300 in functional UI.
- Use one H1 per page and maintain a logical heading hierarchy.
- Use plain language before technical language, especially in ATS and analytics content.

### 5.3 Spacing and grid

Use a 4px base with the following working scale:

`4, 8, 12, 16, 24, 32, 48, 64, 96, 128`

| Context | Columns | Outer gutter | Grid gap |
|---|---:|---:|---:|
| Mobile | 4 | 20px | 16px |
| Tablet | 8 | 32px | 20px |
| Desktop | 12 | 48px | 24px |

- Marketing maximum width: 1216px
- Product/dashboard maximum width: 1440px
- Long-form reading width: 704px
- Header height: 64px
- Marketing section spacing: 112px desktop / 72px mobile
- Standard panel padding: 24px desktop / 16px mobile
- Large feature panel padding: 32–48px
- Default form field gap: 16px
- Default control height: 48px
- Preferred minimum interaction target: 44×44px

Avoid nested cards. Prefer one panel with a header, divided content rows, and an action footer.

### 5.4 Surfaces, borders, and depth

- Default boundary: 1px `--site-border`
- Strong or selected boundary: 2px action or `--site-border-strong`
- Inputs: opaque surface over any busy background
- Section separation: spacing plus a 1px divider where needed
- Dashboard/admin panels: opaque, not glass
- Glass: homepage storytelling modules only, always square
- Dialog scrim: dark overlay at approximately 70%
- Depth comes from surface contrast and borders before shadows
- Do not add hover lift to static cards

Recommended shadows:

```css
--site-shadow-raised: 0 12px 32px rgb(0 0 0 / 28%);
--site-shadow-overlay: 0 20px 56px rgb(0 0 0 / 42%);
```

A restrained 3–4px hard offset shadow may distinguish the main marketing CTA and flatten on press. It should not become a universal effect.

### 5.5 Iconography and imagery

- Use one consistent outline icon family and stroke weight.
- Default icon sizes: 16px compact, 20px standard, 24px prominent.
- Icons clarify labels; they do not replace unfamiliar labels.
- Keep decorative graphics subordinate to product proof.
- Product screenshots and previews must be legible, not miniature decoration.
- Label demonstration profiles and data clearly as examples.

### 5.6 Writing system

- Lead with the user outcome, then explain the mechanism.
- Use “ATS-ready,” not “beats the ATS.”
- Explain specialized terms the first time they appear.
- Avoid invented urgency, popularity claims, rankings, and unverifiable outcomes.
- Never imply that the product invents experience or guarantees placement.
- Use “free” precisely: build, publish, host, download, and update without a card or hidden charge.
- Avoid “forever” unless it becomes an explicit company commitment.
- Never reference a competing professional platform in homepage copy.

---

## 6. Component system

Build source-owned primitives under `src/components/ui`. A shadcn-style composition model is appropriate, but it should be initialized selectively so tooling does not overwrite the existing global stylesheet or theme boundaries.

Use accessible headless primitives for behavior-heavy elements such as dialogs, menus, tabs, and popovers. Style all website primitives with Signal Frame tokens.

### Foundation and layout

- `SiteShell`
- `SiteHeader`
- `SiteNav`
- `SiteFooter`
- `Container`
- `Section`
- `Stack`
- `Grid`
- `PageHeader`
- `SitePreviewFrame`

### Actions and forms

- `Button`
- `LinkButton`
- `IconButton`
- `Field`
- `Input`
- `Textarea`
- `Select`
- `FileDrop`
- `Checkbox`
- `SingleChoice`
- `Switch`

### Content and status

- `Panel`
- `Card`
- `Stat`
- `Callout`
- `Alert`
- `Badge`
- `Tabs`
- `Stepper`
- `Progress`

### Overlays and navigation

- `Dialog`
- `AlertDialog`
- `Drawer`
- `DropdownMenu`
- `Popover`
- `Tooltip`
- `Toast`

### Data and states

- `Table`
- `Pagination`
- `FilterBar`
- `Skeleton`
- `EmptyState`
- `ErrorState`

### Button variants

| Variant | Treatment | Use |
|---|---|---|
| Primary | Blue fill, dark ink | One main next step |
| Secondary | Transparent, strong border | Alternative action |
| Quiet | Text/action color, subtle hover surface | Low-priority action |
| Destructive | Red border or fill | Confirmed destructive action only |

### Panel variants

- Solid
- Raised
- Glass, homepage only
- Interactive
- Selected

### Interaction states

Every interactive primitive includes:

- Default
- Hover
- Pressed
- Focus-visible
- Selected when relevant
- Disabled
- Loading
- Error or success when relevant

Specific rules:

- Focus uses a 2px square `--site-focus` outline with a 2px offset.
- Hover changes color, border, or surface; it does not move the layout.
- Press may reduce the shadow or move by 1px.
- Loading buttons preserve their original width and useful label context.
- Field errors include a border, icon, and persistent message connected with `aria-describedby`.
- Tabs use a 2px bottom or left rule instead of a pill.
- Clickable cards are completely keyboard-focusable and have a clear action label.
- Static cards have no fake hover treatment.

### Internal reference page

Create an authenticated internal component gallery, such as `/admin/design-system`, before migrating the entire application. It should show every component, variant, state, spacing token, type role, color pairing, and output boundary. This is the visual contract for future work.

---

## 7. Comprehensive homepage plan

### Strategic role

The homepage is the first full Signal Frame implementation and the future reference for the rest of the website. It should function as a professional mirror, not a long feature brochure.

The visitor should be able to answer within the first viewport:

- What do I start with?
- What will I get?
- Why is this more useful than a static résumé?
- Is it actually free?
- What should I do next?

### Homepage story map

| Chapter | Visitor question | Product proof | Primary response |
|---|---|---|---|
| Living Reveal | What does this make? | One résumé becomes three connected outputs | Build from my résumé — free |
| Import | Will this take a long time? | Upload/paste and reviewable autofill | Start from the résumé I have |
| ATS + AI search | What does “optimized” actually mean? | Recognizable truthful evidence and selectable-text PDF | Build from my résumé — free |
| Shape for the moment | Why not use one static document? | The facts stay fixed while emphasis changes | Choose a professional moment |
| Identity | Will it still feel like me? | Three curated visual directions | Explore sample pages |
| Sharing | Where would I use this? | Link, Share Card, QR, and page-view signal | See the sharing flow |
| Examples | Can I picture my field? | Clearly labeled profession-diverse transformations | Open a sample |
| Free + control | Is there a catch? | Complete free promise and privacy controls | Build free |
| Final CTA | Am I ready to start? | An empty frame ready for the visitor's experience | Build from my résumé — free |

### 7.1 Navigation

Desktop:

- How it works
- ATS + PDF
- Examples
- Free
- Log in
- **Build from my résumé — free**

Mobile may shorten the header button to **Build free**, while retaining the full phrase in the menu and hero.

Use one header component across marketing pages. Change the current `#pricing` concept to `#free`; there is no plan comparison to make.

### 7.2 Hero: The Living Reveal

**Eyebrow**

> One source. Three useful formats.

**Headline**

> Make your experience easier to understand and harder to forget.

**Brand line**

> Build one living professional page. Shape it for the moment. Share it anywhere.

**Clarifying copy**

> Start with the résumé you already have. We'll turn it into a professional page, a role-tailored ATS-ready PDF, and a share card—all from one source.

**Primary CTA**

> Build from my résumé — free

**Secondary action**

> Try the live sample

**Complete trust line**

> Free to build, publish, host, download, and keep current. No credit card. No trial. No hidden charges.

#### Hero interaction

Ask:

> What do you need to be understood for?

Provide three rectangular choices:

| Professional moment | Output brought forward |
|---|---|
| Applying for a role | ATS-ready PDF |
| Getting referred | Living Page |
| Making an introduction | Share Card + QR |

The underlying résumé remains visibly connected to all three outputs. This demonstrates one source of professional truth without requiring a long explanation.

Output labels:

- **Living Page** — A clear story people can explore
- **ATS-ready PDF** — Real text, familiar sections, role-ready emphasis
- **Share Card + QR** — An easy way into the full story

Motion plays once as the hero becomes visible: one résumé resolves into the three outputs. After that, the visitor controls changes through the professional-moment selector.

### 7.3 Résumé import and autofill

**Eyebrow**

> Start where you are

**Headline**

> Already have a résumé? Good. Start there.

**Copy**

> Upload a PDF, DOCX, TXT, or Markdown file—or paste your résumé text. We'll fill in as much as we can. You review every field before anything is published.

Three compact steps:

1. **Bring it in** — Upload a file or paste text
2. **Review it** — Correct or improve every field
3. **Publish + download** — Create the page and ATS-ready PDF

Reassurance:

> Your uploaded résumé is used for autofill. Your page stays private until you choose to publish.

At launch, show a sample import rather than accepting a private résumé anonymously on the homepage. The CTA should enter signup and continue directly to résumé import, preserving the visitor's intent.

### 7.4 ATS, AI-assisted search, and tailored PDF

**Eyebrow**

> Be found for work you've actually done

**Headline**

> One story. Two readers.

**Introduction**

> A person reads for meaning. Hiring software looks for recognizable details such as job titles, skills, dates, education, and measurable results. MyLivingPage helps make the same truthful experience clear to both.

Show a three-part interactive demonstration:

1. A sample target role or job description
2. Recognized evidence from the résumé
3. The updated ATS-ready PDF preview with a visible **Download tailored PDF** action

Example query:

> Senior engineer with TypeScript, SQL, and large-scale systems experience

Example evidence:

- Senior Full-Stack Engineer
- TypeScript
- SQL
- Platform architecture
- 2M+ requests per day

Payoff:

> These details were already present. MyLivingPage made them easier to identify.

#### Plain-language definitions

- **ATS:** Software employers use to collect applications and pull out details from résumés.
- **AI-assisted search:** Tools that look for clear evidence matching a request.
- **Optimization:** Real text, familiar headings, specific terms, and truthful emphasis—not tricks or hidden keywords.

Tailoring explanation:

> Paste a target job description. We'll show what your résumé already matches, where it may be vague, and what you could clarify. You choose every change, then download a clean PDF with selectable text.

Disclosure:

> We never invent experience or promise a ranking. Different employers use different systems, but clear structure and specific evidence give those systems more reliable information to read.

### 7.5 Shape it for the moment

**Headline**

> Same experience. Sharper emphasis.

**Copy**

> An application, referral, and introduction may each need a different lead. Keep the facts consistent, then bring the most relevant headline, accomplishments, project, and call to action forward.

Synchronize this section with the same professional-moment state used in the hero.

| Moment | Comes forward |
|---|---|
| Application | Target title, matching skills, measurable accomplishments, ATS PDF |
| Referral | Concise summary, strongest proof, context for the referrer |
| Introduction | Memorable headline, contact path, Share Card and QR |

Persistent note:

> The facts stay true. The emphasis meets the moment.

### 7.6 Living Page and visual identity

**Eyebrow**

> Recognizable without becoming generic

**Headline**

> Give people a reason to remember the person behind the résumé.

**Copy**

> Your Living Page adds context a conventional application cannot: selected work, useful links, proof, personality, and a clear way to respond—all at one link you can keep current.

Simplicity is the brand advantage here: it makes a person's value easier to see without flattening what makes them different—or requiring them to maintain a full personal website.

Show three curated visual directions rather than the full theme catalog:

- Focused and technical
- Warm and approachable
- Bold and creative

Changing a direction updates the Living Page preview and matching Share Card. The preview content keeps its own theme geometry; the surrounding demo frame uses Signal Frame.

Label the example visibly:

> Sample profile — built with example data

### 7.7 Sharing and useful signals

**Headline**

> Easy to pass along. Easy to follow up.

Demonstrate a short sequence:

1. Living Page becomes its matching Share Card
2. Card appears in an email, referral message, or phone
3. QR code opens the Living Page
4. A restrained **Page viewed** signal appears

**Copy**

> Share one link in an application follow-up, referral, email signature, or in-person conversation. When someone opens it, you know your page reached a person—not just an inbox.

Only communicate analytics the product truly knows. For example:

> Someone opened Avery's page on mobile moments ago.

Do not imply that a named employer or recruiter viewed the page without reliable attribution.

### 7.8 Clearly labeled examples

**Headline**

> See what a clearer professional story can look like.

Launch with three profession-diverse demonstrations:

- Technical: dense experience becomes searchable proof
- Operations/business: broad responsibilities become measurable impact
- Creative/client-facing: work samples and contact path become easy to explore

Use labels such as **Sample profile**, **Example transformation**, and **Built with demonstration data**. Do not use invented testimonials, fake visitor counts, or unsupported placement claims.

When real users consent, replace demonstrations with substantiated stories that explain the initial problem, what they built, where they shared it, and the concrete outcome.

### 7.9 Free promise and user control

**Eyebrow**

> Free means the finished product

**Headline**

> Build it. Publish it. Host it. Download it. Free.

**Copy**

> Everything shown on this page is included: résumé import and autofill, your hosted Living Page, an ATS-ready PDF, targeted versions, Share Card and QR code, page-view insights, and updates after publishing.

Checklist:

- Free to build and preview
- Free to publish and host
- Free ATS-ready PDF downloads
- Free Share Card and QR code
- No credit card
- No trial expiration
- No surprise publishing, download, or hosting fee

Trust strip:

- Private until you publish
- Review every imported field
- Update or delete your page
- Public privacy and security details

### 7.10 Final transformation CTA

Pair the final CTA with an unfinished or empty Living Page frame ready to be filled.

**Eyebrow**

> Your experience belongs here

**Headline**

> One source of professional truth—structured for software, memorable to people, and ready to share anywhere.

**CTA**

> Build from my résumé — free

**Reassurance**

> Publish, host, download, and update for free. No credit card or hidden charges.

Secondary link:

> View sample pages

---

## 8. Homepage visual and motion direction

### Background strategy

The current cosmic background can remain without competing with the story:

1. Keep it strongest in the hero, where it creates emotional identity.
2. Place the main product transformation inside one square glass focus frame.
3. Fade the cosmic layer substantially as the page enters the ATS and explanation sections.
4. Transition lower sections to a mostly static navy gradient or solid canvas.
5. Use opaque product panels in information-dense sections.
6. Bring back a restrained trace of the cosmic treatment near the final CTA to create visual closure.

Glass is a focus lens, not the default card material.

### Motion tokens

```css
--ease-site: cubic-bezier(0.16, 1, 0.3, 1);
--motion-fast: 120ms;
--motion-state: 180ms;
--motion-enter: 280ms;
--motion-story: 480ms;
```

### Motion rules

- Hero résumé reveal: 600–900ms, once.
- During that reveal, the cosmic layer becomes static or substantially slows and dims; only restrained ambient movement may resume after the product transformation settles.
- Moment changes: 200–300ms crossfade/reposition.
- ATS scan: one pass after activation, never a perpetual loop.
- Scroll entrance: 12–16px travel over 300–450ms.
- Interface state changes: 120–180ms.
- Dialog/panel entrance: 220–280ms.
- Animate transform and opacity where practical.
- Avoid scroll-jacking, autoplay carousels, simultaneous ambient and product motion, and continuous dashboard movement.
- Pause ambient canvas work offscreen and when the tab is hidden.
- Reduced-motion mode switches states directly and preserves all content and controls.
- Reduced-transparency mode replaces glass with an opaque surface.

### Performance strategy

- Keep only one live interactive product demonstration active at a time.
- Use static snapshots until a below-fold demo is near the viewport or selected.
- Lazy-load below-fold interactive modules.
- Do not mount several live theme canvases simultaneously.
- Reserve image and preview dimensions to prevent layout shift.
- Prefer server rendering for static story sections.
- Use one small client story controller for synchronized professional-moment state.

Target the current Core Web Vitals “good” thresholds at the 75th percentile: LCP at or below 2.5 seconds, INP at or below 200 milliseconds, and CLS at or below 0.1.

---

## 9. Homepage responsive behavior

### Mobile priorities

- Headline, primary CTA, and complete free promise appear before the visualization.
- Stack the Living Reveal under the hero copy.
- Render professional moments as full-width or two-line rectangular targets.
- Show one output preview at a time.
- Preserve readable preview content instead of scaling down the desktop composition.
- Give Share Card and QR a dedicated mobile state.
- Replace long sticky scrollytelling with a tap-controlled active panel.
- Use a bottom sticky CTA after the hero and hide it near the final CTA.
- Respect safe-area insets.
- Avoid horizontal overflow at 320px.
- On coarse-pointer devices, use a static or very low-density cosmic background.

### Desktop priorities

- Maintain familiar left-to-right reading order.
- Use the 12-column grid to connect source résumé and three outputs.
- Keep the text and demonstration balanced; do not let the visual push the CTA below the fold.
- Use sticky behavior only when it clarifies the source-to-output relationship and never traps scrolling.

---

## 10. Homepage component map

Recommended composition:

- `LandingHeroReveal`
- `ProfessionalMomentSelector`
- `ResumeImportBridge`
- `SearchabilityPdfDemo`
- `LivingPageIdentityDemo`
- `ShareAndSignalDemo`
- `LandingProofExamples`
- `LandingFreePromise`
- `LandingFinalCta`

Reuse existing résumé/page renderers and Share Card logic where possible. Put synchronized professional-moment state in one small client controller and keep the remaining page server-rendered.

### What to remove or consolidate

- Replace the current hero's static output list with the Living Reveal.
- Replace credibility pills with one complete free/trust line.
- Refactor the long `68svh` story chapters into compact, purpose-specific sections.
- Merge the current “useful loop” into the Share Card → open → Page viewed sequence.
- Replace the pricing-style grid with the Free Promise section.
- Merge repeated “why” and trust cards into the Free + Control section.
- Move résumé guide links to Resources/footer.
- Use “One page. Many moments.” only once if retained.
- Show only three curated homepage theme directions.
- Use **Build from my résumé — free** consistently for signup CTAs.
- Remove repeated explanations after an interaction already demonstrates the idea.

---

## 11. How Signal Frame applies beyond the homepage

### Auth

- One focused 440–480px square panel
- Minimal ambient background
- Persistent labels and a clear primary action
- Trust line below the CTA
- Inline errors rather than toast-only errors

### Résumé import, onboarding, and create

- Résumé upload or paste is the first major choice
- Square progress rail and numbered blocks
- Stable save/continue action area
- Clear review step before imported information becomes final
- Forms grouped with dividers instead of nested cards
- Theme preview remains exempt; surrounding selectors and controls comply

### Dashboard and analytics

- Opaque panels and strong alignment
- Clear page status and one primary action
- Rectangular stat blocks with tabular numerals
- Prefer lists and tables to decorative card grids
- Use charts only when they reveal a useful trend
- Provide a clear compact mobile navigation pattern

### Editor and ATS tools

- Persistent navigation among content, design, ATS PDF, and sharing
- Rectangular tabs with a line-based selected state
- Split preview on desktop and explicit preview toggle on mobile
- ATS findings grouped by severity with plain-language actions
- Only the rendered output inside the preview boundary is exempt

### Settings

- Left section navigation on desktop and rectangular selector on mobile
- One coherent panel per settings group
- Stable save area when changes are pending
- Destructive actions isolated behind a strong divider and `AlertDialog`

### Admin

- Compact density, opaque surfaces, tables, and filters
- Explicit semantic status badges
- IDs and timestamps may use DM Mono
- No glass or ambient visual effects

### Guides and legal

- Content-first opaque layout
- 704px reading measure
- Strong hierarchy and useful table of contents
- Minimal cards
- No animation behind long-form reading

---

## 12. Accessibility and inclusive behavior

Target WCAG 2.2 AA throughout.

- Minimum 4.5:1 contrast for normal text and 3:1 for large text.
- Controls, boundaries, and focus indicators must remain perceptible against adjacent colors.
- Use a persistent 2px focus-visible outline that is not clipped or obscured.
- Prefer 44×44px targets even where the formal minimum may be smaller.
- Use persistent form labels; placeholders provide examples, never labels.
- Connect helper and error text programmatically.
- Add an error summary for long onboarding forms.
- Announce uploads, async saves, publishing, and failures appropriately.
- Provide complete keyboard support for menus, tabs, dialogs, uploads, and theme controls.
- Add a skip-to-content link and semantic landmarks.
- Keep DOM order consistent with visual order.
- Do not communicate meaning by color alone.
- Do not auto-advance onboarding after an unexpected or uncertain result.
- Give data tables an accessible mobile alternative or labeled horizontal scrolling.
- Test keyboard-only, screen reader basics, 200% zoom, 320px width, reduced motion, and reduced transparency.

---

## 13. Analytics and experimentation

### Qualified product funnel

Measure meaningful progress rather than CTA clicks alone:

1. `landing_view`
2. `signup_start`
3. `resume_import_start`
4. `resume_import_complete`
5. `preview_created`
6. `page_published`
7. `first_share`

### Homepage diagnostics

- `hero_primary_cta_click`
- `hero_sample_click`
- `professional_moment_selected`
- `ats_demo_interacted`
- `pdf_preview_viewed`
- `visual_direction_selected`
- `share_demo_interacted`
- `sample_profile_opened`
- `free_details_viewed`
- `final_cta_click`

Properties may include placement, experiment variant, viewport class, moment, and sample ID. Never send résumé content, job-description text, names, emails, or other personal content to analytics.

### First experiment

Compare the current homepage with the Living Reveal version while holding the preferred headline and complete free promise constant.

- Control: current static hero and long-form scroll story
- Variant: résumé-to-three-output reveal plus professional-moment selector
- Primary metric: résumé-import completion per unique homepage visitor
- Secondary metrics: signup start, preview creation, publication, and first share

Scroll depth and animation completion are diagnostics, not business outcomes.

---

## 14. Migration plan

### Phase 0: approve and protect the boundary

- Approve this reference specification.
- Classify every route/component as site UI, rendered output, or preview.
- Add explicit site and output boundaries.
- Capture baseline screenshots of representative routes.
- Freeze new ad-hoc radius, foundational color, and legacy helper usage in site UI.

### Phase 1: tokens and primitives

- Add semantic colors, typography, spacing, border, shadow, motion, and zero-radius tokens.
- Load the complete DM Sans weight set for website UI.
- Build `Button`, `Field`, `Input`, `Panel`, `Badge`, `Tabs`, `Dialog`, `Menu`, `Alert`, and `SitePreviewFrame` first.
- Build the internal design-system gallery.
- Deprecate `.gold-pill` and generic `.glass-card` for site UI.

### Phase 2: homepage reference implementation

- Build the new homepage using only approved tokens and primitives.
- Treat it as the visual reference for later routes.
- Verify desktop, tablet, 390px, 320px, keyboard, reduced motion, and reduced transparency.

### Phase 3: conversion-critical flow

Migrate in this order:

1. Login, signup, and recovery
2. Résumé upload and paste
3. Onboarding and create
4. Preview and publish
5. ATS PDF and job-targeting flow

The experience after the homepage CTA should feel like the same product.

### Phase 4: returning-user product

- Shared application shell and responsive navigation
- Dashboard
- Analytics
- Editor controls
- Settings
- Feedback
- Owner controls
- Page management, sharing, and downloads

### Phase 5: operations and content

- Admin
- Examples
- Free/pricing route
- Guides and resources
- Security and legal pages

### Phase 6: guardrails and QA

- Add a repository check that rejects new `rounded-*`, raw foundational colors, `.gold-pill`, and legacy site surfaces in in-scope files.
- Explicitly exclude themes and the inside of rendered output boundaries.
- Add visual regression screenshots for representative routes and component states.
- Add automated accessibility checks plus manual keyboard/focus testing.
- Verify critical flows after every primitive-family migration.
- Remove legacy tokens only after all consumers have moved.

The migration rule is:

> Migrate component families, not individual class names.

---

## 15. Acceptance criteria

### Homepage story

- A new visitor can identify the starting input, all three outputs, and the complete free promise in the first viewport.
- The primary CTA is visible without scrolling on common mobile and desktop sizes.
- ATS and AI-assisted search are explained without jargon or unsupported guarantees.
- Every claim maps to an available product capability.
- Every demonstration profile is clearly labeled unless it is authentic and consented.
- The professional-moment selector changes the relevant output without changing the person's facts.
- The cosmic background supports the hero and fades before information-dense content.

### Website system

- In-scope website controls and surfaces use zero-radius geometry.
- Living Pages and the contents of previews remain unchanged.
- In-scope pages use DM Sans according to the shared scale.
- Foundational colors come from semantic tokens.
- Shared primitives cover all common controls and interaction states.
- Header, navigation, page shell, fields, alerts, and dialogs are not reimplemented route by route.

### Quality

- No horizontal overflow at 320px, 390px, tablet, or desktop breakpoints.
- Complete keyboard operation and visible focus.
- WCAG 2.2 AA color contrast and semantics.
- Reduced motion and reduced transparency preserve the complete story.
- No console errors, hydration warnings, or broken routes.
- LCP ≤ 2.5s, INP ≤ 200ms, and CLS ≤ 0.1 at the 75th percentile.
- Critical funnel events contain no résumé text or personal content.

---

## 16. Decisions to preserve in future work

1. Signal Frame is the website system; Living Pages remain theme-owned.
2. Website controls and surfaces have sharp 0px corners.
3. DM Sans is the single primary website family.
4. Midnight navy, white, and one action blue define the interface.
5. Semantic tokens replace hue names and one-off values.
6. The homepage demonstrates one résumé becoming a Living Page, ATS-ready PDF, and Share Card.
7. The story explains both human memorability and machine readability.
8. “Free” includes building, publishing, hosting, downloading, and updating, with no card or hidden charges.
9. Motion explains state and transformation; it does not compete with the content.
10. Shared primitives and an explicit output boundary prevent design drift.

---

## 17. Standards and research references

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) for contrast, focus, keyboard operation, target sizing, motion, and other accessibility acceptance criteria.
- [Core Web Vitals](https://web.dev/articles/vitals) for the LCP, INP, and CLS performance thresholds in this specification.
- [Design Tokens Community Group](https://www.designtokens.org/) for portable, tool-agnostic token conventions as the system matures.
- [Google Research: visual complexity and prototypicality](https://research.google/pubs/the-role-of-visual-complexity-and-prototypicality-regarding-first-impression-of-websites-working-towards-understanding-aesthetic-judgments/) for the value of familiar structure and controlled visual complexity in first impressions.
- [Lindgaard et al., rapid visual appeal judgments](https://doi.org/10.1080/01449290500330448) for the importance of a clear and immediately coherent first view.

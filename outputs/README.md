# Hanmadi · 한마디

**Questions, feedback, and a little hello.**

Hanmadi is an interface prototype with Korean and English support for seminar Q&A, event feedback, and booth guestbooks. It explores how people can join through a QR code, share a thought, react to others, and see contributions in different ways.

The name comes from **한마디**: a few words, a short remark, or something you want to say.

[Live demo](https://yeseul-garden.github.io/hanmadi/) · [한국어 소개](#한국어-소개) · [First demo deployment](docs/first-demo-yeseul-garden.md) · [Product specification](docs/product-spec.md) · [Design decisions](docs/design-direction.md)

> **Project status:** GitHub Pages interface with optional Google Sheets recording and Supabase live-event connections. Supabase supports host login, shared responses/reactions, reception controls, timers and question archives. Local PostgreSQL and UI-model checks pass; setup in your own cloud account and real-device rehearsal are required.

## Why I’m building this

A seminar needs questions. A booth needs a place to leave a message. An event needs feedback.

These activities share a small interaction: give someone a clear prompt and an easy way to respond. Hanmadi explores that common experience, with an interface that can feel focused during a Q&A and more playful when collecting memories or feedback.

This project brings together product planning, UX writing, interaction design, and implementation. The interface is being developed iteratively with AI assistance; design choices are documented alongside the implementation and its current limits.

## Explore the prototype

Open the app and choose **Try the demo** to explore four sample responses. Choose **Create my survey** to go through a short setup and open an empty board.

Three views serve different purposes:

| View | Best suited to | Current behavior |
| --- | --- | --- |
| **List** | Questions to discuss next | Upvote or newest-first sorting; hosts can mark a response done and undo it |
| **Cards** | Feedback and ideas | Newest responses first, with optional emoji reactions |
| **Space** | Guestbook messages | Floating cards, twinkling stars, and five configurable colors; reactions hidden by default |

The host selects the public view. Participants and the presentation screen use that selection in the prototype. Published static links load the view saved in the event configuration; later host changes are not pushed to other devices.

## Google Sheets collection

Connect your own spreadsheet from the final setup step or the host’s **Response storage** section. Enter your Sheet URL, copy one prepared connection script into your Google account, authorize and deploy it, then use the single Connect and test button. An Excel template is optional. Open or close collection with the checkbox in the generated settings tab. Participant QR links load the configured question from your Apps Script; no per-event GitHub upload is needed for this path.

The receiver supports Korean or English headers, separate survey tabs, participant IDs for an existing booth bot, server timestamps, acknowledged writes, retry deduplication, formula escaping and a server reception gate. It does not read all responses into the public board. Test rows use `activity_status=test`; real submissions use `submitted`.

Follow the [Google Sheets setup guide](docs/google-sheets.md). Never commit the generated, configured Apps Script files or put a Google password into the app.

## Supabase live events

Choose **Run live with Supabase** in the connection guide. Run the provided installation SQL once, enable anonymous participant sign-ins, create a host email account, and connect with the project URL and publishable key. The app supports host login/logout, event creation/resume, shared responses and reactions, moderation, server-enforced reception deadlines, pause/reset, question archives and full-event Excel export. Postgres Changes triggers refreshes, with a 15-second active-tab fallback.

[Supabase setup](docs/supabase.md) · [First Google Sheets test](docs/google-sheets-test.md)

The database schema is locally tested; cloud installation and a host account are required before use. PostgreSQL/PGlite tests verify ownership, RLS, idempotency and timer rules. Real browser, WebSocket, cloud deployment and event-scale testing remain necessary.

## What’s implemented

- **Three-step setup:** event details → question and participant names → review.
- **Host, participant, and presentation previews**, with responsive layouts.
- **Korean and English UI**, including localized sample content. Custom questions and responses keep their original text.
- **Anonymous nicknames:** generated adjective-and-animal names that participants can edit. Local duplicate checks apply in demo mode; the optional Sheets receiver also rejects conflicting anonymous names when saving.
- **Questions and guidance:** configurable name-field labels, instructions, and response examples.
- **Reactions:** upvotes and additional emoji, with visibility settings for each view.
- **Response timer:** minutes and seconds, pause/resume, restart, and a full reset that removes the time limit.
- **ASCII cat and mouse:** a running scene that pauses in place and speeds up during the final minute. Reduced-motion preferences are respected.
- **Event branding:** logo, key color, eight font presets, and session-local custom font upload.
- **Light and dark themes**, with a Monokai-inspired default dark palette.
- **QR and sharing:** locally generated participant QR, PNG export, clipboard copying with a manual fallback, and separate participant/presentation URLs.
- **Excel export:** question and response records, authors, timestamps, reaction counts, and completion status.

## A few design decisions

**A blank event and a sample event are different entry points.** New users can explore the interface without mistaking sample responses for their own event data.

**“Add a question” and “publish a question” should be separate actions.** The current prototype supports a current prompt and previous prompt records. A prepared question queue and explicit publication controls are planned, rather than presenting them as finished features.

**Upvotes sit on the left in List.** A consistent column makes counts easier to compare when selecting the next question. Cards keeps reactions secondary to reading.

**A timer pause also pauses submissions.** The remaining time is preserved, drafts stay intact, and resuming continues from that point. Reset removes the time limit without deleting responses or silently reopening submissions.

**Preferences depend on the role.** Participant language and theme choices stay personal in the role preview. The presentation follows host preferences and hides those controls.

**Empty states offer a next step.** After setup, the host sees zero responses and a direct action to open submissions.

## How it’s built and deployed

This web-upload edition uses HTML, CSS, and vanilla JavaScript. The application’s interface, styles, and interaction code are included in `index.html`; no frontend package installation or build command is required.

- `index.html` — standalone application and its source.
- `event-config.js` — public static event settings.
- `vendor/` — pinned QR and icon libraries with license notices.
- `licenses/` — original third-party notices.
- `docs/` — product, design, and deployment notes.

For first-time publishing, upload these files to the repository root and select **Settings → Pages → Deploy from a branch → main → /(root)**. Follow the [Korean deployment guide](docs/first-demo-yeseul-garden.md).

Suggested repository name: `hanmadi`.

Demo: [yeseul-garden.github.io/hanmadi](https://yeseul-garden.github.io/hanmadi/). The site owner has confirmed that an earlier version opens; multi-device connections now require the optional Supabase setup and device verification.

## Validation and current limits

State transitions have been checked with a DOM model: ordering, reactions, anonymous naming, draft preservation, timer boundaries, reset behavior, role preferences, and public-link routing. Generated QR targets were checked with an independent decoder. Excel output was checked for ZIP/XML structure and data types.

Actual browser layout, mobile camera scanning, clipboard/download completion, and font-file rendering still need device testing. The DOM checks are not a substitute for those checks.

GitHub Pages hosts static files. It does not provide shared event storage or real-time messaging. Current responses can be lost on reload, and administrator authentication is provided by the optional Supabase path. Without a Sheets connection, publishing an event configuration requires updating the static file; a short role URL is not an authentication mechanism.

## Next steps

- Verify persistent storage against the deployed cloud project.
- Rehearse host authentication and database-enforced permissions on real devices.
- Load-test nickname reservations and atomic vote updates.
- Validate WebSocket delivery under event network conditions.
- A prepared multi-question queue with explicit publish controls.
- Separate facilitator-led and self-paced participation flows.
- Browser, keyboard, mobile, and load testing before real event use.

## Acknowledgements

### Design and UX writing references

Hanmadi’s interface was refined with guidance from the following public resources. They were used as development references, not runtime dependencies or copied application templates.

| Resource | How it informed Hanmadi | Reference license |
| --- | --- | --- |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Visual direction, typography hierarchy, and reducing generic interface patterns | [MIT](https://github.com/Leonxlnx/taste-skill/blob/main/LICENSE) |
| [Hallmark](https://github.com/Nutlope/hallmark) | Reviewing visual consistency, interaction states, and interface details | [MIT](https://github.com/Nutlope/hallmark/blob/main/LICENSE) |
| [Unslop](https://github.com/heydamir/unslop), by Damir Sokolovsky (@heydamir) | Adapted guidance on spacing, restrained metadata, and removing redundant badges, while retaining Hanmadi’s requested motion and branding | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| [UX Writing Skill](https://github.com/content-designer/ux-writing-skill), by Christopher Greer | Clear action labels, consistent terminology, helpful empty states, and Korean/English interface copy | [MIT](https://github.com/content-designer/ux-writing-skill/blob/main/LICENSE) |

The application code and Korean/English copy were written for Hanmadi. These credits do not imply endorsement, certification, or that any reference project’s full review workflow was completed.

### Included libraries and fonts

- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) **1.4.4**, by Kazuhiko Arase — browser-local QR generation; MIT.
- [Lucide](https://github.com/lucide-icons/lucide) **0.468.0** — interface icons; ISC with retained Feather notices.
- **Korean font presets:** IBM Plex Sans KR, Pretendard, Noto Sans KR, and Noto Serif KR.
- **English font presets:** Inter, DM Sans, Manrope, and Source Sans 3.

The eight preset font families use SIL OFL 1.1. Original license texts, copyright notices, and font source records are preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `licenses/`. Vendored libraries retain their own notices. Uploaded user fonts are not covered by those preset licenses.

The ASCII cat-and-mouse scenes were composed for this prototype; no character illustration pack was imported. Radix Themes, shadcn/ui, Open Doodles, and Open Peeps were explored as possible design resources but are not included dependencies or assets in this version.

Development has been AI-assisted. Product requirements, interaction decisions, implementation limits, and validation scope are documented in this repository; AI assistance does not replace browser, accessibility, or load testing.

## Project license

The license for Hanmadi’s own code should follow the root `LICENSE` in the published repository. This local source package does not include a verified copy of that root license. Keep the license selected when creating the GitHub repository, and preserve third-party licenses separately.

## 한국어 소개

**질문도, 후기도, 다녀간 한마디도.**

Hanmadi는 세미나 질문, 행사 후기, 부스 방명록을 하나의 참여 경험으로 연결하는 프로토타입입니다. QR로 참가자 화면을 열고, 생각을 남기고, 공감하고, 목록·카드·우주 화면으로 결과를 살펴보는 흐름을 담았습니다.

영어와 한국어, 익명 닉네임, 행사 디자인, 타이머, Excel 내보내기를 지원합니다. 첫 화면에서는 샘플로 체험하거나 새 행사를 준비할 수 있습니다.

GitHub Pages 화면에 본인의 Google Sheets 또는 Supabase를 연결하는 구조입니다. Sheets는 답변 기록, Supabase는 운영자 로그인과 여러 기기의 답변·공감·접수 상태 공유를 지원합니다. 클라우드 설치와 실제 휴대폰 리허설이 필요합니다. 이 저장소는 완성된 서비스를 과장하기보다, 문제를 정의하고 UX를 설계하며 구현과 검증을 이어가는 과정을 보여주는 포트폴리오를 지향합니다.

### Google Sheets 검증 범위

Google Sheets 저장, 연결 안내, 템플릿·설치 파일 다운로드를 추가했습니다. 시트에서 저장 확인을 받은 뒤 완료 처리하고, 미확인 제출은 같은 ID로 재시도합니다. 전체 답변은 Google Sheets에서 확인하며, Sheets 모드에서는 공개 화면·공감·타이머를 기기 간 동기화하지 않습니다. [연결 방법과 Apps Script 한도](docs/google-sheets.md)를 확인하세요. 실제 Google 배포와 기존 부스 인증 봇의 연동은 사용자 계정에서 리허설이 필요합니다.

### Default identity

The default Little host mark comes from the project’s hanmadi-little-host-in-use assets. The primary color is #FF6B58, the light background #F8F5EF, and the text #242321. Dark mode keeps Monokai surfaces with coral accents. Korean UI defaults to IBM Plex Sans KR and English to Inter; an explicitly selected audience font is preserved. Event logo and color settings override the defaults. Outlined Space Grotesk wordmark notices are retained with the brand artwork.

### Clearer UI copy and code copying

Interface labels and recovery messages use plain Korean and English, with the action and result made explicit. See docs/ux-writing.md. The connection dialog uses the UI font consistently and keeps Korean words together. Connection-code copying writes the prepared text directly during the click; a compatibility copy method and a full-code selection button remain available when browser permissions block automatic copying. Real clipboard behavior still needs verification in the target browser.

## Development

Editable application code is in `src/`, integrations in `integrations/`, and checks in `tests/`. Run `python3 scripts/package-demo.py` to rebuild `public/` and upload-ready ZIPs in `outputs/`. The repository root contains the deployed GitHub Pages app; copy the rebuilt `public/` files to the root when publishing, preserving `event-config.js`.

## Uniform survey URLs

Every connected survey uses one 20-character code and three clean paths: `<site>/<code>/admin-page`, `<site>/<code>/participant-form`, and `<site>/<code>/result`. A site-wide Supabase link directory resolves codes for both Supabase and Google Sheets backends. The host route requires separate owner authentication. [One-time setup and URL rules](docs/uniform-share-urls.md). Deploy `404.html` alongside the app for GitHub Pages deep links; shared-link SQL and `share-config.json` must be installed once before issuing new URLs.

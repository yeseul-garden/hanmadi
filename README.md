# Hanmadi · 한마디

**Questions, feedback, and a little hello.**

Hanmadi is a bilingual interface prototype for seminar Q&A, event feedback, and booth guestbooks. It explores how people can join through a QR code, share a thought, react to others, and see contributions in different ways.

The name comes from **한마디**: a few words, a short remark, or something you want to say.

[한국어 소개](#한국어-소개) · [First demo deployment](docs/first-demo-yeseul-garden.md) · [Product specification](docs/product-spec.md) · [Design decisions](docs/design-direction.md)

> **Project status:** Interactive static prototype. QR entry, interface interactions, and static event links are implemented. Responses, votes, timers, and host controls do **not** synchronize across devices yet. This is a portfolio demo, not a production-ready live event service.

## Why I’m building this

A seminar needs questions. A booth needs a place to leave a message. An event needs feedback.

These activities share a small interaction: give someone a clear prompt and an easy way to respond. Hanmadi explores that common experience, with an interface that can feel focused during a Q&A and more playful when collecting memories or feedback.

This project brings together product planning, UX writing, interaction design, and implementation. The interface is being developed iteratively with AI assistance; design choices are documented alongside the implementation and its current limits.

## Explore the prototype

Open the app and choose **Try the demo** to explore four sample responses. Choose **Create my event** to go through a short setup and open an empty board.

Three views serve different purposes:

| View | Best suited to | Current behavior |
| --- | --- | --- |
| **List** | Questions to discuss next | Upvote or newest-first sorting; hosts can mark a response done and undo it |
| **Cards** | Feedback and ideas | Newest responses first, with optional emoji reactions |
| **Space** | Guestbook messages | Floating cards, twinkling stars, and five configurable colors; reactions hidden by default |

The host selects the public view. Participants and the presentation screen use that selection in the prototype. Published static links load the view saved in the event configuration; later host changes are not pushed to other devices.

## What’s implemented

- **Three-step setup:** event details → question and participant names → review.
- **Host, participant, and presentation previews**, with responsive layouts.
- **Korean and English UI**, including localized sample content. Custom questions and responses keep their original text.
- **Anonymous nicknames:** generated adjective-and-animal names that participants can edit. Duplicate checks currently apply within the prototype, not across devices.
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

Expected GitHub Pages URL **after deployment**: `https://yeseul-garden.github.io/hanmadi/`. A live deployment has not been verified yet.

## Validation and current limits

State transitions have been checked with a DOM model: ordering, reactions, anonymous naming, draft preservation, timer boundaries, reset behavior, role preferences, and public-link routing. Generated QR targets were checked with an independent decoder. Excel output was checked for ZIP/XML structure and data types.

Actual browser layout, mobile camera scanning, clipboard/download completion, and font-file rendering still need device testing. The DOM checks are not a substitute for those checks.

GitHub Pages hosts static files. It does not provide shared event storage or real-time messaging. Current responses can be lost on reload, and administrator authentication has not been implemented. Publishing an event configuration requires updating the static file; a short role URL is not an authentication mechanism.

## Next steps

- Persistent event, question, response, and reaction storage.
- Host authentication and database-enforced permissions.
- Cross-device nickname uniqueness and atomic vote updates.
- Real-time delivery of the current question, reception status, and timer.
- A prepared multi-question queue with explicit publish controls.
- Separate facilitator-led and self-paced participation flows.
- Browser, keyboard, mobile, and load testing before real event use.

## Credits and licensing

Third-party code and font copyright notices are retained in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), `licenses/`, and the vendor license files. The QR generator is MIT-licensed; Lucide retains its ISC/Feather notices; the eight preset font families use SIL OFL 1.1.

The license for Hanmadi’s own code has not been finalized in this source package. MIT is the recommended choice when creating the public repository. Once selected, keep the generated root `LICENSE` file and update this section accordingly. Third-party licenses remain separate.

## 한국어 소개

**질문도, 후기도, 다녀간 한마디도.**

Hanmadi는 세미나 질문, 행사 후기, 부스 방명록을 하나의 참여 경험으로 연결하는 프로토타입입니다. QR로 참가자 화면을 열고, 생각을 남기고, 공감하고, 목록·카드·우주 화면으로 결과를 살펴보는 흐름을 담았습니다.

영어와 한국어, 익명 닉네임, 행사 디자인, 타이머, Excel 내보내기를 지원합니다. 첫 화면에서는 샘플로 체험하거나 새 행사를 준비할 수 있습니다.

현재는 **정적 시안**으로, 여러 기기의 답변·공감·접수 상태를 실시간으로 공유하지 않습니다. 운영자 인증과 데이터 저장도 개발 예정입니다. 이 저장소는 완성된 서비스를 과장하기보다, 문제를 정의하고 UX를 설계하며 구현과 검증을 이어가는 과정을 보여주는 포트폴리오를 지향합니다.

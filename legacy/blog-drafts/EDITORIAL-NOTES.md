# Source and selection notes

Purpose: Explain the history evidence, replacement choices, and limits behind the ranked drafts.

These are editorial notes, not a blog post. The [reading guide](README.md) contains the
30 active articles in the suggested publication order.

## What was available

The local transcript inventory contained 700 Codex files, 658 Pi files, and 24 Claude
files: 1,382 in total. A separate Claude session index contained 728 entries. Index
entries are not equivalent to full transcripts and are not added to the transcript count.

The review prioritized large files and long dialogues, then inspected selected relevant
user and assistant passages. Tool output, repeated control messages, and embedded media
can dominate a file's size. The largest file is therefore not necessarily the richest
conversation, and a high message count is not a count of distinct human decisions.

Some large conversations concerned narrow automation incidents and did not produce
active articles after the requested scope change. Smaller related discussions were used
when they supplied clearer architecture or decision context. The available Claude
material was thinner than the Codex and Pi material; the collection does not invent
long Claude case studies to make the coverage appear balanced.

## Strong sources behind the new selection

Dates below use America/Chicago. Sizes are approximate MiB, where one MiB is 1,048,576
bytes. Short session identifiers provide a private lookup reference without copying
raw logs, credentials, customer data, or personal messages into the collection.

| Conversation | Source reference | Evidence that mattered | Active articles informed |
| --- | --- | --- | --- |
| Apartment-platform demonstrations and E2E work, Oct 6, 2026 | Codex `01a1146e`, about 100.8 MiB | Repeated interface refinement; reported browser and unit checks; final recordings used demo data and guided fallback | A Great Demo Still Needs an Evidence Label |
| Job matcher, Aug 17, 2026 | Pi `01a01299`, about 17.7 MiB | Recovery edge cases; later plans for unknown evidence, profile versions, hourly delivery, and saved/applied/archived states | Unknown Is Not False; Your Cache May Be Answering Yesterday's Question; An Hourly Digest Needs More Than an Hourly Timer; A Status Label Is a Claim About What Happened; A Database Backup Is Not Yet a Recovery Plan |
| Apartment frontend refactor, Oct 8, 2026 | Pi `01a11e35`, about 13.9 MiB | Design-preservation requirement; visible regressions; shared style-order problem; correction reports with some parity questions remaining | The Refactor Passed Its Checks; Parallel Engineering Depends on Clear Ownership |
| Customer dashboard, July 16, 2026 | Codex `019f6c62`, about 33.3 MiB | Reported disposable-database tests, tenant policies, persistence checks, and an open PR whose merge remained restricted | Hiding a Button Does Not Protect the Data |
| Queue incident investigation, June 5, 2026 | Pi `019e9827`, about 11.0 MiB | The reported dominant failure shifted toward application navigation while some database issues remained | Stop Fixing Yesterday's Incident |
| Frontend and backend architecture planning, Oct 8, 2026 | Codex `01a11d47`, about 2.2 MiB | Planned separation of rendering, controllers, pure models, validation, and business rules | Business Rules Should Survive a UI Rewrite |
| First-90-days engineering plan, Oct 5, 2026 | Codex `01a10f94`, about 3.1 MiB | Proposed review of recurring friction; deduplication; relevant-change denominators; estimates distinguished from observations | Measure the Friction You Want to Remove |
| Take-home scope planning, Sept 4, 2026, plus related Pi discussions | Codex `01a06d82`, about 0.9 MiB | Bounded milestones, explicit exclusions, deadline pressure, and a written scope boundary | Build a Complete Small Product Before an Incomplete Big One |

These references establish the origin of the insights. They do not make every illustrative
example in an article a historical event. Analogies, hypothetical timelines, and suggested
tests are explanatory material unless the article explicitly attributes them to the history.

## Evidence distinctions retained in the articles

- **Observed problem:** A conversation documents a reported symptom or an inspected behavior.
  It does not prove that the same issue exists in the current code.
- **Reported validation:** A historical closeout describes checks passing. This review
  did not rerun those project checks or independently audit production outcomes.
- **Proposed design:** A plan explains an intended approach. It is not presented as a
  shipped feature, a measured improvement, or an achieved business result.
- **Illustrative explanation:** Small examples explain a general principle. Their numbers
  and outcomes are not claimed as measurements from the user's projects.

In particular, the job-matcher conversation mixed implementation and later planning.
The state-management and digest redesign articles identify the relevant later design
as proposed. The demo article preserves the use of prepared data. The refactor article
does not claim complete visual parity. The dashboard article does not claim deployment.

## Replacement decisions across the entire collection

The replacement topics are independently supported by the history. They are not simply
the same narrow articles with project names removed.

| Excluded topic | Broader replacement | Why the replacement fits the audience |
| --- | --- | --- |
| Automated login and typing speed | Business rules outside the UI | Explains architecture boundaries that survive technology changes |
| First successful automation run | Evidence labels for demonstrations | Helps leaders distinguish interface proof from live-system readiness |
| Moving a file versus finishing a job | Database recovery design | Connects data integrity, interruption, and operational responsibility |
| Workflow duration averages | Measuring engineering friction | Explains fair comparisons and useful improvement experiments |
| No-data automation timeout | Unknown evidence in AI results | Connects data semantics to trustworthy product decisions |
| Decomposing a particular execution engine | A complete small product | Shows prioritization and technical delivery judgment |
| Partial AI workflow completion | Product-state meaning | Makes user intent, external facts, and recovery behavior explicit |
| Manual portal repair versus production repair | Customer data isolation | Demonstrates enforcement at a real architectural boundary |
| Search not finished versus search empty | Cache identity and freshness | Explains when a previous answer remains valid |
| Approved but quarantined agent plan | Parallel engineering ownership | Replaces harness mechanics with broadly useful coordination decisions |

**Additional largest-conversation insight:** hourly digest identity adds a distinct
distributed-systems article about a familiar product promise. It extends the collection
beyond the ten direct replacements.

## Why several related topics remain separate

The frontend-refactor case study concerns the promise to preserve an existing product.
The feature-organization article concerns where code belongs. The business-rules article
concerns which decisions must remain independent of rendering. They share context but
answer different questions.

Likewise, the demo article concerns what evidence supports a readiness claim. The
screen-recording article concerns experience problems an automated assertion can miss.
The AI-baseline article concerns whether an experiment can establish an improvement.
Their distinctions should remain visible during any later editing.

## Technical companion sections

All 30 active articles retain their original plain-language discussion and now include
a technical deep dive with a jump link near the title. Each deep dive adds roughly
400 words of topic-specific mechanics, contracts, tradeoffs, and verification detail.

Pseudocode, example schemas, timelines, and numerical examples describe illustrative
designs. They are not recovered implementation listings or newly measured project
results. Adding these sections does not change the historical evidence distinctions
above. Technical references support specific platform behavior where cited; they do
not independently verify the user's project outcomes.

Each active article also includes an ASCII diagram near the start of its technical
section. These are conceptual explanations of the article's ideas, not recovered
architecture drawings or new evidence of a historical implementation. Captions identify
the important assumptions, relationship types, and limits.

The ten excluded workflow-specific drafts remain archived and are outside this expansion.
The recruiter and technical-leadership ranking is unchanged.

## Ranking rationale

The strongest opening articles combine an understandable problem with enough concrete
history to discuss investigation and tradeoffs. Architecture, tenant isolation, data
correctness, and evaluation follow closely because they support substantial technical
interview discussion.

Planning essays remain useful but are labeled as plans. Topics supported mainly by a
Claude index are placed later because the evidence is thinner. Accessibility and
knowledge transfer remain in the collection to show breadth, even though their reader
fit is more specific than the opening debugging stories.

The guide offers different starting points for recruiters and technical leaders rather
than pretending that one numerical score can precisely predict both audiences.

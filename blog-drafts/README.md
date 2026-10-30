# Engineering blog collection: 30 ranked drafts

Purpose: Select and rank readable engineering articles for recruiters and technical leaders.

The collection contains **30 separate Markdown articles**, each with two reading levels:
a plain-language explanation for a curious reader around age 13, followed by an in-depth
technical section. Each article has a jump link so readers can choose their starting point.
The expanded articles are about 1,650-2,250 words, with short sections for easier reading.

The technical sections add concrete contracts, algorithms, state models, concurrency
scenarios, calculations, and verification methods appropriate to each topic. Examples
are illustrative unless explicitly identified as historical evidence. Official technical
references appear beside relevant framework, database, and accessibility details.
Each technical section also includes a compact ASCII diagram and a caption explaining
its arrows, assumptions, or limits. The diagrams stay readable inside plain Markdown.

The ranking below replaces the earlier list. It applies the request to remove
workflow-specific topics to the **entire collection**, including the newest additions.
Ten narrow articles are preserved in an [excluded archive](archive/workflow-specific/README.md).

## What changed and why

The active collection focuses on transferable engineering judgment: diagnosing a real
problem, defining correct behavior, making architecture decisions, controlling scope,
and explaining evidence honestly. Topics centered on portal automation, desktop actions,
an individual execution engine, or a particular agent harness are excluded.

General engineering topics remain eligible even when the original example came from
an automation project. Shared locks, data contracts, incident diagnosis, and metrics
apply well beyond that project. Teamwork and development practices remain eligible
when they explain broadly useful engineering decisions rather than tool-specific steps.

Eleven new broad articles replace narrow material and add insights from larger
conversations. Two earlier additions from the largest conversations remain: the frontend
refactor case study and the incident-diagnosis article. Together with 17 retained
articles, this produces 30 active drafts.

The original expansion is preserved for retained articles: each remains at least three
times its initial length. New articles use the same substantial format, with examples,
tradeoffs, failure cases, and validation ideas. Extra length does not imply extra
production evidence.

## How to read the ranking

This is a suggested publication order based on combined recruiter and technical-leadership
interest. It favors concrete evidence, clear communication, transferable depth, and
ownership of meaningful tradeoffs. These are editorial judgments, not measured hiring
outcomes or predictions of reader engagement.

Recruiter interest means the article makes a relevant capability easy to recognize.
Technical-leadership interest means it supports a useful discussion about decisions,
failure modes, and evidence. A proposed approach can demonstrate judgment, but it should
not be described as an achieved result on a resume or in an interview.

## Ranked collection

| Rank | Article                                                                                                                  | Recruiter signal                                    | Technical-leadership interest                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------- |
| 1    | [I Split the Background Jobs. They Still Waited on Each Other.](separate-jobs-shared-lock.md)                            | Concrete debugging across system boundaries         | Find the real bottleneck before restructuring work                         |
| 2    | [The Refactor Passed Its Checks. The Product Still Changed.](refactor-passed-checks-changed-the-product.md)              | Ownership of quality during a difficult migration   | Preserve product behavior beyond compilation and unit checks               |
| 3    | [If You Cannot Reproduce the Bug, You Cannot Prove the Fix](reproduce-the-bug-before-proving-the-fix.md)                 | Honest, rigorous AI evaluation                      | Compare against a meaningful baseline before claiming improvement          |
| 4    | [Hiding a Button Does Not Protect the Data](permissions-belong-at-data-boundary.md)                                      | Backend and security reasoning                      | Enforce customer isolation at real data boundaries                         |
| 5    | [What Does Your Success Rate Actually Count?](success-rate-needs-a-definition.md)                                        | Ability to question misleading metrics              | Align operational numbers with the outcome people care about               |
| 6    | [Business Rules Should Survive a UI Rewrite](business-rules-outside-react.md)                                            | Architecture explained through product rules        | Keep business decisions stable while changing presentation                 |
| 7    | [Build a Complete Small Product Before an Incomplete Big One](scope-a-complete-small-product.md)                         | Prioritization and delivery judgment                | Sequence learning, scope, and integration under a deadline                 |
| 8    | [Unknown Is Not False: Designing Honest AI Results](unknown-is-not-false.md)                                             | Thoughtful AI product design                        | Preserve missing evidence instead of inventing certainty                   |
| 9    | [A Database Backup Is Not Yet a Recovery Plan](database-backup-is-not-a-restore-plan.md)                                 | Reliability thinking beyond the happy path          | Make recovery safe across interruption and competing access                |
| 10   | [Adding More Availability Can Make a Time Slot Disappear](adding-availability-can-remove-a-time-slot.md)                 | Clear explanation of a surprising algorithm         | Connect internal scheduling rules to user expectations                     |
| 11   | [The Same AI Can Write the Code, the Tests, and the Same Mistake Three Times](when-ai-code-and-tests-share-a-mistake.md) | Critical judgment when using AI tools               | Establish independent expectations for correctness                         |
| 12   | [An Hourly Digest Needs More Than an Hourly Timer](hourly-notifications-need-a-time-identity.md)                         | Distributed-systems reasoning in a familiar feature | Separate logical identity, selection, retries, and delivery                |
| 13   | [The File Said Uploaded. The File Was Missing.](uploaded-file-was-missing.md)                                            | Investigation from interface to actual storage      | Separate status records from evidence of a completed outcome               |
| 14   | [Your Cache May Be Answering Yesterday's Question](cache-remembers-an-old-question.md)                                   | Data correctness and performance tradeoffs          | Reuse answers only while their inputs and assumptions remain valid         |
| 15   | [Stop Fixing Yesterday's Incident](incident-cause-can-change.md)                                                         | Evidence-led debugging and clear incident updates   | Reassess the dominant blocker as failures move through a system            |
| 16   | [Measure the Friction You Want to Remove](measure-engineering-improvement.md)                                            | Practical team-improvement judgment                 | Use fair denominators and small interventions without ranking people       |
| 17   | [A Status Label Is a Claim About What Happened](product-state-records-what-user-did.md)                                  | Product thinking connected to data modeling         | Separate user assertions, external facts, and stale actions                |
| 18   | [Parallel Engineering Depends on Clear Ownership](parallel-work-needs-ownership.md)                                      | Collaboration and technical coordination            | Stabilize shared decisions before increasing parallel implementation       |
| 19   | [How I Would Cut a Cloud Bill Without Guessing](reduce-cloud-cost-without-guessing.md)                                   | Cost awareness with operational judgment            | Evaluate savings alongside reliability and reversibility                   |
| 20   | [A Great Demo Still Needs an Evidence Label](demo-proves-less-than-you-think.md)                                         | Credible communication about project readiness      | Distinguish demo data, checked interactions, and live integration evidence |
| 21   | [Refactoring React Around Features: Where Should Shared Code Live?](refactoring-react-around-features.md)                | Maintainable frontend design                        | Balance feature ownership with justified shared abstractions               |
| 22   | [When Two Queues Disagree About the Same Job](one-queue-one-source-of-truth.md)                                          | Understanding of ownership and recovery             | Simplify state without losing delivery guarantees                          |
| 23   | [Testing an LLM Integration on a $10 Budget](testing-an-llm-integration-on-a-small-budget.md)                            | Resourceful AI experimentation                      | Spend a limited evaluation budget on decision-changing evidence            |
| 24   | [What a Screen Recording Reveals That a Passing E2E Test Doesn't](what-e2e-screen-recordings-reveal.md)                  | Attention to the user's actual experience           | Combine assertions with visual and interaction review                      |
| 25   | [How Can a Job Be Billions of Percent Complete?](billions-of-percent-complete.md)                                        | Memorable explanation of a data-contract bug        | Make the meaning and units of cross-service values explicit                |
| 26   | [Could Another Developer Take Over Without a Meeting?](handoff-without-a-meeting.md)                                     | Ownership and knowledge transfer                    | Reduce dependence on undocumented personal knowledge                       |
| 27   | [A Table Can Look Right and Read Wrong](table-looks-right-reads-wrong.md)                                                | Accessibility awareness                             | Verify structure and reading order beyond visual appearance                |
| 28   | [What I Want an LLM to Tell Me About an Unfamiliar Codebase](using-an-llm-to-understand-a-codebase.md)                   | Evidence-based onboarding                           | Turn broad model suggestions into verified engineering questions           |
| 29   | [Designing a Command-Line Tool an AI Can Actually Use](cli-for-humans-and-agents.md)                                     | Developer-tool design and agent awareness           | Make inputs, outcomes, and errors understandable to multiple clients       |
| 30   | [Joining as Engineer Number Three: Choosing the First Problem to Own](choosing-a-first-problem-as-engineer-three.md)     | Humility, initiative, and startup awareness         | Select an early contribution that fits team context                        |

## Most impactful starting points

For a recruiter-facing portfolio, lead with the shared-lock investigation, the frontend
refactor, the failed AI-baseline experiment, tenant isolation, and the scheduling example.
Together they show debugging, architecture, evaluation, backend boundaries, and clear
technical explanation. The source notes distinguish reports from independently proven
production results.

For a technical-leadership audience, start with success metrics, business rules outside
the UI, scope control, recovery design, and measuring engineering friction. These open
useful discussions about correctness, investment, ownership, and how teams know a
change helped. Several are explicitly proposed approaches rather than completed outcomes.

The lower-ranked articles remain useful. Their placement reflects overlap, narrower
audience fit, or thinner historical evidence, rather than a claim that the topic is unimportant.

## History coverage and evidence limits

The work used available local Codex, Claude, and Pi history. The latest inventory found
1,382 transcript files across the three sources, including 658 Pi files and 24 available
Claude transcripts. A separate Claude index supplied 728 older entries, many without
the full conversation text.

The largest files and longest dialogues were prioritized for selective deeper reading.
File size can include tool logs, media, repeated instructions, and inherited context;
it is a discovery signal, not a measure of insight. This was not a line-by-line review
of all transcripts, and local history may not include every conversation you have had.

[Editorial notes](EDITORIAL-NOTES.md) explain the strongest source conversations,
replacement choices, and evidence limits. Historical agent closeouts are treated as
reports, not independent verification of deployments or business outcomes. Drafts
distinguish observed problems, reported checks, proposed designs, and illustrative examples.

The original 30 source articles retain `status: draft` as historical editorial metadata.
They are now published as static pages under `content/pages/`, with published metadata
and homepage links. Run `npm run content:publish-drafts` to refresh the publication
copies after editing these sources. Editorial docs and the excluded archive are not
published. See [the content guide](../content/README.md) for details.

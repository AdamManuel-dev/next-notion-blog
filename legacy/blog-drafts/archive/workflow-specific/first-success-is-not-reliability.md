---
title: "The First Successful Run Is a Milestone, Not a Reliability Score"
description: "Separate proof that a workflow can work from evidence that it keeps working."
status: draft
tags: [automation, testing, operations]
---

# The First Successful Run Is a Milestone, Not a Reliability Score

The first successful run is exciting. It proves that at least one path through a system
worked under a particular set of conditions.

It does not tell us how often the system will work tomorrow.

My workflow history contains repeated investigations into scheduled runs, stalled jobs,
missing files, and first-completion timing. Together, they suggest several different
questions hiding inside the phrase "Does it work?"

## Three questions, three kinds of evidence

| Question | Useful evidence |
| --- | --- |
| Can it complete the task? | A verified end-to-end result. |
| Does it handle expected variations? | Tests across relevant inputs and conditions. |
| Does it keep operating? | Observed scheduled runs, failures, and recovery over time. |

A demonstration can answer the first question without answering the other two.

## Check the outcome beyond the status

A job marked completed may still need an external check. Was the expected file created?
Did the intended record change? Were all required items handled?

Choose a small number of checks tied directly to the user's goal. Otherwise, it is
possible to measure the workflow's internal confidence instead of its actual result.

## Include ordinary variation

An illustrative test set might include a normal input, an empty result, a missing optional
field, a slow response, and an interrupted connection.

The right cases depend on the workflow. A long list of unrelated edge cases is less
useful than coverage of the conditions users regularly encounter.

For actions that change external systems, use an appropriate test environment or
controlled inputs. Repeating real actions carelessly can create duplicate work.

## Measure recovery as well as completion

A system that occasionally fails and clearly recovers may be more usable than one
that silently stops with no explanation.

Record how long failures remain unresolved, what intervention they require, and whether
retries preserve earlier progress safely.

Watch the unfinished jobs too. A success rate calculated only from finished jobs can
hide work that has been stuck for hours.

## Decide what ready means for this use

A tool used by its developer once a week may tolerate manual recovery. A scheduled
customer workflow may need clear alerts and a predictable completion window. The same
technical behavior can be acceptable in one setting and insufficient in the other.

Write the intended use before defining readiness. Who depends on the output? How soon
do they need it? What happens if it is missing or wrong? Who is available to investigate?

These questions guide the amount and kind of evidence needed. They avoid both extremes:
treating one demo as universal proof, and demanding an elaborate production program
for a small experiment that nobody depends on yet.

## Build an evidence ladder

Evidence becomes stronger as it covers more of the real environment. A unit test can
verify a rule in isolation. An integration test can check how components communicate.
A controlled end-to-end run can verify the complete path with known inputs.

Observed scheduled operation adds another dimension: the system has to start at the
right time, obtain its resources, and handle the conditions present without a developer
manually preparing every step.

These levels complement one another. Production observation does not replace a precise
test of a rare boundary case, and a large unit suite does not prove the scheduler is
actually running. The evidence ladder helps identify which question each check answers.

## Choose cases by risk and frequency

Start with the common paths and the failures that would be expensive or difficult to
recover from. A rare visual detail and a duplicate submission do not deserve equal
priority just because both can be called edge cases.

For an illustrative document workflow, important cases might include a normal document,
no available document, an incomplete document, an interrupted transfer, and an existing
destination from a previous attempt.

For each case, define the expected outcome and the evidence that confirms it. Include
the user's experience: does the system explain why it stopped, preserve useful progress,
and identify the next action? Correct stopping behavior is part of reliability.

## Keep environments visible

A workflow can pass locally and fail in its target environment because of permissions,
network routes, application versions, or unavailable desktop sessions. These differences
do not invalidate local tests, but they limit what those tests prove.

Record where each result was observed and which version ran. A report that mixes results
from several builds can accidentally attribute a successful check to code that was
never tested in that environment.

For a new release, identify which important assumptions changed and validate those
boundaries. Repeating every possible check is not always necessary; ignoring a changed
dependency because an older build passed is equally unhelpful.

## Count intervention separately

Suppose ten runs produce the required output, but six need someone to reconnect a session
or correct an input. The output completion rate is useful, yet it does not describe
how autonomous the workflow is.

Track interventions in a way that distinguishes expected human review from unexpected
repair. A planned approval step is part of the design. A developer restarting a worker
after every other job is an operational burden.

Record the reason and approximate effort for those interventions. This helps the team
choose whether to improve the automation, clarify the input process, or deliberately
keep a human decision in the flow.

## Observe the quiet failures

Some failures generate loud errors. Others generate nothing: a scheduler stops firing,
a queue stops being consumed, or a source folder is no longer scanned.

Looking only at failed-job counts misses these cases because no new job exists to fail.
A useful operational check compares expected activity with observed activity. If a
scheduled workflow normally runs each morning, absence itself can be meaningful.

Avoid creating an alert for every quiet interval without understanding the workload.
A workflow with no eligible inputs may correctly do nothing. The system needs enough
context to distinguish a normal empty period from a broken path that never looked.

## Define a limited rollout

When expanding use, begin with a scope small enough to inspect and recover. That might
be one workflow, a controlled batch, or a limited set of inputs, depending on the product.

Decide what observation would justify expansion and what would stop it. Keep a clear
way to pause new work while preserving already-running work and its evidence.

A limited rollout is valuable because it tests the real environment without pretending
that a small sample settles every reliability question. The goal is to learn safely
and improve the decision about the next scope, not to collect a ceremonial green badge.

## Let reports carry uncertainty

A short report can name the version, scope, observed outcomes, interventions, and remaining
gaps. It can also distinguish a confirmed defect from a suspected explanation.

That gives the next engineer a usable starting point. They know what to trust, what
to reproduce, and which claim still needs evidence. Reliability work advances when
each result reduces uncertainty in a specific way, even if the result is that an important
path is not ready yet.

Include the observation period when describing repeated success. Ten runs over one
controlled afternoon do not cover the same conditions as ten scheduled runs across
different days. The count and the variety of conditions both affect what the evidence
can reasonably support.

## Use precise status language

"One end-to-end run passed" is a useful, defensible statement. "Observed 20 scheduled
runs, with two requiring intervention" provides a different level of evidence.

These are examples of reporting styles, not claims about my system's results. Precise
language helps a team decide what to test next without confusing a milestone with a guarantee.

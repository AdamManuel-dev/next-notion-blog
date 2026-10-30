---
title: "Why No Data Should Not Become a Timeout"
description: "Give expected empty results a clear meaning so the system responds appropriately."
status: draft
tags: [automation, errors, reliability]
---

# Why No Data Should Not Become a Timeout

A workflow asked a system to export data. The system answered, "No data to send."
The workflow kept waiting for a file that would never arrive.

Eventually, it reported a timeout.

The timeout described the wait, but hid the useful fact we already had: there was no
data available for that export.

## Different problems need different responses

Imagine asking a librarian for a book.

- If the computer is temporarily offline, trying again may help.
- If the library does not own the book, repeating the request immediately will not help.

Software needs to make similar distinctions. A generic failure can trigger the wrong
recovery, such as retrying repeatedly or marking a working login as unhealthy.

## Give the result a specific code

In this workflow, the change introduced `NO_ERA_DATA`, a specific error code for an
expected empty export. ERA is the payment-remittance data the workflow was looking for.

The job still used the existing failed status. The extra code explained what kind of
failure it was without requiring a new top-level status.

The intended flow became:

1. Detect the no-data response at the relevant point in the session.
2. Cleanly exit the terminal interaction.
3. Stop with the specific code and a readable explanation.
4. Avoid the immediate retries and escalation intended for unexpected failures.

The implementation also preserved that code as it passed through the execution layers.
A useful error code is lost if another layer replaces it with a generic exception.

## Test both branches

The empty-data test should check that cleanup happens before the workflow stops.
The normal-data test should check that the workflow continues to the export.

Other checks should confirm that unrelated failures still receive their normal handling.
Suppressing every alert would be a much broader change than recognizing one expected result.

The historical implementation session reported passing targeted tests and type checks.
It also said the new production workflow-version script had not been applied there.

## The error travels through several layers

A workflow step can identify the situation correctly while the overall job still reports
the wrong reason. The executor may return a specific code, a wrapper may throw a generic
exception, and the queue handler may record only "execution failed."

Think of a message passed through several people. If the first person says the store
is closed for a holiday and the last person hears only that the trip failed, the useful
part was lost along the way.

Trace the result from the step to the stored job, the retry policy, and the user-facing
message. At each boundary, confirm that the important meaning survives. A test of the
small helper alone cannot prove that the final dashboard receives the same information.

## Separate outcome from policy

The outcome is that no export data was available. The policy determines what the system
does about it: stop now, retry tomorrow, notify someone, or include it in a daily report.

Keeping those separate avoids hard-coding every business decision into the screen-reading
step. The step can report what it observed, while a higher layer applies the appropriate
handling for the workflow.

For example, an empty scheduled export may be normal on a quiet day. An empty export
after an operator specifically confirmed records were available may deserve investigation.
The observed result can be the same while the surrounding expectations differ.

That is why a precise code helps more than a message such as "Nothing wrong." It preserves
the fact without deciding that nobody should ever care about it.

## Match current evidence, not old text

A terminal may retain earlier messages. Searching all visible history for "No data to
send" can be risky if that phrase came from a previous attempt.

The historical plan placed the guard at a specific point in the current workflow and
assumed the current session's text was an appropriate source. That assumption deserves
its own check in a real implementation.

Useful evidence might include a fresh screen read tied to the current action, a cleared
output region, or an application response associated with the current request. The
available mechanism depends on the system.

The general rule is simple: a matching phrase is not enough if the system cannot tell
which attempt produced it.

## Cleanup can fail too

Suppose the workflow recognizes the empty result and tries to exit the terminal screen.
The exit action fails, leaving the application in a state that could confuse the next run.

The original result still matters, but now there is an additional operational problem.
Do not silently replace one with the other. Record both the no-data outcome and whether
cleanup completed.

A subsequent run may need to reset or verify the application before starting. That
decision should come from evidence about the remaining state, rather than assuming
that calling an exit function guarantees a clean session.

This also makes investigation easier: an operator can distinguish a normal empty export
from a normal empty export followed by a failed recovery step.

## Avoid punishing unrelated systems

If no export exists, a working username and password should not automatically be marked
unhealthy. Doing so can turn a simple empty result into an unnecessary access problem.

The reviewed implementation specifically separated the no-data result from credential
health penalties and immediate retry or triage paths. That is a useful example of limiting
a change to the mechanism it actually concerns.

Other errors should keep their existing treatment unless evidence supports changing it.
A network failure, expired access, and an empty export may all stop a job, but they need
different follow-up actions. A single catch-all rule would erase those differences.

## Design a readable result for the operator

An illustrative message could say: "No export data was available for this request. The
session was closed successfully. No immediate retry was scheduled."

That is more useful than just displaying the internal code. It answers what happened,
what state the system is in, and what automation will do next.

If an operator needs to act, say exactly what would help: confirm the requested date,
check whether source records exist, or review the upstream system. Avoid giving a generic
"Try again" button when another immediate attempt is expected to produce the same result.

The error code remains valuable for software and support. The explanation makes that
same meaning accessible to the person waiting for the output.

## Test the policy boundary explicitly

Beyond the two workflow branches, I would test that the stored job retains the specific
code, the immediate retry path is skipped, and unrelated errors still trigger their
normal recovery behavior. I would also test a failed cleanup and stale no-data text.

These cases protect decisions rather than duplicating the implementation line by line.
They show whether the system responds correctly to the situations people actually face.
That is the value of a more precise outcome: several downstream behaviors become both
clearer to explain and easier to verify.

Skipping an immediate retry does not require skipping the next normal scheduled run.
The policy should distinguish repeating the same empty request now from checking for
newly available data at the expected future time.

## Preserve visibility

An expected empty result can remain useful in reports even when it does not page someone.
If exports unexpectedly return no data every day, that pattern deserves investigation.

Clear classification helps the system respond proportionately: record what happened,
explain it accurately, and reserve automatic recovery for situations where it can help.

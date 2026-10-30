---
title: "Why Typing Faster Did Not Fix an Automated Login"
description: "A login investigation that required checking readiness, focus, and fresh evidence."
status: draft
tags: [automation, debugging, reliability]
---

# Why Typing Faster Did Not Fix an Automated Login

An automated login was taking too long. Making it type faster seemed like a reasonable
place to start. But typing speed was only one part of a much larger timing problem.

The investigation moved through several explanations: startup windows, keyboard focus,
prompt readiness, and timeout text left over from earlier attempts.

## Sending keys is not the same as entering text

Imagine speaking before someone has joined a phone call. Speaking faster does not help
if nobody is listening yet.

A terminal application has a similar boundary. The username prompt must be ready, and
the correct input surface must have keyboard focus before typing can be useful.

The operating system can accept a key event without the intended application consuming
it in the intended place.

## A fixed wait is a guess

A delay of half a second might work on one run and fail on another. Startup time changes
with machine load, network conditions, and the application's current state.

Waiting for an observable condition is more meaningful: the expected prompt is visible
in the correct window, and the window is ready for input.

That check also needs a deadline. Waiting for evidence forever simply creates a new hang.

## Old evidence can look current

Terminal windows may retain text from earlier interactions. A screenshot containing
"Login timeout" does not automatically mean the current attempt has timed out.

The recorded investigation found that stale text could confuse the decision about
whether to continue or restart. Evidence needed to be tied to the active session and
the current prompt, rather than any matching phrase on screen.

## Test one explanation at a time

A useful investigation separates questions:

1. Did startup reach the intended window?
2. Was the actual prompt ready?
3. Did that input surface have focus?
4. Did the application advance after submission?

Typing cadence still matters. Some applications may drop input sent too quickly.
The recorded work returned to a previously reliable cadence rather than pursuing
the smallest possible delay.

## Write down the state you expect

Before a login attempt, define a small sequence of expected states. The application
starts, the connection is established, the username prompt appears, the username is
accepted, and the password prompt appears.

These are observations, not merely commands. "Clicked Connect" is an action. "The current
session shows the username prompt" is evidence of a resulting state.

For each transition, decide what would show success, what would show failure, and how
long the system should wait before investigating. This turns an ambiguous timeout
into a more precise question about which transition failed.

It also stops the automation from continuing through later actions after an earlier
assumption has already become false.

## Treat focus as a specific claim

An application can have several windows and several controls within a window. Saying
the application is foreground does not necessarily prove that the terminal input area
will receive the next characters.

The recorded investigation found that generic focus checks were too weak. Startup dialogs
and child windows complicated the handoff to the actual terminal surface.

A stronger check identifies the intended input surface and verifies that it is currently
usable. If the automation needs to click to establish focus, it should target that
surface and then check the result.

The useful principle is precision: prove the condition needed for the next action,
rather than a nearby condition that usually happens to be true.

## Freshness is part of evidence

A screenshot is a record of one moment. If an application changes between capture and
typing, the screenshot may no longer justify the action.

That matters when a prompt appears briefly, a connection closes, or a dialog takes focus.
The system needs a bounded interval between observing readiness and using that observation.
It may need to recheck the relevant state immediately before acting.

The historical investigation also questioned whether timing was tied to image capture
or to a later model response. Those times are different. A slow interpretation of an
old frame does not make the underlying frame fresh.

This is one reason visual automation needs explicit timing rules around evidence.

## Distinguish a deadline from a delay

A delay means wait a fixed amount before trying. A deadline means stop waiting after
a maximum amount of time if the required condition has not appeared.

A readiness loop can check for the prompt repeatedly until it appears or the deadline
is reached. But each individual check must also be bounded. A visual check that hangs
longer than the overall deadline defeats the purpose of the loop.

When choosing deadlines, consider what the application normally does and what recovery
is safe. Arbitrarily shrinking every timeout can break unrelated startup paths.

In the reviewed work, broad timeout hardening caused a regression and had to be narrowed
to the login-critical checks. Scope was part of correctness.

## Preserve useful differences between attempts

During debugging, record the changed variable and the observed transition for each
attempt. For example: input cadence changed; prompt was verified; the next expected
prompt did or did not appear.

Avoid changing focus handling, delays, recognition rules, and typing speed simultaneously
unless the dependencies require it. Otherwise, an improved run does not explain which
change mattered, and a worse run gives too many possible causes.

Keep sensitive input out of diagnostic output. It is usually enough to record that
an input action occurred, its duration, and the observed application state afterward.
The password itself is not necessary evidence for understanding a timing failure.

## Use bounded recovery

A clean restart can recover an application stuck in the wrong state. An unlimited
restart loop can hide a persistent defect, waste resources, and repeatedly attempt access.

Define a limited recovery path and stop when its budget is exhausted. Preserve the
failed attempt's evidence before resetting the environment, because the reset may erase
the state needed to explain the problem.

Also distinguish a new attempt from a continuation. If the application has restarted,
old window identifiers, screenshots, and readiness claims should not automatically
carry forward. The new attempt needs fresh evidence for its own state transitions.

That makes retries easier to reason about and prevents old observations from steering new actions.

## Measure the useful speed

The fastest sequence of keystrokes is not necessarily the fastest successful login.
If a lower delay drops characters and forces a restart, it increases total time.

Measure the time from a known starting state to a verified post-login state, including
failed attempts and recovery. Report the number of attempts as well as the successful
duration so the comparison does not hide retries.

For a small sample, describe what happened rather than presenting a confident performance
percentage. The goal is a reliable handoff through the login boundary. Input speed is
one parameter in that handoff, not the definition of success.

One more useful check is whether the input is accepted but interpreted incorrectly.
If the next prompt never appears, inspect safe evidence of the application's response
before increasing the number of attempts. Repeating the same action faster provides
little new information when the unresolved question is what the application did with it.
Each retry should test a reasoned hypothesis or follow an established recovery policy.

## Verify the next state

The reviewed history eventually reported passing the login boundary. That is narrower
than proving the entire workflow succeeded.

For automation, the useful milestone is an observed state change: the application
accepted the input and advanced. A log saying "keys sent" only proves that the automation
attempted an action.

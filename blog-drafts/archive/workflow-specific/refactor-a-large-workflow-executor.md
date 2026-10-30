---
title: "How I Would Break Up an 11,000-Line Workflow File"
description: "A practical refactoring approach that keeps behavior visible while moving code."
status: draft
tags: [refactoring, architecture, maintainability]
---

# How I Would Break Up an 11,000-Line Workflow File

My older Claude history includes a plan to split an 11,148-line workflow executor into
smaller modules. The surviving summary does not establish the final outcome, so this
article describes an approach rather than claiming the refactor succeeded.

A workflow executor reads a list of instructions and carries them out. Over time, it
can collect browser actions, retries, conditions, logging, and error handling in one place.

## Find responsibilities before choosing filenames

Imagine a restaurant where one person takes orders, cooks, handles payments, and cleans.
Splitting the job requires deciding who owns each responsibility and how they communicate.

Cutting a large file every thousand lines does not answer those questions.

I would map responsibilities such as:

- Reading and validating a workflow definition.
- Deciding which step runs next.
- Executing a particular action.
- Recording progress and results.
- Applying cancellation and error rules.

Some of these may deserve separate modules. The boundaries should follow behavior,
not a desired line count.

## Protect observable behavior

Before moving code, choose representative workflows and record what they should do.
Include one failure path and one cancellation path alongside successful execution.

Existing behavior is not automatically correct. Tests that capture current behavior
should be distinguished from tests expressing an agreed product rule.

If a behavior needs changing, explain that change explicitly rather than hiding it
inside a file move.

## Move one responsibility at a time

A manageable first extraction might be one action handler with clear inputs and outputs.

Keep the main execution sequence readable. Pass only the context the handler needs,
instead of handing every module a giant object that exposes the entire system.

After each extraction, run the relevant checks and inspect whether errors, cancellation,
and progress still travel through the same intended paths.

## Follow one instruction all the way through

Before drawing module boundaries, trace one representative instruction from its input
definition to its final result. Where is it validated? How are variables resolved?
Who runs the action? Who records failure? What happens after cancellation?

This trace reveals shared behavior that a quick file split can miss. For example,
moving an action handler without its error-normalization rule may change what the
caller sees even if the successful action still works.

Choose a second instruction with a different path, such as a conditional or repeated
step. Comparing the traces helps distinguish truly shared orchestration from action-specific
details. The boundary should make those differences clearer to the next reader.

## Make the existing dependencies visible

A large function often relies on values created far above it: a browser session, a
logger, mutable variables, or the current retry count. Extracting it exposes those
dependencies because they must cross a new boundary.

That is useful information. If a proposed module needs almost the entire surrounding
function, the boundary may be wrong or the current state model may need clarification first.

Do not hide the problem by passing a generic context object containing everything.
A small explicit interface shows what the module can read and change. It also makes
tests easier to understand because the required setup reflects the actual dependency.

## Separate decisions from effects

Some code decides what should happen. Other code performs an effect such as clicking
a browser element, writing a record, or sending a message.

When practical, make the decision understandable without performing the effect. For
example, a retry policy can decide whether another attempt is allowed from the error
type and attempt count. A separate component can execute that attempt.

This separation helps testing: the rule can be checked with small examples, while the
effect is tested against the relevant integration. It also reduces the temptation to
launch a full workflow just to find out whether a simple decision is correct.

Not every line needs this treatment. Apply it where it clarifies consequential behavior.

## Keep compatibility explicit

An executor may accept old workflow definitions that customers still use. A refactor
can accidentally change defaults, field interpretation, or error behavior even when
the new modules look cleaner.

List the compatibility requirements that matter. Which definitions must still load?
Which output fields do downstream services depend on? Are particular errors used to
decide whether a job should retry?

Representative fixtures can protect these contracts. A fixture is a saved input with
an expected result. Include an older supported definition, not just the newest example.

If a compatibility change is intentional, separate it from the organizational refactor
and give it its own explanation and validation.

## Use small reviewable steps

A giant patch that moves files, renames functions, changes behavior, and reformats code
is hard to review. A reviewer may struggle to distinguish an important rule change
from thousands of moved lines.

Start with one extraction that preserves behavior. Keep naming and formatting changes
limited to what makes the new boundary understandable. Then run the focused checks
before proceeding to the next responsibility.

This creates checkpoints. If a later change introduces a regression, the team has a
smaller set of differences to inspect. It also makes it easier to stop when the useful
improvement has been achieved rather than pursuing a complete architectural rewrite.

## Look for shared mutable state

Two modules can be separate files while still changing the same hidden object. That
coupling makes execution order important in ways the interfaces do not reveal.

For example, an action may update a variables map that a later condition reads. The
relationship may be intentional, but it should be clear who owns the update and when
the next stage can rely on it.

Return explicit results where that improves clarity. Where mutation is necessary, define
its scope and protect the relevant ordering. The objective is not to eliminate all
state. It is to make state changes predictable enough that another engineer can reason
about a workflow without reading every implementation detail.

## Know when to stop

Some duplication can be easier to understand than an abstraction serving unrelated
actions. Some small functions belong together because a reader needs them together.
There is no universal target number of files or lines.

Stop an extraction when it no longer makes an important change easier to locate, test,
or explain. Ask a teammate to trace a real behavior through the new structure. If they
need more navigation and more hidden assumptions than before, reconsider the boundary.

A refactor should earn its maintenance cost through clearer work. Its diagram may look
more organized, but the day-to-day experience of changing the system is the stronger measure.

## Record the result without claiming more

For a completed refactoring slice, report the responsibility moved, the behavior intended
to remain stable, the checks run, and any known gaps. If production behavior has not
been observed, keep that distinction visible.

For a first slice, choose a handler with a clear input, a meaningful result, and few
external dependencies. Use it to test the proposed interface before moving every action.
If the interface proves awkward, revising one extraction is much cheaper than unwinding
a whole-file migration built on the same mistaken boundary.

## Avoid creating a maze

Smaller files can still be hard to understand if a reader must jump through many layers
to follow one action. A useful module has a clear purpose and a clear relationship
with its neighbors.

The final test is practical: can another engineer find where a behavior lives, change
it, and predict what else the change affects?

Reducing line count may happen along the way. Reducing the effort needed to reason
about the system is the actual objective.

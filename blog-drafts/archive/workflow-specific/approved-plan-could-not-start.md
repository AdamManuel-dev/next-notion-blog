---
title: "My AI Agent Approved the Plan - and Could Not Start It"
description: "What a blocked agent run teaches about recovery, ownership, and saved state."
status: draft
tags: [agents, reliability, state-machines]
---

# My AI Agent Approved the Plan - and Could Not Start It

The plan was approved. The next task was ready. No implementation happened.

In one Pi orchestration session, the harness had quarantined the run. That meant it
blocked further work because it could not safely establish the earlier run's state.

This is a story about an unresolved recovery problem, not a completed fix.

## Approval answers only one question

Approval means someone agreed to a particular plan. Starting work requires more answers:

- Which run owns the workspace?
- Is an earlier worker still running?
- Which tasks have already completed?
- Is the execution graph the same one that was approved?

The execution graph is simply the list of tasks and the dependencies between them.
For example, a test cannot verify an implementation that has not been written yet.

## The harness lost continuity

The investigation reported that the host could no longer prove the state of an accepted
agent invocation after a restart or rehydration. It quarantined the run to avoid doing
the same work twice.

The conversation later associated this with context compaction, but the exact trigger
would need confirmation from the underlying runtime evidence.

The practical contradiction was clear: an approved plan existed, while a blocked run
still claimed ownership of the workspace.

Restarting did not reliably solve it. A replacement attempt also encountered an approved
plan with an empty task graph.

## Think of a shared workshop

A workshop needs to know who has permission to build something and who currently has
the tools checked out. Those are separate records.

If someone leaves unexpectedly, granting permission again does not return the tools.
The workshop needs a recovery procedure.

An agent harness needs the same kind of distinction. A design worth testing would save
plan identity, approval, task state, and execution ownership in durable records, then
reconcile them when it restarts.

It must check whether old work is still active before assigning it again.

## Four records that should not be confused

It helps to imagine four cards on a desk. The plan card says what should happen. The
approval card says which version was accepted. The run card records what has happened
so far. The ownership card says who is allowed to change the workspace right now.

They are related, but none can replace the others. An approved plan does not prove that
a worker is inactive. A finished worker does not prove that its result passed review.
A new process does not automatically inherit the right to continue an old run.

Saving these distinctions makes recovery possible to reason about. Without them, the
system may use a vague field such as enabled to stand in for several incompatible facts.

## Bind approval to a specific plan

Suppose someone approves a plan to update documentation. A later process loads a different
plan that also changes deployment settings. The existence of an approval somewhere in
the session is not enough to authorize the second plan.

A design can identify the exact approved plan with a content fingerprint, often called
a hash. If the relevant plan content changes, its fingerprint changes too.

That does not solve every approval problem. The system must define which content belongs
in the fingerprint and how the executable tasks relate to that content. A polished
document and an empty execution graph are still an inconsistent pair, even if the document
has an approved fingerprint.

The reviewed session exposed precisely why consistency between these records matters.

## Recovery begins with uncertainty

After a restart, an earlier worker may be running, completed, failed, or unreachable.
Unreachable is not the same as stopped.

Imagine losing a phone connection while someone is painting a room. Calling a second
painter immediately could put two people on the same job. Doing nothing forever leaves
the room in an unknown state. The useful next step is to establish what happened.

A recovery process might check the worker's durable status, inspect recorded results,
and verify whether its ownership claim remains valid. If it cannot establish a safe
answer, it should explain that uncertainty rather than silently choosing a convenient state.

This is a design approach, not a claim that the historical harness implemented it.

## Expiration alone is not enough

Ownership is sometimes represented by a lease that expires unless renewed. This helps
recover from workers that disappear, but a paused worker can wake up after its lease
has expired.

The system therefore needs a way to reject actions from an old owner after a replacement
has taken over. One approach uses increasing ownership generations: a write from generation
four is rejected once generation five owns the work.

The important idea is understandable without the machinery: an old permission slip must
not remain valid after it has been replaced. Otherwise, a recovery feature can create
the duplicate editing it was meant to prevent.

Whether this mechanism is necessary depends on the execution model and the kinds of
shared state being changed. It should be chosen deliberately, not added as ceremony.

## Make task completion durable

A worker can finish useful work and lose the connection before reporting it. The parent
may then believe nothing happened. Repeating the task could overwrite files or duplicate
an external action.

Useful task records include a stable task identifier, the input version, the attempt
identifier, the outcome, and references to the resulting artifacts. For consequential
actions, recovery may also need to inspect the actual destination.

The record should distinguish an attempt from the logical task. Three attempts can belong
to one task, and only one accepted result may be needed. That distinction helps explain
both retries and review without making them look like three separate deliverables.

## Test the restart boundary on purpose

A normal successful run does not test recovery. Deliberately interrupt a controlled
test at the difficult moments:

1. After approval but before dispatch.
2. After dispatch is accepted but before the worker replies.
3. After the worker writes an artifact but before reporting completion.
4. After a replacement run takes ownership.

For each interruption, decide what should happen and what must never happen. The system
should neither lose completed work nor accept changes from two competing owners.

Also test the user's view. If the interface says approval is required after a still-valid
approval already exists, the recovery flow is adding confusion even if its internal
locks are technically cautious.

## Explain the recovery path in ordinary language

An error code can help a developer, but an operator needs a decision. A useful message
might explain that an earlier worker's state is unknown, editing is paused, and the next
step is to check that worker before creating a replacement attempt.

It should also name the plan that remains approved and preserve any completed results.
That avoids asking someone to recreate work merely because the harness lost track of it.

The historical session ended without implementation of the intended product changes.
Keeping that outcome visible is part of the lesson: a harness can become a delivery
blocker unless recovery is treated as a normal feature with explicit tests.

## Make the blocked state useful

The user should see which fact is unknown, what work may already exist, and what action
can safely recover the run.

"Approved but blocked" can be a valid state. It becomes frustrating when the system
cannot explain or recover from it. Agent reliability includes that recovery experience,
not just the ability to generate a good plan.

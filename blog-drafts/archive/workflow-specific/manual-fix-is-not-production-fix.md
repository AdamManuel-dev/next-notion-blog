---
title: "The Manual Fix Worked. Production Still Used the Old Workflow."
description: "How to close the gap between a successful intervention and a durable product change."
status: draft
tags: [leadership, operations, delivery]
---

# The Manual Fix Worked. Production Still Used the Old Workflow.

A person can repair today's output while tomorrow's scheduled run remains unchanged.

In a long operational conversation, a manual procedure handled a set of unposted documents.
The next important question was whether the production workflow performed that same
procedure automatically. The reviewed evidence showed a gap: a corrected flow contained
later document-handling steps that a captured production definition did not.

That observation came from saved artifacts at that point in the investigation. It did
not establish the state of every later deployment. But it exposes a common delivery
problem: proving that a procedure works is different from proving that the product uses it.

## There can be several versions of done

Imagine a school printer that regularly misplaces a report. Someone finds the file
and prints it manually. The immediate request is satisfied, but the scheduled process
may still misplace the next report.

Software incidents often have the same distinction:

- The current user received the missing result.
- A repeatable workaround was documented.
- The normal workflow was changed.
- The changed workflow reached the intended environment.
- The next ordinary run used it successfully.

Each is useful progress. Reporting the first as if it proves the last leaves a hidden
gap that usually reappears at an inconvenient time.

## Follow the exact execution path

A system may hold a local workflow file, a database definition, a deployed runner,
and a dashboard that selects a particular revision. Those components can disagree.

The fact that a file named latest contains a fix does not show that the scheduler loads
it. The fact that the dashboard displays a new label does not prove the runner executes
the matching definition.

Trace the ordinary path from the user action or schedule to the actual run. Identify
which definition is loaded, which executable version interprets it, and which parameters
are supplied. The investigation needs that chain because a fix can exist in one location
without affecting the path people rely on.

## Record the identity of a run

A useful execution record identifies the workflow revision, runner version, relevant
configuration, and input set. These are the ingredients needed to explain what actually ran.

Without them, a statement such as "the fix was tested" can refer to a local revision
that never reached production, or to a workflow definition interpreted by different code.

The record does not need to expose secrets or dump the entire environment. It needs
the safe version and configuration references that distinguish one execution from another.
When two runs behave differently, those references become a practical starting point
for comparison instead of relying on memory about which deployment happened first.

## Use the workaround as evidence

A manual procedure can reveal the missing business rule. In the historical discussion,
document handling involved identifying the appropriate outputs and moving or copying
them to a location people expected.

Before automating that procedure, write down the decisions the operator makes. Which
documents qualify? What does an empty result mean? What happens when a destination
already exists? Which date determines the destination folder?

Do not automate only the visible clicks while leaving those decisions implicit. The
successful manual run is an example of the desired outcome and a source of questions
for the specification. It is not automatically a complete specification itself.

## Integrate the change where ownership belongs

A temporary script may be the fastest way to restore service. Making it permanent
requires deciding which component owns the behavior.

If the operation belongs at the end of every workflow run, placing it in a personal
utility that must be remembered manually creates an ongoing dependency on an operator.
If it belongs in a separate scheduled reconciliation process, forcing it into each
individual run may be inefficient or incorrect.

Choose the boundary according to the actual requirement, then connect it to the supported
operating path. Documentation should tell the next engineer which route is normal
and which remains an emergency workaround.

## Test the normal route, not only the helper

A helper can pass its tests while the production workflow never calls it. That is why
integration verification needs to start from the same entry point the normal system uses.

Use a controlled input and confirm that the selected workflow invokes the new behavior,
produces the expected result, and records the relevant evidence. Check an empty case
and a recoverable failure as well as the happy path when those are material to the change.

If production observation is still pending, say so. A local successful run supports
the implementation under local conditions; it does not settle whether the deployed
schedule, version selection, and permissions are all aligned.

## Beware of configuration that restores the old value

The same long conversation later described date parameters being replaced by old placeholder
defaults during merge and save paths. A correction at one point did not survive the
full trip to execution.

This is another form of the same problem. A visible edit is not enough when another
layer transforms or overwrites it later.

Trace consequential values through their whole lifecycle: initial default, user edit,
saved configuration, submission, and runtime interpretation. At each boundary, confirm
which component has authority. That avoids a cycle in which engineers repeatedly correct
the symptom while an earlier or later layer keeps recreating it.

## Close the incident and the follow-up separately

The immediate incident may be resolved once the user receives the required output.
The permanent correction remains open until its own acceptance criteria are met.

Create a bounded follow-up with an owner and a clear finish: the ordinary run uses
the verified definition and produces the intended output without the manual intervention.

That does not require turning every workaround into a major platform project. Sometimes
the right permanent change is small. Sometimes a rare manual task should remain manual,
with clear ownership and instructions. The important part is that the choice is deliberate
rather than an accidental consequence of ending the incident conversation too early.

## Make recurrence visible

If the workaround is used again, record that fact. Repeated intervention is evidence
that the permanent path is missing, ineffective, or not adopted.

Look for the reason rather than blaming the person who restored service. They may
have solved the urgent problem correctly while the team never allocated time for the
durable change.

Leadership can use this information to balance product work with operational repair.
A small recurring burden can be worth fixing because it consumes attention and creates
uncertainty, even when each individual intervention appears quick.

## Report what tomorrow will do

A strong status update answers both today's and tomorrow's questions. What result was
restored? Which normal path changed? What evidence shows the next ordinary run will
use it? What remains uncertain?

If the last question has an open answer, keep it visible. The goal is not to make every
incident report sound complete. It is to prevent the team from confusing a successful
rescue with a product that no longer needs rescuing for the same reason.

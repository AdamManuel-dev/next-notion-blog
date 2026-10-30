---
title: "Moving One File Is Not Always Finishing the Job"
description: "Track related files and verify the destination before declaring a transfer complete."
status: draft
tags: [files, automation, recovery]
---

# Moving One File Is Not Always Finishing the Job

A document-processing workflow may handle a main PDF and several attachments. Moving
the main file is only part of the job if the attachments need to travel with it.

My history includes questions about attachments left behind, followed by work on an
attachment-move step. It also includes a broader recovery plan for files whose processing
state and actual location did not agree.

## Define the package

Imagine sending a school application. The application form arrives, but its supporting
documents remain on your desk. The form moved successfully; the application package did not.

Software needs to know what counts as the complete package.

That might mean an explicit list of files. A filename pattern can help identify related
documents, but it should not be treated as proof without checking the naming rules.

## Processing and moving are separate outcomes

A portal task might finish while moving its output fails. If the system stores only one
completed flag, it becomes difficult to know which work needs repeating.

Keep enough state to distinguish:

- The document was discovered.
- The business action completed.
- The required output files were identified.
- The destination was verified.
- Source cleanup completed.

That lets recovery retry a file transfer without unnecessarily repeating the portal action.

## Plan for interruption

On a shared network drive, a move may involve several operations rather than one
indivisible action. A crash can leave both copies present or leave cleanup unfinished.

A recovery design should check the destination before removing the source. Depending
on the requirement, verification may include content hashes, which act like fingerprints
for detecting whether file contents match.

If a destination already exists with different contents, stop and report the conflict.
Blindly replacing it turns a recoverable disagreement into possible data loss.

## Create a manifest for the package

A manifest is a list of what belongs in a transfer. For a document package, it might
record the main file, each required attachment, the source location, and the expected
destination. It gives the system something concrete to verify.

Without a manifest, the meaning of complete can change while the transfer is running.
Perhaps another attachment appears midway through the operation, or a loose filename
match accidentally includes an unrelated file.

Decide when the package is considered ready and what happens if its contents change.
That rule should come from the actual business process. A manifest is useful only if
it represents the right package rather than freezing an incomplete guess.

## A filename is not a unique identity

Two folders can contain files with the same name. A file can also be replaced with new
content while retaining its name. Treating the name alone as proof of identity can
cause the wrong file to be skipped or overwritten.

Depending on the workflow, identity might include a source path, a version, a content
fingerprint, or an upstream document identifier. Each has limitations. A path can change,
and identical content can legitimately appear in two different business contexts.

Choose the identity that answers the actual question: is this the same logical input,
the same bytes, or the same location? Those are related facts, not interchangeable ones.

## Make the destination check meaningful

A file existing at the destination does not necessarily prove that the current transfer
completed. It could be an older file with the same name or a partially written artifact.

A robust design can write to a temporary destination, verify the transferred content,
and then make it available under the final name using the storage system's supported
mechanism. The exact guarantees depend on that system and should be checked before
relying on them.

Only after the destination meets the agreed requirements should source cleanup proceed.
If cleanup fails, preserve that state so the next attempt can finish cleanup without
needlessly repeating the business action that produced the output.

## Keep a state for deferred work

Some files should wait because they are too new, incomplete, or subject to a business
rule. Waiting is a valid state, but silently skipping them makes later investigation hard.

A deferred record can explain the reason, the evidence used, and when it should be
reconsidered. For example, a file may become eligible after an agreed age threshold.
The system should use the correct timestamp for that rule, not whichever timestamp
is easiest to read.

The historical remediation plan included explicit deferred handling. That is valuable
because operators can distinguish "not eligible yet" from "the system forgot this file."
The distinction also makes backlog reports more useful.

## Handle destination conflicts deliberately

Suppose the destination already contains a file with the expected name. There are at
least three possibilities: it is the verified result of an earlier attempt, it contains
different content, or the system cannot determine whether it matches.

Those cases should not all become overwrite. An identical verified result may allow
the workflow to resume at cleanup. Different content needs a conflict policy. An unknown
comparison may require another check or review.

Document the policy so an operator can predict what recovery will do. Automatically
renaming every conflict can also be problematic if downstream software expects one
canonical filename or treats every new name as new work.

## Reconcile records with actual files

A transfer log can say complete while a later storage event removes the destination.
Conversely, the files may be correctly transferred while the final status update fails.

A reconciliation process compares the system's records with the underlying resources.
It should identify disagreements without immediately making destructive assumptions.

For each mismatch, ask whether the evidence supports updating a record, retrying a
transfer, or requesting review. Preserve enough context to explain the decision afterward.

This does not require constantly scanning every file in a large system. The frequency
and scope can follow the importance of the workflow and the cost of inspection. The
principle is that recorded state should be checkable against reality.

## Report completion at the package level

A useful result might say that the main document and two attachments were verified at
the destination, while source cleanup remains pending for one attachment. That is much
more informative than "three files processed."

Counts should have a defined unit. A package with four files is one business item and
four storage items. Reporting one as the other can make a backlog look smaller or
larger than it actually is.

For operators, show the remaining action and whether it is safe to retry. For developers,
retain the relevant attempt and package identifiers. Both views should describe the
same underlying state at different levels of detail.

## Avoid repeating completed external actions

If a portal submission already succeeded, a later file-move failure should not automatically
resubmit the portal form. The retry boundary needs to align with the unfinished work.

That requires recording the successful external result with enough evidence to find
it again. If the result is uncertain, check the destination before deciding whether to
repeat the action. A careful recovery can save time while also preventing duplicates,
which is a much more important outcome than merely making the workflow run again.

## Test the awkward middle

Useful test cases include an unavailable destination, a missing attachment, an identical
destination file, and interruption after copying but before cleanup.

The history reports an attachment-step deployment. The broader remediation conversation
ended blocked by the agent harness, so it should not be presented as a completed recovery
system.

The design lesson is still clear: define completion around the whole user outcome, then
record enough detail to recover safely when only part of that outcome happens.

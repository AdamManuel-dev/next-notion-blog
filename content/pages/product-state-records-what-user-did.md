---
title: "A Status Label Is a Claim About What Happened"
id: "41833f02393955a792dc5064582c8849"
slug: "product-state-records-what-user-did"
source_url: null
description: "Design product states that distinguish user choices, external facts, and stale interface actions."
tags: ["product-design","data-modeling","reliability"]
status: "published"
source_file: "blog-drafts/product-state-records-what-user-did.md"
cover: null
---

# A Status Label Is a Claim About What Happened

**Reading paths:** Start below for the plain-language explanation, or jump to the [technical deep dive](#technical-deep-dive) for implementation details and verification.

When an application says "Applied," what does it mean? The user clicked a button, an application was submitted somewhere else, or an employer confirmed receipt?

Those are three different events. A product becomes confusing when it gives all of them the same label without deciding which event it actually knows about.

In a job-matching discussion, a proposed design gave jobs saved, applied, and archived states. The plan explicitly treated "applied" as a user-recorded fact. It did not claim that the application had submitted anything to an employer. The reviewed closeout described that design; it did not establish that the later feature was implemented.

That small distinction is a useful starting point for designing trustworthy product state.

## Begin with the sentence behind the label

Before choosing database columns, write what each state means in ordinary language. "Saved" might mean the user wants to return to this opportunity. "Archived" might mean the user wants it removed from their active list. "Applied" might mean the user reports having submitted an application elsewhere.

These definitions make disagreement visible. One teammate may think archiving deletes the item forever. Another may expect an undo button. Someone else may assume applied items should remain in the saved list.

Resolving those questions in prose is usually easier than discovering them after several screens and background jobs depend on conflicting assumptions.

A state name is a compact promise. Its definition should explain what the application knows, how it learned that fact, and what the user can reasonably do next.

## Choose one state or several independent facts

Saved, applied, and archived can be modeled as mutually exclusive states. That means an item belongs to only one of these categories at a time. This can make lists and transitions simple: moving an item to applied removes it from saved.

Another product may need independent facts. A person might want to save an opportunity and mark it applied, while separately hiding it from a particular view.

Neither model is universally correct. Trouble starts when the database assumes one model while the interface behaves as if the other were true.

Consider these questions before deciding:

- Can a user want both labels at once?
- Does changing one label intentionally clear another?
- Is the label a historical event or the item's current location?
- Must the application remember the previous value for undo or reporting?

An event such as "application reported on Tuesday" can remain in history even after the current item moves to archived. History and current state answer different questions.

## Do not confuse a user report with external proof

If someone marks a job applied, the application can truthfully say that they recorded an application. It cannot infer that an employer received it successfully.

This is similar to a package tracker. "Shipping label created" is different from "carrier received package." Both are useful facts, but substituting one for the other creates false confidence.

The data model should preserve the source of a claim when that distinction matters. A user report, an imported record, and a verified provider response should not become indistinguishable merely because they produce a similar-looking badge.

Clear copy helps too. "Mark as applied" describes an action the product actually offers. "Apply now" could imply that the button submits something. A few words can change the user's understanding of the entire feature.

## Old buttons remain part of the system

Many products place controls in emails, chat messages, or notifications. Those controls can remain visible long after the underlying record changes.

Imagine saving a job from one device and archiving it from another. Then you return to an old message containing a Save button. The button reflects an earlier moment, but the server must make a decision using current state.

The historical plan tied actions to the owner, chat, message, and record revision. A revision is simply a version number that changes when the record changes. It helps the system recognize when an action was based on an old version.

The right response to a stale action depends on the operation. Repeating "save" when the item is already saved may be harmless. Resurrecting an archived item without a clear user choice may be surprising. Define the behavior instead of guessing at runtime.

## Check ownership where the change happens

Hiding another person's button is not enough to protect their data. The server should verify that the requesting person can change the specific record before applying the transition. An identifier in a message is a reference, not proof of permission.

For a personal job list, this means checking the record's owner against the authenticated user or the trusted messaging identity. If the message itself matters, verify that relationship too rather than accepting any old message ID from the client.

These checks are ordinary correctness work. They prevent accidental cross-account changes as well as deliberate misuse. They also make it easier to reason about shared devices, forwarded messages, and old links.

## Saving data and updating a message are separate steps

Suppose the database accepts a change to applied, but the attempt to edit the chat card fails. The interface still shows Save. Did the operation succeed?

The data change succeeded, while the displayed representation is behind. Treating that as one undifferentiated failure can lead to duplicate transitions or misleading retries.

One design is to save the state change alongside a durable instruction to update its display. A later worker can retry that instruction. This pattern is often called an outbox: a stored list of external updates that still need to be delivered.

The instruction should include the relevant revision. Otherwise, a delayed update from an older change may overwrite a newer card and make the screen move backward in time. The display should converge on the current record, not on whichever request finishes last.

## Make recovery understandable to the user

Technical consistency is valuable because it supports a clearer experience. If a display update is delayed, an acknowledgment can explain that the choice was saved. Refreshing the list should show the current state even if an old message remains stale.

Undo should have similarly explicit meaning. It might restore the previous category, create a new transition, or be unavailable after some external action occurs. A generic undo button should not promise reversal of something the product cannot reverse.

For user-recorded states, preserving a small history can make support and correction easier. That does not mean keeping every detail forever. Retention should match the product's actual recovery and accountability needs.

## Test disagreements between screens

The interesting tests go beyond clicking each button once. Try opening two views of the same record, changing it in one view, and acting from the other. Try retrying the same request. Try changing the state while a previous message edit is still pending.

Ask whether the final result matches a clear rule and whether the visible explanation is honest. A test that checks only the final database value can miss confusing feedback that encourages the person to repeat the action.

Also test list boundaries. If an item moves out of a paginated saved list, the next page should not silently skip or duplicate items because the collection changed underneath it. The navigation policy may be simple, but it should be deliberate.

## State design is product design

A few labels can carry decisions about ownership, evidence, history, retries, and user expectations. Treating them as colored badges postpones those decisions; it does not remove them.

Good state design starts with a true sentence about what happened. The database, API, buttons, and recovery behavior can then express the same meaning. That agreement is what makes a product feel dependable even when people use it from different places and the network does not cooperate.

## Technical deep dive

**Plain-language bridge:** A click requests a change to a record. It should not replace newer information just because an old screen still contains the button.

### Diagram: Reject stale writes and catch the display up

```text
[old button: expected revision 8]
                 |
                 v
       [authorize + compare revision]
                  /             \
                 v               v
      current revision 8    current revision 9
                 |               |
                 v               v
    [commit state + outbox] [stale: reload/explain]
                 |
                 v
    [update external display in order]
```

This is an illustrative optimistic-concurrency path. The stored state can be correct while a chat card is behind; display recovery must not replay an obsolete state.

### Make transitions explicit

An illustrative transition accepts actor identity, item ID, desired state, expected revision, and a request ID. Validate ownership and the allowed transition before writing. Use a conditional update so the decision is tied to the version the caller observed.

```text
UPDATE item
SET state = desired_state, revision = revision + 1
WHERE id = item_id
  AND owner_id = authenticated_owner
  AND revision = expected_revision
```

This is pseudocode with named values, not directly executable SQL. The affected-row count distinguishes a successful transition from an absent, unauthorized, or stale target. Decide how much of that distinction may be disclosed publicly.

A revision protects against lost updates. It does not identify a repeated request. A stored request ID, scoped to the owner and operation, can return the prior outcome when the same request is delivered twice.

### Preserve the source of the state claim

Store "user marked applied" as an event or attributable fact, rather than inventing an external submission acknowledgment. If a later integration supplies confirmation, record that separately with its source and time.

A current state can be a projection of those facts, but the product must define which facts affect the projection. Archiving an item should not erase a historical application report unless that is an explicit data-retention choice.

### Keep external displays revision-aware

Commit the transition and a display-update outbox entry together. The sender then needs an ordering policy for each external message. Merely putting a revision in the outbox does not stop two concurrent HTTP edits from arriving out of order.

One approach serializes sends per message and renders the latest current state when processing pending updates. After a timeout, reconcile or resend current state according to the provider's capabilities. Retrying an old captured payload can move the display backward even though the database is correct.

### Exercise the conflict matrix

Test two different requested transitions from the same revision, a duplicate request ID, and an old button after a successful newer transition. Include a database commit followed by failed message editing, then a later state change before the retry.

Assert current state, history, request outcome, and final displayed revision separately. This exposes bugs that a single assertion on the state column would miss.

These contracts illustrate the later product-state plan. They should be understood as proposed implementation and verification detail, not additional historical evidence that the feature shipped.

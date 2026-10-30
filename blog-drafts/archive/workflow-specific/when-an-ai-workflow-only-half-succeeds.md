---
title: "When an AI Workflow Only Half Succeeds"
description: "How to make incomplete automation understandable and recoverable."
status: draft
tags: [ai, automation, reliability]
---

# When an AI Workflow Only Half Succeeds

An automated workflow can finish several useful steps and still fail to deliver the
result someone needs. A single green or red badge cannot explain that situation well.

My work investigating automation logs, recordings, and exports has made this a useful
design question: what should the system say when only part of the job is complete?

## Imagine a three-step job

Consider an illustrative workflow that:

1. Finds a document.
2. Reads the important details.
3. Exports a report.

Suppose it finds the document and reads most of it, but cannot verify one required field.

Calling the entire job "successful" hides the missing information. Calling it only
"failed" hides the useful work that is already available.

A more helpful result says what happened:

> The document was found. Most details were extracted. The account number needs review,
> so the final report has not been exported.

Someone can now understand the result and decide what to do next.

## Separate progress from completion

Track the steps individually, then decide whether the overall goal was met.

| Step | State | Meaning |
| --- | --- | --- |
| Find document | Complete | The source is available. |
| Read details | Needs review | A required value is uncertain. |
| Export report | Not started | It is waiting for verified details. |

"Needs review" should name an action. "Check the account number against page two" is
more useful than "Something might be wrong."

## Keep enough evidence to recover

A result is easier to review when it includes the source, the uncertain value, and a
short explanation of the problem.

Logs can record which steps ran. A recording can help explain what appeared on screen.
Saved intermediate results can prevent someone from repeating work unnecessarily.

Those records should contain only what the workflow needs for diagnosis and recovery.
More logging is not automatically more useful, especially when documents contain
private information.

## Make retries safe

Retrying a search is different from retrying an action that sends a message or creates
a record. Repeating the second kind of action may create duplicates.

Before a retry, the system needs to answer:

- Did the earlier attempt complete the action?
- Can the destination confirm the result?
- Can this attempt use the same unique request identifier to prevent duplication?
- Has the source changed since the saved progress was recorded?

If completion is uncertain, checking the destination may be safer than repeating the action.

## Define required and optional outputs

A workflow can produce several useful artifacts without meeting its main goal. Suppose
it reads a document, creates a summary, and prepares an export. If the user asked for
a verified export, the summary alone does not make the task complete.

Before execution, define which outputs are required, which are optional, and which
conditions must hold for each. That gives the system a basis for distinguishing complete,
partial, and blocked results.

Optional work should not accidentally prevent delivery of a valid required result.
Likewise, a useful optional result should not hide failure of the required one. These
are product decisions that need to be visible in the workflow's success criteria.

## Use states that lead to actions

A state label earns its place when it changes what someone or something should do next.
Complete means the required result is available. Retryable failure means a bounded
new attempt may help. Needs review means a person has a specific uncertainty to resolve.

Avoid creating many labels that all mean "something went wrong." The operator should
be able to tell whether to wait, correct an input, inspect evidence, or recover a service.

Also separate waiting for an external dependency from actively processing. A job can
be alive without doing useful work, and calling both states running can obscure a
long queue or a missing response.

## Make partial results explicit artifacts

A partly completed extraction should identify which fields are verified, uncertain,
or missing. The next step should not have to infer that information from a paragraph
in a log.

For an illustrative invoice workflow, the amount might be verified while the account
identifier needs review. Store those distinctions with the source reference and the
reason for uncertainty.

Do not fill an uncertain field with a plausible value merely to satisfy a required
schema. The downstream export may treat any present value as trustworthy. The data
format needs a supported way to represent uncertainty if the workflow is expected
to encounter it.

## Give a reviewer enough context to decide

"Please review" creates work without defining it. A useful review item shows the disputed
value, the relevant source excerpt or page, the expected rule, and the consequence
of accepting or changing the value.

Keep the scope small enough for a person to resolve. If the system asks someone to
recheck the whole document every time, the automation may be transferring most of the
work rather than reducing it.

Record the review result and who or what supplied it according to the application's
requirements. That allows later steps to distinguish a model guess from a value that
received the intended verification. It also helps explain a later correction.

## Save checkpoints at meaningful boundaries

A checkpoint records enough progress to resume without repeating everything. Useful
boundaries often occur after a verified input, a completed external action, or a generated
artifact that can be reused.

Saving every tiny interaction can create noisy state without improving recovery. Saving
only the final result can lose all useful work after one late failure.

Choose checkpoints based on what is expensive or risky to repeat. Include the input
version and the relevant dependencies. A saved extraction from an older document may
not be valid after the source changes, even if the workflow step itself completed successfully
at the time.

## Decide what changes invalidate earlier work

Suppose a reviewer corrects the account identifier after a report was prepared. The
report now depends on an old value and may need to be regenerated. The original document
download may still be reusable.

Represent those dependencies clearly enough that recovery repeats the affected steps
without blindly restarting the entire workflow. This is especially useful when some
steps call expensive services or change external systems.

The dependency map does not need to be elaborate for a small workflow. Even a documented
sequence of inputs and outputs can clarify which results remain valid. The important
part is that a successful earlier step is not assumed valid forever regardless of later changes.

## Separate retrying computation from repeating an effect

Recalculating a summary from a saved document usually has different consequences from
submitting that summary to another system. The second action may create a record or
send a message that cannot simply be undone.

If the connection drops after submission, the result may be uncertain rather than
failed. Check whether the destination accepted the request before submitting again.
Where supported, use a destination-enforced identifier for the logical operation.

A workflow-wide retry button should understand these boundaries. Otherwise, a convenient
recovery action may create duplicates while attempting to repair a later, unrelated
step such as downloading a receipt.

## Give retries a budget and a reason

Retrying a temporary service failure may be sensible. Retrying an invalid input without
changing it usually is not. The system should classify the failure and apply a limited
policy rather than retry every non-success in the same way.

Record the attempt count and the latest useful error. If the retry budget is exhausted,
stop with a clear explanation and preserve the work already completed.

Also consider whether the outside world changed during the wait. A document may have
been replaced or a deadline may have passed. Resuming safely can require revalidating
the assumptions that were true when the workflow began.

## Measure outcomes and recovery separately

A dashboard can report complete requests, partial requests, review backlog, and time
spent waiting for resolution. Those numbers answer different questions and should not
be blended into a single unexplained success score.

For example, a high extraction completion rate may coexist with a growing review backlog.
That means the first part of the system is productive while the overall user outcome
remains delayed.

Measure the cost of recovery too: how often people intervene, how long it takes, and
which causes repeat. These observations can identify whether the next improvement
belongs in the model, the input process, the integration, or the review interface.

## Write the result for the person waiting

A useful final message identifies the delivered result, the missing requirement, and
the next action. It should not force the user to interpret internal step numbers or
search logs to discover whether anything usable exists.

An illustrative result might say: "The document and extracted amounts are ready. The
account identifier requires confirmation before export. Review the highlighted value
on page two to continue."

That message gives partial work a clear value without overstating completion. It also
makes the handoff specific enough that the workflow can resume from a known point
after the uncertainty is resolved.

## Design the recovery path with the main path

For each step, I would define what counts as complete, what evidence is saved, and
what happens if the step cannot finish.

A workflow becomes easier to trust when a person can answer three questions quickly:
What is done? What remains uncertain? What should happen next?

That is the experience I would aim for before calling an automation ready to use.

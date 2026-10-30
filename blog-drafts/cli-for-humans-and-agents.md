---
title: "Designing a Command-Line Tool an AI Can Actually Use"
description: "Make automation predictable with clear inputs, structured output, and visible outcomes."
status: draft
tags: [cli, agents, developer-tools]
---

# Designing a Command-Line Tool an AI Can Actually Use

**Reading paths:** Start below for the plain-language explanation, or jump to the
[technical deep dive](#technical-deep-dive) for implementation details and verification.

A command-line interface, or CLI, lets someone operate software by typing commands.
It can also give an AI agent a controlled way to perform useful work.

My Claude history includes work on non-interactive workflow commands and JSON output.
The surviving index establishes that topic, but not a complete implementation record.
The design below describes the principles I would apply.

## Remove surprise questions

An interactive menu can be comfortable for a person. An automated process may stop
indefinitely at "Choose an option" or "Press Enter to continue."

An automation-friendly command should accept its required inputs directly. If something
is missing, it should return a clear error that names the missing input.

Sensitive values should come through a suitable protected mechanism, not be printed
in command examples or diagnostic output.

## Separate readable output from structured output

People appreciate short explanations. Programs benefit from a stable structure.

A hypothetical response could look like this:

```json
{
  "status": "queued",
  "jobId": "example-job-42",
  "message": "The job is waiting for a worker."
}
```

The structure makes it clear that the request was accepted but the job has not finished.
That distinction prevents an agent from reporting success too early.

## Make failure understandable

Useful failures include a stable error code, a readable explanation, and whether retrying
is appropriate. The command should also use a nonzero exit status when it fails.

Diagnostic logs should stay separate from machine-readable results. Otherwise, a harmless
log line can make the structured response impossible to parse.

## Give long jobs a follow-up path

Starting a workflow and waiting for it are different operations. Return a job identifier,
then provide a way to check that specific job's state.

If a request is retried after a connection drops, a request identifier can help prevent
duplicate work. The server must actually enforce that behavior; adding a field alone
does not provide the guarantee.

## Treat the output as a contract

A person can often infer meaning from a sentence that changes slightly. A program may
depend on an exact field name or value. If yesterday's response used queued and today's
uses pending with no notice, the caller may make the wrong decision.

Define the structured response deliberately. Keep field meanings stable, and introduce
an explicit version when a breaking change is necessary. Document which fields are
required, which can be missing, and which values indicate that follow-up work is needed.

A structured output mode should also avoid decorative text before or after the result.
A friendly banner becomes a parsing error when the caller expects only one JSON object.

## Give examples of failure as well as success

Documentation often shows only the happy path. An agent operating a real system needs
to understand rejected requests, unavailable services, missing records, and jobs that
finish only partially.

A hypothetical error might contain a stable code, a readable explanation, and a retryable
flag. That flag should come from a defined policy, not a guess that every failure will
eventually resolve itself.

For example, an invalid date should be corrected before retrying. A temporary service
outage may justify a delayed retry. Missing permission requires a different action.
Examples for those cases help callers choose sensibly without scraping human prose
for words such as error or failed.

## Distinguish acceptance from completion

A command that submits work may exit successfully because the server accepted the request.
That does not mean the work is finished.

State this plainly in both output and documentation. Return a stable job identifier
and a command for checking it. A separate wait operation can wait until the job reaches
a final state, with a bounded timeout and an explanation if it is still running.

If the wait times out, the job may continue. The caller should not assume that leaving
the command also cancelled the underlying work. Cancellation needs its own defined
behavior and confirmation.

These distinctions prevent an agent from announcing a completed task when it has only
successfully placed the task in a queue.

## Make repeated requests predictable

Network failures create ambiguity. The server may have accepted a request even though
the caller never received the reply. Retrying blindly can create a duplicate job.

One approach lets the caller supply a unique request identifier and ask about that
same logical request again. The destination must enforce the uniqueness and return
the earlier result when appropriate.

The identifier also needs a defined scope and lifetime. Reusing it accidentally for
different inputs should produce a clear conflict rather than silently running the wrong
request. These details matter because a retry feature is a correctness mechanism,
not just a convenient flag on a command.

## Make the target visible

A command may operate on a local test system, a staging system, or production. It may
also use one of several organizations or accounts.

The response should identify the selected target in a safe, understandable way. Missing
or ambiguous context should fail clearly for consequential operations rather than
silently selecting an unexpected destination.

For a read command, this helps explain why the result differs from what the user sees
elsewhere. For a write command, it helps prevent acting in the wrong place.

Do not confuse this with printing sensitive configuration. Target identity can be visible
without exposing access tokens, private keys, or other secrets.

## Offer previews where they can be truthful

A preview or dry-run mode can show the intended scope before a change. For example,
it might list which jobs match a filter without cancelling them.

But a preview is only as accurate as its contract. If the system changes between preview
and execution, the final set may differ. The command should explain whether it acts
on the exact previewed set or reruns the filter at execution time.

For consequential operations, an explicit set of identifiers or a verified revision
can make the action more predictable. The important point is to avoid presenting a
best-effort estimate as an exact promise about a later mutation.

## Design for partial output and interruption

Large listings may need pages or streaming output. Define how a caller knows that the
result is complete and how it resumes without accidentally skipping or duplicating items.

If the process is interrupted, leave a clear distinction between the data already emitted
and the overall operation's final status. A few printed rows should not imply that
the full query succeeded.

Test commands with closed input, redirected output, a cancelled wait, and a disconnected
service. These are ordinary automation conditions. A tool that handles them predictably
is easier to combine with scripts, scheduled jobs, and agents because its behavior does
not depend on someone watching the terminal at exactly the right moment.

For listings, document the default ordering and page limit. A caller that receives
the first 100 jobs should be able to tell that more exist. Otherwise, an agent may
mistake a partial inventory for the complete system and make a decision from missing data.

## Test without a person at the keyboard

Run the commands in a non-interactive environment. Check missing inputs, rejected access,
timeouts, and repeated requests as well as the happy path.

A good automation interface lets its caller answer: what did I request, what happened,
and what should I do next? Those same qualities make the tool easier for people to use.

## Technical deep dive

**Plain-language bridge:** An automated caller needs a protocol it can interpret
without guessing what a sentence means or answering an unexpected prompt.

### Diagram: Keep acceptance separate from completion

~~~text
[caller] ---- command ----> [CLI]
                              |
                 +------------+------------+
                 |                         |
                 v                         v
          stdout: JSON              stderr: diagnostics
                 |
                 v
     [accepted + job ID + nonterminal]
                 |
                 v
     [caller checks status by job ID]
                 |
                 v
       [pending OR terminal outcome]
~~~

This shows an illustrative asynchronous command. A successful submission response
means accepted work; completion must be established through the documented status path.


### Define a machine-facing envelope

An illustrative response has stable fields for schema version, operation, acceptance,
terminal status, and structured errors:

~~~json
{
  "schemaVersion": 1,
  "operation": "export",
  "accepted": true,
  "terminal": false,
  "jobId": "example-job",
  "error": null
}
~~~

This response says the request was accepted, not that the export finished. A follow-up
status operation should use the same job identity and report a terminal result or
continued progress. Specify exit-code meaning for each command: successful submission
and successful completed work are different contracts.

Reserve standard output for the selected machine format and standard error for diagnostics.
If streaming is supported, define a record-framing format such as one JSON value per
line and a terminal record. A parser must be able to detect truncated output rather
than mistaking the last progress event for completion.

### Make retries depend on intent

For a mutating request, accept a request key scoped to the principal, target, and operation.
Persist the key with a digest of the meaningful request payload and its outcome.
Reusing a key with a different payload should be a conflict, not an accidental replay
of an unrelated operation.

Idempotency means repeated requests produce the intended single logical effect.
It does not follow merely from returning the same JSON. The actual side effect must
be deduplicated or reconciled at the boundary where it occurs.

### Design noninteractive failure behavior

When required information is absent, return a structured validation failure promptly.
Do not switch to a prompt based solely on a convenient default when the caller has
requested machine operation.

Resolve the target explicitly and include its nonsecret identity in the response.
A preview should identify its assumptions and limitations: a read-only preview cannot
guarantee a later write succeeds under changed state. If needed, use a revision or
plan token to detect drift before applying the action.

### Test the protocol as a consumer

Run the command with closed standard input, captured streams, malformed arguments,
and an interrupted connection. Parse the output with an independent consumer and verify
documented exit behavior. Test unknown fields for forward compatibility and missing
required fields for safe rejection.

For long operations, interrupt the client after acceptance and confirm the job remains
discoverable by its ID. Client termination should not leave the caller guessing whether
work was accepted. These are proposed protocol tests; the Claude index supports the
topic but does not supply a complete delivery record.

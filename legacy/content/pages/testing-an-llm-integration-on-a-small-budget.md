---
title: "Testing an LLM Integration on a $10 Budget"
id: "d6046f2a9ddd92a6e35fc39888d968c3"
slug: "testing-an-llm-integration-on-a-small-budget"
source_url: null
description: "A small experiment for learning whether an AI feature is useful."
tags: ["ai","testing","product-development"]
status: "published"
source_file: "blog-drafts/testing-an-llm-integration-on-a-small-budget.md"
cover: null
---

# Testing an LLM Integration on a $10 Budget

**Reading paths:** Start below for the plain-language explanation, or jump to the [technical deep dive](#technical-deep-dive) for implementation details and verification.

A small testing budget forces a useful question: what do I need to learn before I spend more money on this feature?

I explored that question while planning LLM validation for an apartment locator project. The approach below is an experiment plan, not a claim that a particular model passed it.

## Give the model one clear job

Imagine a feature that turns an apartment request into structured search details.

The user writes:

> I need a two-bedroom apartment under $1,800. I have a cat, and my move date is flexible.

The expected result is:

| Field | Expected value |
| --- | --- |
| Bedrooms | 2 |
| Maximum monthly rent | 1800 |
| Pet | Cat |
| Move date | Unknown or flexible |

The model should preserve the information it has and leave missing details unknown. Inventing a move date would make the output look complete while making it less useful.

## Write the answers before running the test

Create a small set of fictional requests and write down the expected details yourself. This becomes the answer sheet used to judge the model.

Include different kinds of inputs:

- A clear request with every required detail.
- A request with missing information.
- A request with spelling mistakes.
- A request that changes its mind halfway through.
- A message that is unrelated to apartment hunting.

Decide how each should be handled. A contradictory request may need a clarification instead of a guessed answer.

## Divide the budget before experimenting

One possible allocation is:

| Purpose | Maximum spend |
| --- | --- |
| Check that the connection and response format work | $1 |
| Run the initial examples | $3 |
| Try one targeted improvement | $3 |
| Retest failures and run fresh examples | $3 |

These are spending limits, not price estimates. The number of requests depends on the chosen model, current pricing, and the size of the inputs and outputs.

Track usage as you go. Use available account limits and a local stopping rule so a loop or repeated failure does not quietly consume the budget.

## Measure errors that affect the product

A response can have the correct format and still contain the wrong rent amount.

For each example, record whether the output can be read by the application, whether the values are correct, and whether the model invented missing information.

Also record cost and response time. A result that takes too long may still make the feature frustrating to use.

## Separate connection checks from quality checks

Before judging the model's answers, confirm that the application can send a request, receive a response, and handle it in the expected format. Use a tiny harmless example so an infrastructure mistake does not consume the evaluation budget.

That smoke test answers whether the connection works. It does not answer whether the feature interprets apartment requests correctly.

Keep those results separate in the report. "The API returned a valid response" and "The extracted rent matched the expected value" are different checks. A working connection can still deliver wrong information, while a good prompt can be hidden behind broken authentication, parsing, or request configuration.

This separation makes failures easier to assign to the right layer before changing the prompt.

## Give unknown a proper place in the output

If a user does not mention a move date, the system needs a supported way to represent that absence. Otherwise, the model may fill the gap with a plausible date because the format appears to require one.

Define which fields are required from the user and which can remain unknown. Also distinguish unknown from flexible, when the product treats those differently. A person who says "any time in June" provided useful information; a person who says nothing about timing did not.

The application should preserve those differences instead of forcing every request into a falsely complete record. Missing information can lead to a clarification question rather than a fabricated search constraint.

## Handle contradictions explicitly

Consider this fictional request: "My limit is $1,800, but don't show anything above $1,600." There are at least two possible interpretations: the user revised the limit, or they have a preferred limit and a higher absolute maximum.

Decide what the feature should do before scoring the model. It might preserve both values with their meanings, or ask a short clarification. A single-field output may not be expressive enough to represent the request faithfully.

This is a product-design issue as much as a prompting issue. If the expected schema cannot express a common user intention, repeatedly changing the prompt may only make the model choose among several imperfect answers more confidently.

## Score fields and whole requests

A request can contain four correct fields and one critical mistake. Counting only correct fields may make the result look strong even though the user receives unsuitable recommendations because the rent limit is wrong.

Record field-level accuracy to diagnose errors, and request-level acceptability to judge whether the output is usable. Define which mistakes make a request unacceptable.

For example, a spelling variation in a neighborhood label may be recoverable, while inventing an extra $500 of budget may change the result substantially. The exact priorities should come from the product, not from whichever measure produces the highest score.

Preserve the failed examples so improvements can be compared against the same expected behavior.

## Keep a few examples out of the editing loop

If every example is used to revise the prompt, the prompt may become good at those examples without improving generally. Keep a small set of fresh cases for checking the revised version after editing.

The fresh cases should test the same kinds of behavior with different wording and combinations. They should not all be easy requests while the editing set contains the difficult ones.

With a small budget, this will still be a limited sample. State that limitation. The purpose is to catch obvious overfitting and regressions, not to claim a precise population-wide accuracy rate from a handful of messages.

## Compare with a simpler baseline

Some fields may be easy to extract with ordinary application logic. A clearly labeled bedroom count or a structured intake form may not require a model at all.

Compare the AI approach with the simplest plausible alternative for the task. A form may be less flexible but easier to validate. A hybrid design may use the model to interpret free text, then require the user to confirm important constraints.

This comparison helps answer whether the model is adding useful capability rather than merely being capable of the task. The best outcome of an experiment can be deciding that a narrower AI role produces a clearer, cheaper, and more dependable feature.

## Make the budget limit operational

A spreadsheet allocation will not stop a loop from issuing more requests. Use available account controls and an application-side cap appropriate to the experiment. Check what those controls actually enforce before relying on them.

Track the number of requests, input and output usage, and reported cost where available. Limit automatic retries and response size. A failing request repeated indefinitely can spend the budget without producing additional evidence.

Do not include private customer messages when fictional examples will answer the question. The early experiment is about the feature's behavior, so synthetic inputs can often provide a cleaner answer sheet and simpler handling of the test data.

## Record the version that produced each answer

Save the prompt version, model identifier, important settings, input, output, and score for each run. Without that record, an apparent improvement may come from an accidental configuration change rather than the intended edit.

You do not need a complex platform for a small experiment. A simple structured record with stable example identifiers can be enough. The important part is that someone can reconstruct which conditions produced the result.

When a response is rejected by the application, preserve the safe diagnostic reason. A parsing failure, missing field, and semantically wrong value should not all collapse into the same generic failed label.

## Inspect confident-looking mistakes

Models can produce tidy, convincing output even when they misunderstand the request. That makes manual inspection of a small sample valuable, especially for invented facts and subtle changes in meaning.

Do not use a model's stated confidence as the only acceptance rule. Test whether the output actually matches the input and the agreed interpretation. If a confidence score is used, its relationship to observed correctness needs its own evaluation.

A useful review asks, "Could the user recognize their request in this structured result?" For important constraints, a confirmation screen may let the user correct the interpretation before the application acts on it.

## Decide the next investment from the failure pattern

If most failures come from one missing instruction, a targeted prompt revision is sensible. If the output schema cannot express common requests, redesign the schema. If the model cannot reliably handle a critical distinction, narrow the feature or add review.

Write the conclusion as a decision supported by examples. "Proceed to a larger evaluation focused on contradictory budgets" is more useful than "The model seems pretty good." The small budget should buy a clearer next step, even when it does not buy a ready-to-ship feature.

## Change one thing and test again

If the model invents move dates, improve that instruction first. Keep the other settings stable so you can tell whether the change helped.

Then rerun the failed cases and a few examples the revised prompt has not seen.

A small test cannot establish production reliability. It can reveal a repeated failure, identify a useful next experiment, or show that the feature deserves a larger evaluation.

That is a worthwhile result for a $10 experiment.

## Technical deep dive

**Plain-language bridge:** A small budget works best when every model call answers a defined question and the system can stop spending before it crosses the limit.

### Diagram: Reserve spending before running the experiment

```text
[case + expected answer]
           |
           v
[spent + reservations + next bound <= budget?]
                  /                 \
                 v                   v
                yes                  no
                 |                   |
                 v                   v
          [reserve cost]           [stop]
                 |
                 v
            [model call]
                 |
                 v
      [score + reconcile usage]
                 |
                 v
       [choose next useful test]
```

This admission check is only a hard spending guarantee when the reservation is a reliable upper bound. Otherwise it is a budget estimate with explicit limits.

### Build an evaluation record

For each case, preserve input, expected fields, acceptable unknowns, scenario category, and whether it belongs to development or holdout. For each run, record the model identifier, prompt version, schema version, parameters, latency, usage, and parsed result.

```json
{
  "caseId": "pet-and-budget-01",
  "expected": {
    "bedrooms": 2,
    "maxRent": 1800,
    "pet": "cat",
    "moveDate": null
  },
  "criticalFields": ["maxRent"],
  "split": "holdout"
}
```

This is an illustrative local evaluation format, not a provider API schema. A null date here means the example does not establish one; it must not silently become today's date in a later normalization step.

### Score structure and meaning separately

First check whether the response parses and matches the required shape. Then check semantic correctness against the expected fields. A well-formed number can still be the wrong budget.

Report field accuracy, whole-request correctness, and critical-error count separately. A system that gets easy fields right can have high field accuracy while often failing the complete task. Include abstentions and unsupported assertions so "unknown" is not rewarded indiscriminately or penalized when it is the correct answer.

Compare with a simple baseline such as explicit structured filters or a deterministic parser for supported patterns. The question is whether model use improves the relevant task enough to justify its cost and failure modes.

### Reserve cost before dispatch

With concurrent calls, checking the spent total alone can overshoot the budget. Reserve an upper-bound allowance for each admitted call, then reconcile against reported usage when it completes.

```text
admit only if spent + outstanding_reservations + next_bound <= budget
reserve next_bound atomically
on completion: release reservation and record actual billed estimate
```

A true hard monetary cap requires a reliable upper bound covering the provider's charging model, retries, and any tool costs, or a provider-side limit with appropriate semantics. If that bound is unavailable, describe the local cap as an estimate rather than a guarantee. The article's $10 allocation is an experiment budget, not a pricing quote.

### Use failures to choose the next call

After the initial batch, categorize errors: schema, extraction, contradiction handling, unsupported inference, or unavailable integration. Choose one targeted change, rerun affected development cases, then inspect untouched cases.

Keep failed attempts in the ledger. Excluding failures from cost and latency reporting can make an unreliable integration look artificially efficient. The final decision should state what the experiment learned and which uncertainty remains worth buying down.

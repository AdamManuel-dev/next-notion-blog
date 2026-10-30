---
title: "The Same AI Can Write the Code, the Tests, and the Same Mistake Three Times"
id: "698d98b33862168673076ced7c1c5b93"
slug: "when-ai-code-and-tests-share-a-mistake"
source_url: null
description: "Why passing tests still need an independent definition of correct behavior."
tags: ["ai","testing","code-review"]
status: "published"
source_file: "blog-drafts/when-ai-code-and-tests-share-a-mistake.md"
cover: null
---

# The Same AI Can Write the Code, the Tests, and the Same Mistake Three Times

**Reading paths:** Start below for the plain-language explanation, or jump to the [technical deep dive](#technical-deep-dive) for implementation details and verification.

Code, tests, and a review can all agree with one another and still be wrong.

The risk is that they all started with the same incorrect assumption. This is especially easy to miss when an AI writes an implementation and then uses that implementation to decide what the tests should expect.

## A tiny example

Suppose an appointment ends at 10:00. Can another appointment start at exactly 10:00?

For our example, the agreed product rule says yes. No cleanup time is required.

These appointments should therefore be allowed:

| Appointment | Start | End |
| --- | --- | --- |
| First | 9:30 | 10:00 |
| Second | 10:00 | 10:30 |

They touch at the boundary, but they do not occupy any time together.

## How the mistake spreads

An implementation might mistakenly count touching boundaries as an overlap.

Then a test generated from that code might expect the second appointment to be rejected. The test passes because it agrees with the mistake.

A review that only checks whether the test matches the code may also approve it.

There are now three matching outputs, but only one underlying assumption. Their agreement does not provide three independent reasons to trust the behavior.

This is an illustrative failure mode, not a report of a measured incident in my project.

## Write the expected behavior independently

Before asking for code, write examples in ordinary language:

- A booking ending at 10:00 allows another to start at 10:00.
- A booking ending at 10:01 blocks another starting at 10:00.
- Two bookings covering exactly the same time conflict.
- One booking entirely inside another also conflicts.

Those examples come from the product rule. The implementation must satisfy them.

For this rule, two intervals overlap when each starts before the other one ends. Using "before" instead of "before or at" is what allows appointments to touch.

## Give the reviewer a different job

Instead of asking only, "Does this code look correct?", ask the reviewer to compare the behavior with the agreed examples and look for a case that breaks the rule.

A useful review request is:

> Check the implementation against these requirements. Find an input for which the result would violate them. Explain the expected result before proposing a fix.

Using a different model or a fresh conversation may bring another perspective, but it does not guarantee independent reasoning. The reviewer still needs a reliable reference.

## Independence comes from the reference, not the headcount

Three agents can repeat the same assumption if all three read the same implementation and use it as their definition of correctness. Their agreement may feel reassuring without adding much independent evidence.

A stronger setup gives the reviewer an external reference: an agreed requirement, a manually calculated example, a documented protocol, or an observed user outcome.

The reviewer can still inspect the code, but its task is to compare that code with the reference rather than explain why the code is internally consistent.

This applies to people too. A human review that only checks style and whether tests pass can miss the same wrong product assumption. The question is where the expected behavior came from, not merely who produced the check.

## Write an example before exposing the implementation

For a small rule, ask someone to describe the expected result using only the requirement. In the appointment example, give them the two time intervals and ask whether they conflict.

Then compare that answer with the implementation and its tests. A disagreement becomes a focused question: is the requirement ambiguous, is the expected result wrong, or is the code wrong?

The goal is not to hide useful context forever. It is to prevent the current implementation from quietly deciding the answer before anyone has considered the product rule.

Once the expectation is agreed, record why it is correct. That explanation helps future maintainers distinguish an intentional boundary from a test value chosen by accident.

## Use boundary examples because they expose assumptions

Many incorrect implementations work for ordinary inputs. The difference appears at the edge: exactly at 10:00, an empty list, the largest allowed duration, or a missing optional value.

For the overlap rule, compare appointments separated by a minute, touching exactly, and overlapping by a minute. Those three cases reveal whether the comparison operator matches the agreed meaning.

Do not generate dozens of random-looking tests merely to increase the count. Choose examples that distinguish plausible wrong implementations from the correct rule.

A good boundary test has an explanation: if this case fails, a specific assumption about the product is likely wrong. That makes the failure informative during a future change.

## Look for properties as well as examples

A property is a rule that should hold across many inputs. For an overlap function, swapping the two appointments should not change the result. If A conflicts with B, B should conflict with A.

That property can catch certain implementation mistakes without requiring a hand-written answer for every possible pair. Other properties depend on the exact product design and must be chosen carefully.

For example, adding working hours does not necessarily preserve every offered start time in a window-anchored scheduler. Assuming that it must would encode the wrong property.

Properties are powerful because they test relationships, but they still need a justified source. A mathematically tidy assumption can be the wrong business rule.

## Distinguish testing the result from testing the method

A fragile test may assert that an internal helper was called with a particular argument without checking the user-visible result. The implementation can satisfy that test while producing the wrong outcome elsewhere.

For important rules, prefer checks that observe the relevant behavior: whether the booking is accepted, whether the saved state is correct, and whether an invalid request leaves the system unchanged.

Internal interaction checks can still be useful where the interaction itself is the contract. The point is to choose them deliberately. Tests should not merely mirror the implementation's structure so closely that any shared mistake becomes invisible.

## Test the negative path without breaking everything

A test that proves one invalid request is rejected does not prove all valid requests still work. A prompt or code change can become overly restrictive and pass the negative case by refusing too much.

Pair important rejection cases with nearby valid cases. In the appointment example, reject a one-minute overlap and accept an exact boundary touch if that is the agreed rule.

For an AI assistant, a change that avoids an unwanted behavior should also be checked against ordinary useful requests. Otherwise, the system may achieve the safety or quality metric by becoming unhelpful. The expected behavior needs both sides of the boundary.

## Review generated tests as seriously as generated code

Ask what failure each test would catch and where its expected result came from. If the answer is only that the current code returns it, the test may be preserving an accident rather than a requirement.

Check the setup too. A mocked dependency may always return the ideal value, removing the very condition that makes the real workflow difficult. A test can be perfectly implemented against an unrealistic world.

Use small, explicit fixtures whose meaning a reviewer can understand. Keep the expected result separate from the function being tested; calculating the expectation with the same flawed helper can make a test incapable of noticing that helper's mistake.

## Make an adversarial review concrete

An instruction to be skeptical is less useful than a bounded challenge. Ask the reviewer to find a valid input the code wrongly rejects, an invalid input it wrongly accepts, or a state transition that loses an important guarantee.

Require the reviewer to explain the expected result and cite the requirement before proposing a fix. Then verify the claimed failure. Skepticism can produce false alarms as well as useful findings.

The process should allow a finding to be rejected when a caller, validation layer, or product rule disproves it. The objective is better evidence, not the maximum number of defects reported by a reviewer trying to satisfy its assignment.

## Know what mutation testing tells you

Deliberately changing a comparison or removing a check can reveal whether tests protect that behavior. If a relevant wrong version still passes, investigate the gap.

However, not every surviving mutation represents a missing requirement. Some changes may be equivalent for the supported inputs or affect unreachable code. Interpret the result rather than treating a score as complete proof of test quality.

Keep deliberate mutations out of the final implementation and use a controlled workflow that restores the correct version. The exercise is valuable when it checks a specific important rule, not when it becomes another number detached from the product's needs.

## Record confidence as evidence, not agreement

A useful review summary states which requirements were checked, which examples were run, which findings were confirmed, and what remains untested. It does not simply say that several agents approved the change.

That gives the next maintainer a clear account of why the change is believed correct. Agreement can be part of the process, but the durable asset is the evidence connecting the implementation to the behavior the product is supposed to provide.

## Try deliberately breaking the rule

For an important boundary, temporarily introduce the wrong behavior and run the tests. If the tests still pass, they are not protecting that rule. Restore the correct code after the check.

This is a simple form of mutation testing: make a deliberate mistake and see whether the tests notice.

AI can help produce code and checks quickly. Trust grows when those checks are tied to behavior someone has independently decided is correct.

## Technical deep dive

**Plain-language bridge:** Tests need an answer key that does not come from the same assumption as the implementation they are checking.

### Diagram: Give the test an independent answer key

```text
RISK
[wrong assumption] ----> [implementation]
         |
         +------------> [expected test result]
                                  |
                                  v
                       agreement can still be wrong

STRONGER CHECK
[product rule] -------> [independent expected result]
[implementation] -----> [actual result]
                                  |
                                  v
                         compare the two results
```

Independence comes from the source of the expected behavior. A second generator or reviewer can repeat the same misunderstanding if it uses the same mistaken reference.

### Separate the oracle from the implementation

A test oracle is the source used to decide the correct result. For interval overlap, the oracle might be a product rule stating that one appointment may start at the instant another ends. Translate that rule independently:

```text
overlap([a,b), [c,d)) = (a < d) AND (c < b)
```

The square and round brackets express inclusion of the start and exclusion of the end. This contract produces a concrete boundary example: \[09:30,10:00) and \[10:00,10:30) do not overlap. Copying the implementation's comparison into the expected-value calculation would remove the independence the test needs.

### Add properties that constrain the result

Examples catch known mistakes. Properties check broader relationships:

```text
overlap(A, B) == overlap(B, A)
shifting both intervals by the same duration preserves overlap
an interval overlaps itself when its duration is positive
adjacent half-open intervals do not overlap
```

Validate generated inputs so the property is not evaluated on undefined cases such as reversed intervals. Use a deliberate generator for exact adjacency because arbitrary random times may almost never land on the important equality boundary.

A second implementation can act as a differential oracle only if it is independently derived and trustworthy for the tested scope. Two implementations based on the same misread requirement can agree on the wrong answer.

### Interpret mutation testing carefully

Mutation testing deliberately makes small implementation changes, such as replacing a strict comparison with an inclusive one, then checks whether tests fail. A surviving mutation suggests the tests may not distinguish an important behavior.

It is not a universal quality score. Some mutations are equivalent under the input contract; others are irrelevant to the product risk. Inspect survivors and connect them to missing requirements rather than optimizing a percentage blindly.

This differs from breaking unrelated setup. A test suite failing because the application no longer starts does not prove it detects the intended business-rule mutation.

### Review the test's information path

Ask where the expected value came from, which boundary it distinguishes, and what incorrect implementation would still pass. Also inspect fixtures: if fixture builders silently enforce the same assumption as production code, they can hide the invalid case before the assertion runs.

The strongest evidence combines an independently stated requirement, a meaningful example, a broader property, and a targeted mutation that the tests reject. Multiple AI-generated artifacts can assist this process, but their agreement is not itself an additional source of truth.

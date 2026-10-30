---
title: "If You Cannot Reproduce the Bug, You Cannot Prove the Fix"
description: "Why an AI behaving correctly during a test can still leave the main question unanswered."
status: draft
tags: [ai, evaluation, debugging]
---

# If You Cannot Reproduce the Bug, You Cannot Prove the Fix

**Reading paths:** Start below for the plain-language explanation, or jump to the
[technical deep dive](#technical-deep-dive) for implementation details and verification.

An AI behaves badly. You change its instructions. You test again, and it behaves well.
Did your change solve the problem?

Maybe. You need to know what happens when the original instructions face the same test.

## The result that looked encouraging

In an AI improvement project, a historical conversation showed the original bot applying
unwanted pressure. The system could identify that behavior in the recording.

But when we recreated the situation, the original prompt behaved politely. The revised
prompt also behaved politely.

Both versions passed. That left the central question unanswered: did the edit help?

## Why the old version matters

Imagine repairing a bicycle brake and testing it on a flat road without using the brake.
The ride goes well, but it does not tell you whether the repair worked.

An AI test can have the same problem. If it does not recreate the situation that exposed
the failure, it may never exercise the behavior you wanted to change.

The original version is the baseline: the comparison that tells you what the system
would do without your proposed improvement.

## Recreate the conditions, not just the question

A conversation depends on more than its final message. Earlier turns, available tools,
system instructions, and the surrounding situation can all affect the answer.

I would compare the historical run with the replay:

1. Were the same relevant messages included?
2. Were the model settings and tool access recorded?
3. Did the simulated user respond in a similar way?
4. Was the unwanted behavior judged by the same rule?

Repeated trials matter too. A model may produce different answers under the same setup.
One good reply is weak evidence about a behavior that only appears sometimes.

## Separate detection from prevention

The project could detect the unwanted pressure in the historical conversation. That
was useful, but it tested a different ability from preventing that behavior in a new run.

Detection asks whether the system can identify a problem that already happened.
Prevention asks whether a changed system behaves better when facing the conditions
that might cause the problem.

A smoke alarm can correctly recognize smoke without proving that a repaired oven will
stop producing it. Both jobs matter, and each needs its own evidence.

In an AI improvement pipeline, I would report them separately: the detector recognized
the historical example, the replay generated a new conversation, and the proposed edit
did or did not produce an observable improvement. Collapsing those into one green check
makes it too easy to overstate the result.

## Build a small comparison table

Before running more experiments, define what each possible outcome would mean.

| Original version | Revised version | What the comparison suggests |
| --- | --- | --- |
| Fails | Passes | Evidence supporting the edit under these conditions. |
| Passes | Passes | The test does not demonstrate an improvement here. |
| Fails | Fails | The edit did not solve the observed failure in this test. |
| Passes | Fails | The edit may have introduced a regression. |

One run does not establish the frequency of any outcome. Still, the table prevents a
common mistake: interpreting every passing revised run as a win.

The second row is especially important. It can mean the task is already easy for both
versions, the failure is rare, or the recreation missed something important. Those are
different explanations, so the next experiment should help distinguish them.

## Preserve the conversation's pressure points

Recreating a conversation does not require copying every irrelevant detail. It does
require preserving the details that may affect the behavior being studied.

For example, a bot may remain polite after one refusal but apply pressure after several
refusals. A replay containing only the first refusal misses the critical part of the
situation. A simulated user who gives in early may also make the problem disappear.

Write down why each included turn matters. Keep unrelated wording changes limited
while investigating the original failure. Otherwise, a comparison can quietly turn
into a test of a different situation.

When the original context is unavailable, mark the gap explicitly. Reconstructed context
can be a useful hypothesis, but it should not be described as an exact reproduction.

## Decide what counts as pressure before scoring

Words such as rude, pushy, and helpful can be interpreted differently. An evaluator
needs concrete behavior rules.

For an illustrative support bot, a rule might say that after a clear refusal, it may
offer one neutral alternative but must not repeatedly argue, invent consequences, or
imply that the user has no choice. The actual rule should come from the product's needs.

Include both acceptable and unacceptable examples. Otherwise, a scoring system may
reward a bot for avoiding the task entirely or punish a reasonable clarification.

If another model supplies the score, manually inspect a sample of its decisions. The
judge can misunderstand the same conversation being evaluated. A readable explanation
and the relevant excerpt make disagreements easier to resolve.

## Change one variable when possible

Suppose the revised run uses a different model, a shorter conversation, and a new prompt.
If it improves, which change helped?

Start by keeping the comparison as similar as practical. Record the model identity,
instructions, input messages, tool access, and relevant generation settings. Then change
the proposed instruction and repeat the test.

Some systems cannot reproduce an old model or environment exactly. In that case, narrow
the claim: the new prompt performed better in the current test setup, rather than saying
it definitively repaired the historical incident.

Keep a set of ordinary conversations too. An instruction that prevents pressure by
making the bot refuse every request would solve one metric while breaking the product.

## Use a stopping rule

Repeatedly editing a prompt until one replay looks good invites accidental self-deception.
The experiment starts selecting for that one example rather than the behavior people
care about across situations.

Decide in advance how many trials to run, which examples remain untouched during editing,
and what evidence would justify the next step. If the baseline never fails, stop claiming
to measure a fix and investigate the replay itself.

A useful final report includes raw counts, important disagreements, and examples of
remaining failures. It also says what was not tested. A small honest experiment is more
useful than a large collection of passes whose meaning nobody can explain.

If the replay uses another model to simulate the user, evaluate that simulator too.
A cooperative simulated user may remove the very disagreement that triggered the
historical failure. Inspect its turns against the intended scenario, and keep its
configuration stable during the prompt comparison so two changing participants do
not obscure which change caused the observed result.

## Report what the experiment actually showed

The honest conclusion in this case was that the improvement pipeline ran, but the
proposed behavior fix remained unproven. The replay had not reproduced the original failure.

That is still useful progress. It points to the next problem: improve the experiment
before making claims about the fix.

Good evaluation sometimes ends with a smaller claim than we hoped for. That keeps us
from shipping confidence that the evidence has not earned.

## Technical deep dive

**Plain-language bridge:** A comparison can show improvement only if the test exposes
a meaningful difference between the original and revised behavior.

### Diagram: Compare both versions under the same conditions

~~~text
                    [same scenario + rubric]
                         /             \
                        v               v
                   [original]       [revised]
                        |               |
                        v               v
                   [score A]        [score B]
                         \             /
                          v           v
                       [paired comparison]
                                |
                                v
                 [improvements AND regressions]
~~~

Both versions passing a case does not show that the edit fixed the historical failure.
Keep scenario coverage and repeated runs of the same scenario separate.


### Define the unit of evaluation

For conversational behavior, the unit is often a complete scenario rather than one
isolated reply. Preserve the system instructions, available tools, conversation prefix,
and environmental conditions that plausibly contributed to the failure.

Keep the tested edit separate from other changes. If the model version, conversation,
and instructions all change at once, attribution becomes difficult even when the result
looks better. A fixed random seed, where available, does not universally guarantee
identical behavior across infrastructure or version changes.

### Use a paired comparison

Run original and revised versions against the same scenario set and record outcomes
side by side. An illustrative result table is:

~~~text
                         revised passes    revised fails
original passes                18                2
original fails                  7                3
~~~

There are seven observed improvements and two regressions on this hypothetical set.
Reporting only the seven improvements would hide the tradeoff. The net observed
difference is five scenarios out of 30, but its generality depends on how those
scenarios were selected and how variable the responses are.

Repeated runs of one scenario probe response variability. They do not create the same
coverage as independently selected scenarios. Report both the number of distinct cases
and repetitions per case rather than collapsing them into one impressive sample count.

### Make the scoring rule independent

Define observable failure criteria before examining the revised outputs. For example,
distinguish asking a clarifying question from applying unwanted pressure after a clear
refusal. Include positive and negative examples of the boundary.

Blind the version labels during human scoring where practical. Have disagreements
adjudicated against the written rubric. A model-based judge can help triage, but it
needs its own calibration against human-labeled examples; agreement with the candidate
model is not independent proof of correctness.

### Preserve a holdout and a stopping rule

Keep some scenarios out of the editing loop. Once a case informs an edit, it becomes
development evidence rather than a clean holdout. Repeatedly checking the same holdout
also leaks information into later decisions.

Set a budget or attempt limit before tuning. If the original failure cannot be reproduced,
report that the current experiment is inconclusive about fixing it. You may still learn
about current behavior, but both versions passing does not explain the historical failure.

These details extend the article's evaluation design. They do not change the historical
conclusion that the attempted replay left the specific improvement unproven.

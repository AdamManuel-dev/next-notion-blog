---
title: "Joining as Engineer Number Three: Choosing the First Problem to Own"
id: "fdac43131ae8e2d492581bd3e0128485"
slug: "choosing-a-first-problem-as-engineer-three"
source_url: null
description: "A first-week plan for finding a small improvement that matters to the team."
tags: ["engineering","career","startups"]
status: "published"
source_file: "blog-drafts/choosing-a-first-problem-as-engineer-three.md"
cover: null
---

# Joining as Engineer Number Three: Choosing the First Problem to Own

**Reading paths:** Start below for the plain-language explanation, or jump to the [technical deep dive](#technical-deep-dive) for implementation details and verification.

Joining a small engineering team means learning the product and the people at the same time. It also means noticing things that could be improved before knowing why they were built that way.

As I think through joining as a third engineer, this is the first-week approach I want to follow. It is a plan, not a claim about results I have already achieved.

## Learn what matters this month

Before choosing a technical improvement, I want to understand what the company needs to deliver and what repeatedly gets in the team's way.

Useful questions include:

- What must we ship in the next few weeks?
- Which problems keep interrupting that work?
- What is difficult for someone new to understand?
- What have you already tried to improve?

The last question matters. A solution that looks obvious may already have been tried and abandoned for a reason I have not discovered yet.

## Follow one real user action

I would trace a recent feature through the system. For example: what happens when a user books an appointment?

Follow the screen, the server request, the checks, the saved data, and any messages sent afterward. Then ask a teammate to correct the parts I misunderstood.

This builds a practical map of the product. It also puts architectural opinions next to actual behavior that customers use.

## Bring a few candidates, with evidence

Imagine finding these possible improvements:

| Candidate | What I would verify |
| --- | --- |
| Repair a broken setup step | Can a teammate reproduce the failure? |
| Protect a booking rule with a test | Is the rule important and currently unprotected? |
| Reorganize several folders | Is their current structure causing repeated difficulty? |

I would choose based on present impact, effort, maintenance, and how clearly we can tell whether the change helped.

The biggest-looking project is not automatically the best first contribution.

## Agree on a small outcome

"Improve developer experience" is too broad for a first-week task.

A more useful agreement is:

> Make the documented setup work on a clean checkout, then have another engineer follow it successfully.

That gives the work a boundary and a visible finish. It also makes clear whose feedback is needed before calling the task complete.

## Deliver with someone who will use it

I want a teammate to review the change and try the result. If only I can operate what I built, I have created a new dependency on myself.

For a setup improvement, that means watching someone follow the instructions. For a test, it means explaining which failure it catches and how to maintain it.

I would record what changed, what was checked, and what remains uncertain. One successful attempt is useful evidence, but it is not proof of a lasting productivity increase.

## Listen for repeated friction

A new engineer can notice many imperfect things. The useful question is which of them repeatedly costs the team time or creates risk for customers.

I would listen for concrete examples: a setup instruction that fails for every new machine, a release check that people routinely work around, or a customer issue that requires one particular engineer to diagnose it.

Ask when the problem last happened and what someone had to do about it. That helps separate a recurring obstacle from a preference about coding style.

It also makes the conversation less accusatory. The focus becomes a shared difficulty and its consequences rather than an outsider's opinion that the code should look different.

## Understand the local history

An unusual design may be a deliberate response to an old deadline, a difficult customer, or a limitation in an external service. That context can explain both why it exists and whether the original constraint still applies.

I want to ask, "What made this the right choice at the time?" before proposing a replacement. The answer may show that a simple improvement is now possible, or that the apparent shortcut still protects an important requirement.

Understanding the reason does not mean every decision must remain forever. It means the proposed change can preserve the useful part while addressing the demonstrated problem. That is a better starting point for trust than treating unfamiliar code as bad code.

## Use the LLM to prepare evidence

An LLM can help trace a flow, compare related implementations, and locate repeated fixes in Git history. I would ask it to cite the files and commits supporting each claim.

Then I would verify the important findings directly. A model may confuse an unused path with the active one or treat a historical bug as current. A list of plausible problems is not yet a reason to assign the team new work.

Keep observations, explanations, and questions separate. "This setup step references a missing file" is an observation. "This blocks every new hire" needs additional evidence. "Has this caused setup trouble recently?" is the question that can establish the impact.

## Compare candidates without fake precision

A score of 8.7 out of 10 can make a weak judgment look objective. For a few first-week candidates, plain explanations are usually more useful.

I would compare the strength of evidence, current impact, size of the first intervention, ease of verification, and ongoing maintenance. A small table can make the tradeoffs visible.

For example, a broken setup step may have strong evidence and a short fix. A broad architecture change may have uncertain impact and a long adoption path. The architecture idea may still be valuable later, but it is a harder first-week commitment.

The selection should fit both the team's immediate needs and the amount of context I have actually earned.

## Propose an outcome with a boundary

A useful proposal describes the observed problem, the smallest change, the expected benefit, and how the team will check it. It also says what is outside the first attempt.

For a setup issue, the boundary might be one supported local environment rather than rebuilding every development tool. For a fragile business rule, it might be protecting one important path rather than launching a company-wide testing initiative.

This gives teammates something concrete to assess. They can correct a mistaken assumption or suggest a better scope before the work becomes expensive. Agreement on the problem is more valuable than approval of a vague ambition to improve everything.

## Keep product work in the picture

Internal improvements are useful when they support the team's ability to deliver and operate the product. They can become disconnected if they grow into a separate stream of tooling without visible users or outcomes.

Where practical, I would also make a small product change through the normal process. That teaches the actual review, testing, and release path while grounding my opinions about it in firsthand experience.

The internal improvement should have a clear connection to that work: fewer repeated setup failures, a protected customer rule, or a release check that catches a real mistake. The connection helps the team decide whether continued investment is worthwhile.

## Avoid becoming the only person who can maintain it

An improvement can accidentally increase dependence on its author. A clever script that only I understand may remove one problem while creating a new support obligation.

Keep the first solution understandable, document the important choices, and involve someone who will use it. Ask them to run it or modify a small part during review.

Discuss ownership for the next maintenance task. If nobody has time to maintain the solution, that is a reason to simplify it or choose another intervention. Adoption is not enough by itself; the team should be able to operate the improvement without treating its author as a permanent help desk.

## Measure the smallest honest result

In a team of three, one week rarely provides enough data for a confident claim about overall productivity. A specific observed result is more credible.

For example: a teammate completed setup using the revised instructions, or a new check caught a deliberately introduced violation of an agreed booking rule. Those are useful results with clear limits.

Keep a short before-and-after record. Include what changed, what was tested, and whether the improvement has been used by someone else. If longer-term effects need more observation, say so rather than turning a successful demonstration into an unsupported percentage improvement.

## Handle disagreement as information

A teammate may reject a proposal because the problem is less urgent than it appears, because another effort already addresses it, or because the maintenance cost is too high. That is useful context, not necessarily resistance to quality.

Ask what evidence would make the problem worth revisiting. If the answer reveals a smaller useful change, adjust the scope. If another priority clearly matters more, follow it.

The first week is partly about learning how decisions are made. A well-supported proposal that changes after discussion can demonstrate better judgment than pushing through the original idea simply to establish ownership.

The first improvement also needs an exit condition. If the investigation reveals a larger dependency than expected, pause and rescope with the team instead of letting a two-day task quietly become a month-long commitment. A clear boundary protects both delivery and the trust the work is meant to build.

## Write a useful Friday update

A short end-of-week update can explain what I learned, what changed, how it was checked, and what remains uncertain. It should credit collaborators and avoid presenting shared work as a solo transformation.

Then propose one next problem with a bounded outcome. Ask for clarity about responsibility and time within normal team planning, rather than quietly accumulating every engineering inconvenience as personal work.

That creates a sustainable pattern: identify a real need, agree on scope, deliver, enable others, and decide what comes next. Broader responsibility can grow from repeated useful results instead of from a large first-week initiative list.

## Use the result to choose the next step

At the end of the week, I want a shared understanding of one problem, one useful change, and a clear next responsibility.

That is a repeatable way to earn broader ownership: understand the need, agree on the scope, deliver something useful, and help other people use it.

## Technical deep dive

**Plain-language bridge:** A good first improvement is small enough to finish and important enough that someone can tell whether it helped.

### Diagram: Choose a bounded problem with observable value

```text
[team priority] + [reproduced friction]
                    |
                    v
            [candidate improvement]
                    |
                    v
       [impact / evidence / risk / scope]
                    |
                    v
           [agree on small outcome]
                    |
                    v
             [deliver + verify]
                    |
                    v
      [report result and remaining unknowns]
```

This is a decision path, not a scoring formula. A small verified contribution gives the team more useful evidence than a broad improvement claim with no clear boundary.

### Build a candidate from a traced system boundary

For each candidate, identify the entry point, relevant module, data or external dependency, observed failure, and person affected. Tie the description to an inspected revision and a reproducible example where possible.

An illustrative candidate record is:

```text
problem: local setup fails at the migration step
evidence: reproduced in a clean environment at the inspected revision
scope: one missing initialization dependency
affected boundary: setup instructions -> database initialization
success: another developer reaches the documented first request
rollback: restore the previous setup change
unknown: whether hosted onboarding has the same failure
```

This is much easier to prioritize than "developer experience needs improvement." It also prevents the first contribution from silently expanding into every related setup problem.

### Compare risk and information value

Use a qualitative comparison across user impact, confidence in the diagnosis, dependency count, reversibility, and opportunity to learn the system. Do not multiply invented scores into an apparently objective ranking.

A small documentation repair can have high value if it removes a reproduced blocker. A large architecture change can have low initial value if its claimed benefit remains speculative and it requires agreement from several owners.

Distinguish discovery work from implementation work. A short investigation can be the right first commitment when the mechanism is uncertain. Its deliverable is a decision supported by evidence, not a promise that a fix already exists.

### Define the verification boundary before editing

A setup change should be checked from the same clean conditions that reproduced the problem. A concurrency repair needs competing callers. A user-facing validation change needs both rejected and accepted examples.

Avoid testing only the state of the environment after many manual repairs. Hidden dependencies accumulated during investigation can make a broken setup appear reproducible. Write down required prerequisites and verify them from a known starting point.

The final check should include someone besides the original author when independence is part of the value, such as onboarding or handoff.

### Report contribution without inflating impact

Separate the observed outcome from its possible broader benefit. "A teammate completed the documented setup from the tested starting point" is supportable if observed. "Reduced onboarding time for everyone" requires a broader baseline and follow-up evidence.

Include the mechanism, validation, remaining uncertainty, and maintenance owner in the closeout. That gives the team a useful artifact and creates a basis for the next task.

This technical approach extends a first-week plan. It does not turn the planning conversation into a completed employment or delivery story.

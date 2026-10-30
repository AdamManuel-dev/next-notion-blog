---
title: "Measure the Friction You Want to Remove"
description: "Turn recurring engineering problems into small, testable improvements without confusing activity with impact."
status: draft
tags: [leadership, metrics, engineering]
---

# Measure the Friction You Want to Remove

**Reading paths:** Start below for the plain-language explanation, or jump to the
[technical deep dive](#technical-deep-dive) for implementation details and verification.

A team can spend a lot of time improving its development process without knowing
whether the changes helped. The new template exists. The checklist is longer. There
are more tests. But is the recurring problem happening less often?

In my first-90-days planning discussions, one proposed approach was to inspect pull
requests, review comments, bugs, and build failures for repeated sources of friction.
An LLM could help group the material, but the groups would need manual verification.

This was an improvement plan, not a report of achieved results. Its most useful idea
was to measure a specific problem before proposing a broad solution.

## Start with a recurring cost someone recognizes

"Improve code quality" is a reasonable ambition and a difficult experiment. It includes
too many different problems to tell whether a small change worked.

A more useful starting point is concrete: reviewers repeatedly ask for the same missing
validation, developers spend time repairing the same setup issue, or releases need
repeated corrections because one boundary is easy to misunderstand.

These examples connect an observable pattern to an actual cost. The cost may be delay,
rework, confusion, or user-visible defects. It does not have to be converted into money
before it becomes worth investigating.

Ask teammates whether the pattern matches their experience. A cluster in historical
text is a lead to inspect, not a verdict about what the team should prioritize.

## Count affected changes, not just comments

Suppose a reviewer leaves six comments about missing validation in one pull request.
Counting six independent failures would exaggerate how often the problem occurs.

The comments may describe one underlying omission discussed in several places.
A useful initial measure could be the number of relevant pull requests affected by
that omission. The comments remain supporting evidence rather than separate incidents.

The same issue can appear in a bug report, a support note, and a repair pull request.
Those records should not automatically become three unrelated failures.

Deduplication means recognizing when multiple records describe the same underlying
event. It is unglamorous work, but without it a polished chart can give a misleading
impression of the problem's size.

## Choose a denominator that matches the question

Imagine validation concerns appeared in four pull requests last month and two this
month. That looks like an improvement until you learn that last month had 20 relevant
changes and this month had only four.

The share of relevant changes affected went from four out of 20 to two out of four.
The raw count fell, while the rate among relevant changes rose.

"Relevant" matters. If the concern applies to API input handling, including unrelated
documentation changes in the denominator could make the result look artificially good.

Define the population before comparing periods. Explain exclusions and keep the sample
size visible. With a small team, a few changes can move a percentage dramatically, so
showing the underlying counts is often more informative than a precise-looking rate.

## Use an LLM to find candidates, then verify them

An LLM can help summarize a large collection of review comments and suggest recurring
themes. It can also merge unrelated concerns or describe a pattern more confidently
than the evidence supports.

Ask for references to specific examples and a plain explanation of why each example
belongs in its group. Then inspect a sample, including cases near the category boundary.

For instance, "validation" might combine malformed input, missing permission checks,
and incorrect business rules. Those problems may require different interventions even
though the same word appears in their comments.

Keep uncertain classifications visible. It is better to have a smaller verified group
than a large category whose members do not share a useful cause. The model helps narrow
attention; the team remains responsible for interpreting the evidence.

## Prefer a small intervention with a clear mechanism

Once a pattern is understood, choose a change that plausibly addresses it. Repeated
input parsing mistakes might justify a shared parser or a small set of worked examples.
Confusion about ownership might justify a clearer module boundary.

The mechanism should fit in a sentence: "This helper makes the required check happen
in one place" or "This example makes the expected behavior visible before implementation."

If the explanation is only "more documentation improves quality," the intervention
may be too broad to evaluate. Documentation can help, but it needs to answer the
specific question people keep getting wrong and be available where they need it.

Avoid changing several major things at once if the goal is to learn which one helps.
A smaller change is easier to adopt, inspect, reverse, and improve.

## Measure side effects as well as the target

A new check might reduce one kind of defect while making routine changes much slower.
A shared abstraction might reduce duplication while making exceptional cases harder
to understand. These tradeoffs belong in the evaluation.

Choose a few balancing questions. Did review time increase? Are developers working
around the new rule? Did the problem move to a different boundary? Did false alarms
make people ignore the check?

This does not require a dashboard for every detail. A short review of recent changes
and a focused team conversation may be enough for an early trial.

The objective is to learn whether the intervention improves the whole situation, not
to make one number move in the preferred direction at any cost.

## Do not turn a system measure into a people ranking

Pull-request counts, comments, and repair work reflect many factors beyond individual
ability. Difficult assignments attract more discussion. Experienced engineers may take
on the most uncertain work. A careful reviewer may reveal problems others would miss.

Using those records to rank people can distort both behavior and interpretation.
Developers may avoid hard tasks or split changes to make activity counts look better.

The proposed method is about repeated friction in a system: unclear boundaries, missing
examples, brittle tools, or requirements that arrive too late. Keep the unit of analysis
aligned with that purpose.

A useful finding should help the team change a condition. It should not reduce a
person's contribution to a count stripped of context.

## Label estimates and uncertainty

Historical records rarely contain perfect time measurements. Someone may remember that
a repair took "most of the afternoon," while the pull request only shows elapsed days.

Do not turn those details into a precise hours-saved claim. Record estimated effort
as estimated, explain how it was obtained, and separate it from directly observed data.

Likewise, a quieter month does not prove the intervention caused the improvement.
The work mix, team availability, and release schedule may have changed. A small trial
can provide encouraging evidence without supporting a strong causal claim.

That distinction makes a report more useful. Leaders can decide whether the evidence
warrants continued use, a broader trial, or another approach.

## Make the result a decision

A practical experiment ends with a choice: keep the change, adjust it, expand it, or
remove it. Agree on that review point before the intervention becomes permanent by habit.

For example, after several relevant changes, examine the same definition of the problem,
inspect unexpected cases, and ask whether the mechanism helped. Record what remains
uncertain instead of forcing a success story.

Engineering improvement becomes more credible when it follows this loop: identify a
real source of friction, establish a fair baseline, make a focused change, and inspect
the consequences. The value lies in making the team's work easier to do correctly,
not in producing a larger collection of process artifacts.

## Technical deep dive

**Plain-language bridge:** A fair improvement experiment counts the same kind of
problem, among the same kind of opportunities, before and after a focused change.

### Diagram: Keep the unit of measurement stable

~~~text
[comments + bugs + review records]
                 |
                 v
      [deduplicate into affected units]
                 |
                 v
       [define eligible-change cohort]
                 |
                 v
          [baseline problem rate]
                 |
                 v
         [one focused intervention]
                 |
                 v
 [same rate definition + balancing measures]
                 |
                 v
            [keep / revise / stop]
~~~

The rate needs affected eligible changes over all eligible changes. Also inspect work
mix and side effects; favorable movement alone does not prove the intervention caused it.


### Define the observation schema

Use one record per affected change or incident, with links to supporting evidence:

~~~text
unit_id
opened_at and resolved_at where relevant
change_type
eligible_for_target_problem
problem_present
classification_version
supporting_record_ids
intervention_exposure
estimated_effort, if available, clearly labeled
~~~

The eligibility field supplies the denominator. Classification version preserves the
meaning of a category when the rubric changes. Supporting record IDs allow several
comments about one omission to remain one affected unit.

If an LLM proposes classifications, retain human-verified labels for a review sample
and inspect disagreements. Agreement between two model runs does not independently
establish that the category matches the intended engineering problem.

### Calculate a rate and its context

Let p be affected eligible changes divided by all eligible changes. Report p with its
counts, time window, and work mix. A change from 4/20 to 2/4 is a decrease in incident
count and an increase in the observed rate.

Small samples support limited conclusions. Formal uncertainty estimates require
assumptions about sampling and independence. Several changes from one project or one
shared root cause may be correlated, so treating every comment as an independent
observation can produce unjustified confidence.

Do not present an estimated time-saving figure as measured merely because it appears
in a spreadsheet. Preserve the estimate's source and uncertainty.

### Separate intervention from changing workload

A before/after comparison can be confounded by easier assignments, fewer releases, or
a changed reviewer. Stratify by relevant work type, or use a comparable unaffected
group when one genuinely exists. Explain remaining differences rather than claiming
causation from any favorable movement.

Predefine a review window and the conditions for keeping, revising, or removing the
intervention. Repeatedly stopping the experiment at the first favorable result makes
the conclusion less trustworthy.

### Add balancing measures

A validation helper may reduce omissions while increasing false rejections. A template
may reduce repeated questions while increasing completion time. Inspect both the target
problem and the cost introduced by its remedy.

A practical decision record can say that the problem appeared less often in the
reviewed eligible changes, the sample remains small, and the intervention is retained
for another period because its burden is low. That is more informative than declaring
a large productivity gain from thin evidence.

This remains a proposed improvement method. The source conversation did not establish
measured organizational results or justify using these records to rank individuals.

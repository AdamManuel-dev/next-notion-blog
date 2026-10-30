---
title: "Our Workflow Took Nine Hours - or Eight Days - Depending on the Average"
description: "How averages and measurement definitions can change the story about delivery time."
status: draft
tags: [metrics, engineering, estimation]
---

# Our Workflow Took Nine Hours - or Eight Days - Depending on the Average

A historical analysis of workflow development produced two very different numbers:
about nine hours for the median and about eight days for the mean.

Those figures came from an earlier exploratory report. They have not been independently
recalculated for this article. Their value here is the question they raise: what are
we actually measuring when we say how long a workflow takes to build?

## Two ways to describe the middle

Consider five imaginary delivery times:

```text
2 hours, 4 hours, 6 hours, 8 hours, 100 hours
```

The median is the middle entry: six hours.

The mean adds all five entries and divides by five: 24 hours.

Both calculations are correct. They answer different questions. The median describes
the middle case, while the mean is strongly affected by the unusually slow one.

If difficult cases consume substantial time, hiding them behind the median is misleading.
If most cases finish quickly, describing every case with the mean is also incomplete.

## Define the start and finish

The earlier workflow report used the first recorded version as the start and the first
completed job as the finish.

That measures elapsed time between two recorded events. It does not measure hours of
engineering effort. The gap may include waiting, other priorities, or blocked access.

And one completed job is not proof that the workflow works reliably every day.

Those definitions should appear beside the numbers rather than being left for readers
to guess.

## Count the unfinished work too

Looking only at workflows that eventually succeeded leaves out those still waiting
for a first success. That can make the process appear faster than it is.

A stronger report would show:

- How many workflows were included and excluded.
- How long successful cases took, including the slow cases.
- How many had not succeeded by the reporting date.
- Whether renamed workflows were accidentally counted separately.

## Read the historical figures with their assumptions

The earlier report looked at a selected group of workflows with enough terminal runs
to appear operationally meaningful. It used names to group versions and excluded obvious
test or demo workflows.

Those choices may be reasonable for an exploratory question, but each can affect the
answer. A workflow renamed midway through development may appear to start later than
it really did. Two unrelated workflows sharing a name may be combined accidentally.

Before publishing a performance claim, rebuild the dataset with stable identities,
documented exclusions, and inspectable event timestamps. Recalculate both the summary
and a few individual rows by hand. The old report is a lead to investigate, not a substitute
for that work.

## Elapsed time and effort tell different stories

Suppose a prototype is created on Friday afternoon. It waits for external access over
the weekend, receives two hours of engineering work on Monday, and succeeds that evening.

The elapsed time is several days. The engineering effort may be only a few hours. Neither
number is wrong, but using elapsed time to judge coding speed would be misleading.

For planning, both can matter. Customers experience calendar delay. The team also needs
to understand how much work a task requires. If waiting dominates, hiring more developers
may not address the main cause.

Where possible, separate active work, external waiting, and unknown time. If the history
does not support that breakdown, say so instead of guessing from commit timestamps.

## Do not erase the slow cases

It is tempting to remove unusual cases until the average looks stable. Sometimes exclusions
are justified: a training example or a duplicated record may not belong in the dataset.

But a genuinely difficult customer workflow is not invalid merely because it took a
long time. It may represent the most important delivery risk in the business.

Show the result with clear exclusions and explain why each class was excluded. If a
few cases dominate the mean, list their causes in categories such as external dependency,
unclear requirement, repeated technical failure, or unknown.

That turns an inconvenient statistical tail into a set of engineering and delivery
questions the team can actually work on.

## Group similar work when the sample allows it

A simple export and a multi-portal workflow with human review may have very different
delivery paths. Combining them produces one number that describes neither particularly well.

Useful groups might be based on integration type, number of external dependencies,
or whether the workflow reuses an established pattern. Choose categories before examining
which grouping makes the results look best.

Small groups create another limitation. Two examples are not enough to make a confident
promise about all future work of that type. Report their individual times and the uncertainty
rather than manufacturing a precise estimate from a tiny sample.

The purpose of grouping is to make comparisons more meaningful, not to hide difficult work.

## Show the distribution in ordinary language

A table can explain more than one headline. It might show the number of cases, the middle
case, a slower-case marker, the largest observed time, and the number still unfinished.

If using a percentile, explain it. The 90th percentile is a value at or below which
roughly 90% of the observed cases fall. With few observations, that estimate is unstable
and should not look like a guarantee.

A plain-language statement could say, "Most observed cases finished within a day, while
a small group took weeks. Several others have not finished." That communicates the
shape of the evidence without pretending the next case is already known.

## First completion needs an outcome check

The historical analysis treated a completed job as the endpoint. That is a convenient
event to query, but its meaning depends on how the system assigns that status.

Did the run produce the required artifact? Did a person verify the result? Was it a
partial success? Could a test run be included among real deliveries?

For a stronger measure, define the first verified outcome and preserve the evidence
supporting it. Then measure sustained reliability separately. A workflow that succeeds
once and fails on the next ten runs has reached a milestone, but is not necessarily ready
for dependable use.

## Turn the analysis into an experiment

Suppose long delays cluster around waiting for sample inputs. A useful intervention
might be a clearer intake checklist and an early check that the samples are usable.

Measure whether that reduces the relevant waiting time on later cases. Do not claim
that it improved engineering speed if the evidence only supports faster access to inputs.

This is how a descriptive report becomes useful: identify a likely source of delay,
choose a bounded change, and observe the part of the timeline that change should affect.
The next report can then test an explanation instead of repeating the same headline average.

Choose a consistent observation cutoff as well. A workflow started yesterday has had
less opportunity to finish than one started last month. Mixing them without showing
their ages can distort the unfinished-work picture. Grouping by start period and reporting
how long each group has been observed makes that limitation visible to the reader.

## Use the numbers to ask better questions

A large gap between mean and median is a reason to investigate the long tail. Do the
slow cases share a portal, integration, approval step, or unclear requirement?

That explanation is more actionable than a single planning number. A measurement
becomes useful when people understand both its calculation and its limits.

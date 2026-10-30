---
title: "A Table Can Look Right and Read Wrong"
description: "Why document accessibility requires checking reading order as well as appearance."
status: draft
tags: [accessibility, documents, testing]
---

# A Table Can Look Right and Read Wrong

**Reading paths:** Start below for the plain-language explanation, or jump to the
[technical deep dive](#technical-deep-dive) for implementation details and verification.

A table can look tidy on a page while being confusing when read aloud by assistive
software. Its visual layout and its underlying reading structure are related, but they
are not the same thing.

My Pi history includes work on Word table accessibility checks and a request to compare
screen-reader output with the visible table. The history supports the investigation;
it does not establish a completed test matrix across screen readers.

## Try reading without the grid

Consider this small table:

| Item | Quantity | Price |
| --- | --- | --- |
| Notebook | 2 | $5 |
| Pen | 3 | $1 |

Visually, the headers help connect each value to its meaning. If the content is announced
as a stream of disconnected words and numbers, a listener may have to remember or guess
what each value represents.

The question is whether the structure helps someone understand those relationships
while navigating the table.

## Compare intended order with observed behavior

Start with a small example and write down what a reader needs to learn: which item,
which quantity, and which price.

Then use the target application and assistive technology to navigate it. Record what
is announced and compare it with those intended relationships.

An exported text stream can help reveal ordering problems. It is not a complete substitute
for testing actual navigation and header announcements.

## Complicated layouts deserve extra attention

Merged cells, blank cells used for spacing, and tables nested inside other tables can
make relationships harder to follow.

Sometimes the best improvement is a simpler layout. Sometimes it is correcting the
document's structural information. The right choice depends on the actual document
format and the tools readers will use.

## Understand what the visible grid contributes

Sighted readers often use position to understand a table. A value under Price belongs
to that column, and values on the same row belong to the same item. Lines and spacing
reinforce those relationships.

A reader navigating through speech or another nonvisual method needs access to those
relationships without relying on position alone. Hearing "$5" is useful only if the
reader can determine what costs $5 and whether the number is a unit price or a total.

The accessibility question is therefore about meaning, not merely whether all the words
can be extracted. A document can expose every character and still make the relationships
unnecessarily difficult to understand.

## Test one question at a time

Begin with a task such as finding the quantity of pens. Then try a comparison, such
as determining which item has the higher unit price. Finally, try moving away and returning
to the same cell.

These tasks reveal different problems. Reading straight through may work while returning
to a particular row is confusing. A header may be announced initially but become unavailable
when the reader moves between cells.

Write the expected information for each task without prescribing exact wording from
every tool. Different assistive technologies may announce the same meaningful relationship
in different ways. The goal is successful understanding and navigation, not identical audio.

## Keep a comparison record

A useful inspection table can include the intended relationship, the observed announcement,
the navigation action, and the difficulty encountered. Use short excerpts rather than
an unstructured wall of captured speech.

For example, the intended relationship might be "Pen, quantity three." The observation
might show that the value is announced without an identifiable row or column heading.
That gives the investigation a specific target.

Record the document version, viewing application, assistive technology, and relevant
settings. A finding from one combination should not automatically be claimed for all
combinations. Reproducible context makes the result useful to another person trying
to confirm or fix it.

## Distinguish content order from navigation behavior

A text export can expose the order in which content is stored or extracted. That helps
spot some problems, but a screen reader may also use structural information and navigation
commands that a plain-text export does not show.

Conversely, a visually correct screenshot says little about those navigation paths.
The two artifacts answer different questions.

Use each for its strengths. Compare the visible table to the intended structure, inspect
the underlying document information where possible, and test actual use with the target
tools. Agreement among those checks provides stronger evidence than treating any one
representation as the complete truth.

## Simplify complicated headers carefully

Some tables use several header rows, merged headings, or labels that change meaning
partway through the table. Those designs may be necessary, but they increase the amount
of context a reader must maintain.

Try expressing the same information with a flatter table or several smaller tables.
Check whether the simpler structure preserves the comparisons the document is meant
to support. Splitting a table can make one task easier while making cross-group comparison harder.

The right revision follows the reader's task. It should not merely satisfy a checker
by removing structure that carried important meaning. Test the redesigned version with
the same questions used to evaluate the original.

## Be careful with blank cells

A blank cell can mean zero, not applicable, unknown, or intentionally omitted. Those
meanings are different, and the visual context may not resolve the ambiguity for everyone.

Use an explicit value or a clear legend when the distinction matters. Avoid using rows
of empty cells solely to create visual spacing if a simpler document layout can provide
the same appearance.

Also check repeated headings and page transitions in the actual output format. A table
that is understandable on one screen may become confusing when it spans pages or is
converted to another format. The published artifact is the one the reader experiences.

## Use automated checks as guides

Automated inspection can identify missing structural information, inconsistent patterns,
or suspicious layout choices. That can make a large document review more efficient.

But a passing checker does not prove a reader can complete the task. It may not know
whether a heading is meaningful, whether an abbreviation is explained, or whether the
information is arranged sensibly.

Treat automated findings as evidence to investigate and use hands-on testing for the
questions requiring understanding. When a checker flags an intentional structure,
document the reason and confirm usability instead of assuming that either the checker
or the author must always be right.

## Explain the improvement in terms of use

A useful change report says that readers can now identify the row and column associated
with each value in the tested environment. It names the document version and the tasks
used to verify the result.

That is stronger than saying the document is accessible without a defined scope. It
also gives future maintainers a small set of tasks to repeat after editing the table.
The objective is durable understanding of the information, with the visual and nonvisual
experiences both supporting the same reader goals.

## Keep the tests grounded in a task

Ask a practical question: can someone determine how many notebooks were ordered without
seeing the page?

Check visual appearance, structural information, keyboard navigation, and announced
content as separate pieces of evidence. One passing check should not stand in for all four.

The same principle applies beyond tables: information needs a usable order and meaningful
relationships, not just a good-looking arrangement. Testing with that goal gives accessibility
work a concrete outcome to improve.

## Technical deep dive

**Plain-language bridge:** Visual position suggests relationships to a sighted reader.
Assistive technology needs those relationships represented in the document structure.

### Diagram: A value needs its headers to retain meaning

~~~text
VISIBLE TABLE                 STRUCTURAL RELATIONSHIPS

+----------+----------+           [Quantity header]
| Item     | Quantity |                  |
+----------+----------+                  v
| Notebook |    2     |   [Notebook] --> [2]
+----------+----------+    row header    data cell

Reading the value requires both: Notebook, quantity 2.
~~~

The relationship diagram is conceptual. HTML, Word, and PDF express these associations
differently, so inspect the delivered format and actual navigation behavior.


### Model the header relationship

For a simple HTML table, use header cells for labels and explicit scope when needed
to associate row or column headers with data cells. An illustrative small table is:

~~~html
<table>
  <caption>Supply order</caption>
  <tr>
    <th scope="col">Item</th>
    <th scope="col">Quantity</th>
  </tr>
  <tr>
    <th scope="row">Notebook</th>
    <td>2</td>
  </tr>
</table>
~~~

The caption names the table; the header relationships give the value 2 its context.
These mechanisms are described in the
[W3C table-header guidance](https://www.w3.org/WAI/tutorials/tables/one-header/).

This example concerns HTML. It is not a prescription for the internal format of a
Word document or PDF. Those formats and their viewing applications have different
structural mechanisms, and conversion can change what survives.

### Inspect the delivered format

For a Word source exported to another format, test the actual delivered artifact as
well as the source. Correct source structure does not establish correct exported
reading behavior. Record the authoring application, export method, reader, operating
system, and assistive-technology version used.

Extracted plain text can reveal obvious ordering problems, but it loses many structural
relationships. It cannot by itself prove that headers are announced correctly during
table navigation.

The [W3C tables tutorial](https://www.w3.org/WAI/tutorials/tables/) explains the distinction
between data tables and layout tables. That conceptual distinction also helps decide
whether a visually tabular arrangement genuinely needs table semantics.

### Test navigation at the cell level

Choose a task such as "find the notebook quantity." Navigate directly through cells,
then enter a cell from different directions. Check whether the necessary row and column
context remains available without forcing the reader to memorize the whole table.

Merged cells and multi-level headings require special attention because a value may
need several labels to be understood. If the relationship is difficult to express and
navigate, simplify the layout or split the information into clearer tables.

### Preserve meaning during repairs

Replacing a blank with zero changes data unless zero is the intended meaning.
Likewise, rearranging cells solely to improve reading order can alter which labels
apply. Write the intended relationships before editing structure, then verify them
afterward with both visual and assistive review.

Automated checks can identify missing structural features. A task-based manual check
establishes whether the reader can recover the intended meaning in the tested combination
of document and software. The historical investigation did not establish comprehensive
coverage across all combinations.

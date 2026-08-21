# Signal Motion comprehension study

## Purpose

Validate that motion helps people understand where information came from, what changed, and what is ready to share without moving or obscuring resume content.

Automated tests can verify state, focus, layout, and reduced-motion behavior. They cannot prove that a person understood the signal. This five-participant moderated study is therefore a release gate, not an automated check.

## Participants

- Five people who have reviewed resumes, portfolios, or candidates within the last year.
- At least two participants who regularly use keyboard navigation or a reduced-motion setting, when recruitment permits.
- Do not disclose the intended meaning of a signal before its task.

## Test setup

- Use a representative desktop viewport and a 390 px mobile viewport.
- Test Full first for three participants, Calm first for one, and Still first for one.
- Give every participant the same sample resume and a fresh local preview session.
- Record task outcome, response time, observed confusion, and the participant's own explanation. Do not record resume content or other personal data.

## Tasks and questions

1. Import a sample resume. Ask: "Which information was brought in, where can you correct it, and is anything published yet?"
2. Change the headline and one experience item. Ask: "What part of the preview changed?" Confirm that the participant did not have to search the whole page.
3. Publish the sample page. Ask: "What is live now, and what can you share?" Confirm the link is usable before any decorative handoff finishes.
4. Move between two Living Page chapters. Ask: "Which chapter is active, and did any resume text move?"
5. Change the analytics range. Ask: "What changed, and where can you inspect the exact daily values?"
6. Switch among Full, Calm, Still, and Use device setting using only the keyboard. Ask the participant to describe the difference.

## Acceptance criteria

- At least four of five participants correctly identify the destination of an imported or edited fact within five seconds.
- At least four of five correctly explain the active chapter and analytics range result.
- All five find the published link usable without waiting for motion.
- No participant reports lost focus, unexpected scrolling, moving resume copy, disorientation, or a task that depends on animation.
- Keyboard and reduced-motion participants can complete every task with the same final information.

## Issue severity

- Blocker: a task or status is unavailable in Still mode, focus moves unexpectedly, resume content shifts, or publish motion gates the share link.
- High: fewer than four participants understand a primary signal, or the current chapter/range is ambiguous.
- Medium: the signal is understood but noticeably slower, distracting, or difficult to discover on mobile.
- Low: wording or visual-polish feedback that does not affect comprehension or completion.

## Study record

For each participant, record only a participant code, starting mode, device/viewport, task result, time-to-answer, short paraphrase, and issue severity. Mark this release gate complete only after all five sessions and any blocker/high fixes are retested.

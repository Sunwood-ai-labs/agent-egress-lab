# Sample App Playwright E2E QA Inventory

## User-visible claims

| Claim | Functional check | Visual state | Evidence |
| --- | --- | --- | --- |
| The sample app loads inside the Docker internal network | Open `http://local-app/`, assert title and heading | Initial 1200×900 viewport | `01-initial-app.png` |
| A user can add a task through the visible form | Fill the input and click `追加する`; assert the new row and counters | Newly created task visible | `02-task-created.png` |
| A user can complete the created task | Click the created checkbox; assert completed style and counters | Completed task visible | `03-task-completed.png` |
| The visible external-link control cannot reach the public internet | Click the `https://example.com/` link; fail if navigation succeeds | Chromium network error page | `04-external-url-blocked.png` |

## Controls and state changes

- Task input + add button: one new task appears; OPEN count increments.
- Created-task checkbox: task gains completed styling; OPEN decrements and DONE increments.
- External URL button: navigation is attempted from the offline runner and must fail.

## Exploratory checks

- Submitting an empty/whitespace-only task must not create a row.
- The initial app view and densest tested task state must fit the 1200×900 viewport without horizontal overflow or clipped primary controls.

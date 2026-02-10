# Stumpers Adult Experiment

Adult riddle study ("Stumpers") built with jsPsych 8.2.2, hosted on GitHub Pages. Data is stored via DataPipe to OSF. Participants are recruited through Prolific.

## Tech Stack

All client-side JavaScript — no server. jsPsych 8.2.2 and plugins loaded from unpkg CDN. Cloudflare Turnstile for bot protection (client-side only, no server-side token validation required). DataPipe (`jsPsychPipe`) for saving JSON data to OSF.

### Prolific Integration

URL parameters `PROLIFIC_PID`, `STUDY_ID`, `SESSION_ID` are captured automatically on load and stored in jsPsych data properties. Completion and failure screens redirect to Prolific URLs.

### Data Saves

Data is saved incrementally via DataPipe at 4 checkpoints (after comprehension, after riddles, after CRT, and final). Each save uses the OSF experiment ID from `gs.study_metadata.experimentIdOSF`. Filenames use the generated `subjectID`.

## File Structure

```
├── index.html — Entry point. Loads all scripts/CSS from CDN. Contains the captcha-container overlay div and a honeypot email field for bot detection.
├── css/style.css — All custom styles including content boxes, sliders, riddle prompts, captcha overlay.
└── js
| ├── experiment.js — Main experiment logic. The setupGame() function builds the full jsPsych timeline and calls jsPsych.run().
| ├── game_settings.js — Configuration object (gs): study metadata (num riddles, min response length/time, comprehension attempts), session info (condition), Prolific URL params, Cloudflare Turnstile site key.
| └── stimuli.js — Riddle stimuli (stimuli array: 9 riddles across 3 categories — quantity, viewing, common) and CRT items (crt array: 6 cognitive reflection test items).
└── analysis/preprocessing/json_to_csv.R — R script for converting JSON data to CSV.
```

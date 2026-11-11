# Project Plans

The `Plan/` folder is organized by responsibility. `Main Plan/` contains only project-wide architecture and cross-engine decisions. Each engine has its own independent plan folder containing the documentation, milestones, design notes, and verification evidence for that engine.

| Scope | Plan folder |
|---|---|
| Project architecture and shared contracts | [Main Plan](Main%20Plan/) |
| Music notation and engraving | [Notation Plan](Notation%20Plan/) |
| Video rendering and MP4 export | [Video Plan](Video%20Plan/) |
| Piano keyboard and piano video | [Piano Plan](Piano%20Plan/) |
| Piano hand motion and kinematics | [Piano Hand Plan](Piano%20Hand%20Plan/) |
| Cross-instrument 3D scenes, models, and two-hand roadmap | [3D Model Plan](3D%20Model%20Plan/) |
| Fingering and candidate scoring | [Finger Plan](Finger%20Plan/) |
| Guitar and fretboard rendering | [Guitar Plan](Guitar%20Plan/) |
| Tempo and metronome behavior | [Metronome Plan](Metronome%20Plan/) |
| Drum notation, sticking, and drum video | [Drum Plan](Drum%20Plan/) |

The implementation source of truth remains under [`../Engine/`](../Engine/). Plan documents describe and govern those implementations; they are not duplicate engine code folders.

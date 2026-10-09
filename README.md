<a href="https://galabavamsi.github.io/portfolio/">
  <img src="./assets/header.svg" width="100%" alt="Galaba Vamsi. Mechatronics at IIT Bhilai. Open-source contributor to robotics tools." />
</a>

I send pull requests to open-source robotics tools that other teams maintain: robot-data conversion fixes in [HFlow](https://github.com/Hebbian-Robotics/hflow), evaluation features in [Inspect Robots](https://github.com/robocurve/inspect-robots) plus [inspect-robots-wandb](https://pypi.org/project/inspect-robots-wandb/), a community W&B plugin I wrote and publish, and a CLI fix plus documentation corrections in [Cerulion](https://github.com/cerulion-inc/cerulion). My own robotics and controls projects are simulations: ROS 2, MuJoCo, MATLAB/Simulink, Unity. I co-founded [Human Slop](https://humanslop.in) and co-authored two RIS papers.

[Portfolio](https://galabavamsi.github.io/portfolio/) · [Resume](https://galabavamsi.github.io/portfolio/resume_vamsi.pdf) · [LinkedIn](https://www.linkedin.com/in/galabavamsi/) · [Google Scholar](https://scholar.google.com/citations?user=UNjZa1sAAAAJ&hl=en) · [Email](mailto:galabavamsi12@gmail.com) · [X](https://x.com/Galaba_Vamsi) · [YouTube](https://www.youtube.com/@galabavamsi12)

## Now

- Building [Human Slop](https://humanslop.in), live on the web and [Android](https://play.google.com/store/apps/details?id=com.humanslop.app).
- Three Inspect Robots PRs open, including checkpoint and resume for long robot eval sets.
- Co-authoring the Inspect Robots paper, submitted to the CoRL 2026 SPAIS workshop.
- Open to robotics software internships and new-grad roles (graduating May 2027), and research collaborations.

## Open source

<img src="./assets/open-source.svg" width="100%" alt="Merged upstream pull requests per project, one brush stroke each, with open pull requests drawn as dotted paths." />

### [HFlow](https://github.com/Hebbian-Robotics/hflow) · [Hebbian Robotics (YC S26)](https://www.ycombinator.com/companies/hebbian-robotics)

Open-source SDK for verifying the quality of robot training data · **8 merged PRs**

Most of my work there is conversion correctness: robot logs and LeRobot datasets should come through HFlow whole, or be refused with a clear reason, never silently losing a field, a depth channel, or a file.

| Area | What shipped |
|---|---|
| **Episode schema** | Arrow columns typed from every message, so fields that appear after startup survive ([#657](https://github.com/Hebbian-Robotics/hflow/pull/657), closes [#656](https://github.com/Hebbian-Robotics/hflow/issues/656)); sources with several channels on one topic refused before episode creation ([#598](https://github.com/Hebbian-Robotics/hflow/pull/598)) |
| **LeRobot import** | Depth videos refused before the RGB path drops 12-bit depth ([#400](https://github.com/Hebbian-Robotics/hflow/pull/400)); paginated Hugging Face tree discovery ([#350](https://github.com/Hebbian-Robotics/hflow/pull/350)); cache keys that include the video file index ([#353](https://github.com/Hebbian-Robotics/hflow/pull/353)) |
| **Ingest safety** | One URI validator shared by the CLI, server, and SDK ([#360](https://github.com/Hebbian-Robotics/hflow/pull/360)); EgoSuite labels matched by source provenance instead of basenames ([#362](https://github.com/Hebbian-Robotics/hflow/pull/362)) |
| **Evidence** | Reproducible cold 1080p30 benchmark, 3 runs of 900 frames, 4.897 s median; no safe speedup found, so the filter graph stayed as shipped ([#367](https://github.com/Hebbian-Robotics/hflow/pull/367)) |

<details>
<summary><b>Full HFlow contribution log (8 merged)</b></summary>

- [PR #657 · merged · latest](https://github.com/Hebbian-Robotics/hflow/pull/657) · [issue #656](https://github.com/Hebbian-Robotics/hflow/issues/656) — Types Arrow columns from every message, preserving fields introduced after startup and reporting incompatible shapes with topic and field context.
- [PR #598 · merged](https://github.com/Hebbian-Robotics/hflow/pull/598) · [issue #597](https://github.com/Hebbian-Robotics/hflow/issues/597) — Refused sources with multiple channels on one topic before canonical episode creation, added `hflow doctor` diagnostics for the unsupported shape, and bumped `TRANSFORM_BEHAVIOR_VERSION` to `10`.
- [PR #400 · merged](https://github.com/Hebbian-Robotics/hflow/pull/400) · [issue #399](https://github.com/Hebbian-Robotics/hflow/issues/399) — Refused LeRobot depth videos before conversion when depth markers were present, preventing the RGB H.264 path from silently losing 12-bit depth semantics while preserving the existing RGB path.
- [PR #367 · merged · featured](https://github.com/Hebbian-Robotics/hflow/pull/367) · [issue #365](https://github.com/Hebbian-Robotics/hflow/issues/365) — Added a reproducible cold `camera_frame_stats` evidence benchmark: 3 cold 1080p30 checks, 900 decoded frames each, and a 4.897 s median; separated transform timing and provenance, and documented that no repeatable semantics-preserving speedup was demonstrated, so the shipped filter graph stayed unchanged.
- [PR #362 · merged](https://github.com/Hebbian-Robotics/hflow/pull/362) — Matched saved EgoSuite labels by HFlow source provenance instead of basenames, preserving unambiguous legacy reports and rejecting ambiguous matches.
- [PR #360 · merged](https://github.com/Hebbian-Robotics/hflow/pull/360) · [issue #314](https://github.com/Hebbian-Robotics/hflow/issues/314) — Centralized ingest URI parsing across the CLI, server, and SDK with shared trimming and safety checks; normalized safe relative URIs and rejected blank, absolute, and parent-escaping paths.
- [PR #353 · merged](https://github.com/Hebbian-Robotics/hflow/pull/353) · [issue #292](https://github.com/Hebbian-Robotics/hflow/issues/292) — LeRobot video-cache filenames omitted the video file index; included the camera key, video chunk index, and video file index in cache identity and bumped the converter version to invalidate stale outputs.
- [PR #350 · merged](https://github.com/Hebbian-Robotics/hflow/pull/350) · [issue #296](https://github.com/Hebbian-Robotics/hflow/issues/296) — LeRobot's Hugging Face tree discovery stopped after the first API page; added paginated traversal via `Link: rel="next"`, preserved request headers, deduplicated paths, rejected unsafe cross-origin links, and prevented pagination loops.

</details>

### [Inspect Robots](https://github.com/robocurve/inspect-robots) · [Robocurve (YC S26)](https://www.ycombinator.com/companies/robocurve)

MIT-licensed evaluation framework for physical AI · **2 merged PRs · 3 open · author of [inspect-robots-wandb](https://pypi.org/project/inspect-robots-wandb/) on PyPI**

[Robocurve](https://robocurve.org/) builds open-source tools and independent benchmarks for physical AI. The Inspect Robots CI gates merges on 100% core test coverage, strict mypy, and ruff.

- **[inspect-robots-wandb](https://pypi.org/project/inspect-robots-wandb/)** · [source](https://github.com/Galabavamsi/inspect-robots-wandb) — Weights & Biases logging sink: one W&B run per evaluation with the full eval spec, trial counts, and every aggregate metric. It started as PR #434, closed by agreement when the maintainers asked for W&B support to live outside the core, so I published it as a community plugin on PyPI: 100% coverage gate, CI on Python 3.10 to 3.13, PyPI trusted publishing.
- [PR #476 · merged](https://github.com/robocurve/inspect-robots/pull/476) · [issue #441](https://github.com/robocurve/inspect-robots/issues/441) — Configurable LLM retry policy across five wire protocols, honoring `Retry-After` (seconds and HTTP-date) with exponential backoff fallback, recorded in the eval log.
- [PR #475 · merged](https://github.com/robocurve/inspect-robots/pull/475) · [issue #473](https://github.com/robocurve/inspect-robots/issues/473) — Stopped an unknown working-tree state from being logged as a verified-clean commit SHA.
- [PR #514 · open, in review](https://github.com/robocurve/inspect-robots/pull/514) · [issue #136](https://github.com/robocurve/inspect-robots/issues/136) — Checkpoint and resume for long eval sets on robot hardware: single-writer manifest, immutable per-attempt logs, in-flight markers, and safety aborts that are never auto-retried (about 4,100 lines with tests).
- [PR #550 · open](https://github.com/robocurve/inspect-robots/pull/550) — Optional `on_eval_error` sink hook.
- [PR #551 · open](https://github.com/robocurve/inspect-robots/pull/551) — Community plugins section in the plugin guide.

### [Cerulion](https://github.com/cerulion-inc/cerulion)

Open-source Rust robot runtime that records a run and re-executes it against new code (iceoryx2 shared memory, ROS 2 interop) · **5 merged PRs: one CLI fix and four documentation and comment corrections**

- [PR #216 · merged](https://github.com/cerulion-inc/cerulion/pull/216) · issue #53 — `ros2 attach --dry-run` runs outside a workspace using an exclusively created temp root with RAII cleanup, so a pre-planted directory cannot change the report.
- [PR #226 · merged](https://github.com/cerulion-inc/cerulion/pull/226) · issue #71 — Documented the fail-closed arm of the `CERULION_NETWORK` kill-switch; verifying the change surfaced a separate gap in `topic list`, filed as issue #239.
- [PR #224 · merged](https://github.com/cerulion-inc/cerulion/pull/224) — Fixed 21 stale `USER_API.md` references across 11 files.
- [PR #222 · merged](https://github.com/cerulion-inc/cerulion/pull/222) — Replaced 26 em dashes in an rmw_cerulion test file's comments so it passes the repo's ASCII-only public-surface check.
- [PR #220 · merged](https://github.com/cerulion-inc/cerulion/pull/220) — Corrected misleading workspace-root comments in `cerulion_cli_engine`.

## Research

- **Co-author** — *Experience with RF Energy Harvesting-Driven Self-Powered RIS*, IEEE INDICON 2025 ([IEEE Xplore](https://ieeexplore.ieee.org/abstract/document/11392908/)).
- **Co-author** — *A systematic literature review on simulation models and deployments for reconfigurable intelligent surfaces*, Ad Hoc Networks (Elsevier), 2026 ([ScienceDirect](https://www.sciencedirect.com/science/article/pii/S1570870526001964)).
- **Co-author (submitted, under review)** — *Inspect Robots: Evaluating the Capabilities and Safety of Embodied AI*, CoRL 2026 Workshop SPAIS.
- **First author (manuscript; arXiv preprint in preparation)** — *An Open Emulator for Smart Radio Environments* ([draft](https://drive.google.com/file/d/12oDPsflaUXKnSjfA3247HgFDDf4bJkCP/view?usp=drive_link)).

[Google Scholar](https://scholar.google.com/citations?user=UNjZa1sAAAAJ&hl=en) · [ResearchGate](https://www.researchgate.net/profile/Galaba-Vamsi) · [IEEE Xplore](https://ieeexplore.ieee.org/author/943675488152924)

## Selected work

| Project | What it is |
|---|---|
| [Human Slop](https://humanslop.in) | Anti-AI social app for human-written posts, co-built with my co-founder: an Expo (React Native) app for web and Android, a Fastify API, and PostgreSQL on Supabase. I added a device biometric check at signup and a keystroke-timing score in the editor; both are heuristics, not proof of authorship. |
| [Charter](https://github.com/Galabavamsi/charter) | Razorpay AI Buildathon prototype: chat, voice, and MCP (10 tools) share one bounded commerce core with frozen INR quotes, Razorpay test-mode payments, audit trails, and row-level security. |
| [Pneumatic Sorting Digital Twin](https://github.com/Galabavamsi/pneumatic-sorting-digital-twin) (offline simulation) | Unity simulation of three electropneumatic training kits (sorting, stamping, vacuum transfer): simulated axes, logical PLC I/O, HMI screens, and telemetry record and replay. Not yet connected to a physical PLC. |
| [Quarter-car active suspension](https://quarter-car-afc.vercel.app) | Advanced Control Theory course project, simulation only. Reproduced Na et al. (IEEE TSMC 2022) approximation-free active suspension control in MATLAB/Simulink: after fitting two plant parameters to the paper's Case-10 experiment, the unchanged controller lands within about 6% of its error indices (IAE 0.129 vs 0.122). The paper's Case-B gains then fail a hold-out test, and LQR and skyhook baselines match or beat it at equal effort. [Code](https://github.com/Galabavamsi/quarter-car-afc-replication). |
| [Whiteboard cleaning robot](https://github.com/Galabavamsi/whiteboard_robot) | 3-DOF Cartesian gantry that cleans a 90 × 90 cm whiteboard, simulated in ROS 2 Jazzy and Gazebo Harmonic: URDF/Xacro model, ros2_control, a raster path with 10 cm overlap, and coverage analysis from logged data. Built with Gajanand Kumawat. |
| [Prompt Robot Arm](https://github.com/Galabavamsi/prompt-robot-arm) | Kinematic MuJoCo simulation where a prompt such as "sort red, blue, green" is parsed (rule-based for now) into a plan and a pick-and-place sequence, moving from a kinematic gripper to a SCARA arm with analytic inverse kinematics. |
| [RIS-SIM v2](https://github.com/Galabavamsi/RIM-SIM-V2) | Open-source Python emulator for RIS-assisted radio links with USRP-style SDR interfaces. [v1](https://github.com/Galabavamsi/RIS-SIM) came from my 2025 internship; the 2026 rebuild adds six paper-grounded scenarios, a 20 Hz WebSocket dashboard, a ZeroMQ server, Monte Carlo runs, and 103 tests. |
| [Arista Wi-Fi RRM](https://canva.link/puoqbe4okoid8rb) | Team project for Arista's problem at Inter IIT Tech Meet 14.0 (5th place, Dec 2025): client-aware Wi-Fi radio resource management in NS-3, with I/Q-based interference classification (STFT, DBSCAN, Dual-CNN; 16 classes) on a 5-AP, 50-client 802.11k/v topology. |
| [Electron-GNN](https://github.com/Galabavamsi/Electron-GNN) | In-progress team project (advisor: Dr. Soumajit Pramanik): a two-tower graph neural network (GATv2) that predicts absorption-spectrum peaks from molecular geometry, so far trained and checked on two small molecules (water and ammonia). |
| [AntennaNet](https://github.com/Galabavamsi/Antenna-Net) | Inverse antenna design: a surrogate network plus KD-tree nearest-neighbour anchoring over about 2,000 simulated patch-antenna S11 spectra, extended to 12 × 12-pixel (144-dimensional) layouts with a separate method-of-moments dataset, plus MEEP scripts for dataset generation. |
| [Open-PyFX](https://github.com/Galabavamsi/open-pyfx) | GPU video-effects app in Python, ModernGL, and GLSL: CRT emulation using bundled CRT 3D LUT colour profiles, ASCII edge detection, and 4K export. |
| [Lunar Crater Detection](https://github.com/Galabavamsi/Moon-Crater-Detection-using-DEM) | Crater extraction from lunar DEMs, reproducing Zhou et al. (2018): F1 0.839 on a 16-crater labelled region in Mare Serenitatis (13 true positives, 2 false positives, 3 misses); an optional CuPy path makes preprocessing about 4× faster. |
| [HeatCast](https://github.com/Galabavamsi/heatcast) | Hackathon team project (FortyGuard Hackathon'26, Team HumanSlop): a neighborhood heat-planning scorecard for US planners combining thermal maps, heat-exceedance and streak analysis, vulnerability data, indoor sites, and walking routes. [Demo](https://web-pearl-ten-99.vercel.app). |

## Recognition

- AIR 200 — Amazon ML Challenge 2026 (team)
- 5th place — Arista Networks Wi-Fi challenge, Inter IIT Tech Meet 14.0 (team, Dec 2025)
- AIR 700 — Amazon ML Challenge 2025 (team; 20,000+ participants)
- 1st place — IIT Bhilai Web Development Competition
- Top 10 finalist — Toyota Hackathon
- Top 1% — JEE Advanced

<details>
<summary><b>Toolbox</b></summary>

```text
ROBOTICS, SIMULATION, AND CONTROLS
    ROS 2 (rclpy, ros2_control, URDF/Xacro) · Gazebo Harmonic · MuJoCo · Unity (C#)
    MATLAB/Simulink · LQR and Kalman filter design · LeRobot datasets

LANGUAGES
    Python · TypeScript/JavaScript · C/C++ · Rust (open-source contributions)
    SQL · GLSL

ML, DATA, AND SCIENTIFIC COMPUTING
    PyTorch · PyTorch Geometric · OpenCV · NumPy · CuPy · Apache Arrow
    Weights & Biases · MEEP (FDTD) · NS-3

SOFTWARE, CLOUD, AND TOOLING
    FastAPI · Node.js (Fastify) · React · React Native (Expo) · Flutter
    PostgreSQL · Supabase · WebSockets · Docker
    AWS (CDK, Lambda, Step Functions, Bedrock) · Git · Linux · GitHub Actions
    pytest · Ruff · mypy · PyPI trusted publishing
```

</details>

## The year

<img src="./assets/year.svg" width="100%" alt="Contribution calendar for the last year, painted as brush dabs; brighter, larger dabs mean more contributions that day." />

<sub>The header is repainted every night from a new seed, and the counts in the graphics come from the GitHub API. The brush is a small JavaScript generator in [tools/](./tools).</sub>

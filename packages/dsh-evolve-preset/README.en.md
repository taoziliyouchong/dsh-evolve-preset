# dsh-evolve-preset

[中文](README.md) | **English**

The same model plays differently depending on how it takes work. Evolution mode fixes how each turn is framed, reported and closed: the model aligns with your goal and boundaries first, keeps to the agreed rules while working, and lands the result when it replies; repeated work goes to companion plugins, and preferences settle into a long-term profile. The payoff is three things — more accurate understanding of your requests, noticeably better results at the same cost (even in a single sentence), and a fit that improves the longer you use it. It does not write code for you. Everything is scoped to Evolution mode: switch to another mode and behavior is the same as if it were not installed.

## The four stages

| Stage | What happens |
| --- | --- |
| ① Before acting | Decode the request, look for existing sources, reduce it to object + target state, plan, analyze requirements (hard requirements must be derived backwards), open the gate document, publish the alignment bar, hand off to the task tree |
| ② While working | Check principles and requirements before each step; keep the todo list in sync; record repeated work and turn it into a plugin when possible |
| ③ Before replying | Three-block structure; conclusion first; two versions of deliverables (human / AI); run machine checks |
| ④ Closing | Five-item check (profile, induction, alignment, pending, vocabulary) plus file landing; "summarize" only reconciles |

## Shape of every reply

```markdown
> **Goal**: ...
> **Principles**: ...
> **Hard requirements**: ...
> **Soft requirements**: ...
> **Gates**: 16/16 ✅

(body)

> **Closing check**
> ...
```

The four-line alignment bar is injected each turn by `dsh-task-tree`; the closing check is specified by this preset's persona.

## Dependencies

The dictionary is a package dependency and installs with this package; the rest are optional.

| Package | Purpose | Required |
| --- | --- | --- |
| `dsh-task-tree` | Task tree, per-turn alignment injection, align/read tools | yes |
| `dsh-term-dict` | Term dictionary: lookup/write/lint, first-mention injection | yes |
| `dsh-profile-inject` | Injects the user profile at session start | yes |
| `dsh-profile-panel` | Profile and settings panel | no |
| `dsh-chat-density` | Smaller, dimmer alignment bar and closing check | no |
| `dsh-check` | Profile formatting lint, gate cross-check, clean-copy scan | no |
| `dsh-plan-enter` | Lets the model switch the session into plan mode itself (no longer referenced; install it separately) | no |

Optional companions (separate repositories): `dsh-at-menu`, `dsh-prompt-shelf`, `dsh-reload-buttons`, `dsh-session-autarchive`.

## Skills

The package ships one skill, `evolve-maintenance`: how induction lands, how the profile is written, how the mode is edited, how the five-item closing works. The persona says *what*; the skill says *how*. The four official skill from the `cordis` preset are provided by DSH and are not copied here.

## Install

The package declares one dependency — the term dictionary `dsh-term-dict` — and installing the preset pulls it in. The other companions are optional:

```sh
dsh plugin --profile desktop add dsh-evolve-preset
# optional companions:
dsh plugin --profile desktop add dsh-task-tree dsh-profile-inject
```

Without the task tree the persona asks the model to write the alignment bar itself; without profile injection the persona does not read the profile.

Directly from this repository (before the npm release):

```sh
git clone https://github.com/taoziliyouchong/dsh-evolve-preset
cd dsh-evolve
node scripts/install.mjs --profile desktop
```

Restart DSH afterwards, then pick "进化模式" in Settings → Modes.

Requires DSH >= 0.2.1-alpha.1.

## Layout

- `cordis.patch.yml` — preset declaration: persona (the four stages), composition rows (same shape as the built-in `cordis` preset), companion plugin rows
- `skills/evolve-maintenance/SKILL.md` — maintenance rules
- `customSkillDirs` resolves this package's `skills/` through `createRequire(baseUrl)`, so the install path does not matter

## Known limits

- The persona is about ten thousand characters and is read in full by every new session; delete the "gates" and "requirement adjustment" sections if that is too much.
- The preset fails to mount when a required companion package is missing — install the dependencies first.
- Two closing items ("induction", "vocabulary") rely on `repeat-scan` (`dsh-session-search`) and `dict` (`dsh-term-dict`); without them the model writes "none".

## Environment notes (optional)

To keep a record of machine-specific environment problems (the sandbox refusing a delete, a huge directory search hanging, changes not taking effect), write them in `$DSH_HOME/env-pitfalls.md`: a topic index at the top, then one section per problem with “symptom → wrong turns → what worked”. The file is not shipped, not injected into the per-turn context, and not read automatically; it is optional.

## Feedback

Open an issue: https://github.com/taoziliyouchong/dsh-evolve-preset/issues

## License

MIT

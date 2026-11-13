# dsh-evolve-preset

[中文](README.md) | **English**

One package, the whole Evolution mode: the preset itself plus the task tree, profile injection and panel, alignment-bar styling, self-check tools, and the plan-mode entry tool. Install this one and you have everything.

Evolution mode fixes how the agent frames, does and closes each turn: align on the goal and boundaries first, keep to the rules while working, and reply in three blocks (alignment bar, body, closing check). It does not write code for you; it governs how each turn is thought through, reported and closed.

## What this one package contains

| Capability | Form | Notes |
| --- | --- | --- |
| The mode | agent preset | persona (four stages) + composition rows + maintenance skill |
| Task tree | tool + sidebar panel | `task-tree` tool, per-turn alignment injection; trees under `$DSH_HOME/task-trees/sessions/` |
| Profile injection | host hook | injects `$DSH_HOME/evolve/user-profile.md` and the task-profile list at session start; ships no profile content |
| Profile panel | settings + sidebar | roster, per-entry editing, structure, settings, raw text |
| Alignment-bar styling | browser half | smaller, dimmer alignment bar and closing check; the body is untouched |
| Self-check tools | tools | `net-clean-check`, `profile-lint`, `gate-check` |
| Settings page | settings page + host routes | thinking reminder (start seconds / retry interval / content / on-off), closing-check switch, cross-session query switch, compression-plugin notice; stored in `$DSH_HOME/evolve/evolution-settings.json` |
| Plan-mode entry | tool | `enter_plan_mode`; not registered when the composition has no planMode service |

The term dictionary `dsh-term-dict` is a package dependency (version `*`, which resolves to the latest stable release on npm) and installs with this package; it is a separate plugin with no auto-mount — enable it on the plugin page to use the `dict` tool and vocabulary checks.

## Commands

| Command | What it does |
| --- | --- |
| `/task-tree` | Show this session's task tree (where you are, what it serves, what else is open); `--all` lists trees across sessions, `--check` runs the health check |

## Task-tree write guard

Repeated node edits (`align` / `set` / `move` / `drop`) with no new objective (`new` / `add`) in between are throttled: the 1st and 2nd pass; the **3rd is refused with a hint**; the 4th passes with a hint, the 5th is refused, the 6th passes with a hint — odd attempts are refused, even ones pass. Creating a new objective (`new` or `add`) resets the counter.

## Settings page

"Settings → 进化模式" contains:

- **Thinking reminder**: start seconds (5–600, default 40), retry interval (5–120, default 10), content (goal line only / full alignment bar, default goal line only), and an on-off switch. When the time comes it hands over the current alignment draft — anything with a goal line goes out, missing items read “none”; the interval only gates retries while no goal line exists yet.
- **Closing check**: when off, replies carry only the alignment bar and body; the five checks are skipped and the third block does not appear. Turning it back on restores the block.
- **Cross-session query**: when off, the session search / dump / recover tools are refused.
- **Compression-plugin notice**: shows once on load (plus a banner on the settings page) when `billion-context` is installed and running.

Changes on the settings page are saved immediately — no Save button.

Settings live in `$DSH_HOME/evolve/evolution-settings.json`; notice state in `$DSH_HOME/evolve/billion-context-notice.json`.

## Install

```sh
dsh plugin --profile desktop add dsh-evolve-preset
```

Restart DSH, then pick "进化模式" in Settings → Modes.

Requires DSH >= 0.2.1-alpha.1 (same as `engines.dsh`).

From the repository instead of npm:

```sh
git clone https://github.com/taoziliyouchong/dsh-evolve-preset
cd dsh-evolve-preset
node scripts/install.mjs --profile desktop
```

## Upgrading from 0.1.x

0.1.x shipped each capability as its own package. 0.2.0 merges everything into this package, so remove the old companion packages first or every capability mounts twice:

```sh
dsh plugin --profile desktop remove dsh-task-tree dsh-profile-inject dsh-profile-panel dsh-chat-density dsh-check dsh-plan-enter
dsh plugin --profile desktop add dsh-evolve-preset
```

Keep `dsh-term-dict`: it is a dependency, not a duplicate.

## Layout

- `index.js` — host entry: one apply mounts the six capabilities under `host/`; a failing module does not take the package down
- `host/` — host implementations (task-tree, profile-inject, profile-panel, chat-density, check, plan-enter)
- `lib/client.js` — browser half: one entry hosting three UIs
- `cordis.patch.yml` — preset declaration, composition rows, this package's host row
- `skills/` — `evolve-maintenance` and `task-tree-workflow`
- `assets/` — the three self-check scripts

## Known limits

- After the merge you cannot disable one capability on its own; keep 0.1.x if you need that.
- A failing host hook logs one `[dsh-evolve-preset] <module> 未挂上` line and the rest still mount.
- The persona is about ten thousand characters read in full by every new session.
- Two closing items ("induction", "vocabulary") rely on `dsh-session-search` and `dsh-term-dict`; without them the model writes "none".

## Feedback

Open an issue: https://github.com/taoziliyouchong/dsh-evolve-preset/issues

## License

MIT

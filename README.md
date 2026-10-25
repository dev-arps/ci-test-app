# TaskBoard

A small kanban board built as an npm-workspaces monorepo. No runtime dependencies: just Node 20+.

| Workspace | Path | What it does |
| --- | --- | --- |
| `@taskboard/shared` | [packages/shared](packages/shared) | Task validation, stats and sorting, used by the API |
| `@taskboard/api` | [apps/api](apps/api) | REST API on Node's `http` module; also serves the web UI |
| `@taskboard/web` | [apps/web](apps/web) | Static kanban UI with drag and drop, dark mode, responsive |

## Quick start

```bash
npm install
npm start          # http://localhost:3000
```

Set `PORT` to change the port and `DATA_FILE=./data/tasks.json` to persist tasks across restarts.

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness check |
| GET | `/api/tasks` | List tasks (high priority first) |
| POST | `/api/tasks` | Create a task: `{ title, description?, status?, priority? }` |
| GET | `/api/tasks/:id` | Fetch one task |
| PATCH | `/api/tasks/:id` | Update any subset of fields |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/stats` | Counts by status and priority, plus completion rate |

`status` is one of `todo`, `doing`, `done`. `priority` is one of `low`, `medium`, `high`.

## Development

```bash
npm test           # runs every workspace's tests with node:test
npm run dev        # API with auto-restart on change
```

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `npm ci` and `npm test` on Node 20 and 22 for every push and pull request.

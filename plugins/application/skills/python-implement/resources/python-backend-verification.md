# Python Backend Verification

## Detection

- Prefer the repository's configured task runner and lockfile.
- FastAPI signals: `fastapi` dependency, router imports, ASGI app.
- Django DRF signals: `django`, `djangorestframework`, settings module.

## Focused Commands

- Tests: `pytest tests/api/test_orders.py -q`
- Ruff: `ruff check src/orders tests/api/test_orders.py`
- Mypy: `mypy src/orders` when configured.
- FastAPI import smoke: run the repository's ASGI import or app startup test command.
- Django checks: `python manage.py check`
- Django migration drift: `python manage.py makemigrations --check --dry-run`

Report commands that are unavailable or unconfigured as skipped.

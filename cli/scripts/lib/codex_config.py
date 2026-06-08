from __future__ import annotations

import tomllib
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None


def get_ho_chi_minh_tz():
    if ZoneInfo is not None:
        try:
            return ZoneInfo("Asia/Ho_Chi_Minh")
        except Exception:
            pass
    return timezone.utc


def now_ho_chi_minh() -> datetime:
    return datetime.now(tz=timezone.utc).astimezone(get_ho_chi_minh_tz())


@dataclass
class CodexConfig:
    root: Path
    data: dict

    @classmethod
    def load(cls, root: Path) -> "CodexConfig":
        config_path = root / ".codex" / "config.toml"
        if config_path.exists():
            data = tomllib.loads(config_path.read_text(encoding="utf-8-sig"))
        else:
            data = {}
        return cls(root=root, data=data)

    def get(self, *keys, default=None):
        value = self.data
        for key in keys:
            if not isinstance(value, dict) or key not in value:
                return default
            value = value[key]
        return value

    def get_str(self, *keys, default: str = "") -> str:
        value = self.get(*keys, default=default)
        return value if isinstance(value, str) else default

    def get_bool(self, *keys, default: bool = False) -> bool:
        value = self.get(*keys, default=default)
        return value if isinstance(value, bool) else default

    def get_int(self, *keys, default: int = 0) -> int:
        value = self.get(*keys, default=default)
        return value if isinstance(value, int) else default

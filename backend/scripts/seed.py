"""Admin seed CLI: python -m scripts.seed [--force]"""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.common.core.database import Base, SessionLocal, engine
from app.common.persistence import registry  # noqa: F401
from app.common.seed import (
    clear_performance_input_meta,
    seed_all,
    seed_missing_json_stores,
    sync_organizations,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed BOMIBOT database from frontend mocks")
    parser.add_argument("--force", action="store_true", help="Clear and re-seed")
    parser.add_argument(
        "--missing-json",
        action="store_true",
        help="Only seed missing region_json_stores domains",
    )
    parser.add_argument(
        "--sync-organization",
        action="store_true",
        help="Re-load organization employees from seed JSON (both regions)",
    )
    parser.add_argument(
        "--clear-performance-meta",
        action="store_true",
        help=(
            "기존 데이터 보존 — 세목/세세목 기본값"
            "(performanceSubProjectChips·defaultDetailCategories)만 비운다"
        ),
    )
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        if args.sync_organization:
            sync_organizations(session)
        elif args.missing_json:
            seed_missing_json_stores(session)
        elif args.clear_performance_meta:
            count = clear_performance_input_meta(session)
            print(f"Cleared 세목/세세목 defaults on {count} performance store(s).")
            return
        else:
            seed_all(session, force=args.force)
        print("Seed completed.")
    finally:
        session.close()


if __name__ == "__main__":
    main()

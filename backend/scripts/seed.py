"""Admin seed CLI: python -m scripts.seed [--force]"""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.database import Base, SessionLocal, engine
from app.infrastructure.persistence import models  # noqa: F401
<<<<<<< HEAD
from app.infrastructure.seed import seed_all, seed_missing_json_stores
=======
from app.infrastructure.seed import seed_all, seed_missing_json_stores, sync_organizations
>>>>>>> dev2


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed BOMIBOT database from frontend mocks")
    parser.add_argument("--force", action="store_true", help="Clear and re-seed")
    parser.add_argument(
        "--missing-json",
        action="store_true",
        help="Only seed missing region_json_stores domains",
    )
<<<<<<< HEAD
=======
    parser.add_argument(
        "--sync-organization",
        action="store_true",
        help="Re-load organization employees from seed JSON (both regions)",
    )
>>>>>>> dev2
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
<<<<<<< HEAD
        if args.missing_json:
=======
        if args.sync_organization:
            sync_organizations(session)
        elif args.missing_json:
>>>>>>> dev2
            seed_missing_json_stores(session)
        else:
            seed_all(session, force=args.force)
        print("Seed completed.")
    finally:
        session.close()


if __name__ == "__main__":
    main()

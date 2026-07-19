"""Continuous sensor fleet simulator.

Discovers every silo from the backend at each tick (so newly registered
silos are picked up without restarting this script) and posts one reading
per silo every 20 minutes, using a bounded random walk (see sensor_walk.py)
instead of uniform-random noise centred on a permanently extreme band.

Run inside the compose network (BACKEND_URL defaults to the backend service
hostname) or locally against http://localhost:8000 via BACKEND_URL override.
"""
import os
import time
from datetime import datetime

import httpx

from sensor_walk import new_state, step

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")
INTERVAL_SECONDS = 20 * 60


def discover_silos(client: httpx.Client) -> list[str]:
    response = client.get(f"{BACKEND_URL}/silos", timeout=10.0)
    response.raise_for_status()
    return [silo["id"] for silo in response.json()]


def main() -> None:
    states: dict[str, dict] = {}

    with httpx.Client() as client:
        while True:
            try:
                silo_ids = discover_silos(client)
            except httpx.HTTPError as e:
                print(f"Could not fetch silo list ({e}); retrying in {INTERVAL_SECONDS}s")
                time.sleep(INTERVAL_SECONDS)
                continue

            for silo_id in silo_ids:
                states.setdefault(silo_id, new_state())
            for stale_id in [sid for sid in states if sid not in silo_ids]:
                del states[stale_id]

            now = datetime.now()
            hour_of_day = now.hour + now.minute / 60
            for silo_id in silo_ids:
                reading = step(states[silo_id], hour_of_day)
                try:
                    response = client.post(
                        f"{BACKEND_URL}/sensors/ingest",
                        json={"silo_id": silo_id, **reading},
                        timeout=10.0,
                    )
                    print(f"[{now.isoformat(timespec='seconds')}] silo={silo_id} {reading} -> {response.status_code}")
                except httpx.HTTPError as e:
                    print(f"Ingest failed for silo {silo_id}: {e}")

            time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()

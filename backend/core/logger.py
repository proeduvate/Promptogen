import logging
import sys

from core.config import settings


def _build_logger() -> logging.Logger:
    log = logging.getLogger("promptgen")
    log.setLevel(logging.DEBUG if settings.debug else logging.INFO)

    if not log.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.DEBUG if settings.debug else logging.INFO)
        fmt = logging.Formatter(
            "[%(asctime)s] %(levelname)-8s %(name)s — %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(fmt)
        log.addHandler(handler)

    return log


logger = _build_logger()

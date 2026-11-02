"""Tests to verify strict database startup failure when database cannot connect."""

import pytest
from unittest.mock import AsyncMock, patch
from core.database import Database
import main


@pytest.mark.asyncio
async def test_startup_fails_when_database_connect_raises():
    """Verify that on_startup raises RuntimeError and does not continue in in-memory mode."""
    with patch("main.database.connect", new=AsyncMock(side_effect=RuntimeError("Connection refused"))):
        with pytest.raises(RuntimeError, match="Database connection failed on startup: Connection refused"):
            await main.on_startup()


@pytest.mark.asyncio
async def test_database_connect_raises_when_database_url_missing_in_production(monkeypatch):
    """Verify that database.connect() raises RuntimeError when DATABASE_URL is not set outside test mode."""
    db = Database()
    monkeypatch.setattr("core.database.settings.database_url", "")
    
    # Simulate production environment (not pytest)
    with patch("sys.modules", {"main": None}), patch.dict("os.environ", {"TESTING": "false"}):
        with pytest.raises(RuntimeError, match="DATABASE_URL is not configured"):
            await db.connect()

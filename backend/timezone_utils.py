from datetime import datetime, timezone, timedelta
try:
    from zoneinfo import ZoneInfo
except Exception:
    # For very old Python versions, ZoneInfo may be unavailable
    ZoneInfo = None


IST_ZONE = ZoneInfo("Asia/Kolkata") if ZoneInfo is not None else None


def now_ist() -> datetime:
    """Return current time as timezone-aware datetime in IST."""
    if IST_ZONE is not None:
        return datetime.now(IST_ZONE)
    # Fallback: return UTC-aware then shift by +5:30
    dt = datetime.now(timezone.utc)
    return dt.astimezone(timezone(timedelta(hours=5, minutes=30)))


def to_ist(dt: datetime) -> datetime:
    """Convert a datetime (naive assumed UTC) to IST timezone-aware datetime."""
    if dt is None:
        return None
    if IST_ZONE is not None:
        if dt.tzinfo is None:
            # assume UTC
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(IST_ZONE)
    # Fallback: naive conversion (not ideal)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    # add 5.5 hours
    return dt + timedelta(hours=5, minutes=30)

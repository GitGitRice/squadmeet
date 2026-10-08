import pytest

from app.activities import ACTIVITY_TYPES
from app.reasons import ACTIVITY_REASONS, GENERAL_REASONS

ALL_REASONS = GENERAL_REASONS + tuple(r for reasons in ACTIVITY_REASONS.values() for r in reasons)


def test_every_activity_type_has_its_own_reasons():
    assert set(ACTIVITY_REASONS) == set(ACTIVITY_TYPES)


def test_reason_keys_are_unique_over_all_activity_types():
    # A key is stored in the database, so one key must mean one thing.
    keys = [r.key for r in ALL_REASONS]

    assert len(keys) == len(set(keys))


@pytest.mark.parametrize("activity_type", ACTIVITY_TYPES)
def test_each_activity_type_has_positive_and_negative_reasons(activity_type):
    reasons = ACTIVITY_REASONS[activity_type] + GENERAL_REASONS

    assert any(r.positive for r in reasons)
    assert any(not r.positive for r in reasons)
    assert any(r.affects_condition for r in reasons)
    # Two Reasons with the same text would look like one in the UI.
    assert len({r.label for r in reasons}) == len(reasons)


def test_only_negative_reasons_change_the_condition():
    assert not any(r.positive and r.affects_condition for r in ALL_REASONS)


def test_reasons_are_keyed_by_activity_type_members():
    from app.activities import ActivityType

    assert all(isinstance(key, ActivityType) for key in ACTIVITY_REASONS)

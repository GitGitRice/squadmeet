import pytest

from app.reasons import ACTIVITY_REASONS, ACTIVITY_TYPES, GENERAL_REASONS, reasons_for


def test_every_activity_type_has_its_own_reasons():
    assert set(ACTIVITY_REASONS) == set(ACTIVITY_TYPES)


def test_reason_keys_are_unique_over_all_activity_types():
    # A key is stored in the database, so one key must mean one thing.
    keys = [r.key for r in GENERAL_REASONS]
    keys += [r.key for reasons in ACTIVITY_REASONS.values() for r in reasons]

    assert len(keys) == len(set(keys))


@pytest.mark.parametrize("activity_type", ACTIVITY_TYPES)
def test_a_user_can_pick_positive_and_negative_reasons(activity_type):
    reasons = reasons_for(activity_type)

    assert any(r.positive for r in reasons)
    assert any(not r.positive for r in reasons)
    # Two Reasons with the same text would look like one in the UI.
    assert len({r.label for r in reasons}) == len(reasons)


def test_reasons_for_puts_the_activity_reasons_first():
    reasons = reasons_for("table_tennis")

    assert reasons[: len(ACTIVITY_REASONS["table_tennis"])] == ACTIVITY_REASONS["table_tennis"]
    assert set(GENERAL_REASONS) <= set(reasons)


def test_reasons_for_an_unknown_activity_type_fails():
    with pytest.raises(KeyError):
        reasons_for("chess")

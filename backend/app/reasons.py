"""The predefined Reasons for a Rating, per Activity type (SCRUM-18, see CONTEXT.md).

Users cannot write free text (ADR-0004), so a Rating picks one or more of these Reasons.
A negative Reason with affects_condition=True names something broken or missing at the Place.
These Reasons drive the Condition of the Place. The other negative Reasons ("Oft überfüllt")
are worth knowing, but repairs do not fix them, so they do not change the Condition.

The key is stored in the database and must never change. The label is the German UI text and
may change.
"""

from dataclasses import dataclass

# The Activity types (see CONTEXT.md). Place.activity_type holds one of these keys.
ACTIVITY_TYPES = ("table_tennis", "basketball", "football", "beach_volleyball", "outdoor_fitness")


@dataclass(frozen=True)
class Reason:
    key: str
    label: str
    positive: bool
    affects_condition: bool = False


def good(key: str, label: str) -> Reason:
    return Reason(key, label, positive=True)


def bad(key: str, label: str) -> Reason:
    """A negative Reason that does not change the Condition."""
    return Reason(key, label, positive=False)


def broken(key: str, label: str) -> Reason:
    """A negative Reason that changes the Condition: something at the Place is broken."""
    return Reason(key, label, positive=False, affects_condition=True)


# Reasons that fit every Activity type.
GENERAL_REASONS = (
    good("easy_to_reach", "Gut erreichbar"),
    good("clean", "Sauber und gepflegt"),
    good("lit_in_evening", "Abends beleuchtet"),
    good("shade", "Schattig im Sommer"),
    good("seats_nearby", "Bänke in der Nähe"),
    broken("litter", "Müll oder Verschmutzung"),
    broken("broken_glass", "Glasscherben"),
    bad("hard_to_find", "Schwer zu finden"),
    bad("often_crowded", "Oft überfüllt"),
    broken("puddles", "Steht nach Regen unter Wasser"),
)

ACTIVITY_REASONS: dict[str, tuple[Reason, ...]] = {
    "table_tennis": (
        good("table_good", "Platte in gutem Zustand"),
        good("fixed_net", "Festes Netz vorhanden"),
        good("wind_protected", "Windgeschützt"),
        broken("net_missing", "Netz fehlt oder ist kaputt"),
        broken("table_damaged", "Platte beschädigt oder uneben"),
    ),
    "basketball": (
        good("hoops_with_nets", "Körbe mit Netz"),
        good("court_surface_good", "Guter, ebener Belag"),
        good("lines_visible", "Linien gut sichtbar"),
        broken("hoop_damaged", "Korb oder Brett beschädigt"),
        broken("hoop_net_missing", "Korbnetz fehlt"),
        broken("court_surface_bad", "Belag rissig oder rutschig"),
    ),
    "football": (
        good("goals_with_nets", "Tore mit Netz"),
        good("pitch_good", "Rasen oder Belag in gutem Zustand"),
        good("fenced", "Eingezäunt, der Ball bleibt drin"),
        broken("goal_nets_missing", "Tornetze fehlen oder sind kaputt"),
        broken("pitch_bad", "Löcher oder kaputter Belag"),
        bad("often_locked", "Oft abgeschlossen"),
    ),
    "beach_volleyball": (
        good("sand_good", "Feiner, sauberer Sand"),
        good("net_tight", "Netz gespannt und in richtiger Höhe"),
        good("court_marked", "Spielfeld markiert"),
        broken("sand_dirty", "Sand verschmutzt"),
        broken("volleyball_net_missing", "Netz fehlt oder ist kaputt"),
        broken("too_little_sand", "Zu wenig Sand, harter Boden"),
    ),
    "outdoor_fitness": (
        good("equipment_good", "Geräte in gutem Zustand"),
        good("equipment_varied", "Viele verschiedene Geräte"),
        good("instructions", "Übungsanleitungen an den Geräten"),
        broken("equipment_damaged", "Gerät beschädigt oder gesperrt"),
        broken("equipment_rusty", "Geräte rostig oder wackelig"),
    ),
}


def reasons_for(activity_type: str) -> tuple[Reason, ...]:
    """The Reasons a user can pick when they rate a Place of this Activity type."""
    return ACTIVITY_REASONS[activity_type] + GENERAL_REASONS

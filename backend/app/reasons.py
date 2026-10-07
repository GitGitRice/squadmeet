"""The predefined Reasons for a Rating, per Activity type (SCRUM-18, see CONTEXT.md).

Users cannot write free text (ADR-0004), so a Rating picks one or more of these Reasons.
The negative Reasons drive the Condition of a Place, so they name things that are broken or
missing at the Place, not the people there.

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


# Reasons that fit every Activity type.
GENERAL_REASONS = (
    Reason("easy_to_reach", "Gut erreichbar", positive=True),
    Reason("clean", "Sauber und gepflegt", positive=True),
    Reason("lit_in_evening", "Abends beleuchtet", positive=True),
    Reason("shade", "Schattig im Sommer", positive=True),
    Reason("seats_nearby", "Bänke in der Nähe", positive=True),
    Reason("litter", "Müll oder Verschmutzung", positive=False),
    Reason("broken_glass", "Glasscherben", positive=False),
    Reason("hard_to_find", "Schwer zu finden", positive=False),
    Reason("often_crowded", "Oft überfüllt", positive=False),
    Reason("puddles", "Steht nach Regen unter Wasser", positive=False),
)

ACTIVITY_REASONS: dict[str, tuple[Reason, ...]] = {
    "table_tennis": (
        Reason("table_good", "Platte in gutem Zustand", positive=True),
        Reason("fixed_net", "Festes Netz vorhanden", positive=True),
        Reason("wind_protected", "Windgeschützt", positive=True),
        Reason("net_missing", "Netz fehlt oder ist kaputt", positive=False),
        Reason("table_damaged", "Platte beschädigt oder uneben", positive=False),
    ),
    "basketball": (
        Reason("hoops_with_nets", "Körbe mit Netz", positive=True),
        Reason("court_surface_good", "Guter, ebener Belag", positive=True),
        Reason("lines_visible", "Linien gut sichtbar", positive=True),
        Reason("hoop_damaged", "Korb oder Brett beschädigt", positive=False),
        Reason("hoop_net_missing", "Korbnetz fehlt", positive=False),
        Reason("court_surface_bad", "Belag rissig oder rutschig", positive=False),
    ),
    "football": (
        Reason("goals_with_nets", "Tore mit Netz", positive=True),
        Reason("pitch_good", "Rasen oder Belag in gutem Zustand", positive=True),
        Reason("fenced", "Eingezäunt, der Ball bleibt drin", positive=True),
        Reason("goal_nets_missing", "Tornetze fehlen oder sind kaputt", positive=False),
        Reason("pitch_bad", "Löcher oder kaputter Belag", positive=False),
        Reason("often_locked", "Oft abgeschlossen", positive=False),
    ),
    "beach_volleyball": (
        Reason("sand_good", "Feiner, sauberer Sand", positive=True),
        Reason("net_tight", "Netz gespannt und in richtiger Höhe", positive=True),
        Reason("court_marked", "Spielfeld markiert", positive=True),
        Reason("sand_dirty", "Sand verschmutzt", positive=False),
        Reason("volleyball_net_missing", "Netz fehlt oder ist kaputt", positive=False),
        Reason("too_little_sand", "Zu wenig Sand, harter Boden", positive=False),
    ),
    "outdoor_fitness": (
        Reason("equipment_good", "Geräte in gutem Zustand", positive=True),
        Reason("equipment_varied", "Viele verschiedene Geräte", positive=True),
        Reason("instructions", "Übungsanleitungen an den Geräten", positive=True),
        Reason("equipment_damaged", "Gerät beschädigt oder gesperrt", positive=False),
        Reason("equipment_rusty", "Geräte rostig oder wackelig", positive=False),
    ),
}


def reasons_for(activity_type: str) -> tuple[Reason, ...]:
    """The Reasons a user can pick when they rate a Place of this Activity type."""
    return ACTIVITY_REASONS[activity_type] + GENERAL_REASONS

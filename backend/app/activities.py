"""The Activity types (see CONTEXT.md). Place.activity_type holds one of these keys.

One list for the whole backend: the database checks the column against it (migration 0003),
the OSM import maps tags to it, and the Reasons are grouped by it.
"""

from enum import StrEnum


class ActivityType(StrEnum):
    TABLE_TENNIS = "table_tennis"
    BASKETBALL = "basketball"
    FOOTBALL = "football"
    BEACH_VOLLEYBALL = "beach_volleyball"
    OUTDOOR_FITNESS = "outdoor_fitness"


ACTIVITY_TYPES = tuple(ActivityType)

# The German UI word, also the name of a Place that has no name in OpenStreetMap.
LABELS = {
    ActivityType.TABLE_TENNIS: "Tischtennisplatte",
    ActivityType.BASKETBALL: "Basketballplatz",
    ActivityType.FOOTBALL: "Bolzplatz",
    ActivityType.BEACH_VOLLEYBALL: "Beachvolleyballfeld",
    ActivityType.OUTDOOR_FITNESS: "Outdoor-Fitness",
}

# PostgreSQL with PostGIS. The postgis/postgis image has no arm64 build (Apple Silicon,
# Graviton EC2), so we add the Debian PostGIS package to the official multi-arch image.
# The Alembic migrations run CREATE EXTENSION postgis.
FROM postgres:17
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-17-postgis-3 \
    && rm -rf /var/lib/apt/lists/*

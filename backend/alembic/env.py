from logging.config import fileConfig

from alembic import context
from geoalchemy2 import alembic_helpers
from sqlmodel import SQLModel

import app.models  # noqa: F401  (registers the tables on SQLModel.metadata)
from app.db import engine

if context.config.config_file_name is not None:
    fileConfig(context.config.config_file_name)

target_metadata = SQLModel.metadata


def include_object(obj, name, type_, reflected, compare_to):
    # PostGIS owns these tables; autogenerate must not try to drop them.
    if type_ == "table" and name == "spatial_ref_sys":
        return False
    return alembic_helpers.include_object(obj, name, type_, reflected, compare_to)


def run_migrations_online():
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            process_revision_directives=alembic_helpers.writer,
            render_item=alembic_helpers.render_item,
        )
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()

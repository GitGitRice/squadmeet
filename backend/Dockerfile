FROM python:3.13-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY . .
EXPOSE 8000
# Migrate the schema, put the OSM Places into an empty database (data/osm/), then start the API.
# docker-compose.yml overrides this for hot reload.
CMD ["sh", "-c", "alembic upgrade head && python -m app.osm_import load && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

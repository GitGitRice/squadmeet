# One EC2 host with Docker Compose, later the NAS

The graded deployment must be in a cloud, so we run on AWS (Free Tier plus 15 $ credit). We use
one EC2 instance with Docker Compose (Caddy for HTTPS, FastAPI backend, PostgreSQL with PostGIS)
instead of ECS Fargate and RDS. Reasons: cheapest option, simple to explain, and David's NAS can
run the same Compose file, so the planned move to the NAS after the project costs almost nothing.

## Considered Options

- ECS Fargate + RDS: more "cloud native", but more setup and over budget.
- NAS only: does not meet the brief's cloud requirement, and a home network is a risk on demo day.

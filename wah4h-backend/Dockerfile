FROM python:3.12-slim

WORKDIR /app

# System deps needed by psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect static files at build time (dummy key — never used at runtime)
RUN SECRET_KEY=docker-build-static python manage.py collectstatic --no-input

EXPOSE 8000

CMD ["bash", "startup.sh"]

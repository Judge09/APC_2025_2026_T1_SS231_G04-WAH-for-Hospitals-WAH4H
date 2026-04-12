#!/bin/bash
echo "Running migrations..."
python manage.py migrate --no-input

echo "Seeding hospitals..."
python manage.py seed_hospitals

echo "Seeding lab prices..."
python manage.py seed_lab_prices

echo "Starting Gunicorn..."
gunicorn wah4h.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120

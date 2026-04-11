#!/bin/bash
gunicorn wah4h.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120

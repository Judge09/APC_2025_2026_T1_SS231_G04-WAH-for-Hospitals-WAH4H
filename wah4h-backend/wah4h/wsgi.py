"""
WSGI config for wah4h project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "wah4h.settings")

application = get_wsgi_application()

# Run any pending migrations at startup so Azure deployments never
# serve a 500 from missing tables regardless of the startup command.
def _run_pending_migrations():
    try:
        from django.core.management import call_command
        call_command("migrate", "--no-input", verbosity=0)
    except Exception:
        pass

_run_pending_migrations()

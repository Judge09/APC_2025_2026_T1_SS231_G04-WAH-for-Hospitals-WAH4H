"""
Django settings for wah4h project.
"""

from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

# SECURITY
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-dev-fallback-change-in-production')
DEBUG = os.getenv('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'wah4h-backend-e0caecbeghh3hfbh.southeastasia-01.azurewebsites.net').split(',')

# REQUIRED FOR CODESPACES / PROXY
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Apps
    "patients",
    "admission",
    "monitoring",
    "discharge",
    "accounts",
    "pharmacy",
    "laboratory", # added here
    "billing", # added billing
    "core",

    # Third-party
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",

]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "wah4h.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "wah4h.wsgi.application"

# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DATABASE_NAME", "postgres"),
        "USER": os.getenv("DATABASE_USER", "postgres"),
        "PASSWORD": os.getenv("DATABASE_PASSWORD", ""),
        "HOST": os.getenv("DATABASE_HOST", "localhost"),
        "PORT": os.getenv("DATABASE_PORT", "5432"),
        "OPTIONS": {
            "sslmode": "require",
            "connect_timeout": "10",
        },
        "CONN_MAX_AGE": 0,
    }
}

# Password validation - OWASP Compliant
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {
            "min_length": 12,
        }
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Manila"
USE_I18N = True
USE_TZ = True


# Static & Media
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# CORS (DEV)
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL', 'False') == 'True'
CORS_ALLOWED_ORIGINS = [o for o in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',') if o]
CORS_ALLOW_CREDENTIALS = True

# Custom user model
AUTH_USER_MODEL = "accounts.User"

# DRF + JWT
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],

    # Rate Limiting / Throttling
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "20/minute",           # Anonymous users: 20 req/min (prevent scraping/spam)
        "user": "100/minute",          # Authenticated users: 100 req/min (standard usage)
        "login": "60/minute",          # QA: relaxed for testing (was 5/minute)
        "password_reset": "3/minute",  # Password reset: 3 req/min (abuse prevention)
    },
}

# JWT Settings
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),   # OWASP standard for sensitive apps
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),      # 7 days for shift-based hospital staff
    "ROTATE_REFRESH_TOKENS": True,                     # Issue new refresh token on each refresh
    "BLACKLIST_AFTER_ROTATION": True,                   # Invalidate old refresh tokens
    "AUTH_HEADER_TYPES": ("Bearer",),
    # User model uses practitioner as primary key (OneToOneField)
    # Use 'pk' to work with any primary key configuration
    'USER_ID_FIELD': 'pk',
    'USER_ID_CLAIM': 'user_id',
}

# Feature flags
# Set to False to disable OTP for login flow only (easy to re-enable)
LOGIN_USE_OTP = False  # QA: disabled for testing
# Set to False to disable OTP for registration flow (creates account immediately)
REGISTER_USE_OTP = False  # QA: disabled for testing
# ============================================================================
# EMAIL CONFIGURATION (Console Backend for Development)
# ============================================================================
# Console backend prints emails to terminal instead of sending them
# Change to SMTP backend in production
#EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
#DEFAULT_FROM_EMAIL = 'noreply@wah4h.ph'
#EMAIL_HOST_USER = 'noreply@wah4h.ph'

# For Production SMTP (uncomment and configure):
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('EMAIL_HOST_USER', 'noreply@wah4h.ph')

# ============================================================================
# CACHE CONFIGURATION (In-Memory Cache for OTP Storage)
# ============================================================================
# Uses LocMemCache for development - fast, simple, but not persistent
# Change to Redis/Memcached in production for multi-server deployments
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'wah4h-otp-cache',
        'OPTIONS': {
            'MAX_ENTRIES': 10000
        }
    }
}

# For Production Redis (uncomment and configure):
# CACHES = {
#     'default': {
#         'BACKEND': 'django_redis.cache.RedisCache',
#         'LOCATION': 'redis://127.0.0.1:6379/1',
#         'OPTIONS': {
#             'CLIENT_CLASS': 'django_redis.client.DefaultClient',
#         }
#     }
# }

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
        
import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wah4h.settings')
django.setup()

from django.contrib.auth import get_user_model

def reset_password(email, new_password):
    User = get_user_model()
    try:
        user = User.objects.get(email=email)
        user.set_password(new_password)
        user.save()
        print(f"Success: Password for '{email}' has been reset to '{new_password}'.")
        print(f"Username associated with this email: '{user.username}'")
    except User.DoesNotExist:
        print(f"Error: No user found with email '{email}'.")

if __name__ == "__main__":
    reset_password('doctor@gmail.com', 'password123')

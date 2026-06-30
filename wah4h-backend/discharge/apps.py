from django.apps import AppConfig


class DischargeConfig(AppConfig):
    name = "discharge"

    def ready(self):
        import discharge.signals

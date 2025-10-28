from django.apps import AppConfig


class InsightZenCoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'kobo.apps.insightzen_core'

    def ready(self) -> None:  # pragma: no cover - import side effects
        from . import signals  # noqa: F401
        return super().ready()

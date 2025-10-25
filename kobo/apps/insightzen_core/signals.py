from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import OperationalError, ProgrammingError
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import DialerAssignment, InsightUserProfile, Interview

User = get_user_model()


@receiver(post_save, sender=User)
def create_insightzen_profile(sender, instance: User, created: bool, **kwargs):
    if created:
        try:
            InsightUserProfile.objects.get_or_create(user=instance)
        except (ProgrammingError, OperationalError):
            # The InsightZen tables might not be ready yet if migrations are
            # running during a fresh deployment. Swallowing the error avoids
            # breaking account creation while still allowing the profile to be
            # created the next time the signal runs.
            return


@receiver(post_save, sender=DialerAssignment)
def ensure_assignment_interview(sender, instance: DialerAssignment, created: bool, **kwargs):
    if created:
        Interview.objects.get_or_create(assignment=instance)

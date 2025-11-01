from django.conf import settings

from hub.models import ExtraUserDetail
from hub.models.extra_user_detail import (
    AccountTypeChoices,
    MODULE_FORM_MANAGER,
    MODULE_LIBRARY,
    PaymentStatusChoices,
    PERSONAL_ACCOUNT_STORAGE_LIMIT_BYTES,
)
from kobo.apps.kobo_auth.shortcuts import User
from kobo.apps.openrosa.apps.main.models.user_profile import UserProfile
from kobo.apps.stripe.constants import ACTIVE_STRIPE_STATUSES
from kpi.utils.permissions import grant_default_model_level_perms


def user_has_inactive_paid_subscription(username):
    if not settings.STRIPE_ENABLED:
        return False

    return (
        User.objects.filter(
            username=username,
            organizations_organization__djstripe_customers__subscriptions__items__price__unit_amount__gt=0,
        )
        .exclude(
            organizations_organization__djstripe_customers__subscriptions__status__in=ACTIVE_STRIPE_STATUSES,
        )
        .exists()
    )


def user_has_paid_subscription(username):
    if not settings.STRIPE_ENABLED:
        return False

    return User.objects.filter(
        username=username,
        organizations_organization__djstripe_customers__subscriptions__status__in=ACTIVE_STRIPE_STATUSES,
        organizations_organization__djstripe_customers__subscriptions__items__price__unit_amount__gt=0,
    ).exists()


def apply_account_configuration(
    user,
    account_type: str,
    *,
    save_extra_details: bool = True,
    reset_model_permissions: bool = False,
):
    """Configure account metadata and entitlements for ``user``.

    Parameters
    ----------
    user:
        The Django user whose associated account metadata should be updated.
    account_type:
        One of :class:`~hub.models.extra_user_detail.AccountTypeChoices`.
    save_extra_details:
        Persist the updated :class:`~hub.models.ExtraUserDetail` fields
        immediately.  When ``False``, the caller is responsible for saving the
        instance (for example to batch other field updates).
    reset_model_permissions:
        When ``True``, clear any existing model-level permissions before
        granting the defaults that correspond to the recalculated module
        access list.
    """

    try:
        extra_details = user.extra_details
    except ExtraUserDetail.DoesNotExist:  # pragma: no cover - defensive
        extra_details = ExtraUserDetail.objects.create(user=user)

    extra_details.account_type = account_type

    if account_type == AccountTypeChoices.ORGANIZATIONAL:
        extra_details.payment_status = PaymentStatusChoices.PENDING
        extra_details.module_access = []
        extra_details.storage_quota_bytes = None
        extra_details.payment_confirmed_at = None
    else:
        extra_details.payment_status = PaymentStatusChoices.NOT_REQUIRED
        extra_details.module_access = [MODULE_FORM_MANAGER, MODULE_LIBRARY]
        extra_details.storage_quota_bytes = PERSONAL_ACCOUNT_STORAGE_LIMIT_BYTES
        extra_details.payment_confirmed_at = None

    if save_extra_details:
        update_fields = [
            'account_type',
            'payment_status',
            'module_access',
            'storage_quota_bytes',
            'payment_confirmed_at',
        ]
        if extra_details.pk:
            extra_details.save(update_fields=update_fields)
        else:  # pragma: no cover - creation fallback
            extra_details.save()

    profile, _ = UserProfile.objects.get_or_create(user=user)
    if profile.account_type != account_type:
        profile.account_type = account_type
        profile.save(update_fields=['account_type'])

    if reset_model_permissions:
        user.user_permissions.clear()
        grant_default_model_level_perms(user)

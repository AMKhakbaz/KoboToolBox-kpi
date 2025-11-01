from django.contrib import messages
from django.contrib.auth import get_user_model
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone
from django.utils.translation import gettext as _
from django.views import View

from hub.models.extra_user_detail import (
    MODULE_ALL,
    PaymentStatusChoices,
)
from kpi.utils.permissions import grant_default_model_level_perms


class TemporaryPaymentConfirmationView(View):
    template_name = 'payments/temp_confirm.html'

    def _get_target_user(self, request):
        user_model = get_user_model()
        session_user_pk = None
        if hasattr(request, 'session'):
            session_user_pk = request.session.get('pending_payment_user_pk')
        user = None
        if session_user_pk:
            try:
                user = user_model.objects.get(pk=session_user_pk)
            except user_model.DoesNotExist:
                user = None
        if not user and request.user.is_authenticated:
            try:
                if (
                    request.user.extra_details.payment_status
                    == PaymentStatusChoices.PENDING
                ):
                    user = request.user
            except Exception:  # pragma: no cover - defensive
                user = None
        return user

    def get(self, request, *args, **kwargs):
        user = self._get_target_user(request)
        if not user:
            return redirect('account_signup')
        if user.extra_details.payment_status != PaymentStatusChoices.PENDING:
            return redirect(reverse('account_email_verification_sent'))
        return render(
            request,
            self.template_name,
            {
                'user_pending_payment': user,
            },
        )

    def post(self, request, *args, **kwargs):
        user = self._get_target_user(request)
        if not user:
            return redirect('account_signup')
        extra_details = user.extra_details
        if extra_details.payment_status != PaymentStatusChoices.PENDING:
            return redirect(reverse('account_email_verification_sent'))

        extra_details.payment_status = PaymentStatusChoices.CONFIRMED
        extra_details.payment_confirmed_at = timezone.now()
        extra_details.module_access = [MODULE_ALL]
        extra_details.storage_quota_bytes = None
        extra_details.save()

        user.user_permissions.clear()
        grant_default_model_level_perms(user)

        if hasattr(request, 'session'):
            request.session.pop('pending_payment_user_pk', None)
            request.session.modified = True

        messages.success(
            request,
            _('Payment confirmed. Please verify your email address to activate your account.'),
        )
        return redirect(reverse('account_email_verification_sent'))

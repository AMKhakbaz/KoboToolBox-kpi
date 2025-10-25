from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect
from django.urls import reverse
from django.views.generic import TemplateView
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response

from kpi.permissions import IsAuthenticated
from kpi.utils.schema_extensions.markdown import read_md
from kpi.utils.schema_extensions.response import (
    open_api_200_ok_response,
    open_api_201_created_response,
    open_api_204_empty_response,
)
from kpi.versioning import APIV2Versioning
from .extend_schemas.api.v2.email.serializers import EmailRequestPayload
from .mixins import MultipleFieldLookupMixin
from .serializers import EmailAddressSerializer, SocialAccountSerializer
from .constants import (
    ACCOUNT_STATUS_ACTIVE,
    ACCOUNT_STATUS_PENDING_PAYMENT,
    ACCOUNT_TYPE_ORGANIZATIONAL,
    ALL_MODULE_KEYS,
)


class AccountPaymentView(LoginRequiredMixin, TemplateView):
    template_name = 'account/payment.html'

    def dispatch(self, request, *args, **kwargs):
        if not self._requires_payment():
            return redirect(self.get_success_url())
        return super().dispatch(request, *args, **kwargs)

    def _requires_payment(self) -> bool:
        extra_details = getattr(self.request.user, 'extra_details', None)
        data = getattr(extra_details, 'data', {}) or {}
        status_value = data.get('account_status')
        return (
            data.get('account_type') == ACCOUNT_TYPE_ORGANIZATIONAL
            and (
                status_value == ACCOUNT_STATUS_PENDING_PAYMENT
                or not data.get('payment_confirmed')
            )
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        extra_details = getattr(self.request.user, 'extra_details', None)
        data = getattr(extra_details, 'data', {}) or {}
        context['account_status'] = data.get('account_status')
        context['payment_confirmed'] = data.get('payment_confirmed')
        return context

    def post(self, request, *args, **kwargs):
        extra_details = getattr(request.user, 'extra_details', None)
        if extra_details:
            data = extra_details.data or {}
            data['payment_confirmed'] = True
            data['account_status'] = ACCOUNT_STATUS_ACTIVE
            data['allowed_modules'] = list(ALL_MODULE_KEYS)
            data.pop('storage_limit_bytes', None)
            extra_details.data = data
            extra_details.save(update_fields=['data'])
        return redirect(self.get_success_url())

    def get_success_url(self) -> str:
        return f"{reverse('kpi-root')}#/form-manager"


@extend_schema(tags=['User / team / organization / usage'])
@extend_schema_view(
    list=extend_schema(
        description=read_md('accounts', 'me/email/list.md'),
        responses=open_api_200_ok_response(
            EmailAddressSerializer,
            raise_not_found=False,
            raise_access_forbidden=False,
            validate_payload=False,
        ),
    ),
    create=extend_schema(
        description=read_md('accounts', 'me/email/create.md'),
        request={'application/json': EmailRequestPayload},
        responses=open_api_201_created_response(
            EmailAddressSerializer,
            raise_not_found=False,
            raise_access_forbidden=False,
        ),
    ),
)
class EmailAddressViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """
    Viewset for managing current user email address

    Available actions:
    - list           → GET       /me/
    - create         → CREATE    /me/

    Documentation:
    - docs/api/v2/me/email/list.md
    - docs/api/v2/me/email/create.md
    """

    queryset = EmailAddress.objects.all()
    serializer_class = EmailAddressSerializer
    permission_classes = (IsAuthenticated,)
    versioning_class = APIV2Versioning

    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)

    def delete(self, request, format=None):
        request.user.emailaddress_set.filter(
            primary=False, verified=False
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=['User / team / organization / usage'])
@extend_schema_view(
    destroy=extend_schema(
        description=read_md('accounts', 'me/social/delete.md'),
        responses=open_api_204_empty_response(
            raise_access_forbidden=False,
            validate_payload=False,
        ),
    ),
    list=extend_schema(
        description=read_md('accounts', 'me/social/list.md'),
        responses=open_api_200_ok_response(
            SocialAccountSerializer,
            raise_not_found=False,
            raise_access_forbidden=False,
            validate_payload=False,
        ),
    ),
    retrieve=extend_schema(
        description=read_md('accounts', 'me/social/retrieve.md'),
        responses=open_api_200_ok_response(
            SocialAccountSerializer,
            raise_access_forbidden=False,
            validate_payload=False,
        ),
    ),
)
class SocialAccountViewSet(
    MultipleFieldLookupMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Viewset for managing current user's socials

    Available actions:
    - destroy        → DELETE   /me/social-accounts/{provider}/{uid_social_account}/
    - list           → GET      /me/social-accounts/
    - retrieve       → GET      /me/social-accounts/{provider}/{uid_social_account}/

    Documentation:
    - docs/api/v2/me/social/destroy.md
    - docs/api/v2/me/social/list.md
    - docs/api/v2/me/social/retrieve.md
    """

    lookup_value_regex = r'(?P<provider>[^/.]+)/(?P<uid_social_account>[-\w]+)'
    lookup_fields = ['provider', 'uid']
    lookup_field_map = {'uid': 'uid_social_account'}
    queryset = SocialAccount.objects.all()
    serializer_class = SocialAccountSerializer
    permission_classes = (IsAuthenticated,)
    versioning_class = APIV2Versioning

    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)

from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from kobo.apps.kobo_auth.shortcuts import User
from kpi.serializers.v2.admin_user import AdminUserAccountSerializer


class AdminUserAccountViewSet(mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = AdminUserAccountSerializer
    queryset = User.objects.all()
    lookup_field = 'username'
    permission_classes = (IsAuthenticated,)
    http_method_names = ['get', 'patch']

    def get_queryset(self):
        queryset = super().get_queryset().select_related('extra_details')
        if not self.request.user.is_superuser:
            self.permission_denied(self.request)
        return queryset

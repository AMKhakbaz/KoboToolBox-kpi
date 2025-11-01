from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from hub.models.extra_user_detail import (
    MODULE_COLLECTION,
    MODULE_MANAGEMENT,
    MODULE_MR_ANALYSIS,
    MODULE_QUALITY_CONTROL,
)
from kpi.utils.permissions import user_can_access_module


MODULE_CONFIG = {
    'management': {
        'module': MODULE_MANAGEMENT,
        'label': 'Management',
        'description': 'Organizational planning tools.',
    },
    'collection': {
        'module': MODULE_COLLECTION,
        'label': 'Collection',
        'description': 'Field collection coordination.',
    },
    'quality-control': {
        'module': MODULE_QUALITY_CONTROL,
        'label': 'Quality Control',
        'description': 'Data quality monitoring utilities.',
    },
    'mranalysis': {
        'module': MODULE_MR_ANALYSIS,
        'label': 'MRAnalysis',
        'description': 'Mixed-method analysis workbench.',
    },
}


class ModuleAccessViewSet(ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        payload = []
        for slug, config in MODULE_CONFIG.items():
            payload.append(
                {
                    'slug': slug,
                    'module': config['module'],
                    'label': config['label'],
                    'description': config['description'],
                    'allowed': user_can_access_module(request.user, config['module']),
                },
            )
        return Response(payload)

    def retrieve(self, request, pk=None):
        if not pk:
            raise Http404

        config = MODULE_CONFIG.get(pk)
        if not config:
            raise Http404

        if not user_can_access_module(request.user, config['module']):
            raise PermissionDenied('Organizational account required for this module.')

        return Response(
            {
                'module': config['module'],
                'slug': pk,
                'status': 'ok',
            },
            status=status.HTTP_200_OK,
        )

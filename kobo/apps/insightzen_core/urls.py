from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CollectionPerformanceBarView,
    CollectionPerformanceExportView,
    CollectionPerformanceOptionsView,
    CollectionPerformancePieView,
    CollectionPerformanceSummaryView,
    CollectionPerformanceTableView,
    CollectionPerformanceTopView,
    DialerAssignmentViewSet,
    DialerNextNumberView,
    InsightProjectViewSet,
    InsightUserViewSet,
    InterviewViewSet,
    QuotaSchemeViewSet,
)

router = DefaultRouter()
router.register('users', InsightUserViewSet, basename='insightzen-users')
router.register('projects', InsightProjectViewSet, basename='insightzen-projects')
router.register('quotas/schemes', QuotaSchemeViewSet, basename='insightzen-quotas-schemes')
router.register('assignments', DialerAssignmentViewSet, basename='insightzen-assignments')
router.register('interviews', InterviewViewSet, basename='insightzen-interviews')

urlpatterns = [
    *router.urls,
    path('dialer/next/', DialerNextNumberView.as_view(), name='insightzen-dialer-next'),
    path(
        'performance/collection/summary/',
        CollectionPerformanceSummaryView.as_view(),
        name='insightzen-collection-performance-summary',
    ),
    path(
        'performance/collection/bar/',
        CollectionPerformanceBarView.as_view(),
        name='insightzen-collection-performance-bar',
    ),
    path(
        'performance/collection/pie/',
        CollectionPerformancePieView.as_view(),
        name='insightzen-collection-performance-pie',
    ),
    path(
        'performance/collection/top/',
        CollectionPerformanceTopView.as_view(),
        name='insightzen-collection-performance-top',
    ),
    path(
        'performance/collection/table/',
        CollectionPerformanceTableView.as_view(),
        name='insightzen-collection-performance-table',
    ),
    path(
        'performance/collection/export/xlsx/',
        CollectionPerformanceExportView.as_view(),
        name='insightzen-collection-performance-export',
    ),
    path(
        'performance/collection/options/',
        CollectionPerformanceOptionsView.as_view(),
        name='insightzen-collection-performance-options',
    ),
]

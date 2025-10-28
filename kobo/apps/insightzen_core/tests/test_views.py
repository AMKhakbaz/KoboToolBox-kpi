from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from kobo.apps.insightzen_core.models import (
    DialerAssignment,
    InsightMembership,
    InsightProject,
    Interview,
    QuotaCell,
    QuotaScheme,
    SampleContact,
)


class InsightZenViewTests(APITestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_superuser(
            username='admin', email='admin@example.com', password='pass1234'
        )
        self.other_user = get_user_model().objects.create_user(
            username='other', email='other@example.com', password='pass1234'
        )
        self.third_user = get_user_model().objects.create_user(
            username='third', email='third@example.com', password='pass1234'
        )
        self.client.force_authenticate(self.admin)

    def test_export_users_streaming_csv(self):
        project = InsightProject.objects.create(
            code='PRJ1',
            name='Sample Project',
            description='',
            owner=self.admin,
            types=['Tracking'],
        )
        InsightMembership.objects.create(
            project=project,
            user=self.admin,
            role='admin',
            panel_permissions={},
        )

        url = reverse('insightzen-users-export')
        response = self.client.get(url, {'format': 'csv'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(hasattr(response, 'streaming_content'))
        content = b''.join(response.streaming_content).decode('utf-8')
        self.assertIn('username', content)
        self.assertIn('admin', content)

    def test_sync_memberships_updates_and_deactivates(self):
        project = InsightProject.objects.create(
            code='PRJ2',
            name='Another Project',
            description='',
            owner=self.admin,
            types=['Adhoc'],
        )
        existing_membership = InsightMembership.objects.create(
            project=project,
            user=self.other_user,
            role='viewer',
            panel_permissions={},
        )
        extra_membership = InsightMembership.objects.create(
            project=project,
            user=self.third_user,
            role='agent',
            panel_permissions={},
        )

        url = reverse('insightzen-projects-sync-memberships', args=[project.id])
        payload = {
            'memberships': [
                {
                    'id': existing_membership.id,
                    'user': self.other_user.id,
                    'role': 'manager',
                    'title': 'Updated',
                    'panel_permissions': {'collection': {'manage': True}},
                },
                {
                    'user': self.admin.id,
                    'role': 'admin',
                    'title': 'Lead',
                    'panel_permissions': {},
                },
            ]
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        project.refresh_from_db()
        existing_membership.refresh_from_db()
        extra_membership.refresh_from_db()

        self.assertEqual(existing_membership.role, 'manager')
        self.assertTrue(existing_membership.panel_permissions['collection']['manage'])
        new_membership = project.memberships.get(user=self.admin)
        self.assertEqual(new_membership.role, 'admin')
        self.assertFalse(extra_membership.is_active)

    def test_sync_memberships_rejects_duplicate_users(self):
        project = InsightProject.objects.create(
            code='PRJ3',
            name='Duplicate Test',
            description='',
            owner=self.admin,
            types=['Tracking'],
        )
        membership = InsightMembership.objects.create(
            project=project,
            user=self.other_user,
            role='viewer',
            panel_permissions={},
        )

        url = reverse('insightzen-projects-sync-memberships', args=[project.id])
        payload = {
            'memberships': [
                {
                    'id': membership.id,
                    'user': self.other_user.id,
                    'role': 'manager',
                    'panel_permissions': {},
                },
                {
                    'user': self.other_user.id,
                    'role': 'viewer',
                    'panel_permissions': {},
                },
            ]
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        membership.refresh_from_db()
        self.assertEqual(membership.role, 'viewer')
        self.assertEqual(project.memberships.filter(is_active=True).count(), 1)

    def test_quota_scheme_workflow(self):
        project = InsightProject.objects.create(
            code='PRJ4',
            name='Quota Project',
            description='',
            owner=self.admin,
            types=['Tracking'],
        )
        InsightMembership.objects.create(
            project=project,
            user=self.admin,
            role='manager',
            panel_permissions={'collection': {'quota-management': True}},
        )

        list_url = reverse('insightzen-quotas-schemes-list')
        payload = {
            'project': project.id,
            'name': 'Wave-1',
            'dimensions': [
                {'key': 'gender', 'values': [{'value': 'male'}, {'value': 'female'}]},
                {'key': 'province_code', 'values': [{'value': '01'}, {'value': '02'}]},
            ],
            'overflow_policy': 'weighted',
            'priority': 5,
            'is_default': True,
        }

        create_response = self.client.post(list_url, payload, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        scheme_id = create_response.data['id']
        scheme = QuotaScheme.objects.get(pk=scheme_id)
        self.assertEqual(scheme.project_id, project.id)
        self.assertTrue(scheme.is_default)

        bulk_url = reverse('insightzen-quotas-schemes-bulk-upsert-cells', args=[scheme_id])
        bulk_payload = {
            'cells': [
                {
                    'selector': {'gender': 'female', 'province_code': '01'},
                    'label': 'Female / North',
                    'target': 10,
                    'soft_cap': 12,
                    'weight': 1.2,
                },
                {
                    'selector': {'gender': 'male', 'province_code': '02'},
                    'label': 'Male / South',
                    'target': 8,
                    'soft_cap': 9,
                    'weight': 1.0,
                },
            ]
        }

        bulk_response = self.client.post(bulk_url, bulk_payload, format='json')
        self.assertEqual(bulk_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(bulk_response.data), 2)

        publish_url = reverse('insightzen-quotas-schemes-publish', args=[scheme_id])
        publish_response = self.client.post(publish_url, {'is_default': True}, format='json')
        self.assertEqual(publish_response.status_code, status.HTTP_200_OK)
        scheme.refresh_from_db()
        self.assertEqual(scheme.status, QuotaScheme.STATUS_PUBLISHED)
        self.assertIsNotNone(scheme.published_at)

        cells_url = reverse('insightzen-quotas-schemes-list-cells', args=[scheme_id])
        cells_response = self.client.get(cells_url)
        self.assertEqual(cells_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(cells_response.data), 2)

        stats_url = reverse('insightzen-quotas-schemes-stats', args=[scheme_id])
        stats_response = self.client.get(stats_url)
        self.assertEqual(stats_response.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_response.data['target_total'], 18)

    def test_collection_performance_summary_and_table(self):
        project = InsightProject.objects.create(
            code='PRJ5',
            name='Performance Project',
            description='',
            owner=self.admin,
            types=['Tracking'],
        )
        InsightMembership.objects.create(
            project=project,
            user=self.admin,
            role='manager',
            panel_permissions={'collection': {'collection-performance': True}},
        )
        InsightMembership.objects.create(
            project=project,
            user=self.third_user,
            role='agent',
            panel_permissions={'collection': {'telephone-interviewer': True}},
        )

        scheme = QuotaScheme.objects.create(
            project=project,
            name='Wave-1',
            dimensions=[],
            overflow_policy='strict',
            priority=0,
            created_by=self.admin,
        )
        cell = QuotaCell.objects.create(
            scheme=scheme,
            selector={},
            label='All sample',
            target=5,
        )
        sample = SampleContact.objects.create(
            project=project,
            quota_cell=cell,
            phone_number='+989120000000',
            attempt_count=1,
        )
        assignment = DialerAssignment.objects.create(
            project=project,
            scheme=scheme,
            cell=cell,
            interviewer=self.third_user,
            sample=sample,
            expires_at=timezone.now() + timedelta(minutes=15),
        )
        Interview.objects.create(
            assignment=assignment,
            start_form=timezone.now() - timedelta(minutes=10),
            end_form=timezone.now(),
            status=Interview.STATUS_COMPLETED,
            outcome_code='COMP',
        )

        summary_url = reverse('insightzen-collection-performance-summary')
        response = self.client.get(summary_url, {'project': project.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['totals']['completes'], 1)
        self.assertEqual(response.data['totals']['attempts'], 1)

        table_url = reverse('insightzen-collection-performance-table')
        table_response = self.client.get(table_url, {'project': project.id})
        self.assertEqual(table_response.status_code, status.HTTP_200_OK)
        self.assertEqual(table_response.data['count'], 1)
        self.assertEqual(table_response.data['results'][0]['outcome_code'], 'COMP')

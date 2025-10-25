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

User = get_user_model()


class DialerAssignmentAPITests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user('manager', 'manager@example.com', 'pass1234')
        self.interviewer = User.objects.create_user('interviewer', 'interviewer@example.com', 'pass1234')

        self.project = InsightProject.objects.create(
            code='PRJ-DIAL',
            name='Dialer Project',
            description='',
            owner=self.manager,
            types=['Tracking'],
        )
        self.scheme = QuotaScheme.objects.create(
            project=self.project,
            name='Main Scheme',
            created_by=self.manager,
            is_default=True,
            status=QuotaScheme.STATUS_PUBLISHED,
        )
        self.cell = QuotaCell.objects.create(
            scheme=self.scheme,
            selector={},
            label='Cell 1',
            target=2,
        )
        self.scheme.published_at = timezone.now()
        self.scheme.save(update_fields=['published_at'])

        self.sample_one = SampleContact.objects.create(
            project=self.project,
            quota_cell=self.cell,
            phone_number='+9800000001',
            attributes={},
        )
        self.sample_two = SampleContact.objects.create(
            project=self.project,
            quota_cell=self.cell,
            phone_number='+9800000002',
            attributes={},
        )

        InsightMembership.objects.create(
            project=self.project,
            user=self.manager,
            role='manager',
            panel_permissions={'collection': {'telephone-interviewer': True}},
        )
        InsightMembership.objects.create(
            project=self.project,
            user=self.interviewer,
            role='agent',
            panel_permissions={'collection': {'telephone-interviewer': True}},
        )

        self.client.force_authenticate(self.manager)

    def test_reserve_and_complete_assignment(self):
        next_url = reverse('insightzen-dialer-next')
        response = self.client.post(
            next_url,
            {'project': self.project.id, 'interviewer': self.interviewer.id},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        assignment_id = response.data['id']
        assignment = DialerAssignment.objects.get(pk=assignment_id)
        self.assertEqual(assignment.sample_id, self.sample_one.id)
        self.assertFalse(Interview.objects.filter(assignment=assignment).exists())

        complete_url = reverse('insightzen-assignments-complete', args=[assignment_id])
        complete_response = self.client.post(
            complete_url,
            {'outcome_code': 'COMP', 'meta': {'duration': 120}},
            format='json',
        )
        self.assertEqual(complete_response.status_code, status.HTTP_200_OK)
        assignment.refresh_from_db()
        self.cell.refresh_from_db()
        self.assertEqual(assignment.status, DialerAssignment.STATUS_COMPLETED)
        self.assertEqual(assignment.outcome_code, 'COMP')
        self.assertEqual(self.cell.achieved, 1)
        self.assertEqual(self.cell.in_progress, 0)
        self.assertTrue(Interview.objects.filter(assignment=assignment).exists())

        # Completed sample should not be assigned again
        response_again = self.client.post(
            next_url,
            {'project': self.project.id, 'interviewer': self.interviewer.id},
            format='json',
        )
        self.assertEqual(response_again.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response_again.data['sample'], self.sample_two.id)

    def test_double_reservation_prevented(self):
        next_url = reverse('insightzen-dialer-next')
        first = self.client.post(
            next_url,
            {'project': self.project.id, 'interviewer': self.interviewer.id},
            format='json',
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(
            next_url,
            {'project': self.project.id, 'interviewer': self.interviewer.id},
            format='json',
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', second.data)

        assignment = DialerAssignment.objects.get(pk=first.data['id'])
        assignment.expires_at = timezone.now() - timedelta(minutes=1)
        assignment.save(update_fields=['expires_at'])

        expire_url = reverse('insightzen-assignments-expire', args=[assignment.id])
        expire_response = self.client.post(expire_url, {}, format='json')
        self.assertEqual(expire_response.status_code, status.HTTP_200_OK)
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, DialerAssignment.STATUS_EXPIRED)

        third = self.client.post(
            next_url,
            {'project': self.project.id, 'interviewer': self.interviewer.id},
            format='json',
        )
        self.assertEqual(third.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(third.data['id'], assignment.id)

    def test_interviewer_start_and_complete(self):
        self.client.force_authenticate(self.interviewer)
        next_url = reverse('insightzen-dialer-next')
        reserve = self.client.post(
            next_url,
            {'project': self.project.id},
            format='json',
        )
        self.assertEqual(reserve.status_code, status.HTTP_201_CREATED)
        assignment_id = reserve.data['id']

        start_url = reverse('insightzen-interviews-start', args=[assignment_id])
        start_response = self.client.post(start_url, {}, format='json')
        self.assertEqual(start_response.status_code, status.HTTP_200_OK)

        complete_url = reverse('insightzen-interviews-complete', args=[assignment_id])
        complete_response = self.client.post(
            complete_url,
            {'outcome_code': 'COMP'},
            format='json',
        )
        self.assertEqual(complete_response.status_code, status.HTTP_200_OK)
        assignment = DialerAssignment.objects.get(pk=assignment_id)
        self.assertEqual(assignment.status, DialerAssignment.STATUS_COMPLETED)
        self.assertEqual(assignment.outcome_code, 'COMP')

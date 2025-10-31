from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from hub.models.extra_user_detail import (
    AccountTypeChoices,
    MODULE_ALL,
    MODULE_MANAGEMENT,
    PaymentStatusChoices,
)
from kobo.apps.accounts.utils import apply_account_configuration
from kobo.apps.kobo_auth.shortcuts import User


class ModuleAccessViewSetTests(APITestCase):
    databases = {'default', 'kobocat'}

    def setUp(self):
        self.personal_user = User.objects.create_user(
            username='personal',
            email='personal@example.com',
            password='pass',
        )
        apply_account_configuration(
            self.personal_user,
            AccountTypeChoices.PERSONAL,
            save_extra_details=True,
            reset_model_permissions=True,
        )

        self.org_user = User.objects.create_user(
            username='org',
            email='org@example.com',
            password='pass',
        )
        apply_account_configuration(
            self.org_user,
            AccountTypeChoices.ORGANIZATIONAL,
            save_extra_details=True,
            reset_model_permissions=True,
        )
        extra_details = self.org_user.extra_details
        extra_details.payment_status = PaymentStatusChoices.CONFIRMED
        extra_details.module_access = [MODULE_ALL]
        extra_details.save(update_fields=['payment_status', 'module_access'])

    def test_personal_account_cannot_retrieve_module(self):
        self.client.force_login(self.personal_user)
        url = reverse('module-access-detail', kwargs={'pk': 'management'})

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_organizational_account_can_retrieve_module(self):
        self.client.force_login(self.org_user)
        url = reverse('module-access-detail', kwargs={'pk': 'management'})

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['module'], MODULE_MANAGEMENT)

    def test_list_marks_availability(self):
        self.client.force_login(self.personal_user)
        url = reverse('module-access-list')

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        record = next(item for item in response.data if item['module'] == MODULE_MANAGEMENT)
        self.assertFalse(record['allowed'])

        self.client.force_login(self.org_user)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        record = next(item for item in response.data if item['module'] == MODULE_MANAGEMENT)
        self.assertTrue(record['allowed'])

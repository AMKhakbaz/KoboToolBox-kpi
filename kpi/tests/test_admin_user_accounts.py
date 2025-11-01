from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from hub.models.extra_user_detail import (
    AccountTypeChoices,
    MODULE_FORM_MANAGER,
    MODULE_LIBRARY,
    PaymentStatusChoices,
    PERSONAL_ACCOUNT_STORAGE_LIMIT_BYTES,
)
from kobo.apps.accounts.utils import apply_account_configuration
from kobo.apps.kobo_auth.shortcuts import User


class AdminUserAccountTypeViewTests(APITestCase):
    databases = {'default', 'kobocat'}

    def setUp(self):
        self.superuser = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='pass',
        )
        self.target = User.objects.create_user(
            username='target',
            email='target@example.com',
            password='pass',
        )
        apply_account_configuration(
            self.target,
            AccountTypeChoices.PERSONAL,
            save_extra_details=True,
            reset_model_permissions=True,
        )

    def test_superuser_can_update_account_type(self):
        self.client.force_login(self.superuser)
        url = reverse('admin-users-detail', kwargs={'username': self.target.username})

        response = self.client.patch(
            url,
            {'account_type': AccountTypeChoices.ORGANIZATIONAL},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['account_type'], AccountTypeChoices.ORGANIZATIONAL)
        self.assertEqual(response.data['module_access'], [])
        self.assertEqual(response.data['payment_status'], PaymentStatusChoices.PENDING)
        self.assertIsNone(response.data['storage_quota_bytes'])

        self.target.refresh_from_db()
        extra_details = self.target.extra_details
        self.assertEqual(extra_details.account_type, AccountTypeChoices.ORGANIZATIONAL)
        self.assertEqual(extra_details.payment_status, PaymentStatusChoices.PENDING)
        self.assertEqual(extra_details.module_access, [])
        self.assertIsNone(extra_details.storage_quota_bytes)
        self.assertFalse(self.target.has_perm('kpi.view_asset'))

        response = self.client.patch(
            url,
            {'account_type': AccountTypeChoices.PERSONAL},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['account_type'], AccountTypeChoices.PERSONAL)
        self.assertCountEqual(
            response.data['module_access'],
            [MODULE_FORM_MANAGER, MODULE_LIBRARY],
        )
        self.assertEqual(
            response.data['storage_quota_bytes'],
            PERSONAL_ACCOUNT_STORAGE_LIMIT_BYTES,
        )
        self.assertEqual(
            response.data['payment_status'], PaymentStatusChoices.NOT_REQUIRED,
        )

        self.target.refresh_from_db()
        extra_details = self.target.extra_details
        self.assertEqual(extra_details.account_type, AccountTypeChoices.PERSONAL)
        self.assertCountEqual(
            extra_details.module_access,
            [MODULE_FORM_MANAGER, MODULE_LIBRARY],
        )
        self.assertEqual(
            extra_details.storage_quota_bytes,
            PERSONAL_ACCOUNT_STORAGE_LIMIT_BYTES,
        )
        self.assertTrue(self.target.has_perm('kpi.view_asset'))

    def test_non_superuser_cannot_update_account_type(self):
        self.client.force_login(self.target)
        url = reverse('admin-users-detail', kwargs={'username': self.target.username})

        response = self.client.patch(
            url,
            {'account_type': AccountTypeChoices.ORGANIZATIONAL},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_can_retrieve_account_metadata(self):
        self.client.force_login(self.superuser)
        url = reverse('admin-users-detail', kwargs={'username': self.target.username})

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['account_type'], AccountTypeChoices.PERSONAL)
        self.assertCountEqual(
            response.data['module_access'],
            [MODULE_FORM_MANAGER, MODULE_LIBRARY],
        )

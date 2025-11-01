# coding: utf-8
import constance
from constance.test import override_config
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils.translation import gettext as t

from hub.models.extra_user_detail import (
    AccountTypeChoices,
    MODULE_ALL,
    MODULE_FORM_MANAGER,
    MODULE_LIBRARY,
    PaymentStatusChoices,
    PERSONAL_ACCOUNT_STORAGE_LIMIT_BYTES,
)
from kobo.apps.openrosa.apps.main.models.user_profile import UserProfile


class RegistrationTestCase(TestCase):
    @property
    def valid_data(self):
        User = get_user_model()
        return {
            'name': 'alice',
            User.USERNAME_FIELD: 'alice',
            'email': 'alice@example.com',
            'password1': 'swordfish',
            'password2': 'swordfish',
            'account_type': AccountTypeChoices.PERSONAL,
        }

    # use `override_config` decorator to deactivate all password validators
    # to let this test use a simple password.
    @override_config(
        ENABLE_PASSWORD_MINIMUM_LENGTH_VALIDATION=False,
        ENABLE_PASSWORD_USER_ATTRIBUTE_SIMILARITY_VALIDATION=False,
        ENABLE_MOST_RECENT_PASSWORD_VALIDATION=False,
        ENABLE_COMMON_PASSWORD_VALIDATION=False,
        ENABLE_PASSWORD_CUSTOM_CHARACTER_RULES_VALIDATION=False,
    )
    def test_empty_string_allows_all_domains(self):
        self.assertEqual(
            constance.config.REGISTRATION_ALLOWED_EMAIL_DOMAINS, ''
        )
        response = self.client.post(
            reverse('account_signup'), data=self.valid_data
        )
        self.assertRedirects(response, '/accounts/confirm-email/')
        user = get_user_model().objects.get(username='alice')
        user.extra_details.refresh_from_db()
        self.assertEqual(
            user.extra_details.account_type, AccountTypeChoices.PERSONAL
        )
        self.assertEqual(
            user.extra_details.payment_status, PaymentStatusChoices.NOT_REQUIRED
        )
        self.assertEqual(
            user.extra_details.module_access,
            [MODULE_FORM_MANAGER, MODULE_LIBRARY],
        )
        self.assertEqual(
            user.extra_details.storage_quota_bytes,
            PERSONAL_ACCOUNT_STORAGE_LIMIT_BYTES,
        )

    # use `override_config` decorator to deactivate all password validators
    # to let this test use a simple password.
    @override_config(
        ENABLE_PASSWORD_MINIMUM_LENGTH_VALIDATION=False,
        ENABLE_PASSWORD_USER_ATTRIBUTE_SIMILARITY_VALIDATION=False,
        ENABLE_MOST_RECENT_PASSWORD_VALIDATION=False,
        ENABLE_COMMON_PASSWORD_VALIDATION=False,
        ENABLE_PASSWORD_CUSTOM_CHARACTER_RULES_VALIDATION=False,
        REGISTRATION_ALLOWED_EMAIL_DOMAINS='foo.bar\nexample.com'
    )
    def test_allowed_domain_can_register(self):
        response = self.client.post(
            reverse('account_signup'), data=self.valid_data
        )
        self.assertRedirects(response, '/accounts/confirm-email/')

    # use `override_config` decorator to deactivate all password validators
    # to let this test use a simple password.
    @override_config(
        ENABLE_PASSWORD_MINIMUM_LENGTH_VALIDATION=False,
        ENABLE_PASSWORD_USER_ATTRIBUTE_SIMILARITY_VALIDATION=False,
        ENABLE_MOST_RECENT_PASSWORD_VALIDATION=False,
        ENABLE_COMMON_PASSWORD_VALIDATION=False,
        ENABLE_PASSWORD_CUSTOM_CHARACTER_RULES_VALIDATION=False,
        REGISTRATION_ALLOWED_EMAIL_DOMAINS='foo.bar\nbaz.qux'
    )
    def test_disallowed_domain_cannot_register(self):
        response = self.client.post(
            reverse('account_signup'), data=self.valid_data
        )
        self.assertIn(
            t('This email domain is not allowed to create an account').encode(),
            response.content,
        )

    def test_organizational_account_requires_payment(self):
        data = self.valid_data.copy()
        data['username'] = 'orga'
        data['email'] = 'orga@example.com'
        data['account_type'] = AccountTypeChoices.ORGANIZATIONAL
        response = self.client.post(reverse('account_signup'), data=data)
        self.assertRedirects(response, reverse('payments-temp-confirm'))
        user = get_user_model().objects.get(username='orga')
        extra_details = user.extra_details
        self.assertEqual(extra_details.account_type, AccountTypeChoices.ORGANIZATIONAL)
        self.assertEqual(extra_details.payment_status, PaymentStatusChoices.PENDING)
        self.assertEqual(extra_details.module_access, [])
        self.assertIsNone(extra_details.storage_quota_bytes)
        profile = UserProfile.objects.get(user=user)
        self.assertEqual(profile.account_type, AccountTypeChoices.ORGANIZATIONAL)

        session = self.client.session
        session['pending_payment_user_pk'] = user.pk
        session.save()

        response = self.client.get(reverse('payments-temp-confirm'))
        self.assertEqual(response.status_code, 200)

        response = self.client.post(reverse('payments-temp-confirm'))
        self.assertRedirects(response, reverse('account_email_verification_sent'))
        extra_details.refresh_from_db()
        self.assertEqual(extra_details.payment_status, PaymentStatusChoices.CONFIRMED)
        self.assertEqual(extra_details.module_access, [MODULE_ALL])
        self.assertIsNone(extra_details.storage_quota_bytes)
        self.assertIsNotNone(extra_details.payment_confirmed_at)

    def test_pending_payment_blocks_permissions(self):
        data = self.valid_data.copy()
        data['username'] = 'pending'
        data['email'] = 'pending@example.com'
        data['account_type'] = AccountTypeChoices.ORGANIZATIONAL
        self.client.post(reverse('account_signup'), data=data)
        user = get_user_model().objects.get(username='pending')
        self.assertFalse(user.user_permissions.exists())

        session = self.client.session
        session['pending_payment_user_pk'] = user.pk
        session.save()

        self.client.post(reverse('payments-temp-confirm'))
        user.refresh_from_db()
        self.assertTrue(user.user_permissions.exists())

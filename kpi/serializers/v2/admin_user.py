from rest_framework import serializers

from hub.models.extra_user_detail import (
    AccountTypeChoices,
    PaymentStatusChoices,
    PERSONAL_ACCOUNT_STORAGE_LIMIT_BYTES,
)
from kobo.apps.accounts.utils import apply_account_configuration


class AdminUserAccountSerializer(serializers.Serializer):
    username = serializers.CharField(read_only=True)
    account_type = serializers.ChoiceField(choices=AccountTypeChoices.choices)
    module_access = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
    )
    storage_quota_bytes = serializers.IntegerField(read_only=True, allow_null=True)
    payment_status = serializers.CharField(read_only=True)
    payment_confirmed_at = serializers.DateTimeField(read_only=True, allow_null=True)

    def update(self, instance, validated_data):
        account_type = validated_data['account_type']
        apply_account_configuration(
            instance,
            account_type,
            save_extra_details=True,
            reset_model_permissions=True,
        )
        return instance

    def to_representation(self, instance):
        extra_details = getattr(instance, 'extra_details', None)
        if not extra_details:
            module_access = []
            storage_quota = None
            payment_status = PaymentStatusChoices.NOT_REQUIRED
            account_type = AccountTypeChoices.PERSONAL
            confirmed_at = None
        else:
            module_access = list(extra_details.module_access or [])
            storage_quota = extra_details.storage_quota_bytes
            payment_status = extra_details.payment_status
            account_type = (
                extra_details.account_type or AccountTypeChoices.PERSONAL
            )
            confirmed_at = extra_details.payment_confirmed_at

        # Ensure personal accounts always report the default quota when no
        # explicit limit has been set.
        if (
            account_type == AccountTypeChoices.PERSONAL
            and storage_quota is None
        ):
            storage_quota = PERSONAL_ACCOUNT_STORAGE_LIMIT_BYTES

        return {
            'username': instance.username,
            'account_type': account_type,
            'module_access': module_access,
            'storage_quota_bytes': storage_quota,
            'payment_status': payment_status,
            'payment_confirmed_at': self.fields[
                'payment_confirmed_at'
            ].to_representation(confirmed_at),
        }

    def create(self, validated_data):  # pragma: no cover - not used by viewset
        raise NotImplementedError

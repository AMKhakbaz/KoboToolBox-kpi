from __future__ import annotations

from typing import Any

from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import (
    DialerAssignment,
    InsightMembership,
    InsightProject,
    InsightUserProfile,
    Interview,
    QuotaCell,
    QuotaScheme,
    SampleContact,
    ensure_user_profile,
    update_user_profile,
)

User = get_user_model()


class InsightMembershipSerializer(serializers.ModelSerializer):
    project_code = serializers.CharField(source='project.code', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = InsightMembership
        fields = (
            'id',
            'user',
            'project',
            'project_code',
            'project_name',
            'user_username',
            'user_full_name',
            'title',
            'role',
            'panel_permissions',
            'is_active',
            'created_at',
        )
        read_only_fields = (
            'id',
            'created_at',
            'project_code',
            'project_name',
            'user_username',
            'user_full_name',
        )
        extra_kwargs = {'user': {'read_only': True}}

    def validate_panel_permissions(self, value: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(value, dict):
            raise serializers.ValidationError(_('Panel permissions must be an object.'))
        return value

    def validate_project(self, project: InsightProject) -> InsightProject:
        request = self.context.get('request')
        if request and not (request.user.is_staff or request.user.is_superuser):
            allowed_project_ids = set(
                InsightMembership.objects.filter(user=request.user, is_active=True).values_list('project_id', flat=True)
            )
            if project.pk not in allowed_project_ids:
                raise serializers.ValidationError(_('You do not have access to this project.'))
        return project

    def get_user_full_name(self, obj: InsightMembership) -> str:
        first = getattr(obj.user, 'first_name', '') or ''
        last = getattr(obj.user, 'last_name', '') or ''
        full_name = f"{first} {last}".strip()
        return full_name or obj.user.username


class InsightMembershipSyncSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    title = serializers.CharField(required=False, allow_blank=True, max_length=128)
    role = serializers.ChoiceField(choices=InsightMembership.ROLE_CHOICES)
    panel_permissions = serializers.JSONField(required=False)

    def validate_panel_permissions(self, value: Any) -> dict[str, Any]:
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError(_('Panel permissions must be provided as an object.'))
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        project: InsightProject | None = self.context.get('project')
        request = self.context.get('request')
        if request and project and not (request.user.is_staff or request.user.is_superuser):
            allowed_project_ids = set(
                InsightMembership.objects.filter(user=request.user, is_active=True).values_list('project_id', flat=True)
            )
            if project.pk not in allowed_project_ids:
                raise serializers.ValidationError(_('You do not have access to this project.'))
        return attrs


class InsightMembershipBriefSerializer(serializers.ModelSerializer):
    project_code = serializers.CharField(source='project.code')
    project_name = serializers.CharField(source='project.name')

    class Meta:
        model = InsightMembership
        fields = (
            'id',
            'project',
            'project_code',
            'project_name',
            'role',
            'title',
            'is_active',
        )


class InsightProjectSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    memberships = InsightMembershipSerializer(many=True, read_only=True)
    membership_count = serializers.SerializerMethodField()

    class Meta:
        model = InsightProject
        fields = (
            'id',
            'code',
            'name',
            'description',
            'owner',
            'owner_username',
            'types',
            'status',
            'start_date',
            'end_date',
            'created_at',
            'updated_at',
            'membership_count',
            'memberships',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'membership_count', 'memberships', 'owner_username')

    def validate_types(self, value: list[str]) -> list[str]:
        if not isinstance(value, list):
            raise serializers.ValidationError(_('Types must be provided as a list.'))
        unique_values: list[str] = []
        seen = set()
        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError(_('Each project type must be a string.'))
            normalized = item.strip()
            if not normalized:
                continue
            lowered = normalized.lower()
            if lowered in seen:
                continue
            seen.add(lowered)
            unique_values.append(normalized)
        return unique_values

    def validate_status(self, value: str) -> str:
        allowed = {choice[0] for choice in InsightProject._meta.get_field('status').choices}
        if value not in allowed:
            raise serializers.ValidationError(_('Invalid project status.'))
        return value

    def get_membership_count(self, obj: InsightProject) -> int:
        return obj.memberships.filter(is_active=True).count()


class InterviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interview
        fields = (
            'id',
            'assignment',
            'start_form',
            'end_form',
            'status',
            'outcome_code',
            'meta',
        )
        read_only_fields = ('id', 'assignment', 'start_form', 'end_form', 'status', 'outcome_code', 'meta')


class SampleContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleContact
        fields = (
            'id',
            'project',
            'quota_cell',
            'phone_id',
            'person_id',
            'phone_number',
            'full_name',
            'gender',
            'age_band',
            'province_code',
            'city_code',
            'attributes',
            'is_active',
            'status',
            'attempt_count',
            'last_attempt_at',
            'interviewer',
            'used_at',
            'created_at',
        )
        read_only_fields = (
            'id',
            'used_at',
            'created_at',
            'status',
            'attempt_count',
            'last_attempt_at',
        )


class QuotaSchemeSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = QuotaScheme
        fields = (
            'id',
            'project',
            'name',
            'version',
            'status',
            'dimensions',
            'overflow_policy',
            'priority',
            'is_default',
            'created_by',
            'created_by_username',
            'created_at',
            'updated_at',
            'published_at',
        )
        read_only_fields = (
            'id',
            'created_by_username',
            'created_at',
            'updated_at',
            'published_at',
        )

    def validate_dimensions(self, value: Any) -> list[dict[str, Any]]:
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError(_('Dimensions must be provided as a list.'))
        normalized: list[dict[str, Any]] = []
        for dimension in value:
            if not isinstance(dimension, dict):
                raise serializers.ValidationError(_('Each dimension definition must be an object.'))
            key = dimension.get('key')
            if not key or not isinstance(key, str):
                raise serializers.ValidationError(_('Dimension key is required.'))
            values = dimension.get('values', [])
            if values and not isinstance(values, list):
                raise serializers.ValidationError(_('Dimension values must be a list.'))
            normalized.append(dimension)
        return normalized

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        status = attrs.get('status') or getattr(self.instance, 'status', None)
        if self.instance and self.instance.status != QuotaScheme.STATUS_DRAFT and status != self.instance.status:
            raise serializers.ValidationError(_('Only draft schemes can change status directly.'))
        return super().validate(attrs)


class QuotaSchemePublishSerializer(serializers.Serializer):
    is_default = serializers.BooleanField(required=False)


class QuotaCellSerializer(serializers.ModelSerializer):
    remaining = serializers.SerializerMethodField()
    capacity = serializers.SerializerMethodField()

    class Meta:
        model = QuotaCell
        fields = (
            'id',
            'scheme',
            'selector',
            'label',
            'target',
            'soft_cap',
            'weight',
            'achieved',
            'in_progress',
            'reserved',
            'remaining',
            'capacity',
            'updated_at',
        )
        read_only_fields = ('id', 'achieved', 'in_progress', 'reserved', 'remaining', 'capacity', 'updated_at')

    def get_remaining(self, obj: QuotaCell) -> int | None:
        scheme = getattr(obj, 'scheme', None)
        policy = scheme.overflow_policy if scheme else QuotaScheme.OVERFLOW_STRICT
        remaining = obj.remaining_slots(policy)
        return None if remaining is None else int(remaining)

    def get_capacity(self, obj: QuotaCell) -> int | None:
        scheme = getattr(obj, 'scheme', None)
        policy = scheme.overflow_policy if scheme else QuotaScheme.OVERFLOW_STRICT
        limit = obj.capacity_limit(policy)
        return None if limit is None else int(limit)


class QuotaCellUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotaCell
        fields = ('label', 'target', 'soft_cap', 'weight')

    def validate_target(self, value: int) -> int:
        if value is None or value < 0:
            raise serializers.ValidationError(_('Target must be a non-negative integer.'))
        return value

    def validate_soft_cap(self, value: int | None) -> int | None:
        if value is not None and value < 0:
            raise serializers.ValidationError(_('Soft cap must be non-negative.'))
        return value

    def validate_weight(self, value: float) -> float:
        if value <= 0:
            raise serializers.ValidationError(_('Weight must be greater than zero.'))
        return value


class QuotaCellBulkUpsertSerializer(serializers.Serializer):
    cells = serializers.ListField(child=serializers.DictField(), allow_empty=False)


class QuotaSchemeStatsSerializer(serializers.Serializer):
    target_total = serializers.IntegerField()
    achieved_total = serializers.IntegerField()
    in_progress_total = serializers.IntegerField()
    remaining_total = serializers.IntegerField()
    by_dimension = serializers.DictField(child=serializers.DictField())


class DialerAssignmentSerializer(serializers.ModelSerializer):
    interviewer_username = serializers.CharField(source='interviewer.username', read_only=True)
    interviewer_full_name = serializers.SerializerMethodField()
    project_code = serializers.CharField(source='project.code', read_only=True)
    scheme_name = serializers.CharField(source='scheme.name', read_only=True)
    cell_label = serializers.CharField(source='cell.label', read_only=True)
    cell_selector = serializers.JSONField(source='cell.selector', read_only=True)
    cell_target = serializers.IntegerField(source='cell.target', read_only=True)
    cell_achieved = serializers.IntegerField(source='cell.achieved', read_only=True)
    cell_in_progress = serializers.IntegerField(source='cell.in_progress', read_only=True)
    sample_phone_number = serializers.CharField(source='sample.phone_number', read_only=True)
    sample_full_name = serializers.CharField(source='sample.full_name', read_only=True)
    sample_attributes = serializers.JSONField(source='sample.attributes', read_only=True)
    sample_gender = serializers.CharField(source='sample.gender', read_only=True)
    sample_age_band = serializers.CharField(source='sample.age_band', read_only=True)
    sample_province_code = serializers.CharField(source='sample.province_code', read_only=True)
    sample_city_code = serializers.CharField(source='sample.city_code', read_only=True)
    sample_status = serializers.CharField(source='sample.status', read_only=True)
    sample_attempt_count = serializers.IntegerField(source='sample.attempt_count', read_only=True)
    sample_last_attempt_at = serializers.DateTimeField(source='sample.last_attempt_at', read_only=True)
    interview = InterviewSerializer(read_only=True)

    class Meta:
        model = DialerAssignment
        fields = (
            'id',
            'project',
            'project_code',
            'scheme',
            'scheme_name',
            'cell',
            'cell_label',
            'cell_selector',
            'cell_target',
            'cell_achieved',
            'cell_in_progress',
            'interviewer',
            'interviewer_username',
            'interviewer_full_name',
            'sample',
            'sample_phone_number',
            'sample_full_name',
            'sample_gender',
            'sample_age_band',
            'sample_province_code',
            'sample_city_code',
            'sample_attributes',
            'sample_status',
            'sample_attempt_count',
            'sample_last_attempt_at',
            'status',
            'reserved_at',
            'expires_at',
            'completed_at',
            'outcome_code',
            'meta',
            'interview',
        )
        read_only_fields = (
            'id',
            'project_code',
            'scheme_name',
            'cell_label',
            'cell_selector',
            'cell_target',
            'cell_achieved',
            'cell_in_progress',
            'interviewer_username',
            'interviewer_full_name',
            'sample_phone_number',
            'sample_full_name',
            'sample_gender',
            'sample_age_band',
            'sample_province_code',
            'sample_city_code',
            'sample_attributes',
            'sample_status',
            'sample_attempt_count',
            'sample_last_attempt_at',
            'status',
            'reserved_at',
            'completed_at',
            'interview',
        )

    def get_interviewer_full_name(self, obj: DialerAssignment) -> str:
        first = getattr(obj.interviewer, 'first_name', '') or ''
        last = getattr(obj.interviewer, 'last_name', '') or ''
        full_name = f"{first} {last}".strip()
        return full_name or obj.interviewer.username

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        project = attrs.get('project') or getattr(self.instance, 'project', None)
        scheme = attrs.get('scheme') or getattr(self.instance, 'scheme', None)
        cell = attrs.get('cell') or getattr(self.instance, 'cell', None)
        sample = attrs.get('sample') or getattr(self.instance, 'sample', None)

        if project and scheme and scheme.project_id != project.id:
            raise serializers.ValidationError(_('Scheme must belong to the selected project.'))
        if project and cell and cell.scheme.project_id != project.id:
            raise serializers.ValidationError(_('Cell must belong to the selected project.'))
        if sample and project and sample.project_id != project.id:
            raise serializers.ValidationError(_('Sample must belong to the selected project.'))
        return attrs

    def validate_sample(self, sample: SampleContact) -> SampleContact:
        if sample.assignments.filter(status=DialerAssignment.STATUS_RESERVED).exists():
            raise serializers.ValidationError(_('Sample already has an active reservation.'))
        return sample

    def create(self, validated_data: dict[str, Any]) -> DialerAssignment:
        assignment = super().create(validated_data)
        Interview.objects.get_or_create(assignment=assignment)
        return assignment


class AssignmentStatusSerializer(serializers.Serializer):
    outcome_code = serializers.CharField(required=False, allow_blank=True, max_length=8)
    meta = serializers.JSONField(required=False)


class AssignmentFailSerializer(AssignmentStatusSerializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=128)


class InterviewActionSerializer(serializers.Serializer):
    outcome_code = serializers.CharField(required=False, allow_blank=True, max_length=8)
    meta = serializers.JSONField(required=False)


class InsightUserSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(required=False, allow_blank=True)
    preferred_locale = serializers.ChoiceField(choices=(('fa', 'fa'), ('en', 'en')), required=False)
    timezone = serializers.CharField(required=False)
    memberships = InsightMembershipSerializer(many=True, required=False, write_only=True)
    memberships_detail = InsightMembershipSerializer(source='insight_memberships', many=True, read_only=True)
    memberships_brief = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'phone',
            'preferred_locale',
            'timezone',
            'is_active',
            'is_staff',
            'memberships',
            'memberships_detail',
            'memberships_brief',
            'password',
        )
        read_only_fields = ('id', 'memberships_detail', 'memberships_brief')

    def to_representation(self, instance: User) -> dict[str, Any]:
        ensure_user_profile(instance)
        data = super().to_representation(instance)
        profile: InsightUserProfile | None = getattr(instance, 'insight_profile', None)
        if profile:
            data['phone'] = profile.phone
            data['preferred_locale'] = profile.preferred_locale
            data['timezone'] = profile.timezone
        else:
            data['phone'] = ''
            data['preferred_locale'] = 'fa'
            data['timezone'] = 'Asia/Tehran'
        return data

    def get_memberships_brief(self, obj: User) -> list[dict[str, Any]]:
        memberships = obj.insight_memberships.select_related('project').all()
        serializer = InsightMembershipBriefSerializer(memberships, many=True)
        return serializer.data

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        memberships = attrs.get('memberships')
        if memberships:
            for membership in memberships:
                if 'panel_permissions' in membership and not isinstance(membership['panel_permissions'], dict):
                    raise serializers.ValidationError(_('Panel permissions must be provided as an object.'))
        return super().validate(attrs)

    @transaction.atomic
    def create(self, validated_data: dict[str, Any]) -> User:
        memberships_data = validated_data.pop('memberships', [])
        phone = validated_data.pop('phone', '')
        preferred_locale = validated_data.pop('preferred_locale', 'fa')
        timezone_name = validated_data.pop('timezone', 'Asia/Tehran')
        password = validated_data.pop('password', None)

        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=['password'])
        else:
            user.set_unusable_password()
            user.save(update_fields=['password'])

        update_user_profile(
            user,
            phone=phone,
            preferred_locale=preferred_locale,
            timezone_name=timezone_name,
        )

        self._sync_memberships(user, memberships_data)
        return user

    @transaction.atomic
    def update(self, instance: User, validated_data: dict[str, Any]) -> User:
        memberships_data = validated_data.pop('memberships', None)
        phone = validated_data.pop('phone', None)
        preferred_locale = validated_data.pop('preferred_locale', None)
        timezone_name = validated_data.pop('timezone', None)
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if password:
            instance.set_password(password)
            instance.save(update_fields=['password'])

        update_user_profile(
            instance,
            phone=phone if phone is not None else getattr(instance.insight_profile, 'phone', ''),
            preferred_locale=preferred_locale if preferred_locale is not None else None,
            timezone_name=timezone_name if timezone_name is not None else None,
        )

        if memberships_data is not None:
            self._sync_memberships(instance, memberships_data)
        return instance

    def _sync_memberships(self, user: User, memberships_data: list[dict[str, Any]]) -> None:
        request = self.context.get('request')
        existing_memberships = {
            membership.id: membership
            for membership in user.insight_memberships.select_related('project')
        }
        processed_ids: set[int] = set()

        for membership_payload in memberships_data:
            membership_id = membership_payload.get('id')
            membership_serializer = InsightMembershipSerializer(
                instance=existing_memberships.get(membership_id),
                data=membership_payload,
                context=self.context,
            )
            membership_serializer.is_valid(raise_exception=True)
            membership = membership_serializer.save(user=user)
            processed_ids.add(membership.id)

        for membership_id, membership in existing_memberships.items():
            if membership_id not in processed_ids and membership.is_active:
                membership.is_active = False
                membership.save(update_fields=['is_active'])

        if request:
            # refresh cache for representation
            user.refresh_from_db()

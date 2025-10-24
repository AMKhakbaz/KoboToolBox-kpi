from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from django.db import connection, models, transaction
from django.db.models import F
from django.utils import timezone

User = get_user_model()


class InsightUserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='insight_profile',
    )
    display_name = models.CharField(max_length=128, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    preferred_locale = models.CharField(
        max_length=8,
        choices=(('fa', 'Persian'), ('en', 'English')),
        default='fa',
    )
    timezone = models.CharField(max_length=64, default='Asia/Tehran')
    team = models.CharField(max_length=64, blank=True)

    class Meta:
        verbose_name = 'InsightZen User Profile'
        verbose_name_plural = 'InsightZen User Profiles'

    def __str__(self) -> str:
        return f"{self.user.username} profile"

    @property
    def resolved_display_name(self) -> str:
        if self.display_name:
            return self.display_name
        first = (self.user.first_name or '').strip()
        last = (self.user.last_name or '').strip()
        if first or last:
            return f"{first} {last}".strip()
        return self.user.username


class InsightProjectQuerySet(models.QuerySet):
    def active_for_user(self, user: User) -> 'InsightProjectQuerySet':
        if user.is_superuser or user.is_staff:
            return self
        project_ids = InsightMembership.objects.filter(
            user=user,
            is_active=True,
        ).values_list('project_id', flat=True)
        return self.filter(pk__in=project_ids)


class InsightProject(models.Model):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=256)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_insightzen_projects',
    )
    types = ArrayField(
        base_field=models.CharField(max_length=64),
        default=list,
        blank=True,
    )
    status = models.CharField(
        max_length=32,
        choices=(('active', 'Active'), ('paused', 'Paused'), ('archived', 'Archived')),
        default='active',
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = InsightProjectQuerySet.as_manager()

    class Meta:
        ordering = ('name',)
        indexes = [
            models.Index(fields=('code',)),
            models.Index(fields=('status',)),
            GinIndex(fields=('types',), name='insightzen_types_gin'),
        ]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"


class InsightMembershipQuerySet(models.QuerySet):
    def active(self) -> 'InsightMembershipQuerySet':
        return self.filter(is_active=True)


class InsightMembership(models.Model):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('supervisor', 'Supervisor'),
        ('agent', 'Agent'),
        ('viewer', 'Viewer'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='insight_memberships',
    )
    project = models.ForeignKey(
        InsightProject,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    title = models.CharField(max_length=128, blank=True)
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default='viewer')
    panel_permissions = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = InsightMembershipQuerySet.as_manager()

    class Meta:
        unique_together = ('user', 'project')
        indexes = [
            models.Index(fields=('project', 'user')),
            models.Index(fields=('role',)),
        ]

    def __str__(self) -> str:
        return f"{self.user.username} → {self.project.code} ({self.role})"


class BankPerson(models.Model):
    person_id = models.BigIntegerField(primary_key=True)
    national_code = models.CharField(max_length=16, blank=True, null=True)
    gender = models.CharField(max_length=1, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    province_code = models.CharField(max_length=10, blank=True, null=True)
    city_code = models.CharField(max_length=10, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'bank"."bank_person'
        indexes = [
            models.Index(fields=('province_code',)),
            models.Index(fields=('city_code',)),
            models.Index(fields=('gender',)),
        ]

    def __str__(self) -> str:
        return f"Person {self.person_id}"


class BankPhone(models.Model):
    phone_id = models.BigIntegerField(primary_key=True)
    person = models.ForeignKey(
        BankPerson,
        on_delete=models.DO_NOTHING,
        db_column='person_id',
        related_name='phones',
    )
    msisdn = models.CharField(max_length=20, unique=True)
    is_mobile = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'bank"."bank_phone'
        indexes = [
            models.Index(fields=('person',)),
            models.Index(fields=('is_active',)),
            models.Index(fields=('msisdn',)),
        ]

    def __str__(self) -> str:
        return self.msisdn


class QuotaScheme(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_PUBLISHED = 'published'
    STATUS_ARCHIVED = 'archived'

    STATUS_CHOICES = (
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PUBLISHED, 'Published'),
        (STATUS_ARCHIVED, 'Archived'),
    )

    OVERFLOW_STRICT = 'strict'
    OVERFLOW_SOFT = 'soft'
    OVERFLOW_WEIGHTED = 'weighted'

    OVERFLOW_CHOICES = (
        (OVERFLOW_STRICT, 'Strict'),
        (OVERFLOW_SOFT, 'Soft'),
        (OVERFLOW_WEIGHTED, 'Weighted'),
    )

    project = models.ForeignKey(
        InsightProject,
        on_delete=models.CASCADE,
        related_name='quota_schemes',
    )
    name = models.CharField(max_length=128)
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    dimensions = models.JSONField(default=list, blank=True)
    overflow_policy = models.CharField(max_length=16, choices=OVERFLOW_CHOICES, default=OVERFLOW_STRICT)
    priority = models.IntegerField(default=0)
    is_default = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='+',
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ('-is_default', '-priority', '-published_at', 'name')
        constraints = [
            models.UniqueConstraint(
                fields=('project', 'name', 'version'),
                name='insightzen_unique_scheme_version',
            ),
        ]
        indexes = [
            models.Index(fields=('project', 'status')),
            models.Index(fields=('project', 'is_default')),
            models.Index(fields=('project', 'priority')),
        ]

    def __str__(self) -> str:
        return f"{self.project.code} — {self.name} v{self.version}"

    def can_edit(self) -> bool:
        return self.status == self.STATUS_DRAFT

    def mark_published(self) -> None:
        if self.status == self.STATUS_PUBLISHED:
            return
        self.status = self.STATUS_PUBLISHED
        self.published_at = timezone.now()
        self.save(update_fields=['status', 'published_at'])

    def mark_archived(self) -> None:
        if self.status == self.STATUS_ARCHIVED:
            return
        self.status = self.STATUS_ARCHIVED
        self.is_default = False
        self.save(update_fields=['status', 'is_default'])

    def ensure_default(self) -> None:
        if not self.is_default:
            return
        QuotaScheme.objects.filter(project=self.project).exclude(pk=self.pk).update(is_default=False)

    @classmethod
    def pick_for_project(
        cls,
        project: InsightProject,
        *,
        scheme_id: int | None = None,
    ) -> 'QuotaScheme':
        queryset = cls.objects.select_for_update().filter(project=project, status=cls.STATUS_PUBLISHED)
        if scheme_id is not None:
            scheme = queryset.filter(pk=scheme_id).first()
            if scheme is None:
                raise LookupError('No published scheme matches the requested identifier.')
            return scheme
        scheme = queryset.filter(is_default=True).order_by('-priority', '-published_at').first()
        if scheme is not None:
            return scheme
        scheme = queryset.order_by('-priority', '-published_at').first()
        if scheme is None:
            raise LookupError('No published quota scheme is available for this project.')
        return scheme


class QuotaCell(models.Model):
    scheme = models.ForeignKey(
        QuotaScheme,
        on_delete=models.CASCADE,
        related_name='cells',
    )
    selector = models.JSONField(default=dict)
    label = models.CharField(max_length=256, blank=True)
    target = models.PositiveIntegerField()
    soft_cap = models.PositiveIntegerField(null=True, blank=True)
    weight = models.FloatField(default=1.0)
    achieved = models.PositiveIntegerField(default=0)
    in_progress = models.PositiveIntegerField(default=0)
    reserved = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=('scheme', 'selector'), name='insightzen_unique_cell_selector'),
        ]
        indexes = [
            models.Index(fields=('scheme',)),
            models.Index(fields=('scheme', 'achieved')),
        ]

    def __str__(self) -> str:
        selector = ', '.join(f"{key}={value}" for key, value in sorted((self.selector or {}).items()))
        return f"{self.scheme.name} — {selector or 'default'}"

    @property
    def project(self) -> InsightProject:
        return self.scheme.project

    def capacity_limit(self, policy: str) -> int | None:
        if self.target is None:
            return None
        if policy == QuotaScheme.OVERFLOW_SOFT and self.soft_cap:
            return self.soft_cap
        if policy == QuotaScheme.OVERFLOW_WEIGHTED and self.soft_cap:
            return self.soft_cap
        return self.target

    def remaining_slots(self, policy: str) -> int | None:
        limit = self.capacity_limit(policy)
        if limit is None:
            return None
        remaining = limit - (self.achieved + self.in_progress)
        return max(remaining, 0)

    def has_capacity(self, policy: str) -> bool:
        remaining = self.remaining_slots(policy)
        return remaining is None or remaining > 0

    def weighted_score(self, policy: str) -> float:
        remaining = self.remaining_slots(policy)
        if remaining is None:
            return float('inf')
        return self.weight * remaining

    def increment_in_progress(self) -> None:
        QuotaCell.objects.filter(pk=self.pk).update(
            in_progress=F('in_progress') + 1,
            reserved=F('reserved') + 1,
        )

    def decrement_in_progress(self, *, completed: bool = False) -> None:
        updates = {'in_progress': F('in_progress') - 1, 'reserved': F('reserved') - 1}
        if completed:
            updates['achieved'] = F('achieved') + 1
        QuotaCell.objects.filter(pk=self.pk).update(**updates)


class QuotaFilter(models.Model):
    quota_cell = models.ForeignKey(
        QuotaCell,
        on_delete=models.CASCADE,
        related_name='filters',
    )
    json_filter = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [GinIndex(fields=('json_filter',), name='insightzen_quota_filter_gin')]
        verbose_name = 'Quota Filter'
        verbose_name_plural = 'Quota Filters'

    def __str__(self) -> str:
        return f"Filter for cell {self.quota_cell_id}"


class SampleContactQuerySet(models.QuerySet):
    def available(self) -> 'SampleContactQuerySet':
        return self.filter(status=SampleContact.STATUS_AVAILABLE, is_active=True)

    def claimed(self) -> 'SampleContactQuerySet':
        return self.filter(status=SampleContact.STATUS_CLAIMED, is_active=True)


class SampleContact(models.Model):
    STATUS_AVAILABLE = 'available'
    STATUS_CLAIMED = 'claimed'
    STATUS_COMPLETED = 'completed'
    STATUS_BLOCKED = 'blocked'

    STATUS_CHOICES = (
        (STATUS_AVAILABLE, 'Available'),
        (STATUS_CLAIMED, 'Claimed'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_BLOCKED, 'Blocked'),
    )

    project = models.ForeignKey(
        InsightProject,
        on_delete=models.CASCADE,
        related_name='sample_contacts',
    )
    quota_cell = models.ForeignKey(
        'QuotaCell',
        on_delete=models.CASCADE,
        related_name='sample_contacts',
        null=True,
        blank=True,
    )
    phone_id = models.BigIntegerField(null=True, blank=True)
    person_id = models.BigIntegerField(null=True, blank=True)
    phone_number = models.CharField(max_length=32)
    full_name = models.CharField(max_length=256, blank=True)
    gender = models.CharField(max_length=16, null=True, blank=True)
    age_band = models.CharField(max_length=16, null=True, blank=True)
    province_code = models.CharField(max_length=8, null=True, blank=True)
    city_code = models.CharField(max_length=10, null=True, blank=True)
    attributes = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
    attempt_count = models.PositiveIntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    interviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='insightzen_sample_contacts',
        null=True,
        blank=True,
    )
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = SampleContactQuerySet.as_manager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=('project', 'quota_cell', 'phone_id'),
                name='insightzen_unique_pool_entry',
            ),
        ]
        indexes = [
            models.Index(fields=('project', 'is_active')),
            models.Index(fields=('project', 'quota_cell', 'status')),
            models.Index(fields=('project', 'status', 'last_attempt_at')),
            models.Index(fields=('gender',)),
            models.Index(fields=('age_band',)),
            models.Index(fields=('province_code',)),
            models.Index(fields=('phone_number',)),
        ]

    def __str__(self) -> str:
        return f"{self.phone_number} ({self.project.code})"

    def matches_selector(self, selector: dict[str, Any]) -> bool:
        if not selector:
            return True
        attributes = self.attributes or {}
        for key, expected in selector.items():
            if key in {'gender', 'age_band', 'province_code', 'city_code'}:
                actual = getattr(self, key)
            else:
                actual = attributes.get(key)
            if actual is None:
                return False
            if isinstance(expected, (list, tuple, set)):
                if actual not in expected:
                    return False
            elif actual != expected:
                return False
        return True

    def mark_available(self) -> None:
        SampleContact.objects.filter(pk=self.pk).update(
            status=self.STATUS_AVAILABLE,
            interviewer=None,
        )

    def mark_completed(self) -> None:
        SampleContact.objects.filter(pk=self.pk).update(status=self.STATUS_COMPLETED)

    @classmethod
    def claim_next(
        cls,
        *,
        project: InsightProject,
        cell: QuotaCell,
        interviewer: User,
    ) -> 'SampleContact | None':
        now = timezone.now()
        with transaction.atomic():
            entry = (
                cls.objects.select_for_update(skip_locked=True)
                .filter(
                    project=project,
                    quota_cell=cell,
                    status=cls.STATUS_AVAILABLE,
                    is_active=True,
                )
                .exclude(phone_number__in=DoNotContactEntry.objects.values_list('msisdn', flat=True))
                .order_by(models.F('last_attempt_at').asc(nulls_first=True), 'id')
                .first()
            )
            if entry is None:
                return None
            cls.objects.filter(pk=entry.pk).update(
                status=cls.STATUS_CLAIMED,
                attempt_count=F('attempt_count') + 1,
                last_attempt_at=now,
                interviewer=interviewer,
                used_at=now,
            )
            entry.refresh_from_db()
        return entry


class DoNotContactEntry(models.Model):
    msisdn = models.CharField(max_length=32, unique=True)
    reason = models.TextField(blank=True)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Do Not Contact Entry'
        verbose_name_plural = 'Do Not Contact Entries'
        indexes = [models.Index(fields=('added_at',))]

    def __str__(self) -> str:
        return self.msisdn


class DialerAssignmentQuerySet(models.QuerySet):
    def active(self) -> 'DialerAssignmentQuerySet':
        return self.filter(status=self.model.STATUS_RESERVED, expires_at__gt=timezone.now())

    def expire_overdue(self) -> int:
        now = timezone.now()
        expired = 0
        for assignment in (
            self.select_related('cell')
            .filter(status=self.model.STATUS_RESERVED, expires_at__lte=now)
            .order_by('pk')
        ):
            assignment.expire_due_to_ttl()
            expired += 1
        return expired


class DialerAssignment(models.Model):
    STATUS_RESERVED = 'reserved'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILED = 'failed'
    STATUS_EXPIRED = 'expired'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = (
        (STATUS_RESERVED, 'Reserved'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_EXPIRED, 'Expired'),
        (STATUS_CANCELLED, 'Cancelled'),
    )

    project = models.ForeignKey(
        InsightProject,
        on_delete=models.CASCADE,
        related_name='assignments',
    )
    scheme = models.ForeignKey(
        QuotaScheme,
        on_delete=models.PROTECT,
        related_name='assignments',
    )
    cell = models.ForeignKey(
        QuotaCell,
        on_delete=models.PROTECT,
        related_name='assignments',
    )
    interviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='dialer_assignments',
    )
    sample = models.ForeignKey(
        SampleContact,
        on_delete=models.PROTECT,
        related_name='assignments',
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_RESERVED)
    reserved_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    outcome_code = models.CharField(max_length=8, null=True, blank=True)
    meta = models.JSONField(default=dict, blank=True)

    objects = DialerAssignmentQuerySet.as_manager()

    class Meta:
        indexes = [
            models.Index(fields=('project', 'status')),
            models.Index(fields=('cell', 'status')),
            models.Index(fields=('sample', 'status')),
        ]

    def __str__(self) -> str:
        return f"Assignment #{self.pk} — {self.sample.phone_number}"

    @property
    def is_active(self) -> bool:
        return self.status == self.STATUS_RESERVED and self.expires_at > timezone.now()

    def mark_completed(self, outcome_code: str | None = None) -> None:
        if self.status == self.STATUS_RESERVED:
            self.cell.decrement_in_progress(completed=True)
        self.status = self.STATUS_COMPLETED
        self.completed_at = timezone.now()
        if outcome_code:
            self.outcome_code = outcome_code
        self.save(update_fields=['status', 'completed_at', 'outcome_code'])
        self.sample.mark_completed()
        Interview.objects.update_or_create(
            assignment=self,
            defaults={
                'start_form': self.reserved_at,
                'end_form': self.completed_at,
                'status': Interview.STATUS_COMPLETED,
                'outcome_code': self.outcome_code,
            },
        )

    def mark_failed(self, outcome_code: str | None = None) -> None:
        if self.status == self.STATUS_RESERVED:
            self.cell.decrement_in_progress(completed=False)
        self.status = self.STATUS_FAILED
        self.completed_at = timezone.now()
        if outcome_code:
            self.outcome_code = outcome_code
        self.save(update_fields=['status', 'completed_at', 'outcome_code'])
        self.sample.mark_available()
        Interview.objects.filter(assignment=self).delete()

    def mark_cancelled(self) -> None:
        if self.status == self.STATUS_RESERVED:
            self.cell.decrement_in_progress(completed=False)
        self.status = self.STATUS_CANCELLED
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])
        self.sample.mark_available()
        Interview.objects.filter(assignment=self).delete()

    def mark_expired(self) -> None:
        if self.status == self.STATUS_RESERVED:
            self.cell.decrement_in_progress(completed=False)
        self.status = self.STATUS_EXPIRED
        self.save(update_fields=['status'])
        self.sample.mark_available()
        Interview.objects.filter(assignment=self).delete()

    def expire_due_to_ttl(self) -> None:
        if self.status != self.STATUS_RESERVED:
            return
        self.cell.decrement_in_progress(completed=False)
        self.status = self.STATUS_EXPIRED
        self.save(update_fields=['status'])
        self.sample.mark_available()
        Interview.objects.filter(assignment=self).delete()

    @classmethod
    def reserve_next(
        cls,
        *,
        project: InsightProject,
        interviewer: User,
        ttl_minutes: int = 15,
        scheme_id: int | None = None,
    ) -> 'DialerAssignment':
        now = timezone.now()
        expires_at = now + timedelta(minutes=ttl_minutes)

        with transaction.atomic():
            cls.objects.filter(project=project).expire_overdue()

            existing_active = (
                cls.objects.select_for_update()
                .filter(
                    interviewer=interviewer,
                    status=cls.STATUS_RESERVED,
                    expires_at__gt=now,
                )
                .order_by('-reserved_at')
                .first()
            )
            if existing_active:
                raise ValueError('Interviewer already has an active assignment.')

            scheme = QuotaScheme.pick_for_project(project, scheme_id=scheme_id)
            policy = scheme.overflow_policy
            candidate_cells = [
                cell
                for cell in scheme.cells.select_for_update(skip_locked=True)
                if cell.has_capacity(policy)
            ]
            if not candidate_cells:
                raise LookupError('No quota cells with available capacity were found.')

            def sort_key(cell: QuotaCell) -> tuple[float, int]:
                if policy == QuotaScheme.OVERFLOW_WEIGHTED:
                    score = cell.weighted_score(policy)
                else:
                    remaining = cell.remaining_slots(policy)
                    score = float('inf') if remaining is None else remaining
                return (-score, cell.pk)

            candidate_cells.sort(key=sort_key)

            for cell in candidate_cells:
                sample = SampleContact.claim_next(project=project, cell=cell, interviewer=interviewer)
                if sample is None:
                    continue

                assignment = cls.objects.create(
                    project=project,
                    scheme=scheme,
                    cell=cell,
                    interviewer=interviewer,
                    sample=sample,
                    expires_at=expires_at,
                )
                cell.increment_in_progress()
                return assignment

        raise LookupError('No available sample contact to assign.')


class Interview(models.Model):
    STATUS_NOT_STARTED = 'not_started'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'

    STATUS_CHOICES = (
        (STATUS_NOT_STARTED, 'Not Started'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
    )

    assignment = models.OneToOneField(
        DialerAssignment,
        on_delete=models.CASCADE,
        related_name='interview',
    )
    start_form = models.DateTimeField(null=True, blank=True)
    end_form = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_NOT_STARTED)
    outcome_code = models.CharField(max_length=8, null=True, blank=True)
    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=('assignment', 'status')),
        ]

    def mark_in_progress(self) -> None:
        self.status = self.STATUS_IN_PROGRESS
        reserved = getattr(self.assignment, 'reserved_at', None)
        self.start_form = reserved or timezone.now()
        self.save(update_fields=['status', 'start_form'])

    def mark_completed(self, outcome_code: str | None = None) -> None:
        self.status = self.STATUS_COMPLETED
        self.end_form = timezone.now()
        if outcome_code:
            self.outcome_code = outcome_code
        self.save(update_fields=['status', 'end_form', 'outcome_code'])


def _years_ago(base: date, years: int) -> date:
    try:
        return base.replace(year=base.year - years)
    except ValueError:
        # Handle February 29th
        return base.replace(month=2, day=28, year=base.year - years)


def _calculate_age(date_of_birth: date | None) -> int | None:
    if date_of_birth is None:
        return None
    today = timezone.now().date()
    age = today.year - date_of_birth.year - (
        (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
    )
    return age


def _parse_age_band(label: str) -> tuple[int, int] | None:
    label = label.strip()
    if not label:
        return None
    if label.endswith('+'):
        start = int(label[:-1])
        return start, 120
    if '-' in label:
        parts = label.split('-', 1)
        try:
            start = int(parts[0])
            end = int(parts[1])
        except ValueError:
            return None
        return start, end
    try:
        value = int(label)
    except ValueError:
        return None
    return value, value


def _normalize_filter_values(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return [item for item in value if item is not None]
    return [value]


def build_sample_pool_for_cell(
    cell: QuotaCell,
    *,
    limit: int | None = None,
    multiplier: int = 5,
) -> int:
    selector = cell.selector or {}
    project = cell.project

    genders = _normalize_filter_values(selector.get('gender'))
    provinces = _normalize_filter_values(selector.get('province_code'))
    cities = _normalize_filter_values(selector.get('city_code'))

    age_ranges: list[tuple[int, int]] = []
    explicit_age = _normalize_filter_values(selector.get('age') or selector.get('age_range'))
    if explicit_age:
        if len(explicit_age) == 2 and all(isinstance(item, (int, float)) for item in explicit_age):
            age_ranges.append((int(explicit_age[0]), int(explicit_age[1])))
        else:
            for value in explicit_age:
                if isinstance(value, (list, tuple)) and len(value) == 2:
                    age_ranges.append((int(value[0]), int(value[1])))

    age_bands = _normalize_filter_values(selector.get('age_band'))
    for band in age_bands:
        if isinstance(band, str):
            parsed = _parse_age_band(band)
            if parsed:
                age_ranges.append(parsed)

    where_clauses = ['ph.is_active = TRUE', 'ph.is_mobile = TRUE']
    params: list[Any] = []

    if genders:
        where_clauses.append('p.gender = ANY(%s)')
        params.append(genders)
    if provinces:
        where_clauses.append('p.province_code = ANY(%s)')
        params.append(provinces)
    if cities:
        where_clauses.append('p.city_code = ANY(%s)')
        params.append(cities)

    today = timezone.now().date()
    age_sql_parts: list[str] = []
    for min_age, max_age in age_ranges:
        lower_bound = _years_ago(today, int(max_age))
        upper_bound = _years_ago(today, int(min_age))
        age_sql_parts.append('(p.dob BETWEEN %s AND %s)')
        params.extend([lower_bound, upper_bound])
    if age_sql_parts:
        where_clauses.append('(' + ' OR '.join(age_sql_parts) + ')')

    where_sql = ' AND '.join(where_clauses) if where_clauses else 'TRUE'

    limit_value = limit or (cell.target or 0) * multiplier
    if limit_value <= 0:
        limit_value = 1000

    pool_table = SampleContact._meta.db_table
    dnc_table = DoNotContactEntry._meta.db_table

    query = f'''
        SELECT ph.phone_id, ph.msisdn, p.person_id, p.gender, p.dob, p.province_code, p.city_code
        FROM bank."bank_phone" AS ph
        JOIN bank."bank_person" AS p ON p.person_id = ph.person_id
        LEFT JOIN {dnc_table} AS d ON d.msisdn = ph.msisdn
        WHERE d.msisdn IS NULL
          AND {where_sql}
          AND NOT EXISTS (
              SELECT 1 FROM {pool_table} pool
              WHERE pool.phone_number = ph.msisdn AND pool.project_id = %s
          )
        ORDER BY ph.phone_id
        LIMIT %s
    '''

    params.extend([project.id, limit_value])

    created: list[SampleContact] = []
    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        for phone_id, msisdn, person_id, gender, dob, province_code, city_code in rows:
            age_band_value = None
            if age_bands:
                age = _calculate_age(dob)
                if age is not None:
                    for band in age_bands:
                        parsed = _parse_age_band(str(band))
                        if parsed and parsed[0] <= age <= parsed[1]:
                            age_band_value = str(band)
                            break
            created.append(
                SampleContact(
                    project=project,
                    quota_cell=cell,
                    phone_id=phone_id,
                    person_id=person_id,
                    phone_number=msisdn,
                    gender=gender,
                    age_band=age_band_value,
                    province_code=province_code,
                    city_code=city_code,
                    attributes={},
                )
            )

    if not created:
        return 0

    SampleContact.objects.bulk_create(created, ignore_conflicts=True)
    return len(created)


def ensure_user_profile(user: User) -> InsightUserProfile:
    profile, _ = InsightUserProfile.objects.get_or_create(user=user)
    return profile


def update_user_profile(
    user: User,
    *,
    display_name: str | None = None,
    phone: str | None = None,
    preferred_locale: str | None = None,
    timezone_name: str | None = None,
    team: str | None = None,
) -> InsightUserProfile:
    profile = ensure_user_profile(user)
    if display_name is not None:
        profile.display_name = display_name
    if phone is not None:
        profile.phone = phone
    if preferred_locale in {'fa', 'en'}:
        profile.preferred_locale = preferred_locale
    if timezone_name:
        profile.timezone = timezone_name
    if team is not None:
        profile.team = team
    profile.save(update_fields=['display_name', 'phone', 'preferred_locale', 'timezone', 'team'])
    return profile


def deactivate_single_membership(membership: InsightMembership) -> None:
    membership.is_active = False
    membership.save(update_fields=['is_active'])


def archive_project(project: InsightProject) -> InsightProject:
    if project.status != 'archived':
        project.status = 'archived'
        project.updated_at = timezone.now()
        project.save(update_fields=['status', 'updated_at'])
    return project

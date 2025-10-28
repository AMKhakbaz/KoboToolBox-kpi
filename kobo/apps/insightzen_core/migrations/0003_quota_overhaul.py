from django.conf import settings
from django.db import migrations, models
import django.utils.timezone


def _ensure_column_sql(table, column, definition):
    return f"""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = '{table}'
                  AND column_name = '{column}'
            ) THEN
                ALTER TABLE "{table}" ADD COLUMN {definition};
            END IF;
        END;
        $$;
    """


def _safe_add_field(model_name, name, field, *, table, column_sql, column_name=None, reverse_drop=True):
    column = column_name or name
    sql = _ensure_column_sql(table, column, column_sql)
    reverse_sql = f'ALTER TABLE "{table}" DROP COLUMN IF EXISTS "{column}";' if reverse_drop else migrations.RunSQL.noop
    return migrations.SeparateDatabaseAndState(
        database_operations=[
            migrations.RunSQL(sql, reverse_sql),
        ],
        state_operations=[
            migrations.AddField(
                model_name=model_name,
                name=name,
                field=field,
            )
        ],
    )


class Migration(migrations.Migration):

    dependencies = [
        ('insightzen_core', '0002_dialer_models'),
    ]

    operations = [
        migrations.RemoveField(model_name='quotascheme', name='definition'),
        migrations.RemoveField(model_name='quotascheme', name='description'),
        migrations.RemoveField(model_name='quotascheme', name='is_active'),
        migrations.RemoveField(model_name='quotacell', name='code'),
        migrations.RemoveField(model_name='quotacell', name='completed_count'),
        migrations.RemoveField(model_name='quotacell', name='metadata'),
        migrations.RemoveField(model_name='samplecontact', name='cell'),
        migrations.RemoveField(model_name='samplecontact', name='scheme'),
        _safe_add_field(
            'quotascheme',
            'created_by',
            models.ForeignKey(blank=True, null=True, on_delete=models.PROTECT, related_name='+', to=settings.AUTH_USER_MODEL),
            table='insightzen_core_quotascheme',
            column_sql='"created_by_id" bigint REFERENCES auth_user(id) DEFERRABLE INITIALLY DEFERRED',
            column_name='created_by_id',
        ),
        _safe_add_field(
            'quotascheme',
            'dimensions',
            models.JSONField(blank=True, default=list),
            table='insightzen_core_quotascheme',
            column_sql="\"dimensions\" jsonb NOT NULL DEFAULT '[]'::jsonb",
        ),
        _safe_add_field(
            'quotascheme',
            'is_default',
            models.BooleanField(default=False),
            table='insightzen_core_quotascheme',
            column_sql='"is_default" boolean NOT NULL DEFAULT false',
        ),
        _safe_add_field(
            'quotascheme',
            'overflow_policy',
            models.CharField(choices=[('strict', 'Strict'), ('soft', 'Soft'), ('weighted', 'Weighted')], default='strict', max_length=16),
            table='insightzen_core_quotascheme',
            column_sql="\"overflow_policy\" varchar(16) NOT NULL DEFAULT 'strict'",
        ),
        _safe_add_field(
            'quotascheme',
            'priority',
            models.IntegerField(default=0),
            table='insightzen_core_quotascheme',
            column_sql='"priority" integer NOT NULL DEFAULT 0',
        ),
        _safe_add_field(
            'quotascheme',
            'published_at',
            models.DateTimeField(blank=True, null=True),
            table='insightzen_core_quotascheme',
            column_sql='"published_at" timestamp with time zone',
        ),
        _safe_add_field(
            'quotascheme',
            'status',
            models.CharField(choices=[('draft', 'Draft'), ('published', 'Published'), ('archived', 'Archived')], default='draft', max_length=16),
            table='insightzen_core_quotascheme',
            column_sql="\"status\" varchar(16) NOT NULL DEFAULT 'draft'",
        ),
        _safe_add_field(
            'quotascheme',
            'version',
            models.PositiveIntegerField(default=1),
            table='insightzen_core_quotascheme',
            column_sql='"version" integer NOT NULL DEFAULT 1',
        ),
        _safe_add_field(
            'quotacell',
            'achieved',
            models.PositiveIntegerField(default=0),
            table='insightzen_core_quotacell',
            column_sql='"achieved" integer NOT NULL DEFAULT 0',
        ),
        _safe_add_field(
            'quotacell',
            'in_progress',
            models.PositiveIntegerField(default=0),
            table='insightzen_core_quotacell',
            column_sql='"in_progress" integer NOT NULL DEFAULT 0',
        ),
        _safe_add_field(
            'quotacell',
            'reserved',
            models.PositiveIntegerField(default=0),
            table='insightzen_core_quotacell',
            column_sql='"reserved" integer NOT NULL DEFAULT 0',
        ),
        _safe_add_field(
            'quotacell',
            'selector',
            models.JSONField(default=dict),
            table='insightzen_core_quotacell',
            column_sql="\"selector\" jsonb NOT NULL DEFAULT '{}'::jsonb",
        ),
        _safe_add_field(
            'quotacell',
            'soft_cap',
            models.PositiveIntegerField(blank=True, null=True),
            table='insightzen_core_quotacell',
            column_sql='"soft_cap" integer',
        ),
        _safe_add_field(
            'quotacell',
            'target',
            models.PositiveIntegerField(default=0),
            table='insightzen_core_quotacell',
            column_sql='"target" integer NOT NULL DEFAULT 0',
        ),
        _safe_add_field(
            'quotacell',
            'updated_at',
            models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            table='insightzen_core_quotacell',
            column_sql='"updated_at" timestamp with time zone NOT NULL DEFAULT NOW()',
        ),
        _safe_add_field(
            'quotacell',
            'weight',
            models.FloatField(default=1.0),
            table='insightzen_core_quotacell',
            column_sql='"weight" double precision NOT NULL DEFAULT 1.0',
        ),
        _safe_add_field(
            'samplecontact',
            'age_band',
            models.CharField(blank=True, max_length=16, null=True),
            table='insightzen_core_samplecontact',
            column_sql='"age_band" varchar(16)',
        ),
        _safe_add_field(
            'samplecontact',
            'gender',
            models.CharField(blank=True, max_length=16, null=True),
            table='insightzen_core_samplecontact',
            column_sql='"gender" varchar(16)',
        ),
        _safe_add_field(
            'samplecontact',
            'province_code',
            models.CharField(blank=True, max_length=8, null=True),
            table='insightzen_core_samplecontact',
            column_sql='"province_code" varchar(8)',
        ),
        _safe_add_field(
            'samplecontact',
            'used_at',
            models.DateTimeField(blank=True, null=True),
            table='insightzen_core_samplecontact',
            column_sql='"used_at" timestamp with time zone',
        ),
        migrations.AlterField(
            model_name='samplecontact',
            name='attributes',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AlterField(
            model_name='quotacell',
            name='label',
            field=models.CharField(blank=True, max_length=256),
        ),
        migrations.RemoveConstraint(model_name='quotacell', name='insightzen_quota_cell_unique'),
        migrations.AddConstraint(
            model_name='quotacell',
            constraint=models.UniqueConstraint(fields=('scheme', 'selector'), name='insightzen_unique_cell_selector'),
        ),
        migrations.AddConstraint(
            model_name='quotascheme',
            constraint=models.UniqueConstraint(fields=('project', 'name', 'version'), name='insightzen_unique_scheme_version'),
        ),
        migrations.AddIndex(
            model_name='quotacell',
            index=models.Index(fields=['scheme'], name='insightzen_cell_scheme_idx'),
        ),
        migrations.AddIndex(
            model_name='quotacell',
            index=models.Index(fields=['scheme', 'achieved'], name='insightzen_cell_ach_idx'),
        ),
        migrations.RemoveIndex(model_name='quotascheme', name='insightzen_scheme_project_active_idx'),
        migrations.AddIndex(
            model_name='quotascheme',
            index=models.Index(fields=['project', 'status'], name='insightzen_scheme_status_idx'),
        ),
        migrations.AddIndex(
            model_name='quotascheme',
            index=models.Index(fields=['project', 'is_default'], name='insightzen_scheme_default_idx'),
        ),
        migrations.AddIndex(
            model_name='quotascheme',
            index=models.Index(fields=['project', 'priority'], name='insightzen_scheme_priority_idx'),
        ),
        migrations.RemoveIndex(model_name='quotacell', name='insightzen_cell_scheme_code_idx'),
        migrations.RemoveIndex(model_name='quotacell', name='insightzen_cell_completed_idx'),
        migrations.RemoveIndex(model_name='samplecontact', name='insightzen_sample_cell_active_idx'),
        migrations.AddIndex(
            model_name='samplecontact',
            index=models.Index(fields=['project', 'used_at'], name='insightzen_sample_used_idx'),
        ),
        migrations.AddIndex(
            model_name='samplecontact',
            index=models.Index(fields=['gender'], name='insightzen_sample_gender_idx'),
        ),
        migrations.AddIndex(
            model_name='samplecontact',
            index=models.Index(fields=['age_band'], name='insightzen_sample_age_idx'),
        ),
        migrations.AddIndex(
            model_name='samplecontact',
            index=models.Index(fields=['province_code'], name='insightzen_sample_province_idx'),
        ),
    ]

from django.conf import settings
from django.db import migrations, models
import django.utils.timezone


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
        migrations.AddField(
            model_name='quotascheme',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.PROTECT, related_name='+', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='quotascheme',
            name='dimensions',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='quotascheme',
            name='is_default',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='quotascheme',
            name='overflow_policy',
            field=models.CharField(choices=[('strict', 'Strict'), ('soft', 'Soft'), ('weighted', 'Weighted')], default='strict', max_length=16),
        ),
        migrations.AddField(
            model_name='quotascheme',
            name='priority',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='quotascheme',
            name='published_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='quotascheme',
            name='status',
            field=models.CharField(choices=[('draft', 'Draft'), ('published', 'Published'), ('archived', 'Archived')], default='draft', max_length=16),
        ),
        migrations.AddField(
            model_name='quotascheme',
            name='version',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='quotacell',
            name='achieved',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='quotacell',
            name='in_progress',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='quotacell',
            name='reserved',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='quotacell',
            name='selector',
            field=models.JSONField(default=dict),
        ),
        migrations.AddField(
            model_name='quotacell',
            name='soft_cap',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='quotacell',
            name='target',
            field=models.PositiveIntegerField(default=0),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='quotacell',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='quotacell',
            name='weight',
            field=models.FloatField(default=1.0),
        ),
        migrations.AddField(
            model_name='samplecontact',
            name='age_band',
            field=models.CharField(blank=True, max_length=16, null=True),
        ),
        migrations.AddField(
            model_name='samplecontact',
            name='gender',
            field=models.CharField(blank=True, max_length=16, null=True),
        ),
        migrations.AddField(
            model_name='samplecontact',
            name='province_code',
            field=models.CharField(blank=True, max_length=8, null=True),
        ),
        migrations.AddField(
            model_name='samplecontact',
            name='used_at',
            field=models.DateTimeField(blank=True, null=True),
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

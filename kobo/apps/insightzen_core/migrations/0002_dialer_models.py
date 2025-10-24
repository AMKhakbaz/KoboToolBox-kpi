from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('insightzen_core', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='QuotaScheme',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=128)),
                ('description', models.TextField(blank=True)),
                ('definition', models.JSONField(blank=True, default=dict)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quota_schemes', to='insightzen_core.insightproject')),
            ],
            options={'ordering': ('name',)},
        ),
        migrations.CreateModel(
            name='QuotaCell',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=64)),
                ('label', models.CharField(max_length=256)),
                ('target', models.PositiveIntegerField(blank=True, null=True)),
                ('completed_count', models.PositiveIntegerField(default=0)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('scheme', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cells', to='insightzen_core.quotascheme')),
            ],
            options={'ordering': ('scheme', 'code')},
        ),
        migrations.CreateModel(
            name='SampleContact',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('phone_number', models.CharField(max_length=32)),
                ('full_name', models.CharField(blank=True, max_length=256)),
                ('attributes', models.JSONField(blank=True, default=dict)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('cell', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='sample_contacts', to='insightzen_core.quotacell')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sample_contacts', to='insightzen_core.insightproject')),
                ('scheme', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='sample_contacts', to='insightzen_core.quotascheme')),
            ],
        ),
        migrations.CreateModel(
            name='DialerAssignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('reserved', 'Reserved'), ('completed', 'Completed'), ('failed', 'Failed'), ('expired', 'Expired'), ('cancelled', 'Cancelled')], default='reserved', max_length=16)),
                ('reserved_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('outcome_code', models.CharField(blank=True, max_length=8, null=True)),
                ('meta', models.JSONField(blank=True, default=dict)),
                ('cell', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='assignments', to='insightzen_core.quotacell')),
                ('interviewer', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='dialer_assignments', to=settings.AUTH_USER_MODEL)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignments', to='insightzen_core.insightproject')),
                ('sample', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='assignments', to='insightzen_core.samplecontact')),
                ('scheme', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='assignments', to='insightzen_core.quotascheme')),
            ],
        ),
        migrations.CreateModel(
            name='Interview',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_form', models.DateTimeField(blank=True, null=True)),
                ('end_form', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(choices=[('not_started', 'Not Started'), ('in_progress', 'In Progress'), ('completed', 'Completed')], default='not_started', max_length=16)),
                ('outcome_code', models.CharField(blank=True, max_length=8, null=True)),
                ('meta', models.JSONField(blank=True, default=dict)),
                ('assignment', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='interview', to='insightzen_core.dialerassignment')),
            ],
        ),
        migrations.AddConstraint(
            model_name='quotacell',
            constraint=models.UniqueConstraint(fields=('scheme', 'code'), name='insightzen_quota_cell_unique'),
        ),
        migrations.AddConstraint(
            model_name='samplecontact',
            constraint=models.UniqueConstraint(fields=('project', 'phone_number'), name='insightzen_sample_contact_unique'),
        ),
        migrations.AddIndex(
            model_name='quotascheme',
            index=models.Index(fields=['project', 'is_active'], name='insightzen_scheme_project_active_idx'),
        ),
        migrations.AddIndex(
            model_name='quotacell',
            index=models.Index(fields=['scheme', 'code'], name='insightzen_cell_scheme_code_idx'),
        ),
        migrations.AddIndex(
            model_name='quotacell',
            index=models.Index(fields=['scheme', 'completed_count'], name='insightzen_cell_completed_idx'),
        ),
        migrations.AddIndex(
            model_name='samplecontact',
            index=models.Index(fields=['project', 'is_active'], name='insightzen_sample_project_active_idx'),
        ),
        migrations.AddIndex(
            model_name='samplecontact',
            index=models.Index(fields=['cell', 'is_active'], name='insightzen_sample_cell_active_idx'),
        ),
        migrations.AddIndex(
            model_name='dialerassignment',
            index=models.Index(fields=['project', 'status'], name='insightzen_assign_project_status_idx'),
        ),
        migrations.AddIndex(
            model_name='dialerassignment',
            index=models.Index(fields=['cell', 'status'], name='insightzen_assign_cell_status_idx'),
        ),
        migrations.AddIndex(
            model_name='dialerassignment',
            index=models.Index(fields=['sample', 'status'], name='insightzen_assign_sample_status_idx'),
        ),
        migrations.AddIndex(
            model_name='interview',
            index=models.Index(fields=['assignment', 'status'], name='insightzen_interview_status_idx'),
        ),
    ]

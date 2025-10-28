from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.postgres.indexes import GinIndex


class Migration(migrations.Migration):

    dependencies = [
        ('insightzen_core', '0003_quota_overhaul'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DoNotContactEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('msisdn', models.CharField(max_length=32, unique=True)),
                ('reason', models.TextField(blank=True)),
                ('added_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Do Not Contact Entry',
                'verbose_name_plural': 'Do Not Contact Entries',
            },
        ),
        migrations.CreateModel(
            name='QuotaFilter',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('json_filter', models.JSONField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('quota_cell', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='filters', to='insightzen_core.quotacell')),
            ],
            options={
                'verbose_name': 'Quota Filter',
                'verbose_name_plural': 'Quota Filters',
            },
        ),
        migrations.AddField(
            model_name='samplecontact',
            name='attempt_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='samplecontact',
            name='city_code',
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.AddField(
            model_name='samplecontact',
            name='interviewer',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='insightzen_sample_contacts', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='samplecontact',
            name='last_attempt_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='samplecontact',
            name='person_id',
            field=models.BigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='samplecontact',
            name='phone_id',
            field=models.BigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='samplecontact',
            name='quota_cell',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='sample_contacts', to='insightzen_core.quotacell'),
        ),
        migrations.AddField(
            model_name='samplecontact',
            name='status',
            field=models.CharField(choices=[('available', 'Available'), ('claimed', 'Claimed'), ('completed', 'Completed'), ('blocked', 'Blocked')], default='available', max_length=16),
        ),
        migrations.AddIndex(
            model_name='samplecontact',
            index=models.Index(fields=['project', 'quota_cell', 'status'], name='insightzen_sample_quota_status_idx'),
        ),
        migrations.AddIndex(
            model_name='samplecontact',
            index=models.Index(fields=['project', 'status', 'last_attempt_at'], name='insightzen_sample_status_attempt_idx'),
        ),
        migrations.AddIndex(
            model_name='samplecontact',
            index=models.Index(fields=['phone_number'], name='insightzen_sample_phone_idx'),
        ),
        migrations.RemoveConstraint(
            model_name='samplecontact',
            name='insightzen_sample_contact_unique',
        ),
        migrations.AddConstraint(
            model_name='samplecontact',
            constraint=models.UniqueConstraint(fields=('project', 'quota_cell', 'phone_id'), name='insightzen_unique_pool_entry'),
        ),
        migrations.AddIndex(
            model_name='donotcontactentry',
            index=models.Index(fields=['added_at'], name='insightzen_dnc_added_idx'),
        ),
        migrations.AddIndex(
            model_name='quotafilter',
            index=GinIndex(fields=['json_filter'], name='insightzen_quota_filter_gin'),
        ),
    ]

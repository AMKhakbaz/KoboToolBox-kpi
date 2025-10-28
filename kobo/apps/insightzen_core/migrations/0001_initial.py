# Generated manually for InsightZen module
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.contrib.postgres.fields
import django.contrib.postgres.indexes


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='InsightUserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('phone', models.CharField(blank=True, max_length=32)),
                (
                    'preferred_locale',
                    models.CharField(
                        choices=[('fa', 'Persian'), ('en', 'English')], default='fa', max_length=8
                    ),
                ),
                ('timezone', models.CharField(default='Asia/Tehran', max_length=64)),
                (
                    'user',
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='insight_profile',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'verbose_name': 'InsightZen User Profile',
                'verbose_name_plural': 'InsightZen User Profiles',
            },
        ),
        migrations.CreateModel(
            name='InsightProject',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=32, unique=True)),
                ('name', models.CharField(max_length=256)),
                ('description', models.TextField(blank=True)),
                (
                    'types',
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(max_length=64), blank=True, default=list
                    ),
                ),
                (
                    'status',
                    models.CharField(
                        choices=[('active', 'Active'), ('paused', 'Paused'), ('archived', 'Archived')],
                        default='active',
                        max_length=32,
                    ),
                ),
                ('start_date', models.DateField(blank=True, null=True)),
                ('end_date', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'owner',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='owned_insightzen_projects',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={'ordering': ('name',)},
        ),
        migrations.CreateModel(
            name='InsightMembership',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(blank=True, max_length=128)),
                (
                    'role',
                    models.CharField(
                        choices=[
                            ('admin', 'Admin'),
                            ('manager', 'Manager'),
                            ('supervisor', 'Supervisor'),
                            ('agent', 'Agent'),
                            ('viewer', 'Viewer'),
                        ],
                        default='viewer',
                        max_length=32,
                    ),
                ),
                ('panel_permissions', models.JSONField(blank=True, default=dict)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'project',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='memberships',
                        to='insightzen_core.insightproject',
                    ),
                ),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='insight_memberships',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AddIndex(
            model_name='insightproject',
            index=models.Index(fields=['code'], name='insightpro_code_209a24_idx'),
        ),
        migrations.AddIndex(
            model_name='insightproject',
            index=models.Index(fields=['status'], name='insightpro_status_2f155d_idx'),
        ),
        migrations.AddIndex(
            model_name='insightproject',
            index=django.contrib.postgres.indexes.GinIndex(fields=['types'], name='insightzen_types_gin'),
        ),
        migrations.AddConstraint(
            model_name='insightmembership',
            constraint=models.UniqueConstraint(fields=('user', 'project'), name='insight_membership_unique_user_project'),
        ),
        migrations.AddIndex(
            model_name='insightmembership',
            index=models.Index(fields=['project', 'user'], name='insightmem_project_user_idx'),
        ),
        migrations.AddIndex(
            model_name='insightmembership',
            index=models.Index(fields=['role'], name='insightmem_role_idx'),
        ),
    ]

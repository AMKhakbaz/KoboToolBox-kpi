from django.db import migrations, models


MODULE_ALL = 'all'


def populate_existing_accounts(apps, schema_editor):
    ExtraUserDetail = apps.get_model('hub', 'ExtraUserDetail')
    ExtraUserDetail.objects.all().update(
        account_type='personal',
        payment_status='not_required',
        module_access=[MODULE_ALL],
    )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('hub', '0016_extrauserdetail_password_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='extrauserdetail',
            name='account_type',
            field=models.CharField(choices=[('organizational', 'سازمانی'), ('personal', 'شخصی')], default='personal', max_length=32),
        ),
        migrations.AddField(
            model_name='extrauserdetail',
            name='module_access',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='extrauserdetail',
            name='payment_confirmed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='extrauserdetail',
            name='payment_status',
            field=models.CharField(choices=[('not_required', 'Payment not required'), ('pending', 'Payment pending'), ('confirmed', 'Payment confirmed')], default='not_required', max_length=32),
        ),
        migrations.AddField(
            model_name='extrauserdetail',
            name='storage_quota_bytes',
            field=models.BigIntegerField(blank=True, null=True),
        ),
        migrations.RunPython(populate_existing_accounts, noop),
    ]

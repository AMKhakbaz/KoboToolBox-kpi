from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0019_drop_guardian_constraints'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='account_type',
            field=models.CharField(choices=[('organizational', 'سازمانی'), ('personal', 'شخصی')], default='personal', max_length=32),
        ),
    ]

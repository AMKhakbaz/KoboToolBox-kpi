from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('insightzen_core', '0005_collection_performance'),
    ]

    operations = [
        migrations.AddField(
            model_name='insightuserprofile',
            name='display_name',
            field=models.CharField(blank=True, default='', max_length=128),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='insightuserprofile',
            name='team',
            field=models.CharField(blank=True, default='', max_length=64),
            preserve_default=False,
        ),
    ]

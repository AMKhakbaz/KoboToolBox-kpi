from django.db import migrations, models


MATERIALIZED_VIEW_SQL = """
DROP MATERIALIZED VIEW IF EXISTS insightzen_core_mv_collection_daily;
CREATE MATERIALIZED VIEW insightzen_core_mv_collection_daily AS
SELECT
    da.project_id,
    da.interviewer_id,
    DATE_TRUNC('day', COALESCE(i.end_form, i.start_form))::date AS day,
    COUNT(*) AS attempts,
    COUNT(*) FILTER (WHERE i.outcome_code = 'COMP') AS completes,
    COUNT(*) FILTER (WHERE i.outcome_code IN ('BUSY', 'NOANS', 'NA')) AS non_contacts,
    AVG(EXTRACT(EPOCH FROM (i.end_form - i.start_form)))::int AS avg_duration_sec
FROM insightzen_core_interview AS i
JOIN insightzen_core_dialerassignment AS da ON da.id = i.assignment_id
GROUP BY da.project_id, da.interviewer_id, day;
"""


DROP_VIEW_SQL = "DROP MATERIALIZED VIEW IF EXISTS insightzen_core_mv_collection_daily;"


CREATE_INDEX_SQL = """
CREATE UNIQUE INDEX IF NOT EXISTS insightzen_mv_collection_daily_unique
    ON insightzen_core_mv_collection_daily (project_id, interviewer_id, day);
CREATE INDEX IF NOT EXISTS insightzen_mv_collection_daily_project_day
    ON insightzen_core_mv_collection_daily (project_id, day DESC);
"""


DROP_INDEX_SQL = """
DROP INDEX IF EXISTS insightzen_mv_collection_daily_project_day;
DROP INDEX IF EXISTS insightzen_mv_collection_daily_unique;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('insightzen_core', '0004_bank_integration'),
    ]

    operations = [
        migrations.AddField(
            model_name='insightuserprofile',
            name='display_name',
            field=models.CharField(blank=True, max_length=128),
        ),
        migrations.AddField(
            model_name='insightuserprofile',
            name='team',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.RunSQL(MATERIALIZED_VIEW_SQL, DROP_VIEW_SQL),
        migrations.RunSQL(CREATE_INDEX_SQL, DROP_INDEX_SQL),
    ]

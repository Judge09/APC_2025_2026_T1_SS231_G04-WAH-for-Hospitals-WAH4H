from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_doctorfeeschedule_procedurepriceconfig_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='practitioner',
            name='wah4pc_id',
            field=models.UUIDField(blank=True, null=True),
        ),
    ]

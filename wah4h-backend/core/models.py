from django.db import models

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

class FHIRResourceModel(TimeStampedModel):
    identifier = models.CharField(max_length=100, unique=True, db_index=True)
    status = models.CharField(max_length=100, db_index=True)
    class Meta:
        abstract = True
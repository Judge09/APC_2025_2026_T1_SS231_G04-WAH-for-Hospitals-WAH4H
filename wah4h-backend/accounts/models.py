# accounts/models.py
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, UserManager
from core.models import TimeStampedModel, FHIRResourceModel

class Organization(FHIRResourceModel):
    organization_id = models.AutoField(primary_key=True)
    active = models.BooleanField(null=True, blank=True)
    nhfr_code = models.CharField(max_length=100, unique=True, null=True, blank=True)
    type_code = models.CharField(max_length=100, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    alias = models.CharField(max_length=255, null=True, blank=True)
    telecom = models.CharField(max_length=50, null=True, blank=True)
    endpoint = models.ForeignKey('accounts.Endpoint', on_delete=models.PROTECT, db_column='endpoint_id', null=True, blank=True, related_name='organizations')
    part_of_organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        db_column='part_of_organization_id',
        related_name='sub_organizations'
    )
    address_line = models.CharField(max_length=255, null=True, blank=True)
    address_city = models.CharField(max_length=255, null=True, blank=True)
    address_district = models.CharField(max_length=255, null=True, blank=True)
    address_state = models.CharField(max_length=255, null=True, blank=True)
    address_country = models.CharField(max_length=255, null=True, blank=True)
    address_postal_code = models.CharField(max_length=100, unique=True, null=True, blank=True)
    contact_purpose = models.CharField(max_length=50, null=True, blank=True)
    contact_first_name = models.CharField(max_length=50, null=True, blank=True)
    contact_last_name = models.CharField(max_length=50, null=True, blank=True)
    contact_telecom = models.CharField(max_length=50, null=True, blank=True)
    contact_address_line = models.CharField(max_length=50, null=True, blank=True)
    contact_address_city = models.CharField(max_length=50, null=True, blank=True)
    contact_address_state = models.CharField(max_length=50, null=True, blank=True)
    contact_address_country = models.CharField(max_length=50, null=True, blank=True)
    contact_postal_code = models.CharField(max_length=100, unique=True, null=True, blank=True)

    class Meta:
        db_table = 'organization'
        unique_together = [('name', 'address_city')]

    def __str__(self):
        return self.name or f"Organization {self.organization_id}"


class Location(FHIRResourceModel):
    location_id = models.AutoField(primary_key=True)
    identifier = models.CharField(max_length=100, unique=True, null=True, blank=True)
    status = models.CharField(max_length=100)
    physical_type_code = models.CharField(max_length=100, unique=True, null=True, blank=True)
    type_code = models.CharField(max_length=100, unique=True, null=True, blank=True)
    operational_status = models.CharField(max_length=100, null=True, blank=True)
    mode = models.CharField(max_length=255, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    alias = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    telecom = models.CharField(max_length=50, null=True, blank=True)
    longitude = models.CharField(max_length=255, null=True, blank=True)
    latitude = models.CharField(max_length=255, null=True, blank=True)
    altitude = models.CharField(max_length=255, null=True, blank=True)
    managing_organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        db_column='managing_organization_id'
    )
    part_of_location = models.ForeignKey(
        'accounts.Location',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        db_column='part_of_location_id'
    )
    endpoint = models.ForeignKey('accounts.Endpoint', on_delete=models.PROTECT, db_column='endpoint_id', null=True, blank=True, related_name='locations')
    address_line = models.CharField(max_length=255, null=True, blank=True)
    address_city = models.CharField(max_length=255, null=True, blank=True)
    address_district = models.CharField(max_length=255, null=True, blank=True)
    address_state = models.CharField(max_length=255, null=True, blank=True)
    address_country = models.CharField(max_length=255, null=True, blank=True)
    address_postal_code = models.CharField(max_length=100, unique=True, null=True, blank=True)
    hours_of_operation_days = models.CharField(max_length=255, null=True, blank=True)
    hours_of_operation_all_day = models.CharField(max_length=255, null=True, blank=True)
    opening_time = models.CharField(max_length=255, null=True, blank=True)
    closing_time = models.CharField(max_length=255, null=True, blank=True)
    availability_exceptions = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'location'

    def __str__(self):
        return self.name or f"Location {self.location_id}"


class Practitioner(FHIRResourceModel):
    practitioner_id = models.AutoField(primary_key=True)
    identifier = models.CharField(max_length=100, unique=True)
    active = models.BooleanField(null=True, blank=True)
    first_name = models.CharField(max_length=255)
    middle_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255)
    suffix_name = models.CharField(max_length=255, null=True, blank=True)
    gender = models.CharField(max_length=100, null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    photo_url = models.URLField(max_length=255, null=True, blank=True)
    telecom = models.CharField(max_length=50, null=True, blank=True)
    communication_language = models.CharField(max_length=255, null=True, blank=True)
    address_line = models.CharField(max_length=255, null=True, blank=True)
    address_city = models.CharField(max_length=255, null=True, blank=True)
    address_district = models.CharField(max_length=255, null=True, blank=True)
    address_state = models.CharField(max_length=255, null=True, blank=True)
    address_country = models.CharField(max_length=255, null=True, blank=True)
    address_postal_code = models.CharField(max_length=100, null=True, blank=True)
    qualification_code = models.CharField(max_length=100, null=True, blank=True)
    qualification_identifier = models.CharField(max_length=100, null=True, blank=True)
    qualification_issuer = models.ForeignKey('accounts.Organization', on_delete=models.PROTECT, db_column='qualification_issuer_id', null=True, blank=True, related_name='qualified_practitioners')
    qualification_period_start = models.DateField(null=True, blank=True)
    qualification_period_end = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'practitioner'
        unique_together = [('first_name', 'last_name', 'birth_date')]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class PractitionerRole(FHIRResourceModel):
    practitioner_role_id = models.AutoField(primary_key=True)
    identifier = models.CharField(max_length=100, unique=True)
    active = models.BooleanField(null=True, blank=True)
    practitioner = models.ForeignKey(
        'accounts.Practitioner',
        on_delete=models.PROTECT,
        db_column='practitioner_id'
    )
    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.PROTECT,
        db_column='organization_id'
    )
    location = models.ForeignKey(
        'accounts.Location',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        db_column='location_id'
    )
    role_code = models.CharField(max_length=100, null=True, blank=True)
    specialty_code = models.CharField(max_length=100, null=True, blank=True)
    telecom = models.CharField(max_length=50, null=True, blank=True)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    available_days_of_week = models.CharField(max_length=255, null=True, blank=True)
    available_all_day_flag = models.BooleanField(null=True, blank=True)
    available_start_time = models.CharField(max_length=255, null=True, blank=True)
    available_end_time = models.CharField(max_length=255, null=True, blank=True)
    availability_exceptions = models.CharField(max_length=255, null=True, blank=True)
    not_available_description = models.TextField(null=True, blank=True)
    not_available_period_start = models.DateField(null=True, blank=True)
    not_available_period_end = models.DateField(null=True, blank=True)
    endpoint = models.ForeignKey('accounts.Endpoint', on_delete=models.PROTECT, db_column='endpoint_id', null=True, blank=True, related_name='practitioner_roles')
    healthcare_service = models.ForeignKey('accounts.HealthcareService', on_delete=models.PROTECT, db_column='healthcare_service_id', null=True, blank=True, related_name='practitioner_roles')

    class Meta:
        db_table = 'practitioner_role'
    
    def clean(self):
        """
        Business Rule: Prevent duplicate active roles for the same practitioner
        in the same organization to avoid schedule conflicts.
        """
        from django.core.exceptions import ValidationError
        
        if self.active:
            # Check for existing active roles with same practitioner, organization, and role_code
            duplicate_roles = PractitionerRole.objects.filter(
                practitioner=self.practitioner,
                organization=self.organization,
                role_code=self.role_code,
                active=True
            ).exclude(practitioner_role_id=self.practitioner_role_id)
            
            if duplicate_roles.exists():
                raise ValidationError(
                    f"Practitioner {self.practitioner} already has an active {self.role_code} "
                    f"role at {self.organization}. Deactivate the existing role first to prevent schedule conflicts."
                )
    
    def save(self, *args, **kwargs):
        """Call clean() before saving to ensure validation."""
        self.clean()
        super().save(*args, **kwargs)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """
    Custom User model with OneToOne link to Practitioner.
    
    Architecture:
    - Inherits from AbstractBaseUser for Django authentication (check_password, set_password, etc.)
    - Inherits from PermissionsMixin for Django permission system
    - practitioner is the primary key (enforces 1:1 relationship)
    - Uses standard UserManager for authentication
    
    Context: Philippine LGU Hospital System
    - Prevents credential sharing (one practitioner = one user)
    - Supports offline TOTP authentication
    """
    practitioner = models.OneToOneField(
        'accounts.Practitioner',
        on_delete=models.PROTECT,
        primary_key=True,
        db_column='practitioner_id'
    )
    username = models.CharField(max_length=255, unique=True)
    email = models.EmailField(max_length=255, unique=True, null=True, blank=True)
    password = models.CharField(max_length=255, db_column='password_hash')  # Django expects 'password' field
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    role = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=100)
    # Kept as Integer to match Excel, though Practitioner is PK
    user_id = models.IntegerField(null=True, blank=True) # original field name = "id" in excel
    
    # Required by AbstractBaseUser and Django Admin
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_superuser = models.BooleanField(default=False)

    # Attach standard UserManager for Django authentication
    objects = UserManager()
    
    # ---------------------------------------------------------
    # DJANGO AUTH CONFIGURATION
    # ---------------------------------------------------------
    USERNAME_FIELD = 'username'
    # Fields required when running 'createsuperuser'
    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'user'

    # =========================================================
    # THE FIX: Alias 'id' to primary key
    # =========================================================
    @property
    def id(self):
        """
        Alias 'id' to the actual primary key (practitioner_id) 
        to satisfy libraries (like SimpleJWT) expecting a standard 'id' field.
        """
        return self.pk

    def __str__(self):
        return self.username

# Supporting Models

class Endpoint(FHIRResourceModel):
    endpoint_id = models.AutoField(primary_key=True)
    connection_type = models.CharField(max_length=100, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    managing_organization = models.ForeignKey('accounts.Organization', on_delete=models.PROTECT, db_column='managing_organization_id', null=True, blank=True, related_name='managed_endpoints')
    contact_telecom = models.CharField(max_length=100, null=True, blank=True)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    payload_type = models.CharField(max_length=100, null=True, blank=True)
    payload_mime_type = models.CharField(max_length=100, null=True, blank=True)
    address = models.URLField(max_length=255, null=True, blank=True)
    class Meta:
        db_table = 'endpoint'

class HealthcareService(FHIRResourceModel):
    healthcare_service_id = models.AutoField(primary_key=True)
    active = models.BooleanField(null=True, blank=True)
    provided_by = models.ForeignKey('accounts.Organization', on_delete=models.PROTECT, db_column='provided_by_id', null=True, blank=True, related_name='healthcare_services')
    category = models.CharField(max_length=100, null=True, blank=True)
    healthcare_service_type = models.CharField(max_length=100, null=True, blank=True) # original field name = "type" in excel
    specialty = models.CharField(max_length=100, null=True, blank=True)
    location = models.ForeignKey('accounts.Location', on_delete=models.PROTECT, db_column='location_id', null=True, blank=True, related_name='healthcare_services')
    name = models.CharField(max_length=255, null=True, blank=True)
    comment = models.TextField(null=True, blank=True)
    telecom = models.CharField(max_length=100, null=True, blank=True)
    availability_exceptions = models.CharField(max_length=255, null=True, blank=True)
    class Meta:
        db_table = 'healthcare_service'
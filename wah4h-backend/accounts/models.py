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
    logo_url = models.URLField(max_length=500, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
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
    address_postal_code = models.CharField(max_length=100, null=True, blank=True)
    contact_purpose = models.CharField(max_length=50, null=True, blank=True)
    contact_first_name = models.CharField(max_length=50, null=True, blank=True)
    contact_last_name = models.CharField(max_length=50, null=True, blank=True)
    contact_telecom = models.CharField(max_length=50, null=True, blank=True)
    contact_address_line = models.CharField(max_length=50, null=True, blank=True)
    contact_address_city = models.CharField(max_length=50, null=True, blank=True)
    contact_address_state = models.CharField(max_length=50, null=True, blank=True)
    contact_address_country = models.CharField(max_length=50, null=True, blank=True)
    contact_postal_code = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = 'organization'
        unique_together = [('name', 'address_city')]

    def __str__(self):
        return self.name or f"Organization {self.organization_id}"


class Location(FHIRResourceModel):
    location_id = models.AutoField(primary_key=True)
    identifier = models.CharField(max_length=100, unique=True, null=True, blank=True)
    status = models.CharField(max_length=100)
    physical_type_code = models.CharField(max_length=100, null=True, blank=True)
    type_code = models.CharField(max_length=100, null=True, blank=True)
    operational_status = models.CharField(max_length=100, null=True, blank=True)
    mode = models.CharField(max_length=255, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    alias = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    telecom = models.CharField(max_length=50, null=True, blank=True)
    longitude = models.DecimalField(max_digits=18, decimal_places=10, null=True, blank=True)
    latitude = models.DecimalField(max_digits=18, decimal_places=10, null=True, blank=True)
    altitude = models.DecimalField(max_digits=18, decimal_places=10, null=True, blank=True)
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
    address_postal_code = models.CharField(max_length=100, null=True, blank=True)
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
    # PRC license — required PH Core practitioner identifier
    # System: http://prc.gov.ph/fhir/Identifier/prc-license
    prc_license_number = models.CharField(max_length=50, null=True, blank=True)
    # WAH4PC gateway provider UUID — used to route interop pushes to this practitioner
    wah4pc_id = models.UUIDField(null=True, blank=True)

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
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('doctor', 'Doctor'),
        ('nurse', 'Nurse'),
        ('lab_technician', 'Lab Technician'),
        ('pharmacist', 'Pharmacist'),
        ('billing_clerk', 'Billing Clerk'),
    ]
    role = models.CharField(max_length=255, null=True, blank=True, choices=ROLE_CHOICES)
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


import json as _json

class RoleModuleConfig(models.Model):
    """
    Stores admin-configurable module access per role.
    One row per role; modules stored as a JSON list.
    Seeded with defaults on first access via get_for_role().
    """
    ROLE_CHOICES = [
        ('doctor', 'Doctor'),
        ('nurse', 'Nurse'),
        ('lab_technician', 'Lab Technician'),
        ('pharmacist', 'Pharmacist'),
        ('billing_clerk', 'Billing Clerk'),
    ]

    DEFAULT_MODULES = {
        'doctor': ['dashboard', 'patients', 'admission', 'laboratory', 'monitoring', 'discharge', 'settings'],
        'nurse': ['dashboard', 'patients', 'admission', 'monitoring', 'laboratory', 'pharmacy', 'inventory', 'settings'],
        'lab_technician': ['dashboard', 'laboratory', 'monitoring', 'patients', 'compliance', 'settings'],
        'pharmacist': ['dashboard', 'pharmacy', 'inventory', 'patients', 'compliance', 'settings'],
        'billing_clerk': ['dashboard', 'billing', 'patients', 'settings'],
    }

    role = models.CharField(max_length=50, unique=True, choices=ROLE_CHOICES)
    modules = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'role_module_config'

    @classmethod
    def get_for_role(cls, role):
        obj, _ = cls.objects.get_or_create(
            role=role,
            defaults={'modules': cls.DEFAULT_MODULES.get(role, [])}
        )
        return obj

    @classmethod
    def get_all_configs(cls):
        result = {}
        for role, _ in cls.ROLE_CHOICES:
            result[role] = cls.get_for_role(role).modules
        return result

    def __str__(self):
        return f"RoleModuleConfig({self.role})"


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN PERSONALIZATION MODELS
# ─────────────────────────────────────────────────────────────────────────────

class RoomTypeDefinition(models.Model):
    """
    Admin-configurable room type catalog with daily rates.
    Used by billing to populate room/accommodation charges.
    """
    ROOM_TYPE_CODES = [
        ('ICU', 'Intensive Care Unit (ICU)'),
        ('NICU', 'Neonatal ICU (NICU)'),
        ('PRIVATE', 'Private Room'),
        ('SEMI_PRIVATE', 'Semi-Private Room'),
        ('WARD', 'General Ward'),
        ('ER', 'Emergency Room'),
        ('OR', 'Operating Room'),
        ('RECOVERY', 'Recovery Room'),
        ('ISOLATION', 'Isolation Room'),
        ('OTHER', 'Other'),
    ]

    room_type_id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'room_type_definition'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"


class DoctorFeeSchedule(models.Model):
    """
    Admin-configurable professional fee schedule per practitioner or specialty.
    Fortress pattern: practitioner_id is a BigIntegerField (no FK).
    Either practitioner_id or specialty_code must be set (not both required).
    """
    fee_id = models.AutoField(primary_key=True)
    practitioner_id = models.BigIntegerField(db_index=True, null=True, blank=True,
        help_text="Links to accounts.Practitioner.practitioner_id (Fortress pattern)")
    practitioner_name = models.CharField(max_length=255, null=True, blank=True,
        help_text="Cached display name for the practitioner")
    specialty_code = models.CharField(max_length=100, null=True, blank=True,
        help_text="SNOMED CT specialty code (e.g. 394814009 = General practice)")
    specialty_display = models.CharField(max_length=255, null=True, blank=True)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    professional_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'doctor_fee_schedule'
        ordering = ['practitioner_name', 'specialty_display']

    def __str__(self):
        label = self.practitioner_name or self.specialty_display or f"Fee #{self.fee_id}"
        return label


class ProcedurePriceConfig(models.Model):
    """
    Admin-configurable procedure price catalog.
    Code maps to ICD-10 PCS or CPT procedure codes stored in Encounter.Procedure.
    """
    PROCEDURE_CATEGORIES = [
        ('surgical', 'Surgical'),
        ('diagnostic', 'Diagnostic'),
        ('therapeutic', 'Therapeutic'),
        ('rehabilitative', 'Rehabilitative'),
        ('preventive', 'Preventive'),
        ('other', 'Other'),
    ]

    price_id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, null=True, blank=True, choices=PROCEDURE_CATEGORIES)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'procedure_price_config'
        ordering = ['category', 'code']

    def __str__(self):
        return f"{self.code} - {self.name}"
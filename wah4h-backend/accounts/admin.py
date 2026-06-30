"""
accounts/admin.py
Django Admin Configuration for Identity & Structure Management

Special Considerations:
- User model has practitioner as OneToOneField (PK), requiring special handling
- Enhanced search capabilities for LGU hospital staff
"""

from django.contrib import admin
from .models import (
    Organization,
    Location,
    Practitioner,
    PractitionerRole,
    User,
    Endpoint,
    HealthcareService
)


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    """Admin interface for Organization management."""
    
    list_display = (
        'organization_id',
        'name',
        'nhfr_code',
        'type_code',
        'active',
        'status'
    )
    search_fields = ('name', 'nhfr_code', 'type_code', 'address_city')
    list_filter = ('active', 'status', 'type_code')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'active',
                'nhfr_code',
                'type_code',
                'name',
                'alias',
                'status'
            )
        }),
        ('Contact Information', {
            'fields': (
                'telecom',
                'endpoint',
            )
        }),
        ('Address', {
            'fields': (
                'address_line',
                'address_city',
                'address_district',
                'address_state',
                'address_country',
                'address_postal_code',
            )
        }),
        ('Contact Person', {
            'fields': (
                'contact_purpose',
                'contact_first_name',
                'contact_last_name',
                'contact_telecom',
                'contact_address_line',
                'contact_address_city',
                'contact_address_state',
                'contact_address_country',
                'contact_postal_code',
            ),
            'classes': ('collapse',)
        }),
        ('Relationships', {
            'fields': ('part_of_organization',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    """Admin interface for Location management."""
    
    list_display = (
        'location_id',
        'name',
        'identifier',
        'physical_type_code',
        'type_code',
        'operational_status',
        'status'
    )
    search_fields = (
        'name',
        'identifier',
        'physical_type_code',
        'type_code',
        'address_city'
    )
    list_filter = ('operational_status', 'status', 'mode', 'physical_type_code')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'identifier',
                'status',
                'name',
                'alias',
                'description',
                'physical_type_code',
                'type_code',
                'operational_status',
                'mode',
            )
        }),
        ('Contact & Location', {
            'fields': (
                'telecom',
                'longitude',
                'latitude',
                'altitude',
            )
        }),
        ('Address', {
            'fields': (
                'address_line',
                'address_city',
                'address_district',
                'address_state',
                'address_country',
                'address_postal_code',
            )
        }),
        ('Hours of Operation', {
            'fields': (
                'hours_of_operation_days',
                'hours_of_operation_all_day',
                'opening_time',
                'closing_time',
                'availability_exceptions',
            ),
            'classes': ('collapse',)
        }),
        ('Relationships', {
            'fields': (
                'managing_organization',
                'part_of_location',
                'endpoint',
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(Practitioner)
class PractitionerAdmin(admin.ModelAdmin):
    """
    Admin interface for Practitioner management.
    
    Enhanced search for LGU hospital staff to quickly find practitioners by:
    - Name (first_name, last_name)
    - Identifier (hospital/system ID)
    - PRC License (qualification_identifier)
    """
    
    list_display = (
        'practitioner_id',
        'identifier',
        'first_name',
        'last_name',
        'qualification_identifier',
        'active',
        'gender',
        'status'
    )
    search_fields = (
        'first_name',
        'last_name',
        'identifier',
        'qualification_identifier',  # PRC License search
        'telecom',
        'address_city'
    )
    list_filter = ('active', 'gender', 'status', 'qualification_code')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Identification', {
            'fields': (
                'identifier',
                'active',
                'status',
            )
        }),
        ('Personal Information', {
            'fields': (
                'first_name',
                'middle_name',
                'last_name',
                'suffix_name',
                'gender',
                'birth_date',
                'photo_url',
            )
        }),
        ('Contact Information', {
            'fields': (
                'telecom',
                'communication_language',
            )
        }),
        ('Address', {
            'fields': (
                'address_line',
                'address_city',
                'address_district',
                'address_state',
                'address_country',
                'address_postal_code',
            ),
            'classes': ('collapse',)
        }),
        ('Professional Qualifications (PRC)', {
            'fields': (
                'qualification_code',
                'qualification_identifier',
                'qualification_issuer',
                'qualification_period_start',
                'qualification_period_end',
            ),
            'description': 'Professional Regulation Commission (PRC) license information'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(PractitionerRole)
class PractitionerRoleAdmin(admin.ModelAdmin):
    """Admin interface for PractitionerRole management."""
    
    list_display = (
        'practitioner_role_id',
        'practitioner',
        'organization',
        'location',
        'role_code',
        'specialty_code',
        'active',
        'status'
    )
    search_fields = (
        'practitioner__last_name',
        'practitioner__first_name',
        'organization__name',
        'role_code',
        'specialty_code',
        'identifier'
    )
    list_filter = ('active', 'status', 'role_code', 'specialty_code')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'identifier',
                'active',
                'status',
            )
        }),
        ('Assignment', {
            'fields': (
                'practitioner',
                'organization',
                'location',
                'healthcare_service',
            )
        }),
        ('Role Details', {
            'fields': (
                'role_code',
                'specialty_code',
                'telecom',
                'period_start',
                'period_end',
            )
        }),
        ('Availability', {
            'fields': (
                'available_days_of_week',
                'available_all_day_flag',
                'available_start_time',
                'available_end_time',
                'availability_exceptions',
            ),
            'classes': ('collapse',)
        }),
        ('Not Available Periods', {
            'fields': (
                'not_available_description',
                'not_available_period_start',
                'not_available_period_end',
            ),
            'classes': ('collapse',)
        }),
        ('Technical', {
            'fields': ('endpoint',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """
    Admin interface for User management.
    
    Special Handling:
    - User.practitioner is a OneToOneField used as Primary Key
    - Cannot create User without existing Practitioner
    - Must select existing Practitioner when creating User in admin
    """
    
    list_display = (
        'practitioner',
        'username',
        'email',
        'role',
        'status',
        'last_login'
    )
    search_fields = (
        'username',
        'email',
        'first_name',
        'last_name',
        'practitioner__first_name',
        'practitioner__last_name'
    )
    list_filter = ('role', 'status')
    readonly_fields = ('last_login', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Practitioner Link', {
            'fields': ('practitioner',),
            'description': (
                'Select an existing Practitioner. Each Practitioner can only have one User account. '
                'This prevents credential sharing in shared device environments.'
            )
        }),
        ('Account Information', {
            'fields': (
                'username',
                'email',
                'password_hash',
            )
        }),
        ('Personal Information', {
            'fields': (
                'first_name',
                'last_name',
            )
        }),
        ('Permissions & Status', {
            'fields': (
                'role',
                'status',
            )
        }),
        ('Metadata', {
            'fields': (
                'last_login',
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        })
    )
    
    def get_readonly_fields(self, request, obj=None):
        """
        Make practitioner field readonly when editing existing User.
        This prevents changing the User-Practitioner link after creation.
        """
        if obj:  # Editing existing User
            return self.readonly_fields + ('practitioner',)
        return self.readonly_fields


@admin.register(Endpoint)
class EndpointAdmin(admin.ModelAdmin):
    """Admin interface for Endpoint management."""
    
    list_display = (
        'endpoint_id',
        'name',
        'connection_type',
        'managing_organization',
        'status'
    )
    search_fields = ('name', 'connection_type', 'address')
    list_filter = ('status', 'connection_type')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(HealthcareService)
class HealthcareServiceAdmin(admin.ModelAdmin):
    """Admin interface for HealthcareService management."""
    
    list_display = (
        'healthcare_service_id',
        'name',
        'active',
        'status'
    )
    search_fields = ('name',)
    list_filter = ('active', 'status')
    readonly_fields = ('created_at', 'updated_at')

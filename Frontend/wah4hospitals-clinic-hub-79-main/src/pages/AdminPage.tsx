import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Building2, Users, LayoutGrid, Code2, Save, RefreshCw,
  ShieldCheck, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';

const API_BASE    = import.meta.env.LOCAL_8000 || '';
const ACCOUNTS_API = `${API_BASE}/api/accounts`;

// ─────────────────────────────────────────────────────────────────────────────
// FHIR / PHCore R4 CODE TABLES
// Must mirror wah4pc.py so values round-trip correctly through the backend.
// ─────────────────────────────────────────────────────────────────────────────

// PHCore facility-type CodeSystem + HL7 organization-type fallback
// system: urn://example.com/ph-core/fhir/CodeSystem/facility-type
const FACILITY_TYPES = [
  { code: 'hospital',              display: 'Hospital' },
  { code: 'clinic',                display: 'Clinic' },
  { code: 'health-center',         display: 'Health Center' },
  { code: 'rural-health-unit',     display: 'Rural Health Unit (RHU)' },
  { code: 'barangay-health-station', display: 'Barangay Health Station (BHS)' },
  { code: 'birthing-home',         display: 'Birthing Home' },
  { code: 'dialysis-center',       display: 'Dialysis Center' },
  { code: 'diagnostic-laboratory', display: 'Diagnostic Laboratory' },
  { code: 'radiology-center',      display: 'Radiology / Imaging Center' },
  { code: 'infirmary',             display: 'Infirmary' },
  { code: 'sanitarium',            display: 'Sanitarium' },
  { code: 'rehabilitation-center', display: 'Rehabilitation Center' },
  { code: 'medical-center',        display: 'Medical Center' },
  { code: 'specialty-hospital',    display: 'Specialty Hospital' },
  { code: 'lying-in-clinic',       display: 'Lying-in Clinic' },
  { code: 'other',                 display: 'Other' },
];

// FHIR contactentity-type CodeSystem
// system: http://terminology.hl7.org/CodeSystem/contactentity-type
const CONTACT_PURPOSES = [
  { code: 'BILL',   display: 'Billing' },
  { code: 'ADMIN',  display: 'Administrative' },
  { code: 'HR',     display: 'Human Resource' },
  { code: 'PAYOR',  display: 'Payor' },
  { code: 'PATINF', display: 'Patient Information' },
  { code: 'PRESS',  display: 'Press / Media' },
];

// PSGC regions — short code stored in DB, matches wah4pc.py _PSGC_REGION
const REGIONS = [
  { code: 'NCR',   display: 'National Capital Region (NCR)' },
  { code: 'CAR',   display: 'Cordillera Administrative Region (CAR)' },
  { code: 'I',     display: 'Region I – Ilocos Region' },
  { code: 'II',    display: 'Region II – Cagayan Valley' },
  { code: 'III',   display: 'Region III – Central Luzon' },
  { code: 'IVA',   display: 'Region IV-A – CALABARZON' },
  { code: 'IVB',   display: 'Region IV-B – MIMAROPA' },
  { code: 'V',     display: 'Region V – Bicol Region' },
  { code: 'VI',    display: 'Region VI – Western Visayas' },
  { code: 'VII',   display: 'Region VII – Central Visayas' },
  { code: 'VIII',  display: 'Region VIII – Eastern Visayas' },
  { code: 'IX',    display: 'Region IX – Zamboanga Peninsula' },
  { code: 'X',     display: 'Region X – Northern Mindanao' },
  { code: 'XI',    display: 'Region XI – Davao Region' },
  { code: 'XII',   display: 'Region XII – SOCCSKSARGEN' },
  { code: 'XIII',  display: 'Region XIII – Caraga' },
  { code: 'BARMM', display: 'BARMM – Bangsamoro Autonomous Region' },
];

// PSGC cities — 10-digit frontend code stored in DB, matches wah4pc.py _PSGC_CITY
// Grouped by region for filtered display
const CITIES: { code: string; display: string; region: string }[] = [
  // NCR
  { code: '1380100000', display: 'Caloocan City',    region: 'NCR' },
  { code: '1380200000', display: 'Las Piñas City',   region: 'NCR' },
  { code: '1380300000', display: 'Makati City',      region: 'NCR' },
  { code: '1380400000', display: 'Malabon City',     region: 'NCR' },
  { code: '1380500000', display: 'Mandaluyong City', region: 'NCR' },
  { code: '1380600000', display: 'Manila',           region: 'NCR' },
  { code: '1380700000', display: 'Marikina City',    region: 'NCR' },
  { code: '1380800000', display: 'Muntinlupa City',  region: 'NCR' },
  { code: '1380900000', display: 'Navotas City',     region: 'NCR' },
  { code: '1381000000', display: 'Parañaque City',   region: 'NCR' },
  { code: '1381100000', display: 'Pasay City',       region: 'NCR' },
  { code: '1381200000', display: 'Pasig City',       region: 'NCR' },
  { code: '1381300000', display: 'Quezon City',      region: 'NCR' },
  { code: '1381400000', display: 'San Juan City',    region: 'NCR' },
  { code: '1381500000', display: 'Taguig City',      region: 'NCR' },
  { code: '1381600000', display: 'Valenzuela City',  region: 'NCR' },
  { code: '1381701000', display: 'Pateros',          region: 'NCR' },
  // Central Luzon (III)
  { code: '0310600000', display: 'San Fernando City (Pampanga)', region: 'III' },
  { code: '0318200000', display: 'Angeles City',     region: 'III' },
  { code: '0307400000', display: 'Mabalacat City',   region: 'III' },
];

// ISO 3166-1 alpha-2 — Philippines-focused list
const COUNTRIES = [
  { code: 'PH', display: 'Philippines' },
  { code: 'US', display: 'United States' },
  { code: 'JP', display: 'Japan' },
  { code: 'KR', display: 'South Korea' },
  { code: 'AU', display: 'Australia' },
  { code: 'GB', display: 'United Kingdom' },
  { code: 'SG', display: 'Singapore' },
  { code: 'other', display: 'Other' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const ALL_MODULES = [
  { id: 'dashboard',   label: 'Dashboard' },
  { id: 'patients',    label: 'Patients' },
  { id: 'admission',   label: 'Admission' },
  { id: 'appointment', label: 'Appointment' },
  { id: 'pharmacy',    label: 'Pharmacy' },
  { id: 'laboratory',  label: 'Laboratory' },
  { id: 'monitoring',  label: 'Monitoring' },
  { id: 'discharge',   label: 'Discharge' },
  { id: 'inventory',   label: 'Inventory' },
  { id: 'compliance',  label: 'Compliance' },
  { id: 'statistics',  label: 'Statistics' },
  { id: 'billing',     label: 'Billing' },
  { id: 'philhealth',  label: 'PhilHealth' },
  { id: 'settings',    label: 'Settings' },
  { id: 'admin',       label: 'Admin Panel' },
];

// FHIR PractitionerRole codes aligned with PHCore R4
// system: http://snomed.info/sct (SNOMED CT)
const ROLE_OPTIONS = [
  { value: 'admin',         label: 'Admin',           fhirCode: null,        fhirDisplay: 'System Administrator' },
  { value: 'doctor',        label: 'Doctor',          fhirCode: '309343006', fhirDisplay: 'Physician' },
  { value: 'nurse',         label: 'Nurse',           fhirCode: '106292003', fhirDisplay: 'Professional nurse' },
  { value: 'lab_technician',label: 'Lab Technician',  fhirCode: '159076007', fhirDisplay: 'Medical laboratory technician' },
  { value: 'pharmacist',    label: 'Pharmacist',      fhirCode: '46255001',  fhirDisplay: 'Pharmacist' },
  { value: 'billing_clerk', label: 'Billing Clerk',   fhirCode: '224608005', fhirDisplay: 'Administrative officer' },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.filter(r => r.value !== 'admin').map(r => [r.value, r.label])
);

function authHeaders() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Reusable native select styled to match Input
const Select: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ value, onChange, placeholder, children, className = '' }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {children}
  </select>
);

// ─────────────────────────────────────────────────────────────────────────────
// HOSPITAL PROFILE TAB
// ─────────────────────────────────────────────────────────────────────────────
interface HospitalSettings {
  organization_id?: number;
  name: string; alias: string; nhfr_code: string; type_code: string;
  active: boolean; telecom: string; logo_url: string; description: string;
  address_line: string; address_city: string; address_district: string;
  address_state: string; address_country: string; address_postal_code: string;
  contact_purpose: string; contact_first_name: string; contact_last_name: string;
  contact_telecom: string; contact_address_line: string; contact_address_city: string;
  contact_address_state: string; contact_address_country: string; contact_postal_code: string;
  fhir_resource_type?: string;
  fhir_identifier?: { system: string; value: string } | null;
}

const emptyHospital: HospitalSettings = {
  name: '', alias: '', nhfr_code: '', type_code: '', active: true,
  telecom: '', logo_url: '', description: '',
  address_line: '', address_city: '', address_district: '',
  address_state: '', address_country: 'PH', address_postal_code: '',
  contact_purpose: '', contact_first_name: '', contact_last_name: '',
  contact_telecom: '', contact_address_line: '', contact_address_city: '',
  contact_address_state: '', contact_address_country: 'PH', contact_postal_code: '',
};

const HospitalProfileTab: React.FC = () => {
  const { toast } = useToast();
  const [form, setForm]     = useState<HospitalSettings>(emptyHospital);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [fhirId, setFhirId]   = useState<{ system: string; value: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${ACCOUNTS_API}/admin/hospital/`, { headers: authHeaders() });
      const d = data.data as HospitalSettings;
      setForm({
        name: d.name || '', alias: d.alias || '', nhfr_code: d.nhfr_code || '',
        type_code: d.type_code || '', active: d.active ?? true,
        telecom: d.telecom || '', logo_url: d.logo_url || '', description: d.description || '',
        address_line: d.address_line || '', address_city: d.address_city || '',
        address_district: d.address_district || '', address_state: d.address_state || '',
        address_country: d.address_country || 'PH', address_postal_code: d.address_postal_code || '',
        contact_purpose: d.contact_purpose || '', contact_first_name: d.contact_first_name || '',
        contact_last_name: d.contact_last_name || '', contact_telecom: d.contact_telecom || '',
        contact_address_line: d.contact_address_line || '', contact_address_city: d.contact_address_city || '',
        contact_address_state: d.contact_address_state || '',
        contact_address_country: d.contact_address_country || 'PH',
        contact_postal_code: d.contact_postal_code || '',
      });
      setFhirId(d.fhir_identifier ?? null);
    } catch {
      toast({ title: 'Failed to load hospital settings', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${ACCOUNTS_API}/admin/hospital/`, form, { headers: authHeaders() });
      toast({ title: 'Hospital settings saved.' });
      load();
    } catch (e: any) {
      toast({ title: e?.response?.data?.message || 'Save failed.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // text input handler
  const fi = (key: keyof HospitalSettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [key]: e.target.value }));
  // select handler
  const fs = (key: keyof HospitalSettings) =>
    (v: string) => setForm(p => ({ ...p, [key]: v }));

  // cities filtered by selected region
  const filteredCities = form.address_state
    ? CITIES.filter(c => c.region === form.address_state)
    : CITIES;
  const filteredContactCities = form.contact_address_state
    ? CITIES.filter(c => c.region === form.contact_address_state)
    : CITIES;

  if (loading) return <div className="flex items-center justify-center p-10"><Loader2 className="animate-spin w-6 h-6" /></div>;

  return (
    <div className="space-y-6">
      {fhirId && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 w-fit">
          <CheckCircle2 className="w-4 h-4" />
          <span>FHIR R4 · PHCore Organization · NHFR: <strong>{fhirId.value}</strong></span>
        </div>
      )}

      {form.logo_url && (
        <div className="flex items-center gap-4">
          <img src={form.logo_url} alt="Hospital logo" className="h-16 w-16 object-contain rounded border" />
          <span className="text-sm text-gray-500">{form.logo_url}</span>
        </div>
      )}

      {/* ── Basic Information ── */}
      <Card>
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Hospital Name</Label>
            <Input value={form.name} onChange={fi('name')} placeholder="e.g. San Juan City General Hospital" />
          </div>
          <div className="space-y-1">
            <Label>Alias / Short Name</Label>
            <Input value={form.alias} onChange={fi('alias')} placeholder="e.g. SJCGH" />
          </div>
          <div className="space-y-1">
            <Label>NHFR Code <span className="text-xs text-gray-400 ml-1">DOH National Health Facility Registry</span></Label>
            <Input value={form.nhfr_code} onChange={fi('nhfr_code')} placeholder="e.g. DOH-NCR-00123" />
          </div>

          {/* Facility Type — PHCore facility-type CodeSystem */}
          <div className="space-y-1">
            <Label>
              Facility Type
              <span className="text-xs text-blue-500 ml-1">PHCore facility-type</span>
            </Label>
            <Select value={form.type_code} onChange={fs('type_code')} placeholder="— select type —">
              {FACILITY_TYPES.map(t => (
                <option key={t.code} value={t.code}>{t.display}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Telephone</Label>
            <Input value={form.telecom} onChange={fi('telecom')} placeholder="+63 2 8XXX XXXX" />
          </div>
          <div className="space-y-1">
            <Label>Logo URL</Label>
            <Input value={form.logo_url} onChange={fi('logo_url')} placeholder="https://..." />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={fi('description')} placeholder="Short description of the facility" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.active} onCheckedChange={v => setForm(p => ({ ...p, active: v }))} />
            <Label>Active</Label>
          </div>
        </CardContent>
      </Card>

      {/* ── Address ── */}
      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
          <CardDescription className="text-xs">
            Region &amp; city fields map to PSGC codes for FHIR R4 address extensions.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 md:col-span-2">
            <Label>Street / Address Line <span className="text-xs text-gray-400">(barangay, street, building)</span></Label>
            <Input value={form.address_line} onChange={fi('address_line')} />
          </div>

          {/* Region — PSGC short code */}
          <div className="space-y-1">
            <Label>
              Region <span className="text-xs text-blue-500 ml-1">PSGC</span>
            </Label>
            <Select
              value={form.address_state}
              onChange={v => setForm(p => ({ ...p, address_state: v, address_city: '' }))}
              placeholder="— select region —"
            >
              {REGIONS.map(r => (
                <option key={r.code} value={r.code}>{r.display}</option>
              ))}
            </Select>
          </div>

          {/* City — PSGC 10-digit code, filtered by region */}
          <div className="space-y-1">
            <Label>
              City / Municipality <span className="text-xs text-blue-500 ml-1">PSGC</span>
            </Label>
            <Select value={form.address_city} onChange={fs('address_city')} placeholder="— select city —">
              {filteredCities.map(c => (
                <option key={c.code} value={c.code}>{c.display}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label>District / Barangay</Label>
            <Input value={form.address_district} onChange={fi('address_district')} placeholder="e.g. Barangay 123" />
          </div>

          {/* Country — ISO 3166-1 alpha-2 */}
          <div className="space-y-1">
            <Label>
              Country <span className="text-xs text-blue-500 ml-1">ISO 3166-1 α-2</span>
            </Label>
            <Select value={form.address_country} onChange={fs('address_country')} placeholder="— select country —">
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.display}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Postal Code</Label>
            <Input value={form.address_postal_code} onChange={fi('address_postal_code')} placeholder="e.g. 1000" />
          </div>
        </CardContent>
      </Card>

      {/* ── Contact Person ── */}
      <Card>
        <CardHeader><CardTitle>Contact Person</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>First Name</Label>
            <Input value={form.contact_first_name} onChange={fi('contact_first_name')} />
          </div>
          <div className="space-y-1">
            <Label>Last Name</Label>
            <Input value={form.contact_last_name} onChange={fi('contact_last_name')} />
          </div>

          {/* Contact Purpose — FHIR contactentity-type */}
          <div className="space-y-1">
            <Label>
              Contact Purpose
              <span className="text-xs text-blue-500 ml-1">FHIR contactentity-type</span>
            </Label>
            <Select value={form.contact_purpose} onChange={fs('contact_purpose')} placeholder="— select purpose —">
              {CONTACT_PURPOSES.map(p => (
                <option key={p.code} value={p.code}>{p.display} ({p.code})</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Contact Telecom</Label>
            <Input value={form.contact_telecom} onChange={fi('contact_telecom')} placeholder="+63 9XX XXX XXXX" />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Contact Address Line</Label>
            <Input value={form.contact_address_line} onChange={fi('contact_address_line')} />
          </div>

          {/* Contact Region */}
          <div className="space-y-1">
            <Label>Contact Region <span className="text-xs text-blue-500 ml-1">PSGC</span></Label>
            <Select
              value={form.contact_address_state}
              onChange={v => setForm(p => ({ ...p, contact_address_state: v, contact_address_city: '' }))}
              placeholder="— select region —"
            >
              {REGIONS.map(r => (
                <option key={r.code} value={r.code}>{r.display}</option>
              ))}
            </Select>
          </div>

          {/* Contact City */}
          <div className="space-y-1">
            <Label>Contact City <span className="text-xs text-blue-500 ml-1">PSGC</span></Label>
            <Select value={form.contact_address_city} onChange={fs('contact_address_city')} placeholder="— select city —">
              {filteredContactCities.map(c => (
                <option key={c.code} value={c.code}>{c.display}</option>
              ))}
            </Select>
          </div>

          {/* Contact Country */}
          <div className="space-y-1">
            <Label>Contact Country <span className="text-xs text-blue-500 ml-1">ISO 3166-1 α-2</span></Label>
            <Select value={form.contact_address_country} onChange={fs('contact_address_country')} placeholder="— select country —">
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.display}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Contact Postal Code</Label>
            <Input value={form.contact_postal_code} onChange={fi('contact_postal_code')} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="flex items-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Hospital Settings
      </Button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT TAB
// ─────────────────────────────────────────────────────────────────────────────
interface AdminUser {
  practitioner_id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  is_active: boolean;
}

const UserManagementTab: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<number | null>(null);
  const [edits, setEdits]     = useState<Record<number, Partial<AdminUser>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${ACCOUNTS_API}/admin/users/`, { headers: authHeaders() });
      setUsers(data.data as AdminUser[]);
    } catch { toast({ title: 'Failed to load users', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const patch = async (uid: number) => {
    const changes = edits[uid];
    if (!changes) return;
    setSaving(uid);
    try {
      await axios.patch(`${ACCOUNTS_API}/admin/users/${uid}/`, changes, { headers: authHeaders() });
      toast({ title: 'User updated.' });
      setEdits(prev => { const n = { ...prev }; delete n[uid]; return n; });
      load();
    } catch (e: any) {
      toast({ title: e?.response?.data?.message || 'Update failed.', variant: 'destructive' });
    } finally { setSaving(null); }
  };

  const edit = (uid: number, key: keyof AdminUser, value: unknown) =>
    setEdits(prev => ({ ...prev, [uid]: { ...prev[uid], [key]: value } }));

  const roleOf   = (u: AdminUser) => edits[u.practitioner_id]?.role ?? u.role;
  const activeOf = (u: AdminUser) => edits[u.practitioner_id]?.is_active ?? u.is_active;

  const roleMeta = (code: string) => ROLE_OPTIONS.find(r => r.value === code);

  if (loading) return <div className="flex items-center justify-center p-10"><Loader2 className="animate-spin w-6 h-6" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{users.length} users registered</p>
        <Button variant="outline" size="sm" onClick={load} className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Username / Email</th>
              <th className="px-4 py-3 text-left">
                Role
                <span className="text-blue-400 font-normal normal-case ml-1">(SNOMED CT)</span>
              </th>
              <th className="px-4 py-3 text-left">Active</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => {
              const uid   = u.practitioner_id;
              const dirty = !!edits[uid];
              const meta  = roleMeta(roleOf(u));
              return (
                <tr key={uid} className={dirty ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <div>{u.username}</div>
                    <div className="text-xs">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {/* Role — FHIR PractitionerRole codes (SNOMED CT) */}
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={roleOf(u)}
                      onChange={e => edit(uid, 'role', e.target.value)}
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    {meta?.fhirCode && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        SNOMED {meta.fhirCode} · {meta.fhirDisplay}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={activeOf(u) as boolean}
                      onCheckedChange={v => edit(uid, 'is_active', v)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {dirty && (
                      <Button size="sm" onClick={() => patch(uid)} disabled={saving === uid}>
                        {saving === uid ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        &nbsp;Save
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ROLE MODULE CONFIG TAB
// ─────────────────────────────────────────────────────────────────────────────
type RoleModuleMap = Record<string, string[]>;

const RoleModulesTab: React.FC = () => {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<RoleModuleMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${ACCOUNTS_API}/admin/role-modules/`, { headers: authHeaders() });
      setConfigs(data.data as RoleModuleMap);
    } catch { toast({ title: 'Failed to load role configs', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const toggle = (role: string, module: string) =>
    setConfigs(prev => {
      const cur  = prev[role] ?? [];
      const next = cur.includes(module) ? cur.filter(m => m !== module) : [...cur, module];
      return { ...prev, [role]: next };
    });

  const saveRole = async (role: string) => {
    setSaving(role);
    try {
      await axios.put(
        `${ACCOUNTS_API}/admin/role-modules/${role}/`,
        { modules: configs[role] ?? [] },
        { headers: authHeaders() }
      );
      toast({ title: `Modules for ${ROLE_LABELS[role] ?? role} saved.` });
    } catch (e: any) {
      toast({ title: e?.response?.data?.message || 'Save failed.', variant: 'destructive' });
    } finally { setSaving(null); }
  };

  if (loading) return <div className="flex items-center justify-center p-10"><Loader2 className="animate-spin w-6 h-6" /></div>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Configure which modules each role can access. Changes take effect on next login.
      </p>
      {Object.entries(ROLE_LABELS).map(([role, label]) => {
        const active = configs[role] ?? [];
        const meta   = ROLE_OPTIONS.find(r => r.value === role);
        return (
          <Card key={role}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{label}</CardTitle>
                  {meta?.fhirCode && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      SNOMED CT {meta.fhirCode} · {meta.fhirDisplay}
                    </p>
                  )}
                </div>
                <Button size="sm" onClick={() => saveRole(role)} disabled={saving === role}>
                  {saving === role ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ALL_MODULES.map(m => {
                  const on = active.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggle(role, m.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        on
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {on
                        ? <CheckCircle2 className="inline w-3 h-3 mr-1" />
                        : <XCircle className="inline w-3 h-3 mr-1" />}
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FHIR ORGANIZATION VIEWER TAB
// ─────────────────────────────────────────────────────────────────────────────
const FHIROrgTab: React.FC = () => {
  const { toast } = useToast();
  const [resource, setResource] = useState<object | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${ACCOUNTS_API}/fhir/Organization/`, { headers: authHeaders() });
        setResource(data);
      } catch { toast({ title: 'Failed to load FHIR Organization resource', variant: 'destructive' }); }
      finally { setLoading(false); }
    })();
  }, [toast]);

  if (loading) return <div className="flex items-center justify-center p-10"><Loader2 className="animate-spin w-6 h-6" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            FHIR R4 Organization Resource
          </CardTitle>
          <CardDescription>
            Live PHCore R4-compliant resource at
            <code className="ml-1 text-xs bg-gray-100 px-1 rounded">/api/accounts/fhir/Organization/</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resource ? (
            <pre className="bg-gray-900 text-green-300 rounded-lg p-4 text-xs overflow-x-auto max-h-[500px]">
              {JSON.stringify(resource, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-gray-500">No Organization record found. Save hospital settings first.</p>
          )}
        </CardContent>
      </Card>
      <div className="text-xs text-gray-400 space-y-1">
        <p>• Profile: <code>urn://example.com/ph-core/fhir/StructureDefinition/ph-core-organization</code></p>
        <p>• NHFR identifier system: <code>https://nhfr.doh.gov.ph/facility</code></p>
        <p>• Facility-type CodeSystem: <code>urn://example.com/ph-core/fhir/CodeSystem/facility-type</code></p>
        <p>• Address PSGC extensions: <code>urn://example.com/ph-core/fhir/StructureDefinition/region</code> · <code>/city-municipality</code></p>
        <p>• Logo extension: <code>urn://example.com/ph-core/fhir/StructureDefinition/organization-logo</code></p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const AdminPage: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <ShieldCheck className="w-7 h-7 text-blue-600" />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 text-sm">Hospital configuration, user management, and role settings</p>
      </div>
    </div>

    <Tabs defaultValue="hospital" className="space-y-4">
      <TabsList className="flex w-full space-x-2 overflow-x-auto">
        <TabsTrigger value="hospital" className="flex items-center gap-2 flex-shrink-0">
          <Building2 className="w-4 h-4" /> Hospital Profile
        </TabsTrigger>
        <TabsTrigger value="users" className="flex items-center gap-2 flex-shrink-0">
          <Users className="w-4 h-4" /> Users
        </TabsTrigger>
        <TabsTrigger value="roles" className="flex items-center gap-2 flex-shrink-0">
          <LayoutGrid className="w-4 h-4" /> Role Modules
        </TabsTrigger>
        <TabsTrigger value="fhir" className="flex items-center gap-2 flex-shrink-0">
          <Code2 className="w-4 h-4" /> FHIR Organization
        </TabsTrigger>
      </TabsList>

      <TabsContent value="hospital"><HospitalProfileTab /></TabsContent>
      <TabsContent value="users"><UserManagementTab /></TabsContent>
      <TabsContent value="roles"><RoleModulesTab /></TabsContent>
      <TabsContent value="fhir"><FHIROrgTab /></TabsContent>
    </Tabs>
  </div>
);

export default AdminPage;

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import addressData from '../data/addressData.json';
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
  DollarSign, MapPin, Plus, Pencil, Trash2, X,
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

// PSGC regions — derived from addressData.json (all 18 Philippine regions)
const REGIONS = (addressData.regions as { code: string; name: string }[]).map(r => ({
  code: r.code,
  display: r.name,
}));

// PSGC cities — all 1,656 cities/municipalities derived from addressData.json
// Flat list with region code for filtered display (province→region mapped via provinces dict)
const _provinceToRegion: Record<string, string> = {};
Object.entries(addressData.provinces as Record<string, { code: string; name: string }[]>).forEach(
  ([regionCode, provs]) => provs.forEach(p => { _provinceToRegion[p.code] = regionCode; })
);
const CITIES: { code: string; display: string; region: string }[] = [];
Object.entries(addressData.cities as Record<string, { code: string; name: string }[]>).forEach(
  ([provCode, cities]) => {
    const regionCode = _provinceToRegion[provCode] ?? 'NCR';
    cities.forEach(c => CITIES.push({ code: c.code, display: c.name, region: regionCode }));
  }
);

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
      setUsers(Array.isArray(data.data) ? data.data : []);
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
// SHARED INLINE FORM HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const FormRow: React.FC<{ label: string; children: React.ReactNode; span2?: boolean }> = ({ label, children, span2 }) => (
  <div className={`space-y-1 ${span2 ? 'md:col-span-2' : ''}`}>
    <Label>{label}</Label>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FACILITIES TAB — Hierarchical Building → Ward → Room → Bed manager
// ─────────────────────────────────────────────────────────────────────────────
interface LocRecord {
  location_id: number;
  name: string;
  alias: string;
  description: string;
  physical_type_code: string;
  type_code: string;
  status: string;
  operational_status: string;
  telecom: string;
  part_of_location_id: number | null;
  part_of_name: string | null;
}
interface RoomTypeCatalog { room_type_id: number; code: string; name: string; daily_rate: string; is_active: boolean; }

type FacLevel = 'bu' | 'wa' | 'ro' | 'bd';

const FAC_LEVELS: { code: FacLevel; label: string; parentLabel: string }[] = [
  { code: 'bu', label: 'Buildings',  parentLabel: '' },
  { code: 'wa', label: 'Wards',      parentLabel: 'Building' },
  { code: 'ro', label: 'Rooms',      parentLabel: 'Ward' },
  { code: 'bd', label: 'Beds',       parentLabel: 'Room' },
];

const OPS_STATUSES = [
  { code: 'O', label: 'Operational' },
  { code: 'C', label: 'Closed' },
  { code: 'H', label: 'Housekeeping' },
  { code: 'U', label: 'Unoccupied' },
  { code: 'K', label: 'Contaminated' },
  { code: 'I', label: 'Isolated' },
];

const selectCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const FacilitiesTab: React.FC = () => {
  const { toast } = useToast();

  const [level, setLevel] = useState<FacLevel>('bu');
  const [items, setItems] = useState<LocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LocRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // parent lookups for dropdowns
  const [buildings, setBuildings] = useState<LocRecord[]>([]);
  const [wards, setWards] = useState<LocRecord[]>([]);
  const [rooms, setRooms] = useState<LocRecord[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeCatalog[]>([]);

  // filter by parent
  const [filterParent, setFilterParent] = useState<number | ''>('');

  // form state
  const [fName, setFName] = useState('');
  const [fAlias, setFAlias] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fParent, setFParent] = useState<number | ''>('');
  const [fRoomType, setFRoomType] = useState('');   // type_code = RoomTypeDefinition.code
  const [fStatus, setFStatus] = useState('active');
  const [fOps, setFOps] = useState('O');
  const [fTelecom, setFTelecom] = useState('');

  const resetForm = () => {
    setFName(''); setFAlias(''); setFDesc('');
    setFParent(''); setFRoomType('');
    setFStatus('active'); setFOps('O'); setFTelecom('');
    setEditing(null);
  };

  const loadLookups = useCallback(async () => {
    const h = { headers: authHeaders() };
    const [bRes, wRes, rRes, rtRes] = await Promise.allSettled([
      axios.get(`${ACCOUNTS_API}/admin/locations/?physical_type=bu`, h),
      axios.get(`${ACCOUNTS_API}/admin/locations/?physical_type=wa`, h),
      axios.get(`${ACCOUNTS_API}/admin/locations/?physical_type=ro`, h),
      axios.get(`${ACCOUNTS_API}/admin/room-types/`, h),
    ]);
    if (bRes.status === 'fulfilled') setBuildings(Array.isArray(bRes.value.data.data) ? bRes.value.data.data : []);
    if (wRes.status === 'fulfilled') setWards(Array.isArray(wRes.value.data.data) ? wRes.value.data.data : []);
    if (rRes.status === 'fulfilled') setRooms(Array.isArray(rRes.value.data.data) ? rRes.value.data.data : []);
    if (rtRes.status === 'fulfilled') setRoomTypes(Array.isArray(rtRes.value.data.data) ? rtRes.value.data.data : []);
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ physical_type: level });
      if (filterParent !== '') params.append('part_of_location_id', String(filterParent));
      const { data } = await axios.get(`${ACCOUNTS_API}/admin/locations/?${params}`, { headers: authHeaders() });
      // client-side filter since the API filters by physical_type but not by parent yet
      const all: LocRecord[] = Array.isArray(data.data) ? data.data : [];
      setItems(filterParent !== '' ? all.filter(l => l.part_of_location_id === filterParent) : all);
    } catch {
      toast({ title: 'Failed to load', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [level, filterParent, toast]);

  useEffect(() => { loadLookups(); }, [loadLookups]);
  useEffect(() => { loadItems(); setShowForm(false); resetForm(); }, [loadItems]);

  const parentOptions = () => {
    if (level === 'wa') return buildings;
    if (level === 'ro') return wards;
    if (level === 'bd') return rooms;
    return [];
  };

  const filterOptions = () => {
    if (level === 'wa') return buildings;
    if (level === 'ro') return wards;
    if (level === 'bd') return rooms;
    return [];
  };

  const openAdd = () => { resetForm(); setShowForm(true); };
  const openEdit = (loc: LocRecord) => {
    setEditing(loc);
    setFName(loc.name || '');
    setFAlias(loc.alias || '');
    setFDesc(loc.description || '');
    setFParent(loc.part_of_location_id ?? '');
    setFRoomType(loc.type_code || '');
    setFStatus(loc.status || 'active');
    setFOps(loc.operational_status || 'O');
    setFTelecom(loc.telecom || '');
    setShowForm(true);
  };

  const save = async () => {
    if (!fName.trim()) { toast({ title: 'Name is required.', variant: 'destructive' }); return; }
    if (level !== 'bu' && fParent === '') { toast({ title: 'Parent location is required.', variant: 'destructive' }); return; }

    setSaving(true);
    const payload: Record<string, unknown> = {
      name: fName.trim(),
      alias: fAlias.trim(),
      description: fDesc.trim(),
      physical_type_code: level,
      type_code: fRoomType || '',
      status: fStatus,
      operational_status: fOps,
      telecom: fTelecom.trim(),
      part_of_location_id: fParent !== '' ? Number(fParent) : null,
    };

    try {
      if (editing) {
        await axios.put(`${ACCOUNTS_API}/admin/locations/${editing.location_id}/`, payload, { headers: authHeaders() });
        toast({ title: 'Updated successfully.' });
      } else {
        await axios.post(`${ACCOUNTS_API}/admin/locations/`, payload, { headers: authHeaders() });
        toast({ title: 'Created successfully.' });
      }
      setShowForm(false);
      resetForm();
      loadItems();
      loadLookups();
    } catch (e: any) {
      toast({ title: e?.response?.data?.message || 'Save failed.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const remove = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${ACCOUNTS_API}/admin/locations/${id}/`, { headers: authHeaders() });
      toast({ title: 'Deleted.' });
      loadItems();
      loadLookups();
    } catch {
      toast({ title: 'Delete failed — item may still be in use.', variant: 'destructive' });
    }
  };

  const selectedRoomType = roomTypes.find(rt => rt.code === fRoomType);
  const levelMeta = FAC_LEVELS.find(l => l.code === level)!;

  return (
    <div className="space-y-4">
      {/* Level Selector */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {FAC_LEVELS.map(l => (
          <button
            key={l.code}
            onClick={() => { setLevel(l.code); setFilterParent(''); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              level === l.code ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {filterOptions().length > 0 && (
            <select
              className="border rounded px-3 py-1.5 text-sm"
              value={filterParent}
              onChange={e => setFilterParent(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">All {levelMeta.parentLabel}s</option>
              {filterOptions().map(p => <option key={p.location_id} value={p.location_id}>{p.name}</option>)}
            </select>
          )}
          <Button variant="outline" size="sm" onClick={loadItems} className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
        <Button size="sm" onClick={openAdd} className="flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add {levelMeta.label.replace(/s$/, '')}
        </Button>
      </div>

      {/* Inline Add / Edit Form */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50/60">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold text-blue-800">
                {editing ? `Edit ${levelMeta.label.replace(/s$/, '')}` : `New ${levelMeta.label.replace(/s$/, '')}`}
              </CardTitle>
              <button onClick={() => { setShowForm(false); resetForm(); }}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Name */}
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input value={fName} onChange={e => setFName(e.target.value)}
                  placeholder={level === 'bu' ? 'e.g. Main Building' : level === 'wa' ? 'e.g. Ward A' : level === 'ro' ? 'e.g. Room 201' : 'e.g. Bed 1'}
                />
              </div>

              {/* Alias */}
              <div className="space-y-1">
                <Label className="text-xs">Alias / Code</Label>
                <Input value={fAlias} onChange={e => setFAlias(e.target.value)}
                  placeholder={level === 'bu' ? 'MAIN' : level === 'wa' ? 'WA' : level === 'ro' ? 'R201' : 'B1'}
                />
              </div>

              {/* Parent (Ward, Room, Bed only) */}
              {level !== 'bu' && (
                <div className="space-y-1">
                  <Label className="text-xs">Parent {levelMeta.parentLabel} *</Label>
                  <select className={selectCls} value={fParent}
                    onChange={e => setFParent(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">— select —</option>
                    {parentOptions().map(p => (
                      <option key={p.location_id} value={p.location_id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Room Type (Rooms only) */}
              {level === 'ro' && (
                <div className="space-y-1">
                  <Label className="text-xs">Room Type & Rate</Label>
                  <select className={selectCls} value={fRoomType} onChange={e => setFRoomType(e.target.value)}>
                    <option value="">— no type —</option>
                    {roomTypes.filter(rt => rt.is_active).map(rt => (
                      <option key={rt.code} value={rt.code}>
                        {rt.name} — ₱{Number(rt.daily_rate).toLocaleString('en-PH')}/day
                      </option>
                    ))}
                  </select>
                  {selectedRoomType && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      Rate: ₱{Number(selectedRoomType.daily_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}/day
                    </p>
                  )}
                </div>
              )}

              {/* Status */}
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select className={selectCls} value={fStatus} onChange={e => setFStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Operational Status (Rooms & Beds) */}
              {(level === 'ro' || level === 'bd') && (
                <div className="space-y-1">
                  <Label className="text-xs">Operational Status</Label>
                  <select className={selectCls} value={fOps} onChange={e => setFOps(e.target.value)}>
                    {OPS_STATUSES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                  </select>
                </div>
              )}

              {/* Telecom (Buildings & Wards) */}
              {(level === 'bu' || level === 'wa') && (
                <div className="space-y-1">
                  <Label className="text-xs">Telephone</Label>
                  <Input value={fTelecom} onChange={e => setFTelecom(e.target.value)} placeholder="+63 2 8XXX XXXX" />
                </div>
              )}

              {/* Description */}
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Description</Label>
                <Input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Optional notes" />
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                {editing ? 'Update' : 'Create'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin w-5 h-5 text-gray-400" /></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                {level !== 'bu' && <th className="px-4 py-3 text-left">{levelMeta.parentLabel}</th>}
                {level === 'ro' && <th className="px-4 py-3 text-left">Room Type</th>}
                {level === 'ro' && <th className="px-4 py-3 text-right">Daily Rate</th>}
                <th className="px-4 py-3 text-left">Status</th>
                {(level === 'ro' || level === 'bd') && <th className="px-4 py-3 text-left">Ops</th>}
                {(level === 'bu' || level === 'wa') && <th className="px-4 py-3 text-left">Tel</th>}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No {levelMeta.label.toLowerCase()} yet.
                    {level !== 'bu' && ` Add a ${levelMeta.parentLabel.toLowerCase()} first if needed.`}
                  </td>
                </tr>
              )}
              {items.map(loc => {
                const rt = level === 'ro' ? roomTypes.find(r => r.code === loc.type_code) : null;
                return (
                  <tr key={loc.location_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{loc.name}</div>
                      {loc.alias && <div className="text-xs text-gray-400">{loc.alias}</div>}
                    </td>
                    {level !== 'bu' && (
                      <td className="px-4 py-3 text-sm text-gray-600">{loc.part_of_name || '—'}</td>
                    )}
                    {level === 'ro' && (
                      <td className="px-4 py-3">
                        {rt ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700">{rt.name}</span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    )}
                    {level === 'ro' && (
                      <td className="px-4 py-3 text-right font-medium text-sm">
                        {rt ? `₱${Number(rt.daily_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        loc.status === 'active' ? 'bg-green-100 text-green-700' :
                        loc.status === 'inactive' ? 'bg-gray-100 text-gray-500' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{loc.status}</span>
                    </td>
                    {(level === 'ro' || level === 'bd') && (
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {OPS_STATUSES.find(s => s.code === loc.operational_status)?.label || loc.operational_status || '—'}
                      </td>
                    )}
                    {(level === 'bu' || level === 'wa') && (
                      <td className="px-4 py-3 text-xs text-gray-500">{loc.telecom || '—'}</td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(loc)} className="text-blue-500 hover:text-blue-700">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(loc.location_id, loc.name)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// PRICING & RATES TAB
// ─────────────────────────────────────────────────────────────────────────────

// ── Room Types ──────────────────────────────────────────────────────────────
interface RoomType { room_type_id: number; code: string; name: string; description: string; daily_rate: string; is_active: boolean; }
const emptyRoomType = { code: '', name: '', description: '', daily_rate: '0', is_active: true };

const RoomTypesSection: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RoomType | null>(null);
  const [form, setForm] = useState({ ...emptyRoomType });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${ACCOUNTS_API}/admin/room-types/`, { headers: authHeaders() });
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch { toast({ title: 'Failed to load room types', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ ...emptyRoomType }); setShowForm(true); };
  const openEdit = (r: RoomType) => {
    setEditing(r);
    setForm({ code: r.code, name: r.name, description: r.description || '', daily_rate: r.daily_rate, is_active: r.is_active });
    setShowForm(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${ACCOUNTS_API}/admin/room-types/${editing.room_type_id}/`, form, { headers: authHeaders() });
        toast({ title: 'Room type updated.' });
      } else {
        await axios.post(`${ACCOUNTS_API}/admin/room-types/`, form, { headers: authHeaders() });
        toast({ title: 'Room type created.' });
      }
      setShowForm(false); load();
    } catch (e: any) { toast({ title: e?.response?.data?.message || 'Save failed.', variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const remove = async (id: number) => {
    if (!confirm('Delete this room type?')) return;
    try { await axios.delete(`${ACCOUNTS_API}/admin/room-types/${id}/`, { headers: authHeaders() }); toast({ title: 'Deleted.' }); load(); }
    catch { toast({ title: 'Delete failed.', variant: 'destructive' }); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Room Types & Daily Rates</CardTitle>
          <Button size="sm" onClick={openAdd} className="flex items-center gap-1"><Plus className="w-3 h-3" /> Add</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <FormRow label="Code">
              <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. ICU" />
            </FormRow>
            <FormRow label="Name">
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Intensive Care Unit" />
            </FormRow>
            <FormRow label="Daily Rate (PHP)">
              <Input type="number" value={form.daily_rate} onChange={e => setForm(p => ({ ...p, daily_rate: e.target.value }))} />
            </FormRow>
            <FormRow label="Description" span2>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional" />
            </FormRow>
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                <Label>Active</Label>
              </div>
            </div>
            <div className="md:col-span-3 flex gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                {editing ? 'Update' : 'Create'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-right">Daily Rate</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={5} className="py-6 text-center"><Loader2 className="inline animate-spin w-4 h-4" /></td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">No room types yet.</td></tr>}
            {items.map(r => (
              <tr key={r.room_type_id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-right font-medium">₱{Number(r.daily_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-2 flex gap-2 justify-end">
                  <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => remove(r.room_type_id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

// ── Doctor Fee Schedules ─────────────────────────────────────────────────────
interface DoctorFee {
  fee_id: number;
  practitioner_id: number | null;
  practitioner_name: string | null;
  specialty_code: string | null;
  specialty_display: string | null;
  consultation_fee: string;
  professional_fee: string;
  is_active: boolean;
}
const emptyFee = {
  practitioner_id: '' as string | number,
  practitioner_name: '',
  specialty_code: '',
  specialty_display: '',
  consultation_fee: '0',
  professional_fee: '0',
  is_active: true,
};

const DoctorFeesSection: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<DoctorFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DoctorFee | null>(null);
  const [form, setForm] = useState({ ...emptyFee });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${ACCOUNTS_API}/admin/doctor-fees/`, { headers: authHeaders() });
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch { toast({ title: 'Failed to load fee schedules', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ ...emptyFee }); setShowForm(true); };
  const openEdit = (f: DoctorFee) => {
    setEditing(f);
    setForm({
      practitioner_id: f.practitioner_id ?? '',
      practitioner_name: f.practitioner_name ?? '',
      specialty_code: f.specialty_code ?? '',
      specialty_display: f.specialty_display ?? '',
      consultation_fee: f.consultation_fee,
      professional_fee: f.professional_fee,
      is_active: f.is_active,
    });
    setShowForm(true);
  };
  const save = async () => {
    setSaving(true);
    const payload = {
      ...form,
      practitioner_id: form.practitioner_id !== '' ? Number(form.practitioner_id) : null,
    };
    try {
      if (editing) {
        await axios.put(`${ACCOUNTS_API}/admin/doctor-fees/${editing.fee_id}/`, payload, { headers: authHeaders() });
        toast({ title: 'Fee schedule updated.' });
      } else {
        await axios.post(`${ACCOUNTS_API}/admin/doctor-fees/`, payload, { headers: authHeaders() });
        toast({ title: 'Fee schedule created.' });
      }
      setShowForm(false); load();
    } catch (e: any) { toast({ title: e?.response?.data?.message || 'Save failed.', variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const remove = async (id: number) => {
    if (!confirm('Delete this fee schedule?')) return;
    try { await axios.delete(`${ACCOUNTS_API}/admin/doctor-fees/${id}/`, { headers: authHeaders() }); toast({ title: 'Deleted.' }); load(); }
    catch { toast({ title: 'Delete failed.', variant: 'destructive' }); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Doctor Professional Fee Schedules</CardTitle>
          <Button size="sm" onClick={openAdd} className="flex items-center gap-1"><Plus className="w-3 h-3" /> Add</Button>
        </div>
        <CardDescription className="text-xs">Set per-doctor or per-specialty consultation and professional fees.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <FormRow label="Practitioner ID (optional)">
              <Input type="number" value={form.practitioner_id as string} onChange={e => setForm(p => ({ ...p, practitioner_id: e.target.value }))} placeholder="Leave blank for specialty-level" />
            </FormRow>
            <FormRow label="Practitioner Name">
              <Input value={form.practitioner_name} onChange={e => setForm(p => ({ ...p, practitioner_name: e.target.value }))} placeholder="Dr. Juan Dela Cruz" />
            </FormRow>
            <FormRow label="Specialty Code (optional)">
              <Input value={form.specialty_code} onChange={e => setForm(p => ({ ...p, specialty_code: e.target.value }))} placeholder="e.g. 394814009 (SNOMED)" />
            </FormRow>
            <FormRow label="Specialty Display">
              <Input value={form.specialty_display} onChange={e => setForm(p => ({ ...p, specialty_display: e.target.value }))} placeholder="e.g. General Practice" />
            </FormRow>
            <FormRow label="Consultation Fee (PHP)">
              <Input type="number" value={form.consultation_fee} onChange={e => setForm(p => ({ ...p, consultation_fee: e.target.value }))} />
            </FormRow>
            <FormRow label="Professional Fee (PHP)">
              <Input type="number" value={form.professional_fee} onChange={e => setForm(p => ({ ...p, professional_fee: e.target.value }))} />
            </FormRow>
            <div className="flex items-center gap-2 mt-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label>Active</Label>
            </div>
            <div className="md:col-span-3 flex gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                {editing ? 'Update' : 'Create'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Doctor / Specialty</th>
              <th className="px-3 py-2 text-right">Consultation</th>
              <th className="px-3 py-2 text-right">Professional</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={5} className="py-6 text-center"><Loader2 className="inline animate-spin w-4 h-4" /></td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">No fee schedules yet.</td></tr>}
            {items.map(f => (
              <tr key={f.fee_id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="font-medium">{f.practitioner_name || f.specialty_display || '—'}</div>
                  {f.specialty_code && <div className="text-xs text-gray-400">SNOMED {f.specialty_code}</div>}
                </td>
                <td className="px-3 py-2 text-right">₱{Number(f.consultation_fee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 text-right">₱{Number(f.professional_fee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${f.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {f.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-2 flex gap-2 justify-end">
                  <button onClick={() => openEdit(f)} className="text-blue-600 hover:text-blue-800"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => remove(f.fee_id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

// ── Lab Test Pricing ─────────────────────────────────────────────────────────
interface LabTest { test_id: number; code: string; name: string; category: string; base_price: string; turnaround_time: string; unit: string; }
const emptyLab = { code: '', name: '', category: '', base_price: '0', turnaround_time: '', unit: '' };
const LAB_API = `${import.meta.env.LOCAL_8000 || ''}/api/laboratory`;

const LabTestPricingSection: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LabTest | null>(null);
  const [form, setForm] = useState({ ...emptyLab });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${LAB_API}/test-definitions/`, { headers: authHeaders() });
      setItems(Array.isArray(data.results) ? data.results : Array.isArray(data.data) ? data.data : []);
    } catch { toast({ title: 'Failed to load lab tests', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ ...emptyLab }); setShowForm(true); };
  const openEdit = (t: LabTest) => {
    setEditing(t);
    setForm({ code: t.code, name: t.name, category: t.category, base_price: t.base_price, turnaround_time: t.turnaround_time || '', unit: t.unit || '' });
    setShowForm(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await axios.patch(`${LAB_API}/test-definitions/${editing.test_id}/`, form, { headers: authHeaders() });
        toast({ title: 'Lab test updated.' });
      } else {
        // LabTestDefinition inherits identifier+status as required non-nullable fields
        // from FHIRResourceModel — auto-populate them so the create succeeds.
        const createPayload = {
          ...form,
          status: 'active',
          identifier: `lab-${form.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        };
        await axios.post(`${LAB_API}/test-definitions/`, createPayload, { headers: authHeaders() });
        toast({ title: 'Lab test created.' });
      }
      setShowForm(false); load();
    } catch (e: any) { toast({ title: e?.response?.data?.message || 'Save failed.', variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const remove = async (id: number) => {
    if (!confirm('Delete this lab test?')) return;
    try { await axios.delete(`${LAB_API}/test-definitions/${id}/`, { headers: authHeaders() }); toast({ title: 'Deleted.' }); load(); }
    catch { toast({ title: 'Delete failed.', variant: 'destructive' }); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Lab Test Catalog & Pricing</CardTitle>
          <Button size="sm" onClick={openAdd} className="flex items-center gap-1"><Plus className="w-3 h-3" /> Add</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <FormRow label="Code (SKU)">
              <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. LAB-CBC-001" />
            </FormRow>
            <FormRow label="Test Name">
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Complete Blood Count" />
            </FormRow>
            <FormRow label="Category">
              <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Hematology" />
            </FormRow>
            <FormRow label="Base Price (PHP)">
              <Input type="number" value={form.base_price} onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))} />
            </FormRow>
            <FormRow label="Turnaround Time">
              <Input value={form.turnaround_time} onChange={e => setForm(p => ({ ...p, turnaround_time: e.target.value }))} placeholder="e.g. 4 hours" />
            </FormRow>
            <FormRow label="Unit">
              <Input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="e.g. mg/dL" />
            </FormRow>
            <div className="md:col-span-3 flex gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                {editing ? 'Update' : 'Create'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Base Price</th>
              <th className="px-3 py-2 text-left">TAT</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={6} className="py-6 text-center"><Loader2 className="inline animate-spin w-4 h-4" /></td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">No lab tests yet.</td></tr>}
            {items.map(t => (
              <tr key={t.test_id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{t.code}</td>
                <td className="px-3 py-2">{t.name}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{t.category}</td>
                <td className="px-3 py-2 text-right font-medium">₱{Number(t.base_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{t.turnaround_time || '—'}</td>
                <td className="px-3 py-2 flex gap-2 justify-end">
                  <button onClick={() => openEdit(t)} className="text-blue-600 hover:text-blue-800"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => remove(t.test_id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

// ── Procedure Pricing ────────────────────────────────────────────────────────
interface ProcedurePrice { price_id: number; code: string; name: string; category: string; base_price: string; description: string; is_active: boolean; }
const emptyProc = { code: '', name: '', category: 'surgical', base_price: '0', description: '', is_active: true };
const PROC_CATEGORIES = ['surgical', 'diagnostic', 'therapeutic', 'rehabilitative', 'preventive', 'other'];

const ProcedurePricingSection: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<ProcedurePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProcedurePrice | null>(null);
  const [form, setForm] = useState({ ...emptyProc });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${ACCOUNTS_API}/admin/procedures/`, { headers: authHeaders() });
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch { toast({ title: 'Failed to load procedures', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ ...emptyProc }); setShowForm(true); };
  const openEdit = (p: ProcedurePrice) => {
    setEditing(p);
    setForm({ code: p.code, name: p.name, category: p.category || 'surgical', base_price: p.base_price, description: p.description || '', is_active: p.is_active });
    setShowForm(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${ACCOUNTS_API}/admin/procedures/${editing.price_id}/`, form, { headers: authHeaders() });
        toast({ title: 'Procedure updated.' });
      } else {
        await axios.post(`${ACCOUNTS_API}/admin/procedures/`, form, { headers: authHeaders() });
        toast({ title: 'Procedure created.' });
      }
      setShowForm(false); load();
    } catch (e: any) { toast({ title: e?.response?.data?.message || 'Save failed.', variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const remove = async (id: number) => {
    if (!confirm('Delete this procedure?')) return;
    try { await axios.delete(`${ACCOUNTS_API}/admin/procedures/${id}/`, { headers: authHeaders() }); toast({ title: 'Deleted.' }); load(); }
    catch { toast({ title: 'Delete failed.', variant: 'destructive' }); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Procedure Price Catalog</CardTitle>
          <Button size="sm" onClick={openAdd} className="flex items-center gap-1"><Plus className="w-3 h-3" /> Add</Button>
        </div>
        <CardDescription className="text-xs">Maps to ICD-10 PCS / CPT procedure codes used in Encounter records.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <FormRow label="Code (ICD-10 PCS / CPT)">
              <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. 0BH17EZ" />
            </FormRow>
            <FormRow label="Procedure Name">
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Appendectomy" />
            </FormRow>
            <FormRow label="Category">
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {PROC_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </FormRow>
            <FormRow label="Base Price (PHP)">
              <Input type="number" value={form.base_price} onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))} />
            </FormRow>
            <FormRow label="Description" span2>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional notes" />
            </FormRow>
            <div className="flex items-center gap-2 mt-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label>Active</Label>
            </div>
            <div className="md:col-span-3 flex gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                {editing ? 'Update' : 'Create'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Base Price</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={6} className="py-6 text-center"><Loader2 className="inline animate-spin w-4 h-4" /></td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">No procedures yet.</td></tr>}
            {items.map(p => (
              <tr key={p.price_id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2 text-xs capitalize text-gray-500">{p.category}</td>
                <td className="px-3 py-2 text-right font-medium">₱{Number(p.base_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-2 flex gap-2 justify-end">
                  <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => remove(p.price_id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

// ── Pricing Tab Wrapper ───────────────────────────────────────────────────────
const PricingTab: React.FC = () => (
  <div className="space-y-6">
    <p className="text-sm text-gray-500">
      Configure pricing and rates used across billing, admission, and laboratory modules.
      Changes apply to new invoices — existing invoices are not retroactively updated.
    </p>
    <RoomTypesSection />
    <DoctorFeesSection />
    <LabTestPricingSection />
    <ProcedurePricingSection />
  </div>
);


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
        <TabsTrigger value="facilities" className="flex items-center gap-2 flex-shrink-0">
          <MapPin className="w-4 h-4" /> Facilities
        </TabsTrigger>
        <TabsTrigger value="pricing" className="flex items-center gap-2 flex-shrink-0">
          <DollarSign className="w-4 h-4" /> Pricing & Rates
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
      <TabsContent value="facilities"><FacilitiesTab /></TabsContent>
      <TabsContent value="pricing"><PricingTab /></TabsContent>
      <TabsContent value="users"><UserManagementTab /></TabsContent>
      <TabsContent value="roles"><RoleModulesTab /></TabsContent>
      <TabsContent value="fhir"><FHIROrgTab /></TabsContent>
    </Tabs>
  </div>
);

export default AdminPage;

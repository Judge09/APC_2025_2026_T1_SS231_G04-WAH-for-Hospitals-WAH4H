import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Users,
  LayoutGrid,
  Code2,
  Save,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

const API_BASE = import.meta.env.LOCAL_8000 || 'http://127.0.0.1:8000';
const ACCOUNTS_API = `${API_BASE}/api/accounts`;

const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'patients', label: 'Patients' },
  { id: 'admission', label: 'Admission' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'laboratory', label: 'Laboratory' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'discharge', label: 'Discharge' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'billing', label: 'Billing' },
  { id: 'settings', label: 'Settings' },
];

const ROLE_LABELS: Record<string, string> = {
  doctor: 'Doctor',
  nurse: 'Nurse',
  lab_technician: 'Lab Technician',
  pharmacist: 'Pharmacist',
  billing_clerk: 'Billing Clerk',
};

function authHeaders() {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─────────────────────────────────────────────
// HOSPITAL PROFILE TAB
// ─────────────────────────────────────────────
interface HospitalSettings {
  organization_id?: number;
  name: string;
  alias: string;
  nhfr_code: string;
  type_code: string;
  active: boolean;
  telecom: string;
  logo_url: string;
  description: string;
  address_line: string;
  address_city: string;
  address_district: string;
  address_state: string;
  address_country: string;
  address_postal_code: string;
  contact_purpose: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_telecom: string;
  contact_address_line: string;
  contact_address_city: string;
  contact_address_state: string;
  contact_address_country: string;
  contact_postal_code: string;
  fhir_resource_type?: string;
  fhir_identifier?: { system: string; value: string } | null;
}

const emptyHospital: HospitalSettings = {
  name: '', alias: '', nhfr_code: '', type_code: '', active: true,
  telecom: '', logo_url: '', description: '',
  address_line: '', address_city: '', address_district: '',
  address_state: '', address_country: '', address_postal_code: '',
  contact_purpose: '', contact_first_name: '', contact_last_name: '',
  contact_telecom: '', contact_address_line: '', contact_address_city: '',
  contact_address_state: '', contact_address_country: '', contact_postal_code: '',
};

const HospitalProfileTab: React.FC = () => {
  const { toast } = useToast();
  const [form, setForm] = useState<HospitalSettings>(emptyHospital);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fhirId, setFhirId] = useState<{ system: string; value: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${ACCOUNTS_API}/admin/hospital/`, {
        headers: authHeaders(),
      });
      const d = data.data as HospitalSettings;
      setForm({
        name: d.name || '',
        alias: d.alias || '',
        nhfr_code: d.nhfr_code || '',
        type_code: d.type_code || '',
        active: d.active ?? true,
        telecom: d.telecom || '',
        logo_url: d.logo_url || '',
        description: d.description || '',
        address_line: d.address_line || '',
        address_city: d.address_city || '',
        address_district: d.address_district || '',
        address_state: d.address_state || '',
        address_country: d.address_country || '',
        address_postal_code: d.address_postal_code || '',
        contact_purpose: d.contact_purpose || '',
        contact_first_name: d.contact_first_name || '',
        contact_last_name: d.contact_last_name || '',
        contact_telecom: d.contact_telecom || '',
        contact_address_line: d.contact_address_line || '',
        contact_address_city: d.contact_address_city || '',
        contact_address_state: d.contact_address_state || '',
        contact_address_country: d.contact_address_country || '',
        contact_postal_code: d.contact_postal_code || '',
      });
      setFhirId(d.fhir_identifier ?? null);
    } catch {
      toast({ title: 'Failed to load hospital settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${ACCOUNTS_API}/admin/hospital/`, form, {
        headers: authHeaders(),
      });
      toast({ title: 'Hospital settings saved.' });
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Save failed.';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const f = (key: keyof HospitalSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  if (loading) return <div className="flex items-center justify-center p-10"><Loader2 className="animate-spin w-6 h-6" /></div>;

  return (
    <div className="space-y-6">
      {/* FHIR badge */}
      {fhirId && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 w-fit">
          <CheckCircle2 className="w-4 h-4" />
          <span>FHIR R4 Organization · NHFR: <strong>{fhirId.value}</strong></span>
        </div>
      )}

      {/* Logo preview */}
      {form.logo_url && (
        <div className="flex items-center gap-4">
          <img src={form.logo_url} alt="Hospital logo" className="h-16 w-16 object-contain rounded border" />
          <span className="text-sm text-gray-500">{form.logo_url}</span>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Hospital Name</Label>
            <Input value={form.name} onChange={f('name')} placeholder="e.g. San Juan City General Hospital" />
          </div>
          <div className="space-y-1">
            <Label>Alias / Short Name</Label>
            <Input value={form.alias} onChange={f('alias')} placeholder="e.g. SJCGH" />
          </div>
          <div className="space-y-1">
            <Label>NHFR Code</Label>
            <Input value={form.nhfr_code} onChange={f('nhfr_code')} placeholder="DOH National Health Facility Registry code" />
          </div>
          <div className="space-y-1">
            <Label>Facility Type</Label>
            <Input value={form.type_code} onChange={f('type_code')} placeholder="e.g. hospital, clinic" />
          </div>
          <div className="space-y-1">
            <Label>Telephone / Telecom</Label>
            <Input value={form.telecom} onChange={f('telecom')} placeholder="+63 2 8XXX XXXX" />
          </div>
          <div className="space-y-1">
            <Label>Logo URL</Label>
            <Input value={form.logo_url} onChange={f('logo_url')} placeholder="https://..." />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={f('description')} placeholder="Short description of the facility" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.active} onCheckedChange={v => setForm(p => ({ ...p, active: v }))} />
            <Label>Active</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Address</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 md:col-span-2">
            <Label>Street / Address Line</Label>
            <Input value={form.address_line} onChange={f('address_line')} />
          </div>
          <div className="space-y-1">
            <Label>City / Municipality</Label>
            <Input value={form.address_city} onChange={f('address_city')} />
          </div>
          <div className="space-y-1">
            <Label>District / Barangay</Label>
            <Input value={form.address_district} onChange={f('address_district')} />
          </div>
          <div className="space-y-1">
            <Label>Province / State</Label>
            <Input value={form.address_state} onChange={f('address_state')} />
          </div>
          <div className="space-y-1">
            <Label>Country</Label>
            <Input value={form.address_country} onChange={f('address_country')} placeholder="PH" />
          </div>
          <div className="space-y-1">
            <Label>Postal Code</Label>
            <Input value={form.address_postal_code} onChange={f('address_postal_code')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact Person</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>First Name</Label>
            <Input value={form.contact_first_name} onChange={f('contact_first_name')} />
          </div>
          <div className="space-y-1">
            <Label>Last Name</Label>
            <Input value={form.contact_last_name} onChange={f('contact_last_name')} />
          </div>
          <div className="space-y-1">
            <Label>Contact Purpose</Label>
            <Input value={form.contact_purpose} onChange={f('contact_purpose')} placeholder="e.g. ADMIN, BILL" />
          </div>
          <div className="space-y-1">
            <Label>Contact Telecom</Label>
            <Input value={form.contact_telecom} onChange={f('contact_telecom')} />
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

// ─────────────────────────────────────────────
// USER MANAGEMENT TAB
// ─────────────────────────────────────────────
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
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, Partial<AdminUser>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${ACCOUNTS_API}/admin/users/`, {
        headers: authHeaders(),
      });
      setUsers(data.data as AdminUser[]);
    } catch {
      toast({ title: 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const patch = async (uid: number) => {
    const changes = edits[uid];
    if (!changes) return;
    setSaving(uid);
    try {
      await axios.patch(`${ACCOUNTS_API}/admin/users/${uid}/`, changes, {
        headers: authHeaders(),
      });
      toast({ title: 'User updated.' });
      setEdits(prev => { const n = { ...prev }; delete n[uid]; return n; });
      load();
    } catch (e: any) {
      toast({ title: e?.response?.data?.message || 'Update failed.', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const edit = (uid: number, key: keyof AdminUser, value: unknown) =>
    setEdits(prev => ({ ...prev, [uid]: { ...prev[uid], [key]: value } }));

  const roleOf = (u: AdminUser) => edits[u.practitioner_id]?.role ?? u.role;
  const activeOf = (u: AdminUser) => edits[u.practitioner_id]?.is_active ?? u.is_active;

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
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Active</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => {
              const uid = u.practitioner_id;
              const dirty = !!edits[uid];
              return (
                <tr key={uid} className={dirty ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <div>{u.username}</div>
                    <div className="text-xs">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={roleOf(u)}
                      onChange={e => edit(uid, 'role', e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="doctor">Doctor</option>
                      <option value="nurse">Nurse</option>
                      <option value="lab_technician">Lab Technician</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="billing_clerk">Billing Clerk</option>
                    </select>
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

// ─────────────────────────────────────────────
// ROLE MODULE CONFIG TAB
// ─────────────────────────────────────────────
type RoleModuleMap = Record<string, string[]>;

const RoleModulesTab: React.FC = () => {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<RoleModuleMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${ACCOUNTS_API}/admin/role-modules/`, {
        headers: authHeaders(),
      });
      setConfigs(data.data as RoleModuleMap);
    } catch {
      toast({ title: 'Failed to load role configs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const toggle = (role: string, module: string) => {
    setConfigs(prev => {
      const current = prev[role] ?? [];
      const next = current.includes(module)
        ? current.filter(m => m !== module)
        : [...current, module];
      return { ...prev, [role]: next };
    });
  };

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
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-10"><Loader2 className="animate-spin w-6 h-6" /></div>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Configure which modules each role can access. Changes take effect on next login.
      </p>
      {Object.entries(ROLE_LABELS).map(([role, label]) => {
        const active = configs[role] ?? [];
        return (
          <Card key={role}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{label}</CardTitle>
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
                      {on ? <CheckCircle2 className="inline w-3 h-3 mr-1" /> : <XCircle className="inline w-3 h-3 mr-1" />}
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

// ─────────────────────────────────────────────
// FHIR ORGANIZATION VIEWER TAB
// ─────────────────────────────────────────────
const FHIROrgTab: React.FC = () => {
  const { toast } = useToast();
  const [resource, setResource] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${ACCOUNTS_API}/fhir/Organization/`, {
          headers: { ...authHeaders(), Accept: 'application/fhir+json' },
        });
        setResource(data);
      } catch {
        toast({ title: 'Failed to load FHIR Organization resource', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
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
            Read-only view of the PHCore R4-compliant Organization resource served at
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
        <p>• Identifier system: <code>https://nhfr.doh.gov.ph/facility</code> (DOH NHFR)</p>
        <p>• Profile: <code>http://hl7.org/fhir/StructureDefinition/Organization</code></p>
        <p>• Logo extension URL: <code>https://wah4h.local/fhir/StructureDefinition/organization-logo</code></p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN ADMIN PAGE
// ─────────────────────────────────────────────
const AdminPage: React.FC = () => {
  return (
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
            <Building2 className="w-4 h-4" />
            Hospital Profile
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 flex-shrink-0">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2 flex-shrink-0">
            <LayoutGrid className="w-4 h-4" />
            Role Modules
          </TabsTrigger>
          <TabsTrigger value="fhir" className="flex items-center gap-2 flex-shrink-0">
            <Code2 className="w-4 h-4" />
            FHIR Organization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hospital">
          <HospitalProfileTab />
        </TabsContent>

        <TabsContent value="users">
          <UserManagementTab />
        </TabsContent>

        <TabsContent value="roles">
          <RoleModulesTab />
        </TabsContent>

        <TabsContent value="fhir">
          <FHIROrgTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;

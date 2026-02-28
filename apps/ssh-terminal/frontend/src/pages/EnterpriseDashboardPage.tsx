import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  ArrowUpDown,
  Bell,
  Cable,
  Cpu,
  Database,
  Download,
  HardDrive,
  Layers,
  ListChecks,
  Monitor,
  Network,
  Play,
  RefreshCcw,
  Save,
  Search,
  Server,
  Settings,
  ShieldCheck,
  TerminalSquare,
  Trash2,
  Waypoints,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Section =
  | 'dashboard'
  | 'devices'
  | 'terminal'
  | 'discovery'
  | 'backup'
  | 'migration'
  | 'monitoring'
  | 'audit'
  | 'settings';

type AuditLevel = 'info' | 'success' | 'warning' | 'error';

type Device = {
  id: string;
  hostname: string;
  ip: string;
  status: 'online' | 'warning' | 'offline';
  site: string;
  lastBackup: string;
  connectionMethod: string;
};

type AuditEvent = {
  id: string;
  level: AuditLevel;
  message: string;
  target?: string;
  createdAt: string;
};

type HealthStatus = {
  api: 'up' | 'down';
  backup: 'up' | 'down';
  checkedAt: string;
};

const nav: Array<{ id: Section; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <Layers className="h-4 w-4" /> },
  { id: 'devices', label: 'Devices', icon: <Server className="h-4 w-4" /> },
  { id: 'terminal', label: 'SSH Terminal', icon: <TerminalSquare className="h-4 w-4" /> },
  { id: 'discovery', label: 'Discovery', icon: <Waypoints className="h-4 w-4" /> },
  { id: 'backup', label: 'Backup & Config', icon: <Archive className="h-4 w-4" /> },
  { id: 'migration', label: 'Migration', icon: <Network className="h-4 w-4" /> },
  { id: 'monitoring', label: 'Monitoring', icon: <Monitor className="h-4 w-4" /> },
  { id: 'audit', label: 'Audit Log', icon: <ListChecks className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
];

function getStored(key: string, fallback: string): string {
  const value = localStorage.getItem(key);
  return value && value.trim() ? value : fallback;
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function EnterpriseDashboardPage() {
  const [section, setSection] = useState<Section>('dashboard');
  const [backupApi, setBackupApi] = useState(() => getStored('nms_backup_api', 'http://localhost:5003'));
  const [discoveryApi, setDiscoveryApi] = useState(() => getStored('nms_discovery_api', 'http://localhost:5004'));
  const [sshUiUrl, setSshUiUrl] = useState(() => getStored('nms_ssh_ui_url', 'http://localhost:5173/'));
  const [operator, setOperator] = useState(() => getStored('nms_operator', 'net-admin'));

  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [health, setHealth] = useState<HealthStatus>({ api: 'down', backup: 'down', checkedAt: '-' });

  const [backupSito, setBackupSito] = useState('');
  const [backupSubnet, setBackupSubnet] = useState('');
  const [backupUser, setBackupUser] = useState('');
  const [backupPass, setBackupPass] = useState('');
  const [backupResult, setBackupResult] = useState('');

  const [discoverySubnet, setDiscoverySubnet] = useState('10.0.1.0/24');
  const [discoveryResult, setDiscoveryResult] = useState('');

  const [migrationSource, setMigrationSource] = useState('HP/Aruba');
  const [migrationTarget, setMigrationTarget] = useState('Huawei');
  const [migrationNotes, setMigrationNotes] = useState('');

  const logEvent = (level: AuditLevel, message: string, target?: string) => {
    const e: AuditEvent = {
      id: crypto.randomUUID(),
      level,
      message,
      target,
      createdAt: new Date().toISOString(),
    };
    setAudit((prev) => [e, ...prev].slice(0, 200));
  };

  const refreshDevices = async () => {
    const url = `${backupApi}/api/backups?limit=200`;
    try {
      const res = await fetch(url);
      const payload = await safeJson<{ backups?: Array<Record<string, unknown>> }>(res);
      if (!res.ok || !payload?.backups) {
        throw new Error(`HTTP ${res.status}`);
      }

      const latestByIp = new Map<string, Device>();
      for (const row of payload.backups) {
        const ip = String(row.ip || '');
        if (!ip || latestByIp.has(ip)) continue;
        const rawTs = String(row.timestamp || row.created_at || '');
        const lastBackup = rawTs ? new Date(rawTs).toLocaleString('it-IT') : '-';
        latestByIp.set(ip, {
          id: String(row.id || ip),
          hostname: String(row.nome_sito || row.sito || ip),
          ip,
          site: String(row.sito || '-'),
          lastBackup,
          connectionMethod: String(row.connection_method || '-'),
          status: rawTs ? 'online' : 'warning',
        });
      }
      setDevices(Array.from(latestByIp.values()));
      logEvent('success', 'Inventario dispositivi aggiornato', `${latestByIp.size} host`);
    } catch (err) {
      logEvent('error', 'Aggiornamento inventario fallito', err instanceof Error ? err.message : 'Errore sconosciuto');
    }
  };

  const checkHealth = async () => {
    const checkedAt = new Date().toLocaleTimeString('it-IT');
    let api: 'up' | 'down' = 'down';
    let backup: 'up' | 'down' = 'down';

    try {
      const r = await fetch('http://localhost:3000/health');
      if (r.ok) api = 'up';
    } catch {}

    try {
      const r = await fetch(`${backupApi}/api/health`);
      if (r.ok) backup = 'up';
    } catch {}

    setHealth({ api, backup, checkedAt });
  };

  useEffect(() => {
    refreshDevices();
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDevices = useMemo(() => {
    const q = search.toLowerCase().trim();
    const rows = devices.filter((d) =>
      !q || [d.hostname, d.ip, d.site, d.connectionMethod].some((v) => v.toLowerCase().includes(q))
    );
    rows.sort((a, b) => (sortAsc ? a.hostname.localeCompare(b.hostname) : b.hostname.localeCompare(a.hostname)));
    return rows;
  }, [devices, search, sortAsc]);

  const kpis = useMemo(() => {
    const total = devices.length;
    const online = devices.filter((d) => d.status === 'online').length;
    const warning = devices.filter((d) => d.status === 'warning').length;
    const offline = devices.filter((d) => d.status === 'offline').length;
    return { total, online, warning, offline };
  }, [devices]);

  const exportDevices = () => {
    const rows = ['hostname,ip,site,status,lastBackup,connectionMethod'];
    for (const d of filteredDevices) {
      rows.push([d.hostname, d.ip, d.site, d.status, d.lastBackup, d.connectionMethod].join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logEvent('info', 'Export CSV generato', `${filteredDevices.length} righe`);
  };

  const removeSelected = () => {
    if (selected.size === 0) return;
    setDevices((prev) => prev.filter((d) => !selected.has(d.id)));
    logEvent('warning', 'Dispositivi rimossi dalla vista', `${selected.size} elementi`);
    setSelected(new Set());
  };

  const runDiscovery = async () => {
    setDiscoveryResult('Discovery in esecuzione...');
    try {
      const res = await fetch(`${discoveryApi}/api/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network: discoverySubnet, sync: true }),
      });
      const payload = await safeJson<Record<string, unknown>>(res);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDiscoveryResult(JSON.stringify(payload, null, 2));
      logEvent('success', 'Discovery completata', discoverySubnet);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setDiscoveryResult(`Errore discovery: ${msg}`);
      logEvent('error', 'Discovery fallita', msg);
    }
  };

  const runBackup = async () => {
    if (!backupSubnet && !backupSito) {
      setBackupResult('Inserisci almeno SITO o subnet.');
      return;
    }
    setBackupResult('Backup job avviato...');
    try {
      const body: Record<string, unknown> = {
        subnet: backupSubnet || undefined,
        sito: backupSito || undefined,
        username: backupUser || undefined,
        password: backupPass || undefined,
      };
      const res = await fetch(`${backupApi}/api/backup/discover-and-backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await safeJson<Record<string, unknown>>(res);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setBackupResult(JSON.stringify(payload, null, 2));
      logEvent('success', 'Backup/discovery completato', backupSito || backupSubnet);
      refreshDevices();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setBackupResult(`Errore backup: ${msg}`);
      logEvent('error', 'Backup job fallito', msg);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('nms_backup_api', backupApi);
    localStorage.setItem('nms_discovery_api', discoveryApi);
    localStorage.setItem('nms_ssh_ui_url', sshUiUrl);
    localStorage.setItem('nms_operator', operator);
    logEvent('success', 'Impostazioni salvate');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-4 p-4">
        <aside className="col-span-12 lg:col-span-2">
          <Card className="sticky top-4 p-3">
            <div className="mb-3 flex items-center gap-2 px-2">
              <ShieldCheck className="h-5 w-5 text-cyan-300" />
              <div>
                <p className="text-sm font-semibold">NetCore Enterprise</p>
                <p className="text-xs text-white/80">Operations Console</p>
              </div>
            </div>
            <div className="space-y-1">
              {nav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition ${
                    section === item.id ? 'bg-cyan-500/15 text-cyan-200' : 'text-white/90 hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </Card>
        </aside>

        <section className="col-span-12 lg:col-span-10">
          <Card className="mb-4 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Bell className="h-4 w-4 text-cyan-300" />
                <span>Operatore: {operator}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className={`rounded px-2 py-1 text-xs ${health.api === 'up' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>API SSH {health.api}</span>
                <span className={`rounded px-2 py-1 text-xs ${health.backup === 'up' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>API Backup {health.backup}</span>
                <span className="text-xs text-white/80">check {health.checkedAt}</span>
                <Button variant="outline" size="sm" onClick={checkHealth}><RefreshCcw className="mr-1 h-3.5 w-3.5" />Refresh</Button>
              </div>
            </div>
          </Card>

          {section === 'dashboard' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {[{ t: 'Total Devices', v: kpis.total, c: 'text-cyan-300', i: <Server className="h-5 w-5" /> },
                  { t: 'Online', v: kpis.online, c: 'text-emerald-300', i: <Cable className="h-5 w-5" /> },
                  { t: 'Warning', v: kpis.warning, c: 'text-amber-300', i: <Activity className="h-5 w-5" /> },
                  { t: 'Offline', v: kpis.offline, c: 'text-rose-300', i: <Database className="h-5 w-5" /> }].map((k) => (
                  <Card key={k.t} className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white/80">{k.t}</p>
                      <span className={`${k.c}`}>{k.i}</span>
                    </div>
                    <p className={`mt-2 text-3xl font-semibold ${k.c}`}>{k.v}</p>
                  </Card>
                ))}
              </div>
              <Card className="p-4">
                <p className="mb-3 text-sm text-white">Recent Audit Events</p>
                <div className="space-y-2">
                  {audit.slice(0, 8).map((e) => (
                    <div key={e.id} className="flex items-center gap-2 text-sm">
                      <span className={`h-2 w-2 rounded-full ${e.level === 'success' ? 'bg-emerald-400' : e.level === 'warning' ? 'bg-amber-400' : e.level === 'error' ? 'bg-rose-400' : 'bg-cyan-400'}`} />
                      <span>{e.message}</span>
                      {e.target && <span className="text-white/70">({e.target})</span>}
                    </div>
                  ))}
                  {audit.length === 0 && <p className="text-sm text-white/70">Nessun evento registrato.</p>}
                </div>
              </Card>
            </div>
          )}

          {section === 'devices' && (
            <Card className="p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-white/70" />
                  <Input className="pl-8" placeholder="Search by host, IP, site..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Button variant="outline" onClick={() => setSortAsc((s) => !s)}><ArrowUpDown className="mr-1 h-4 w-4" />Sort</Button>
                <Button variant="outline" onClick={refreshDevices}><RefreshCcw className="mr-1 h-4 w-4" />Reload</Button>
                <Button variant="outline" onClick={exportDevices}><Download className="mr-1 h-4 w-4" />Export</Button>
                <Button variant="destructive" onClick={removeSelected}><Trash2 className="mr-1 h-4 w-4" />Delete Selected</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-white/80">
                    <tr className="border-b border-slate-700">
                      <th className="py-2"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(filteredDevices.map((d) => d.id)) : new Set())} /></th>
                      <th>Hostname</th><th>IP</th><th>Site</th><th>Status</th><th>Last Backup</th><th>Method</th><th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDevices.map((d) => (
                      <tr key={d.id} className="border-b border-slate-800">
                        <td className="py-2"><input type="checkbox" checked={selected.has(d.id)} onChange={() => setSelected((prev) => { const n = new Set(prev); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n; })} /></td>
                        <td>{d.hostname}</td><td className="font-mono text-cyan-300">{d.ip}</td><td>{d.site}</td>
                        <td>{d.status}</td><td>{d.lastBackup}</td><td>{d.connectionMethod}</td>
                        <td className="text-right">
                          <Button size="sm" variant="outline" onClick={() => { window.open(`${sshUiUrl}`, '_blank'); logEvent('info', 'Aperta console SSH', d.ip); }}>SSH</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {section === 'terminal' && (
            <Card className="p-4">
              <p className="mb-2 text-sm text-white/85">Terminal operations</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => window.open(sshUiUrl, '_blank')}><TerminalSquare className="mr-1 h-4 w-4" />Open SSH Workspace</Button>
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(sshUiUrl)}>Copy URL</Button>
              </div>
            </Card>
          )}

          {section === 'discovery' && (
            <Card className="p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Subnet CIDR</Label>
                  <Input value={discoverySubnet} onChange={(e) => setDiscoverySubnet(e.target.value)} placeholder="10.10.4.0/24" />
                </div>
                <div className="flex items-end">
                  <Button onClick={runDiscovery}><Play className="mr-1 h-4 w-4" />Run Discovery</Button>
                </div>
              </div>
              <pre className="mt-3 max-h-80 overflow-auto rounded-md border border-slate-700 bg-slate-950 p-3 text-xs">{discoveryResult || 'Nessun risultato.'}</pre>
            </Card>
          )}

          {section === 'backup' && (
            <Card className="p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>SITO (optional)</Label><Input value={backupSito} onChange={(e) => setBackupSito(e.target.value)} placeholder="123" /></div>
                <div><Label>Subnet (optional)</Label><Input value={backupSubnet} onChange={(e) => setBackupSubnet(e.target.value)} placeholder="10.10.4.0/24" /></div>
                <div><Label>Username</Label><Input value={backupUser} onChange={(e) => setBackupUser(e.target.value)} placeholder="admin" /></div>
                <div><Label>Password</Label><Input type="password" value={backupPass} onChange={(e) => setBackupPass(e.target.value)} placeholder="password" /></div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={runBackup}><Archive className="mr-1 h-4 w-4" />Run Backup Workflow</Button>
                <Button variant="outline" onClick={refreshDevices}>Sync Devices</Button>
              </div>
              <pre className="mt-3 max-h-80 overflow-auto rounded-md border border-slate-700 bg-slate-950 p-3 text-xs">{backupResult || 'Nessun risultato.'}</pre>
            </Card>
          )}

          {section === 'migration' && (
            <Card className="p-4 space-y-3">
              <p className="text-sm text-white/85">Enterprise migration planner</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>Source Platform</Label><Input value={migrationSource} onChange={(e) => setMigrationSource(e.target.value)} /></div>
                <div><Label>Target Platform</Label><Input value={migrationTarget} onChange={(e) => setMigrationTarget(e.target.value)} /></div>
              </div>
              <div>
                <Label>Runbook Notes</Label>
                <textarea value={migrationNotes} onChange={(e) => setMigrationNotes(e.target.value)} className="h-36 w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-sm" />
              </div>
              <Button onClick={() => logEvent('info', 'Migration runbook aggiornato', `${migrationSource} -> ${migrationTarget}`)}><Save className="mr-1 h-4 w-4" />Save Runbook</Button>
            </Card>
          )}

          {section === 'monitoring' && (
            <div className="grid gap-3 md:grid-cols-3">
              <Card className="p-4"><div className="mb-2 flex items-center gap-2 text-cyan-300"><Cpu className="h-4 w-4" />CPU</div><p className="text-2xl font-semibold">{Math.round(Math.random() * 45 + 20)}%</p></Card>
              <Card className="p-4"><div className="mb-2 flex items-center gap-2 text-amber-300"><HardDrive className="h-4 w-4" />Memory</div><p className="text-2xl font-semibold">{Math.round(Math.random() * 35 + 40)}%</p></Card>
              <Card className="p-4"><div className="mb-2 flex items-center gap-2 text-emerald-300"><Activity className="h-4 w-4" />Throughput</div><p className="text-2xl font-semibold">{Math.round(Math.random() * 300 + 200)} Mbps</p></Card>
            </div>
          )}

          {section === 'audit' && (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-white/85">Audit Trail</p>
                <Button variant="outline" onClick={() => setAudit([])}>Clear</Button>
              </div>
              <div className="max-h-[520px] space-y-2 overflow-auto">
                {audit.map((e) => (
                  <div key={e.id} className="rounded border border-slate-800 bg-slate-900/60 p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>{e.message}</span>
                      <span className="text-xs text-white/65">{new Date(e.createdAt).toLocaleString('it-IT')}</span>
                    </div>
                    {e.target && <p className="mt-1 text-xs text-cyan-300">{e.target}</p>}
                  </div>
                ))}
                {audit.length === 0 && <p className="text-sm text-white/70">Nessun evento disponibile.</p>}
              </div>
            </Card>
          )}

          {section === 'settings' && (
            <Card className="p-4 space-y-3">
              <div><Label>Backup API Base URL</Label><Input value={backupApi} onChange={(e) => setBackupApi(e.target.value)} /></div>
              <div><Label>Discovery API Base URL</Label><Input value={discoveryApi} onChange={(e) => setDiscoveryApi(e.target.value)} /></div>
              <div><Label>SSH UI URL</Label><Input value={sshUiUrl} onChange={(e) => setSshUiUrl(e.target.value)} /></div>
              <div><Label>Operator Name</Label><Input value={operator} onChange={(e) => setOperator(e.target.value)} /></div>
              <Button onClick={saveSettings}><Save className="mr-1 h-4 w-4" />Save Enterprise Settings</Button>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

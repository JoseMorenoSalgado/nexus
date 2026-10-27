"use client";

import { useState } from "react";

type Severity = "critical" | "high" | "medium" | "low";
type Release = { version: string; type: "security" | "feature" | "bugfix"; severity?: Severity; description: string };
const sample: Release = {
  version: "1.1.0-beta.1", type: "security", severity: "high",
  description: "Simulación: refuerzo de controles de sesión y validación de acceso."
};

/** Safe UI prototype. It NEVER downloads, executes or installs code. */
export default function UpdateManagerDemo() {
  const [installed, setInstalled] = useState("1.0.0");
  const [auto, setAuto] = useState(false);
  const [available, setAvailable] = useState(true);
  const [status, setStatus] = useState("Simulación preparada. No hay conexión con el servidor de actualizaciones.");
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [snapshots, setSnapshots] = useState<{id: number; version: string; created: string}[]>([]);
  const [nextSnapshotId, setNextSnapshotId] = useState(1);

  function createSnapshot() {
    if (busy) return;
    const snapshot = { id: nextSnapshotId, version: installed, created: new Date().toLocaleString("es") };
    setSnapshots(old => [snapshot, ...old]);
    setNextSnapshotId(n => n + 1);
    setHistory(h => [`Snapshot SIMULADO #${snapshot.id} creado para versión ${installed}`, ...h]);
    setStatus("Punto de restauración simulado creado. No existe copia real en disco.");
  }

  function restoreSnapshot(id: number) {
    if (busy) return;
    const snapshot = snapshots.find(item => item.id === id);
    if (!snapshot || !window.confirm("¿Restablecer únicamente el estado de esta simulación? No se restaurarán archivos ni datos reales.")) return;
    setInstalled(snapshot.version);
    setAvailable(snapshot.version !== sample.version);
    setHistory(h => [`Restauración SIMULADA #${id} a versión ${snapshot.version}`, ...h]);
    setStatus("Restauración simulada finalizada. No se modificó el servidor.");
  }

  function simulate() {
    if (busy || !available) return;
    setBusy(true);
    setStatus("Simulando validación, respaldo e instalación…");
    // Synchronous state transition: no real filesystem, network or database changes.
    const snapshot = { id: nextSnapshotId, version: installed, created: new Date().toLocaleString("es") };
    setSnapshots(old => [snapshot, ...old]);
    setNextSnapshotId(n => n + 1);
    setInstalled(sample.version);
    setAvailable(false);
    setHistory(h => [`Simulación completada: ${sample.version} (sin cambios reales)`, `Snapshot SIMULADO #${snapshot.id} previo a la actualización`, ...h]);
    setStatus("Simulación finalizada. No se modificaron archivos, base de datos ni Passenger.");
    setBusy(false);
  }

  return <section className="mx-auto max-w-3xl space-y-5 rounded-xl border p-6" aria-label="Simulador de actualizaciones">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">Actualizaciones del sistema</h1>
      <span className="rounded bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">MODO SIMULACIÓN</span>
    </div>
    <p className="text-sm">Esta pantalla es una demostración. No se descargan ni instalan actualizaciones reales.</p>
    <div className="rounded-lg border p-4">
      <p>Versión simulada instalada: <strong>{installed}</strong></p>
      {available ? <>
        <p className="mt-2">Versión disponible: <strong>{sample.version}</strong> · Beta privada</p>
        <p>Tipo: Seguridad · Gravedad: <strong>Alta</strong></p>
        <p className="mt-2">{sample.description}</p>
        <button type="button" disabled={busy} onClick={simulate} className="mt-4 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Simular actualización</button>
      </> : <p className="mt-2 text-green-700">No hay actualizaciones pendientes en la simulación.</p>}
    </div>
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />
      Actualizaciones automáticas (preferencia de demostración; no se guarda)
    </label>
    <p role="status" aria-live="polite" className="rounded bg-slate-100 p-3 text-sm text-slate-900">{status}</p>
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Snapshots de seguridad (simulación)</h2>
      <p className="my-2 text-sm">Los puntos de restauración son temporales y solo existen en esta pantalla. No son respaldos reales.</p>
      <button type="button" onClick={createSnapshot} disabled={busy} className="rounded border px-4 py-2">Crear snapshot simulado</button>
      {snapshots.length ? <ul className="mt-3 space-y-2">{snapshots.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
        <span>#{item.id} · v{item.version} · {item.created}</span>
        <button type="button" onClick={() => restoreSnapshot(item.id)} className="rounded border px-3 py-1">Restaurar simulación</button>
      </li>)}</ul> : <p className="mt-2 text-sm">Sin snapshots simulados.</p>}
    </div>
    <h2 className="text-lg font-semibold">Historial simulado</h2>
    {history.length ? <ul className="list-disc pl-5">{history.map((item,i)=><li key={i}>{item}</li>)}</ul> : <p>Aún no hay eventos.</p>}
    <button type="button" onClick={() => { setInstalled("1.0.0"); setAvailable(true); setHistory([]); setSnapshots([]); setNextSnapshotId(1); setStatus("Simulación restablecida."); }} className="rounded border px-4 py-2">Restablecer simulación</button>
  </section>;
}

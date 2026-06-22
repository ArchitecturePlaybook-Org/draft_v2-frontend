import { useEffect, useState } from "react";
import { orgsApi } from "@/domains/orgs/api";

export function AuditLogsView({ orgId }: { orgId: number }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      try {
        const data = await orgsApi.listAuditLogs(orgId);
        // Assuming DRF pagination returns { results: [...] }
        setLogs(data.results || data);
      } catch (err: any) {
        setError(err.message || "Failed to load audit logs");
      } finally {
        setIsLoading(false);
      }
    }
    if (orgId) {
      fetchLogs();
    }
  }, [orgId]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-10 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="bg-white p-10 border border-surface-200 rounded-2xl shadow-sm">
      <h3 className="text-sm font-bold text-primary uppercase tracking-[0.3em] mb-6">Activity Audit Logs</h3>
      {logs.length === 0 ? (
        <p className="text-surface-400 text-sm italic">No activity logs found for this organization.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log: any) => (
            <div key={log.id} className="flex gap-4 p-4 border border-surface-100 rounded-xl bg-surface-50">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-1 rounded">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-surface-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-surface-600 mb-2">
                  <span className="font-bold text-primary">
                    {log.user_details ? log.user_details.name : "System"}
                  </span>
                  {" "}on <span className="font-mono">{log.resource_type}</span> {log.resource_id ? `(${log.resource_id})` : ""}
                </div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <pre className="text-[10px] text-surface-500 bg-white p-3 border border-surface-100 rounded-lg overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

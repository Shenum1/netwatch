import { useQuery } from "@tanstack/react-query";
import { fetchAlertStats, fetchAlerts, acknowledgeAlert } from "../utils/api.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useAlertStats() {
  return useQuery({
    queryKey: ["alert-stats"],
    queryFn: fetchAlertStats,
    refetchInterval: 5000,
  });
}

export function useAlerts(params = {}) {
  return useQuery({
    queryKey: ["alerts", params],
    queryFn: () => fetchAlerts(params),
    refetchInterval: 5000,
  });
}

export function useAcknowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alert-stats"] });
    },
  });
}

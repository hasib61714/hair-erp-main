import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SupabaseTable = Parameters<typeof supabase.from>[0];

// ── Generic fetcher ────────────────────────────────────────────────
/**
 * Wraps a Supabase select query in React Query with consistent defaults.
 *
 * Usage:
 *   const { data, isLoading } = useSupabaseQuery(
 *     ["inventory"],
 *     () => supabase.from("inventory").select("*").order("grade")
 *   );
 */
export function useSupabaseQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  options?: Omit<UseQueryOptions<T[]>, "queryKey" | "queryFn">
) {
  return useQuery<T[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn();
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// ── Generic single-row fetcher ─────────────────────────────────────
export function useSupabaseSingle<T>(
  queryKey: readonly unknown[],
  queryFn: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  options?: Omit<UseQueryOptions<T | null>, "queryKey" | "queryFn">
) {
  return useQuery<T | null>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn();
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// ── Generic mutation helper ────────────────────────────────────────
interface MutationOptions<TVariables> {
  /** Called after a successful mutation — typically invalidates query cache. */
  onSuccess?: () => void;
  /** Override error message display. */
  onError?: (msg: string) => void;
  /** Supabase table name for auto invalidation. */
  invalidates?: readonly unknown[][];
}

export function useSupabaseMutation<TVariables>(
  mutationFn: (vars: TVariables) => PromiseLike<{ error: { message: string } | null }>,
  options?: MutationOptions<TVariables>
) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: TVariables) => {
      const { error } = await mutationFn(vars);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      options?.invalidates?.forEach(key => qc.invalidateQueries({ queryKey: key }));
      options?.onSuccess?.();
    },
    onError: (err: Error) => {
      if (options?.onError) {
        options.onError(err.message);
      } else {
        toast.error(err.message);
      }
    },
  });
}

// ── Convenience: insert ────────────────────────────────────────────
export function useInsert<T extends object>(
  table: SupabaseTable,
  invalidates: readonly unknown[][],
  onSuccess?: () => void
) {
  return useSupabaseMutation<T>(
    vars => supabase.from(table).insert(vars as Parameters<typeof supabase.from>[0]),
    { invalidates, onSuccess }
  );
}

// ── Convenience: delete by id ──────────────────────────────────────
export function useDeleteById(
  table: SupabaseTable,
  invalidates: readonly unknown[][],
  onSuccess?: () => void
) {
  return useSupabaseMutation<string>(
    id => supabase.from(table).delete().eq("id", id),
    { invalidates, onSuccess }
  );
}

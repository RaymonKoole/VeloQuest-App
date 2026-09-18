import type { SupabaseClient } from "@supabase/supabase-js";

export type SegmentEffortRow = {
  activity_id: number;
  segment_id: number | null;
  segment_name: string | null;
  elapsed_time: number | null;
  pr_rank: number | null;
  kom_rank: number | null;
};

const EFFORTS_PAGE_SIZE = 1000;

/**
 * Supabase/PostgREST geeft standaard maximaal 1000 rijen per query terug.
 * Actieve gebruikers hebben al gauw meer dan 1000 segment-efforts in totaal,
 * dus zonder paginering worden sommige segmenten stilzwijgend te laag geteld.
 * Elke plek die "hoe vaak heb ik dit segment gereden" berekent gebruikt deze
 * gedeelde helper, zodat het cijfer overal (Segmenten-tab, Jaaroverzicht, ...)
 * hetzelfde is.
 */
export async function fetchAllSegmentEfforts(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<SegmentEffortRow[]> {
  const efforts: SegmentEffortRow[] = [];

  for (let from = 0; ; from += EFFORTS_PAGE_SIZE) {
    const { data: page, error } = await supabaseAdmin
      .from("activity_segment_efforts")
      .select("activity_id, segment_id, segment_name, elapsed_time, pr_rank, kom_rank")
      .eq("user_id", userId)
      .range(from, from + EFFORTS_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    efforts.push(...(page || []));

    if (!page || page.length < EFFORTS_PAGE_SIZE) {
      break;
    }
  }

  return efforts;
}

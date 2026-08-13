import type {
  PlanCounts,
  PlanExtractionResult,
  PlanRoom,
  PlanScopeFacts,
  PlanScopeItem,
} from "./extraction";
import {
  addFact,
  emptyTrail,
  normalizeKey,
  valuesAgree,
  type AuditTrail,
  type FactSource,
} from "../documents/auditTrail";

/**
 * Folding many per-chunk reads of one plan set into one answer.
 *
 * THIS IS WHERE DOUBLE COUNTING LIVES OR DIES. A hundred-page set restates the
 * same quantity by design: a room is tagged on the floor plan and again in the
 * cover-sheet tabulation, a door count appears on the plan and again in the
 * schedule. Reading pages independently and concatenating the results counts
 * every one of those twice, and a 1,714 SF house prices as 3,056 SF - which is
 * not hypothetical, it is what a single confused read already did to the Squier
 * set before `phase` was introduced.
 *
 * So rooms are merged on identity (level + name + phase), not appended. A room
 * seen twice with the same area is ONE room with two sources. A room seen twice
 * with different areas is a CONFLICT: it is not averaged, not resolved by
 * picking the higher or the newer sheet, and not priced at face value. It is
 * put to the customer as a question, because a superseded sheet and a current
 * one look identical to a reader that has only the numbers.
 */

export interface ChunkedRead {
  result: PlanExtractionResult;
  /** Page indices this read covered, for attribution. */
  pageIndices: number[];
  /** Filename and sheet for the audit trail. */
  filename: string;
  sheet: string | null;
}

export interface MergedPlans {
  result: PlanExtractionResult;
  trail: AuditTrail;
  /** Rooms dropped because an identical room was already recorded. */
  duplicateRoomsMerged: number;
}

/**
 * Rooms drawn on an existing or demolition sheet describe the house as it
 * stands. They must never be summed with the new-work rooms - that is the same
 * floor counted twice - but they are still evidence, so they are kept and
 * tagged rather than discarded.
 */
function roomKey(room: PlanRoom): string {
  return normalizeKey(room.level ?? "", room.name, room.phase);
}

/** Prefer the reading whose source we trust more, then the one that has a number. */
function betterRoom(a: PlanRoom, b: PlanRoom): PlanRoom {
  const rank = (r: PlanRoom) =>
    (r.areaSqFt === null ? 0 : 2) + (r.areaSource === "printed" ? 2 : r.areaSource === "derived" ? 1 : 0);
  return rank(b) > rank(a) ? b : a;
}

export function mergePlanReads(reads: ChunkedRead[]): MergedPlans {
  const trail = emptyTrail();

  const rooms = new Map<string, PlanRoom>();
  const counts = new Map<string, PlanCounts>();
  const scopeItems = new Map<string, PlanScopeItem>();
  const scopeNotes: string[] = [];
  const warnings: string[] = [];
  const sheetsUsed: string[] = [];
  let duplicateRoomsMerged = 0;

  let looksLikePlans = false;
  let statedTotalSqFt: number | null = null;
  const projectTypes = new Map<string, number>();
  const facts: PlanScopeFacts = {
    wallsRemovedOrAdded: null,
    plumbingFixturesRelocated: null,
    electricalServiceOrPanelWork: null,
    structuralWork: null,
    hvacWork: null,
    exteriorEnvelopeWork: null,
    kitchenInScope: null,
  };

  // Deterministic: page order, not completion order.
  const ordered = [...reads].sort((a, b) => (a.pageIndices[0] ?? 0) - (b.pageIndices[0] ?? 0));

  for (const read of ordered) {
    const source = (sheet: string | null, quote: string | null): FactSource => ({
      pageIndex: read.pageIndices[0] ?? 0,
      filename: read.filename,
      sheet: sheet ?? read.sheet,
      quote,
    });

    if (read.result.looksLikePlans) looksLikePlans = true;
    if (read.result.projectType && read.result.projectType !== "unclear") {
      projectTypes.set(read.result.projectType, (projectTypes.get(read.result.projectType) ?? 0) + 1);
    }

    /* A stated total is the one number the whole cross-check rests on, so a
       second sheet claiming a different one is a conflict worth surfacing
       rather than a value worth overwriting. */
    if (read.result.statedTotalSqFt != null) {
      addFact(trail, {
        key: "stated-total-area",
        label: "Stated total conditioned area",
        factType: "stated-total",
        value: read.result.statedTotalSqFt,
        unit: "SF",
        derivation: "Printed on the drawings as a total area.",
        status: "confirmed",
        sources: [source(null, `${read.result.statedTotalSqFt} SF`)],
      });
      if (statedTotalSqFt === null) statedTotalSqFt = read.result.statedTotalSqFt;
    }

    for (const room of read.result.rooms) {
      const key = roomKey(room);
      const existing = rooms.get(key);
      if (existing) {
        duplicateRoomsMerged++;
        rooms.set(key, betterRoom(existing, room));
      } else {
        rooms.set(key, room);
      }
      addFact(trail, {
        key,
        label: `${room.name}${room.level ? ` (${room.level})` : ""}`,
        factType: "room-area",
        value: room.areaSqFt,
        unit: "SF",
        derivation:
          room.areaSqFt === null
            ? "No area printed for this room; it is not counted toward the measured floor area."
            : `Area ${room.areaSource} from the drawing${room.dimensionText ? ` (${room.dimensionText})` : ""}.`,
        status: room.areaSqFt === null ? "assumed" : "confirmed",
        sources: [source(room.sheet, room.dimensionText ?? (room.areaSqFt ? `${room.areaSqFt} SF` : null))],
      });
    }

    for (const count of read.result.counts) {
      const key = normalizeKey(count.label);
      const existing = counts.get(key);
      /* Schedules beat plan counts. A door schedule is a tabulation the
         drafter reconciled; counting symbols off a plan misses the ones behind
         a callout bubble. Where both exist and disagree, the trail records a
         conflict and the schedule figure is the one carried forward. */
      if (!existing || (count.source === "printed" && existing.source !== "printed")) {
        counts.set(key, count);
      }
      addFact(trail, {
        key,
        label: count.label,
        factType: "count",
        value: count.count,
        unit: "EA",
        derivation: `Counted from the drawings (${count.source}).`,
        status: "confirmed",
        sources: [source(count.sheet, `${count.label}: ${count.count}`)],
      });
    }

    for (const item of read.result.scopeItems) {
      const key = normalizeKey(item.category, item.description);
      if (!scopeItems.has(key)) scopeItems.set(key, item);
      addFact(trail, {
        key,
        label: item.description.slice(0, 120),
        factType: item.inContract ? "scope" : "out-of-contract",
        value: null,
        unit: null,
        derivation: item.inContract
          ? "Called for by the drawings and inside the contract."
          : "Marked on the drawings as by others, NIC, or under a separate permit. NOT priced.",
        status: item.inContract ? "confirmed" : "excluded",
        sources: [source(item.sheet, item.description.slice(0, 200))],
      });
    }

    for (const note of read.result.scopeNotes) if (!scopeNotes.includes(note)) scopeNotes.push(note);
    for (const warning of read.result.warnings) if (!warnings.includes(warning)) warnings.push(warning);
    for (const sheet of read.result.sheetsUsed) if (!sheetsUsed.includes(sheet)) sheetsUsed.push(sheet);

    /* Scope facts are OR-ed across the set, never overwritten. A structural
       beam drawn on sheet 60 is structural work even though sheets 1 to 59
       showed none, and a later read returning null must not erase it. */
    for (const field of Object.keys(facts) as (keyof PlanScopeFacts)[]) {
      const value = read.result.scopeFacts?.[field];
      if (value === true) facts[field] = true;
      else if (value === false && facts[field] === null) facts[field] = false;
    }
  }

  const mergedRooms = [...rooms.values()];
  /* Summed from the DEDUPLICATED, in-scope rooms only. Summing the raw
     per-chunk totals is precisely the double count this module exists to
     prevent, and existing/demolition phases are the same floor drawn again. */
  const inScopeRooms = mergedRooms.filter((r) => r.phase === "new" && r.areaSqFt != null);
  const roomAreaTotalSqFt =
    inScopeRooms.length > 0 ? inScopeRooms.reduce((sum, r) => sum + (r.areaSqFt ?? 0), 0) : null;

  if (roomAreaTotalSqFt !== null) {
    addFact(trail, {
      key: "room-area-total",
      label: "Measured floor area (sum of new-work rooms)",
      factType: "derived-total",
      value: Math.round(roomAreaTotalSqFt),
      unit: "SF",
      derivation:
        `Summed from ${inScopeRooms.length} new-work room(s) after removing ${duplicateRoomsMerged} restated room(s). ` +
        `Existing and demolition sheets were excluded so the same floor is not counted twice.`,
      status: duplicateRoomsMerged > 0 ? "deduplicated" : "confirmed",
      sources: inScopeRooms.slice(0, 5).map((r) => ({
        pageIndex: 0,
        filename: "",
        sheet: r.sheet,
        quote: `${r.name}: ${r.areaSqFt} SF`,
      })),
    });
  }

  const projectType =
    [...projectTypes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unclear";

  return {
    duplicateRoomsMerged,
    trail,
    result: {
      looksLikePlans,
      projectType: projectType as PlanExtractionResult["projectType"],
      statedTotalSqFt,
      roomAreaTotalSqFt: roomAreaTotalSqFt === null ? null : Math.round(roomAreaTotalSqFt),
      rooms: mergedRooms,
      counts: [...counts.values()],
      scopeItems: [...scopeItems.values()],
      scopeFacts: facts,
      sheetsUsed,
      scopeNotes,
      warnings,
    },
  };
}

/** Exported for the verifier: does a merged set double count a restated room? */
export function roomIdentity(room: PlanRoom): string {
  return roomKey(room);
}

export { valuesAgree };

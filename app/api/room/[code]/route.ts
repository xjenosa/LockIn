import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// The read path. Replaces the three separate PostgREST selects useRoom.ts used
// to make (rooms, then teams + players) with ONE round trip.
//
// With realtime gone this is polled by every connected phone and projector, so
// it is now the hottest query in the app -- which is why db/schema.sql carries
// room_id indexes on teams and players.
//
// It returns rooms/teams/players and nothing else. room_hosts,
// final_submissions and score_events are never joined in here: they hold the
// host token, the Last Call wagers/answers, and the correct answers. This
// response goes to every player's phone.
//
// jsonb (rather than three result sets) also keeps the wire format identical to
// what PostgREST produced: Postgres renders timestamptz inside jsonb as an ISO
// string and uuid[] as a JSON array, so lib/types.ts Room/Team/Player still
// describe the payload exactly.

const SQL = `
  select
    to_jsonb(r) as room,
    coalesce((
      select jsonb_agg(to_jsonb(t) order by t.created_at)
        from teams t where t.room_id = r.id
    ), '[]'::jsonb) as teams,
    coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at)
        from players p where p.room_id = r.id
    ), '[]'::jsonb) as players
  from rooms r
  where r.code = upper($1::text)
`;

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  const code = (params.code ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
  }

  try {
    const rows = await query<{
      room: unknown;
      teams: unknown[];
      players: unknown[];
    }>(SQL, [code]);

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({
      room: row.room,
      teams: row.teams,
      players: row.players,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "DB_ERROR" },
      { status: 500 }
    );
  }
}

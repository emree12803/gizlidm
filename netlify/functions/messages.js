import { getStore } from "@netlify/blobs";

const ROOM_KEY_RE = /^[0-9]{6}$/;

export default async (req) => {
  const url = new URL(req.url);
  const store = getStore("gizli-sohbet-odalar");

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method === "GET") {
    const room = url.searchParams.get("room") || "";
    const since = parseInt(url.searchParams.get("since") || "0", 10);

    if (!ROOM_KEY_RE.test(room)) {
      return new Response(JSON.stringify({ error: "Kod 6 haneli rakam olmalı" }), { status: 400, headers: cors });
    }

    const data = (await store.get(room, { type: "json" })) || [];
    const fresh = data.filter((m) => m.ts > since);
    return new Response(JSON.stringify(fresh), { status: 200, headers: cors });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Geçersiz istek" }), { status: 400, headers: cors });
    }

    const { room, name, text } = body || {};
    if (!ROOM_KEY_RE.test(room || "")) {
      return new Response(JSON.stringify({ error: "Kod 6 haneli rakam olmalı" }), { status: 400, headers: cors });
    }
    if (!name || !text || String(text).trim() === "") {
      return new Response(JSON.stringify({ error: "İsim ve mesaj gerekli" }), { status: 400, headers: cors });
    }

    const data = (await store.get(room, { type: "json" })) || [];
    const msg = {
      name: String(name).slice(0, 24),
      text: String(text).slice(0, 1000),
      ts: Date.now(),
    };
    data.push(msg);
    const trimmed = data.slice(-300); // sadece son 300 mesaj tutulsun
    await store.set(room, JSON.stringify(trimmed));

    return new Response(JSON.stringify(msg), { status: 200, headers: cors });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
};

export const config = { path: "/api/messages" };

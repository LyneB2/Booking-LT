import { makeHandler } from "../../../../lib/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handler = makeHandler();
export { handler as GET, handler as POST, handler as DELETE };

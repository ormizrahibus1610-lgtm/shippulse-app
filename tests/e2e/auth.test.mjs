import test from "node:test";
import assert from "node:assert/strict";
import {
  checkAuthMiddleware as guardCheck,
  resolveSession as guardResolve,
} from "../../src/app/auth/guard.ts";
import {
  checkAuthMiddleware,
  resolveSession,
} from "../../src/middleware.ts";

test("resolveSession parses valid and invalid x-demo-user headers", () => {
  assert.equal(resolveSession, guardResolve);

  assert.deepEqual(
    resolveSession({
      headers: { "x-demo-user": "u-1:builder@example.com:user" },
    }),
    { id: "u-1", email: "builder@example.com", role: "user" },
  );

  assert.deepEqual(
    resolveSession({
      headers: { "x-demo-user": "a-1:admin@example.com:admin" },
    }),
    { id: "a-1", email: "admin@example.com", role: "admin" },
  );

  assert.equal(resolveSession({ headers: {} }), null);
  assert.equal(
    resolveSession({ headers: { "x-demo-user": "malformed-header" } }),
    null,
  );
  assert.equal(
    resolveSession({ headers: { "x-demo-user": "u-1::user" } }),
    null,
  );
  assert.equal(
    resolveSession({
      headers: { "x-demo-user": "u-1:builder@example.com:superadmin" },
    }),
    null,
  );
});

test("checkAuthMiddleware gates public GET, authenticated POST, and admin changelog routes", () => {
  assert.equal(checkAuthMiddleware, guardCheck);

  const member = { id: "u-1", email: "builder@example.com", role: "user" };
  const admin = { id: "a-1", email: "admin@example.com", role: "admin" };

  // Public GET routes
  assert.equal(checkAuthMiddleware(null, "GET", "/").allowed, true);
  assert.equal(checkAuthMiddleware(null, "GET", "/api/features").allowed, true);
  assert.equal(checkAuthMiddleware(null, "GET", "/api/changelogs").allowed, true);

  // Authenticated POST routes
  for (const path of ["/api/features", "/api/votes"]) {
    const unauth = checkAuthMiddleware(null, "POST", path);
    assert.equal(unauth.allowed, false);
    assert.equal(unauth.status, 401);

    const asMember = checkAuthMiddleware(member, "POST", path);
    assert.equal(asMember.allowed, true);
    assert.equal(asMember.status, 200);

    const asAdmin = checkAuthMiddleware(admin, "POST", path);
    assert.equal(asAdmin.allowed, true);
    assert.equal(asAdmin.status, 200);
  }

  // Admin-only POST /api/changelogs
  const unauthLog = checkAuthMiddleware(null, "POST", "/api/changelogs");
  assert.equal(unauthLog.allowed, false);
  assert.equal(unauthLog.status, 401);

  const memberLog = checkAuthMiddleware(member, "POST", "/api/changelogs");
  assert.equal(memberLog.allowed, false);
  assert.equal(memberLog.status, 403);

  const adminLog = checkAuthMiddleware(admin, "POST", "/api/changelogs");
  assert.equal(adminLog.allowed, true);
  assert.equal(adminLog.status, 200);
});

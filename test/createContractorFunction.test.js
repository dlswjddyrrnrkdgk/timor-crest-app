import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handler } from "../netlify/functions/create-contractor.js";

describe("create-contractor Netlify Function", () => {
  it("rejects non-POST requests", async () => {
    const response = await handler({ headers: {}, httpMethod: "GET" });

    assert.equal(response.statusCode, 405);
    assert.match(response.body, /POST/);
  });

  it("rejects requests without a bearer token before using server secrets", async () => {
    const response = await handler({ body: "{}", headers: {}, httpMethod: "POST" });

    assert.equal(response.statusCode, 401);
    assert.match(response.body, /로그인/);
  });
});

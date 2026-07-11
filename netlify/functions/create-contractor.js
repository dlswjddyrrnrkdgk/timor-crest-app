import { createClient } from "@supabase/supabase-js";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const CONTRACTOR_SELECT = `
  id,
  profile_id,
  unit_id,
  full_name,
  email,
  phone,
  passport_no,
  address,
  status,
  unit:units (
    id,
    unit_code,
    unit_name,
    property_type,
    total_price,
    currency,
    status
  )
`;

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { error: "POST 요청만 지원합니다." });

  const accessToken = getBearerToken(event);
  if (!accessToken) return json(401, { error: "로그인이 필요합니다." });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "서버 환경변수가 설정되지 않았습니다." });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const requester = await getRequester(adminClient, accessToken);
  if (requester.error) return json(requester.statusCode, { error: requester.error });

  const adminCheck = await assertAdmin(adminClient, requester.user.id);
  if (adminCheck.error) return json(adminCheck.statusCode, { error: adminCheck.error });

  const payloadResult = parsePayload(event.body);
  if (payloadResult.error) return json(400, { error: payloadResult.error });

  const created = {
    contractorId: null,
    profileId: null,
    userId: null,
  };

  try {
    const input = payloadResult.data;
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      password: input.temporary_password,
      user_metadata: {
        full_name: input.full_name,
        role: "contractor",
      },
    });

    if (authError) throw stepError("auth", authError.message, isDuplicateEmailError(authError) ? 409 : 500);
    if (!authData.user?.id) throw stepError("auth", "Supabase Auth user id를 받지 못했습니다.", 500);

    created.userId = authData.user.id;

    const profilePayload = {
      id: created.userId,
      role: "contractor",
      display_name: input.full_name,
      email: input.email,
      phone: input.phone,
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await adminClient.from("profiles").upsert(profilePayload, { onConflict: "id" });
    if (profileError) throw stepError("profiles", profileError.message, 500);

    created.profileId = created.userId;

    const contractorPayload = {
      profile_id: created.userId,
      unit_id: input.unit_id,
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      passport_no: input.passport_no,
      address: input.address,
      status: input.status,
    };

    const { data: contractor, error: contractorError } = await adminClient
      .from("contractors")
      .insert(contractorPayload)
      .select(CONTRACTOR_SELECT)
      .single();

    if (contractorError) throw stepError("contractors", contractorError.message, 500);

    created.contractorId = contractor.id;

    return json(200, {
      data: {
        contractor,
        temporary_password: input.temporary_password,
        user: {
          email: authData.user.email,
          id: authData.user.id,
        },
      },
    });
  } catch (error) {
    await cleanupCreatedRecords(adminClient, created);
    const statusCode = error.statusCode || 500;
    const message = error.step
      ? `계약자 계정 생성 중 ${error.step} 단계에서 실패했습니다: ${error.message}`
      : error.message || "계약자 계정 생성에 실패했습니다.";
    return json(statusCode, { error: message });
  }
}

async function getRequester(client, accessToken) {
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user?.id) {
    return { error: "로그인 토큰을 확인할 수 없습니다.", statusCode: 401, user: null };
  }

  return { error: "", statusCode: 200, user: data.user };
}

async function assertAdmin(client, userId) {
  const { data, error } = await client.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error) return { error: `관리자 권한 확인에 실패했습니다: ${error.message}`, statusCode: 500 };
  if (data?.role !== "admin") return { error: "Admin 권한이 필요합니다.", statusCode: 403 };

  return { error: "", statusCode: 200 };
}

function parsePayload(body) {
  let input;
  try {
    input = JSON.parse(body || "{}");
  } catch {
    return { data: null, error: "요청 본문이 올바른 JSON이 아닙니다." };
  }

  const data = {
    address: optionalText(input.address),
    email: requiredText(input.email).toLowerCase(),
    full_name: requiredText(input.full_name),
    passport_no: optionalText(input.passport_no),
    phone: optionalText(input.phone),
    status: optionalText(input.status) || "active",
    temporary_password: requiredText(input.temporary_password || input.password),
    unit_id: optionalUuid(input.unit_id),
  };

  if (!data.full_name) return { data: null, error: "계약자 이름을 입력해 주세요." };
  if (!isValidEmail(data.email)) return { data: null, error: "올바른 이메일을 입력해 주세요." };
  if (!data.temporary_password || data.temporary_password.length < 8) {
    return { data: null, error: "임시 비밀번호는 8자 이상이어야 합니다." };
  }

  return { data, error: "" };
}

async function cleanupCreatedRecords(client, created) {
  if (created.contractorId) {
    const { error } = await client.from("contractors").delete().eq("id", created.contractorId);
    if (error) console.warn("Failed to cleanup contractor row", error.message);
  }

  if (created.profileId) {
    const { error } = await client.from("profiles").delete().eq("id", created.profileId);
    if (error) console.warn("Failed to cleanup profile row", error.message);
  }

  if (created.userId) {
    const { error } = await client.auth.admin.deleteUser(created.userId);
    if (error) console.warn("Failed to cleanup auth user", error.message);
  }
}

function getBearerToken(event) {
  const header = event.headers.authorization || event.headers.Authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function isDuplicateEmailError(error) {
  const message = String(error.message || "").toLowerCase();
  return error.status === 422 || message.includes("already") || message.includes("registered") || message.includes("exists");
}

function stepError(step, message, statusCode) {
  const error = new Error(message);
  error.step = step;
  error.statusCode = statusCode;
  return error;
}

function json(statusCode, body) {
  return {
    body: statusCode === 204 ? "" : JSON.stringify(body),
    headers: JSON_HEADERS,
    statusCode,
  };
}

function requiredText(value) {
  return String(value || "").trim();
}

function optionalText(value) {
  const next = requiredText(value);
  return next || null;
}

function optionalUuid(value) {
  const next = requiredText(value);
  return next || null;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

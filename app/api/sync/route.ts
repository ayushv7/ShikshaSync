import crypto from "node:crypto";
import type { MasteryMap } from "@/lib/bkt";
import { questions, students, type Subject } from "@/lib/data";
import type { RemedialItem, SyncDelta } from "@/lib/storage";

type SyncBody = {
  deltas?: SyncDelta[];
  mastery?: Record<string, MasteryMap>;
};

const LOCAL_TIPS: Record<Subject, Record<number, string>> = {
  math: {
    3: "Practice two-digit addition using 10-stick bundles and counting blocks.",
    4: "Use folded paper strips to compare halves, quarters, and equal fractions.",
    5: "Solve short speed, time, and distance word problems in 3-step tables.",
  },
  reading: {
    3: "Read two short village sentences aloud and identify who did what and why.",
    4: "Match everyday Kannada/Hindi/English word pairs with opposite meanings.",
    5: "Summarize short science paragraphs in one main-idea sentence.",
  },
};

function hmac(key: crypto.BinaryLike, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

async function awsSignedPost(
  urlStr: string,
  service: string,
  region: string,
  body: string,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  const accessKey = process.env.AWS_ACCESS_KEY_ID || "";
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY || "";
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  const url = new URL(urlStr);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);

  const headers: Record<string, string> = {
    "content-type": "application/json",
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...Object.fromEntries(
      Object.entries(extraHeaders).map(([k, v]) => [k.toLowerCase(), v])
    ),
  };

  if (sessionToken) {
    headers["x-amz-security-token"] = sessionToken;
  }

  const sortedKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headers[k]}\n`).join("");
  const signedHeaders = sortedKeys.join(";");
  const canonicalUri = url.pathname
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");

  const canonicalRequest = [
    "POST",
    canonicalUri || "/",
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto
    .createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  return fetch(urlStr, {
    method: "POST",
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body,
  });
}

function buildLocalPack(
  mastery: Record<string, MasteryMap>,
  deltas: SyncDelta[]
): RemedialItem[] {
  const merged: Record<string, MasteryMap> = {};
  for (const student of students) {
    merged[student.id] = {
      ...student.initialMastery,
      ...(mastery[student.id] ?? {}),
    };
  }
  for (const d of deltas) {
    if (merged[d.studentId]) {
      merged[d.studentId][d.subject] = d.mastery;
    }
  }

  return students.map((student) => {
    const scores = merged[student.id];
    const subject: Subject = scores.math <= scores.reading ? "math" : "reading";
    const questionIds = questions
      .filter((q) => q.subject === subject && q.grade <= student.grade + 1)
      .sort((a, b) => a.level - b.level)
      .slice(0, 2)
      .map((q) => q.id);

    return {
      studentId: student.id,
      studentName: student.name,
      grade: student.grade,
      subject,
      mastery: scores[subject],
      tip: LOCAL_TIPS[subject][student.grade] ?? LOCAL_TIPS[subject][3],
      questionIds,
    };
  });
}

async function syncDynamo(
  region: string,
  table: string,
  deltas: SyncDelta[],
  mastery: Record<string, MasteryMap>
): Promise<boolean> {
  try {
    const item = {
      pk: { S: `school-sync-${Date.now()}` },
      syncedAt: { N: String(Date.now()) },
      deltaCount: { N: String(deltas.length) },
      masteryJson: { S: JSON.stringify(mastery) },
    };
    const res = await awsSignedPost(
      `https://dynamodb.${region}.amazonaws.com/`,
      "dynamodb",
      region,
      JSON.stringify({ TableName: table, Item: item }),
      {
        "content-type": "application/x-amz-json-1.0",
        "x-amz-target": "DynamoDB_20120810.PutItem",
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function enrichWithBedrock(
  region: string,
  modelId: string,
  pack: RemedialItem[]
): Promise<{ pack: RemedialItem[]; ok: boolean }> {
  try {
    const summary = pack
      .map((p) => `${p.studentName}(G${p.grade}):${p.subject}=${Math.round(p.mastery * 100)}%`)
      .join(", ");
    const payload = JSON.stringify({
      messages: [
        {
          role: "user",
          content: [
            {
              text: `Return JSON array of {studentId, tip} with one 12-word remedial tip per student for: ${summary}. IDs: ${pack.map((p) => p.studentId).join(",")}.`,
            },
          ],
        },
      ],
      inferenceConfig: { maxTokens: 220, temperature: 0.2 },
    });

    const res = await awsSignedPost(
      `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`,
      "bedrock",
      region,
      payload
    );

    if (!res.ok) return { pack, ok: false };
    const data = (await res.json()) as {
      output?: { message?: { content?: Array<{ text?: string }> } };
    };
    const raw = data.output?.message?.content?.[0]?.text ?? "";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return { pack, ok: false };

    const tips = JSON.parse(match[0]) as Array<{ studentId?: string; tip?: string }>;
    const tipByStudent = new Map(
      tips
        .filter((t) => t.studentId && t.tip)
        .map((t) => [t.studentId as string, t.tip as string])
    );

    return {
      pack: pack.map((item) => ({
        ...item,
        tip: tipByStudent.get(item.studentId) ?? item.tip,
      })),
      ok: tipByStudent.size > 0,
    };
  } catch {
    return { pack, ok: false };
  }
}

export async function POST(req: Request) {
  let body: SyncBody;
  try {
    body = (await req.json()) as SyncBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deltas = Array.isArray(body.deltas) ? body.deltas : [];
  const mastery = body.mastery ?? {};
  let remedialPack = buildLocalPack(mastery, deltas);

  const hasAwsKeys = Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  );
  const region = process.env.AWS_REGION || "ap-south-1";
  const dynamoTable = process.env.AWS_DYNAMODB_TABLE;
  const bedrockModel =
    process.env.AWS_BEDROCK_MODEL_ID || "amazon.nova-micro-v1:0";

  let dynamoSynced = false;
  let bedrockUsed = false;

  if (hasAwsKeys) {
    if (dynamoTable) {
      dynamoSynced = await syncDynamo(region, dynamoTable, deltas, mastery);
    }
    const bedrockRes = await enrichWithBedrock(region, bedrockModel, remedialPack);
    remedialPack = bedrockRes.pack;
    bedrockUsed = bedrockRes.ok;
  }

  const payload = {
    ok: true,
    syncedCount: deltas.length,
    syncedAt: Date.now(),
    source: bedrockUsed ? "aws-bedrock" : "local",
    dynamoSynced,
    remedialPack,
  };

  const payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
  return Response.json({ ...payload, payloadBytes });
}

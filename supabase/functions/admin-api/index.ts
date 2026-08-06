import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import * as XLSX from "npm:xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAdminPassword(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await supabase
    .from("admin_config")
    .select("admin_password")
    .eq("id", 1)
    .maybeSingle();
  return data?.admin_password ?? "admin123";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    let path = url.pathname;
    path = path.replace(/^\/functions\/v1\/admin-api/, "").replace(/^\/admin-api/, "");
    if (path === "") path = "/";

    const adminPassword = await getAdminPassword(supabase);

    // ── Admin Login ──────────────────────────
    if (path === "/login" && req.method === "POST") {
      const { password } = await req.json();
      if (!password || password !== adminPassword) {
        return json({ success: false, error: "Incorrect password" }, 401);
      }
      return json({ success: true, token: adminPassword });
    }

    // All other routes require admin auth
    const auth = req.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = auth.split(" ")[1];
    if (token !== adminPassword) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ── List Students ─────────────────────────
    if (path === "/students" && req.method === "GET") {
      const { data, error } = await supabase
        .from("students")
        .select("roll_no, name, class_grade, stream, combination")
        .eq("stream", "Science")
        .order("roll_no", { ascending: true });

      if (error) return json({ error: error.message }, 500);
      return json({ success: true, students: data });
    }

    // ── Add Single Student ────────────────────
    if (path === "/student" && req.method === "POST") {
      const body = await req.json();
      const { roll_no, name, password, class_grade, stream, combination } = body;
      if (!roll_no || !name) return json({ error: "Roll number and name required" }, 400);
      if (String(stream || "").trim().toLowerCase() !== "science") {
        return json({ error: "Only Science students are supported" }, 400);
      }

      const { error } = await supabase.from("students").upsert({
        roll_no, name, password: password || roll_no, class_grade, stream, combination,
      }, { onConflict: "roll_no" });

      if (error) return json({ error: error.message }, 500);
      return json({ success: true, message: `Student ${roll_no} added` });
    }

    // ── Upload Excel ──────────────────────────
    if (path === "/upload-excel" && req.method === "POST") {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return json({ error: "No file uploaded" }, 400);
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) return json({ error: "Excel file is empty" }, 400);

      const nonSubjectKeys = new Set([
        "rollno", "roll_no", "rollnumber", "name", "studentname",
        "class", "class_grade", "classgrade", "stream", "combination",
        "totalmarks", "total_marks", "maxmarks", "max_marks", "percentage",
        "collegerank", "college_rank", "streamrank", "stream_rank",
      ]);

      const subjectKeyMap: Record<string, string> = {
        physics: "Physics", chemistry: "Chemistry", math: "Mathematics",
        maths: "Mathematics", mathematics: "Mathematics", biology: "Biology",
        computer: "Computer Science", computerscience: "Computer Science",
        "computer science": "Computer Science", english: "English", kannada: "Kannada",
      };

      function normalizeKey(key: string): string {
        return String(key || "").trim().toLowerCase().replace(/[\s_]/g, "");
      }

      function getRowValue(row: Record<string, unknown>, aliases: string[]): unknown {
        const candidates = aliases.map(normalizeKey);
        for (const [key, value] of Object.entries(row)) {
          if (candidates.includes(normalizeKey(key))) return value;
        }
        return "";
      }

      function titleCase(key: string): string {
        return String(key || "").replace(/[_\-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()).trim();
      }

      const parsedRows = rows.map((row: Record<string, unknown>) => {
        const rollNo = String(getRowValue(row, ["Roll No", "RollNo", "roll_no", "rollno", "roll number"]) || "").trim().toUpperCase();
        const name = String(getRowValue(row, ["Name", "name", "Student Name", "studentname"]) || "").trim();
        const classGrade = String(getRowValue(row, ["Class", "class", "class_grade", "classgrade"]) || "").trim();
        const combination = String(getRowValue(row, ["Combination", "combination", "comb"]) || "").trim();
        if (!rollNo || !name) return null;

        const marks: Record<string, number> = {};
        Object.entries(row).forEach(([key, value]) => {
          const nk = normalizeKey(key);
          if (nonSubjectKeys.has(nk)) return;
          if (value === undefined || value === null || value === "") return;
          const mark = parseInt(String(value), 10);
          if (Number.isNaN(mark)) return;
          const displayName = subjectKeyMap[nk] || titleCase(key);
          marks[displayName] = mark;
        });

        if (Object.keys(marks).length === 0) return null;

        const totalMarks = Object.values(marks).reduce((sum, v) => sum + v, 0);
        const subjectCount = Object.keys(marks).length;
        const maxMarks = parseInt(String(row["MaxMarks"] || row["max_marks"] || ""), 10) || subjectCount * 100;
        const percentage = maxMarks ? parseFloat(((totalMarks / maxMarks) * 100).toFixed(2)) : 0;

        return { rollNo, name, classGrade, combination, marks, totalMarks, percentage };
      }).filter(Boolean) as Array<{
        rollNo: string; name: string; classGrade: string; combination: string;
        marks: Record<string, number>; totalMarks: number; percentage: number;
      }>;

      let successCount = 0;
      for (const item of parsedRows) {
        await supabase.from("students").upsert({
          roll_no: item.rollNo, name: item.name, password: item.rollNo,
          class_grade: item.classGrade, stream: "Science", combination: item.combination,
        }, { onConflict: "roll_no" });

        await supabase.from("results").upsert({
          roll_no: item.rollNo,
          physics: item.marks.Physics ?? null,
          chemistry: item.marks.Chemistry ?? null,
          mathematics: item.marks.Mathematics ?? null,
          biology: item.marks.Biology ?? null,
          computer_science: item.marks["Computer Science"] ?? null,
          english: item.marks.English ?? null,
          kannada: item.marks.Kannada ?? null,
          total_marks: item.totalMarks,
          percentage: item.percentage,
        }, { onConflict: "roll_no" });

        successCount++;
      }

      return json({
        success: true,
        message: `Uploaded and ranked ${successCount} Science students!`,
        successCount,
      });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("Admin API error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

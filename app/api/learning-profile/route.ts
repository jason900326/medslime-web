import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LearningProfileRequest = {
  educationStage?: string;
  primaryGoal?: string;
  studyMethod?: string;
  biggestPain?: string;
  sessionLength?: string;
};

const allowed = {
  educationStage: new Set([
    "year1",
    "year2",
    "year3",
    "year4",
    "intern",
    "exam_prep",
    "graduated",
  ]),
  primaryGoal: new Set([
    "school_exam",
    "internship_exam",
    "national_exam",
    "daily_review",
  ]),
  studyMethod: new Set([
    "slides",
    "questions",
    "notes",
    "videos",
    "mixed",
  ]),
  biggestPain: new Set([
    "find_focus",
    "forget_fast",
    "mistakes",
    "motivation",
    "not_enough_time",
  ]),
  sessionLength: new Set([
    "under20",
    "20to40",
    "40to60",
    "over60",
  ]),
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入。" }, { status: 401 });
    }

    const body = (await request.json()) as LearningProfileRequest;
    const educationStage = body.educationStage ?? "";
    const primaryGoal = body.primaryGoal ?? "";
    const studyMethod = body.studyMethod ?? "";
    const biggestPain = body.biggestPain ?? "";
    const sessionLength = body.sessionLength ?? "";

    if (
      !allowed.educationStage.has(educationStage) ||
      !allowed.primaryGoal.has(primaryGoal) ||
      !allowed.studyMethod.has(studyMethod) ||
      !allowed.biggestPain.has(biggestPain) ||
      !allowed.sessionLength.has(sessionLength)
    ) {
      return NextResponse.json(
        { error: "學習習慣資料不完整。" },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("learning_profiles").upsert(
      {
        user_id: user.id,
        education_stage: educationStage,
        primary_goal: primaryGoal,
        study_method: studyMethod,
        biggest_pain: biggestPain,
        session_length: sessionLength,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "學習習慣儲存失敗。",
      },
      { status: 500 },
    );
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getFocusPolicy(classId: string) {
  try {
    const policy = await prisma.focusPolicy.findUnique({
      where: { classId },
    });
    return policy || { domains: [] };
  } catch (error) {
    console.error("Failed to fetch focus policy:", error);
    return { domains: [] };
  }
}

export async function getUserFocusPolicy(userId: string) {
  try {
    const policies = await prisma.focusPolicy.findMany({
      where: {
        class: {
          teacherId: userId
        }
      },
      select: { domains: true }
    });

    const allDomains = Array.from(new Set(policies.flatMap(p => p.domains)));
    return { domains: allDomains };
  } catch (error) {
    console.error("Failed to fetch user focus policy:", error);
    return { domains: [] };
  }
}

export async function updateFocusPolicy(classId: string, domains: string[]) {
  try {
    const policy = await prisma.focusPolicy.upsert({
      where: { classId },
      update: { domains },
      create: { classId, domains },
    });
    revalidatePath(`/teacher/classes/${classId}`);
    return { success: true, policy };
  } catch (error) {
    console.error("Failed to update focus policy:", error);
    return { success: false, error: "Failed to update policy" };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

/**
 * Get student analytics for the last 7 days.
 */
export async function getStudentAnalytics(userId: string) {
  try {
    const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i)).reverse();
    
    const analytics = await Promise.all(
      days.map(async (day) => {
        const dateStr = format(day, "MMM dd");
        const start = startOfDay(day);
        const end = endOfDay(day);

        const sessions = await prisma.studySession.findMany({
          where: {
            userId,
            startedAt: { gte: start, lte: end },
            status: "COMPLETED",
          },
          select: { actualDuration: true, xpEarned: true },
        });

        const totalMinutes = sessions.reduce((acc, s) => acc + s.actualDuration, 0);
        const totalXP = sessions.reduce((acc, s) => acc + s.xpEarned, 0);

        return {
          date: dateStr,
          minutes: totalMinutes,
          xp: totalXP,
        };
      })
    );

    return analytics;
  } catch (error) {
    console.error("Failed to fetch student analytics:", error);
    return [];
  }
}

/**
 * Get teacher analytics (Class performance overview).
 */
export async function getTeacherAnalytics(teacherId: string) {
  try {
    if (!teacherId) return [];
    
    const classes = await prisma.class.findMany({
      where: { teacherId },
      include: {
        _count: { select: { members: true } },
        sessions: {
          where: { status: "COMPLETED" },
          select: { actualDuration: true, focusScore: true },
        },
      },
    });

    if (!classes) return [];

    return classes.map((c) => ({
      name: c.name,
      students: c._count?.members || 0,
      avgFocus: (c.sessions && c.sessions.length > 0)
        ? Math.round(c.sessions.reduce((acc, s) => acc + (s.focusScore || 0), 0) / c.sessions.length) 
        : 0,
      totalTime: c.sessions ? c.sessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0) : 0,
    }));
  } catch (error) {
    console.error("CRITICAL: Failed to fetch teacher analytics:", error);
    return [];
  }
}

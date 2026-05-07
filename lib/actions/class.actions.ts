"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

/**
 * Create a new class (Teacher only).
 */
export async function createClass(teacherId: string, name: string, description?: string) {
  try {
    const code = nanoid(6).toUpperCase(); // Unique 6-char code

    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        code,
        teacherId,
      },
    });

    revalidatePath("/teacher/dashboard");
    revalidatePath("/teacher/classes");
    return { success: true, class: newClass };
  } catch (error) {
    console.error("Failed to create class:", error);
    return { success: false, error: "Failed to create class" };
  }
}

import { createNotification } from "./notification.actions";

/**
 * Join a class using a code (Student only).
 */
export async function joinClass(userId: string, code: string) {
  try {
    const targetClass = await prisma.class.findUnique({
      where: { code: code.toUpperCase() },
      include: { teacher: true }
    });

    if (!targetClass) {
      return { success: false, error: "Class not found. Please check the code." };
    }

    if (!targetClass.isActive) {
      return { success: false, error: "This class is no longer active." };
    }

    const existingMember = await prisma.classMember.findUnique({
      where: {
        classId_userId: {
          classId: targetClass.id,
          userId,
        },
      },
    });

    if (existingMember) {
      return { success: false, error: "You are already a member of this class." };
    }

    await prisma.classMember.create({
      data: {
        classId: targetClass.id,
        userId,
      },
    });

    // Notify Student
    await createNotification({
      userId,
      title: "Successfully Joined!",
      message: `You are now a member of ${targetClass.name}.`,
      type: "CLASS",
      link: `/student/classes/${targetClass.id}`
    });

    // Notify Teacher
    await createNotification({
      userId: targetClass.teacherId,
      title: "New Student Enrolled",
      message: `A new student has joined your class: ${targetClass.name}.`,
      type: "SUCCESS",
      link: `/teacher/classes/${targetClass.id}`
    });

    revalidatePath("/student/dashboard");
    revalidatePath("/student/classes");
    return { success: true, className: targetClass.name };
  } catch (error) {
    console.error("Failed to join class:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Get student's enrolled classes.
 */
export async function getStudentClasses(userId: string) {
  try {
    const memberships = await prisma.classMember.findMany({
      where: { userId },
      include: {
        class: {
          include: {
            teacher: {
              select: { name: true, avatar: true },
            },
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return memberships.map((m) => m.class);
  } catch (error) {
    console.error("Failed to fetch student classes:", error);
    return [];
  }
}

/**
 * Get teacher's classes.
 */
export async function getTeacherClasses(teacherId: string) {
  try {
    if (!teacherId) return [];
    const classes = await prisma.class.findMany({
      where: { teacherId },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return classes;
  } catch (error) {
    console.error("Failed to fetch teacher classes:", error);
    return [];
  }
}

export async function getClassDetails(classId: string) {
  try {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: { select: { id: true, name: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true, level: true, xp: true } },
          },
          orderBy: { joinedAt: "desc" }
        },
        announcements: {
          include: { 
            author: { select: { name: true, avatar: true } },
            comments: {
              include: { author: { select: { name: true, avatar: true } } },
              orderBy: { createdAt: "asc" }
            },
            reactions: true
          },
          orderBy: { createdAt: "desc" }
        },
        assignments: {
          orderBy: { createdAt: "desc" }
        },
        documents: {
          orderBy: { createdAt: "desc" }
        },
        quizzes: {
          include: {
            questions: true,
            submissions: {
              include: {
                user: {
                  select: { name: true, avatar: true }
                }
              },
              orderBy: { completedAt: "desc" }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        _count: { select: { members: true } },
      },
    });

    return classData;
  } catch (error) {
    console.error("Failed to fetch class details:", error);
    return null;
  }
}

/**
 * Post an announcement to the class wall.
 */
export async function postAnnouncement(classId: string, authorId: string, content: string) {
  try {
    await prisma.announcement.create({
      data: { classId, authorId, content }
    });
    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/student/classes/${classId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to post announcement" };
  }
}

/**
 * Create a new assignment.
 */
export async function createAssignment(classId: string, title: string, description?: string, xpReward = 100) {
  try {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true }
    });

    const newAssignment = await prisma.assignment.create({
      data: { classId, title, description, xpReward }
    });

    if (classData) {
      await prisma.announcement.create({
        data: {
          classId,
          authorId: classData.teacherId,
          content: `📝 New Assignment: **${title}**! Complete this task to earn ${xpReward} XP.`,
          type: "ASSIGNMENT",
          attachmentId: newAssignment.id
        }
      });
    }

    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/student/classes/${classId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to create assignment" };
  }
}

/**
 * Upload a document.
 */
export async function uploadDocument(classId: string, name: string, url: string, type: string) {
  try {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true }
    });

    const newDoc = await prisma.document.create({
      data: { classId, name, url, type }
    });

    if (classData) {
      await prisma.announcement.create({
        data: {
          classId,
          authorId: classData.teacherId,
          content: `📁 New Resource Shared: **${name}**. Check out the new ${type} document!`,
          type: "DOCUMENT",
          attachmentId: newDoc.id
        }
      });
    }

    revalidatePath(`/teacher/classes/${classId}`);
    revalidatePath(`/student/classes/${classId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to upload document" };
  }
}

/**
 * Remove a student from a class.
 */
export async function removeStudent(classId: string, userId: string) {
  try {
    await prisma.classMember.delete({
      where: { classId_userId: { classId, userId } }
    });
    revalidatePath(`/teacher/classes/${classId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to remove student" };
  }
}

/**
 * Delete a class permanently.
 */
export async function deleteClass(classId: string) {
  try {
    await prisma.class.delete({
      where: { id: classId }
    });
    revalidatePath("/teacher/dashboard");
    revalidatePath("/teacher/classes");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete class" };
  }
}

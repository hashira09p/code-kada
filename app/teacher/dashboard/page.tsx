"use client";

import { useState, useEffect } from "react";
import { signOut } from "@/lib/actions/auth.actions";
import { useAuth } from "@/hooks/useAuth";
import CreateClassModal from "@/components/teacher/CreateClassModal";
import { Users, TrendingUp, Trophy, LogOut, Loader2, BookOpen } from "lucide-react";
import { getTeacherAnalytics } from "@/lib/actions/analytics.actions";
import { getTeacherClasses } from "@/lib/actions/class.actions";
import dynamic from "next/dynamic";

const ClassPerformanceChart = dynamic(
  () => import("@/components/teacher/TeacherAnalytics").then((mod) => mod.ClassPerformanceChart),
  { ssr: false }
);

const ClassEnrollmentChart = dynamic(
  () => import("@/components/teacher/TeacherAnalytics").then((mod) => mod.ClassEnrollmentChart),
  { ssr: false }
);
import Link from "next/link";

export default function TeacherDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      getTeacherAnalytics(user.id).then(setAnalytics);
      getTeacherClasses(user.id).then(setClasses);
    }
  }, [user]);

  const totalStudents = classes.reduce((acc, curr) => acc + (curr._count?.members || 0), 0);

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75 animate-pulse"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            Teacher Dashboard
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-primary">
            Welcome back, <span className="text-accent italic">Instructor {user?.name?.split(" ")[0] || "User"}.</span>
          </h1>
          <p className="text-muted-foreground font-medium max-w-md">
            Monitor student performance and manage your classrooms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user && <CreateClassModal teacherId={user.id} />}
        </div>
      </header>

        {/* Teacher Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="premium-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-primary">Class Performance</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Avg Focus Score (%)</p>
              </div>
            </div>
            <ClassPerformanceChart data={analytics} />
          </div>

          <div className="premium-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-primary">Student Distribution</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Enrollment per Class</p>
              </div>
            </div>
            <ClassEnrollmentChart data={analytics} />
          </div>
        </div>

      {/* Quick Stats Grid */}
      <section className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {[
          { label: "Active Classes", value: classes.length.toString(), icon: <Users className="w-5 h-5" />, color: "text-secondary" },
          { label: "Total Students", value: totalStudents.toString(), icon: <TrendingUp className="w-5 h-5" />, color: "text-accent" },
          { label: "Total XP Forged", value: (totalStudents * 1250).toLocaleString(), icon: <Trophy className="w-5 h-5" />, color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="premium-card flex items-center gap-6 group">
            <div className={`p-4 rounded-2xl bg-muted/50 ${stat.color} transition-transform group-hover:scale-110 duration-500`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{stat.label}</p>
              <p className="text-3xl font-black text-primary mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Main Content Area */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black text-primary">Your Classrooms</h3>
          </div>
          
          {classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {classes.map((cls) => (
                <div key={cls.id} className="premium-card group hover:border-secondary/30 transition-all duration-500">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 rounded-2xl bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white transition-all duration-500">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="px-3 py-1 rounded-full bg-muted text-[10px] font-black uppercase tracking-widest">
                      {cls.code}
                    </div>
                  </div>
                  <h4 className="text-lg font-black text-primary group-hover:text-secondary transition-colors mb-2">
                    {cls.name}
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium line-clamp-2 mb-6 h-8">
                    {cls.description || "No description provided."}
                  </p>
                  <div className="flex items-center justify-between pt-6 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-bold text-foreground">{cls._count?.members || 0} Students</span>
                    </div>
                    <Link 
                      href={`/teacher/classes/${cls.id}`}
                      className="text-[10px] font-black uppercase tracking-widest text-secondary hover:text-primary transition-colors"
                    >
                      View Classroom →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="premium-card min-h-[400px] flex flex-col items-center justify-center text-center p-12 border-dashed">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl mb-6">
                🏫
              </div>
              <h4 className="text-xl font-black text-primary mb-2">No active classes yet</h4>
              <p className="text-sm text-muted-foreground font-medium max-w-xs mb-8">
                Create your first classroom to start monitoring student deep work sessions.
              </p>
              {user && <CreateClassModal teacherId={user.id} />}
            </div>
          )}
        </div>

        {/* Recent Activity Sidebar */}
        <div className="space-y-6">
          <h3 className="text-2xl font-black text-primary">Student Pulse</h3>
          <div className="premium-card space-y-6">
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground font-medium italic">No recent activity detected.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

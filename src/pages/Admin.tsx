import React, { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  BookOpen,
  GraduationCap,
  Coins,
  ArrowLeft,
  Activity,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CourseManagement from "@/components/admin/CourseManagement";
import ClassManagement from "@/components/admin/ClassManagement";
import LessonManagement from "@/components/admin/LessonManagement";
import UserManagement from "@/components/admin/UserManagement";
import CoinConfigPanel from "@/components/admin/CoinConfigPanel";
import MetricsTab from "@/components/admin/MetricsTab";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LearnerLayout } from "@/components/layout/LearnerLayout";
import { useAuth } from "@/context/AuthContext";

const Admin: React.FC = () => {
  const { isAdmin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("courses");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const tabTriggerClass =
    "gap-2 text-sm font-medium px-3 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:font-semibold";

  return (
    <LearnerLayout contentClassName="max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground mb-1">
              Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage courses, lessons, users & scoring
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/50 p-1 flex-wrap">
          <TabsTrigger value="courses" className={tabTriggerClass}>
            <GraduationCap className="w-4 h-4" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="classes" className={tabTriggerClass}>
            <CalendarDays className="w-4 h-4" />
            Classes
          </TabsTrigger>
          <TabsTrigger value="lessons" className={tabTriggerClass}>
            <BookOpen className="w-4 h-4" />
            Lessons
          </TabsTrigger>
          <TabsTrigger value="users" className={tabTriggerClass}>
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="coins" className={tabTriggerClass}>
            <Coins className="w-4 h-4" />
            Coins
          </TabsTrigger>
          <TabsTrigger value="scoring" className={tabTriggerClass}>
            <Activity className="w-4 h-4" />
            Scoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-0">
          <CourseManagement />
        </TabsContent>

        <TabsContent value="classes" className="mt-0">
          <ClassManagement />
        </TabsContent>

        <TabsContent value="lessons" className="mt-0">
          <LessonManagement />
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <UserManagement />
        </TabsContent>

        <TabsContent value="coins" className="mt-0">
          <CoinConfigPanel />
        </TabsContent>

        <TabsContent value="scoring" className="mt-0">
          <MetricsTab />
        </TabsContent>
      </Tabs>
    </LearnerLayout>
  );
};

export default Admin;

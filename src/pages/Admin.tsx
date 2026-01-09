import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  Coins, 
  ArrowLeft,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import CourseManagement from '@/components/admin/CourseManagement';
import LessonManagement from '@/components/admin/LessonManagement';
import UserManagement from '@/components/admin/UserManagement';
import CoinConfigPanel from '@/components/admin/CoinConfigPanel';
import ScoringConfigPanel from '@/components/admin/ScoringConfigPanel';

const Admin: React.FC = () => {
  const { isAdmin, isTeacher, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('courses');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin && !isTeacher) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-display font-bold">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Manage courses, lessons, users & scoring</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card/50 p-1 flex-wrap">
            <TabsTrigger value="courses" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="lessons" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Lessons
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="w-4 h-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="coins" className="gap-2">
                  <Coins className="w-4 h-4" />
                  Coins
                </TabsTrigger>
                <TabsTrigger value="scoring" className="gap-2">
                  <Activity className="w-4 h-4" />
                  Scoring
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="courses" className="mt-0">
              <CourseManagement />
            </TabsContent>

            <TabsContent value="lessons" className="mt-0">
              <LessonManagement />
            </TabsContent>

            {isAdmin && (
              <>
                <TabsContent value="users" className="mt-0">
                  <UserManagement />
                </TabsContent>

                <TabsContent value="coins" className="mt-0">
                  <CoinConfigPanel />
                </TabsContent>

                <TabsContent value="scoring" className="mt-0">
                  <ScoringConfigPanel />
                </TabsContent>
              </>
            )}
          </motion.div>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
